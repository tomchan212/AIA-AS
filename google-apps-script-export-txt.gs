/**
 * Export spreadsheet rows to a TXT file in a Google Drive folder.
 *
 * Columns:
 * A: Code
 * B: Date
 * C: Start
 * D: End
 * E: Contact
 * F: Name
 * H: Status
 */
function exportSheetToTxt() {
  // ====== CONFIG ======
  var SHEET_NAME = "Sheet1"; // Change to your sheet name
  var FOLDER_ID = "1NN2OYVG0gvcqNnMFYV0X4EAn5N2h9t1K"; // Change to your Google Drive folder ID
  var FILE_NAME_PREFIX = "appointments_export_";
  // ====================

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error("Sheet not found: " + SHEET_NAME);
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    throw new Error("No data rows found. Put data from row 2 onward.");
  }

  // Read A:H (row 1 assumed as headers), use A:F + H
  var values = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  var timezone = ss.getSpreadsheetTimeZone();
  var lines = [];

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var code = safeText_(row[0]);
    var date = formatDate_(row[1], timezone);
    var start = formatTime_(row[2], timezone);
    var end = formatTime_(row[3], timezone);
    var contact = safeText_(row[4]);
    var name = safeText_(row[5]);
    var status = safeText_(row[7]);

    // One line per row, pipe-separated
    lines.push([code, date, start, end, contact, name, status].join("|"));
  }

  var content =
    "Code|Date|Start|End|Contact|Name|Status\n" +
    lines.join("\n");

  var normalizedFolderId = normalizeFolderId_(FOLDER_ID);
  var folder;
  try {
    folder = DriveApp.getFolderById(normalizedFolderId);
    // Force a lightweight read to surface permission/ID issues clearly.
    folder.getName();
  } catch (err) {
    throw new Error(
      "Cannot access target folder. Check FOLDER_ID and deployment permission. " +
      "FOLDER_ID=" + normalizedFolderId + " | Detail: " + err
    );
  }
  var fileName = FILE_NAME_PREFIX + Utilities.formatDate(new Date(), timezone, "yyyyMMdd_HHmmss") + ".txt";
  var file = folder.createFile(fileName, content, MimeType.PLAIN_TEXT);

  Logger.log("TXT created: " + file.getUrl());
}

function safeText_(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function formatDate_(value, timezone) {
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, timezone, "yyyy-MM-dd");
  }
  return safeText_(value);
}

function formatTime_(value, timezone) {
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, timezone, "HH:mm");
  }
  return safeText_(value);
}

function normalizeFolderId_(rawValue) {
  var input = safeText_(rawValue);
  if (!input || input === "PASTE_YOUR_FOLDER_ID_HERE") {
    throw new Error("FOLDER_ID is empty. Please set a valid Google Drive folder ID.");
  }

  // Accept either a plain folder ID or a full folder URL.
  var match = input.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return input;
}

// =========================
// Web API (for calendar UI)
// =========================

var APP_SHEET_NAME_ = "Sheet1";
var HEADER_ROW_ = 1;
var DEFAULT_RESERVE_STATUS_ = "First meet";
var RESERVED_STATUS_FALLBACK_ = "Reserved"; // 兼容舊資料若仍使用 Reserved

function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = safeText_((params && params.action) || "");

    if (action === "getMonth") {
      var year = Number((params && params.year) || "");
      var month = Number((params && params.month) || "");
      if (!year || !month || month < 1 || month > 12) {
        return jsonResponse_({ ok: false, message: "Invalid year/month" });
      }
      var tz = getSpreadsheetTimeZone_();
      var data = getMonthAppointments_(year, month, tz);
      return jsonResponse_({ ok: true, year, month, appointments: data });
    }

    // 無副作用測試端點：確認部署已更新
    if (action === "ping") {
      return jsonResponse_({ ok: true, message: "pong" });
    }

    // User reserve via GET (avoids POST parsing/deployment issues)
    if (action === "reserve") {
      var dateStr = safeText_(params.date);
      var startStr = safeText_(params.start);
      var endStr = safeText_(params.end);
      var contact = safeText_(params.contact);
      var name = safeText_(params.name);
      var tz = getSpreadsheetTimeZone_();

      if (!dateStr || !startStr || !endStr || !contact || !name) {
        return jsonResponse_({ ok: false, message: "Missing required fields." });
      }

      var res = reserveAppointment_(dateStr, startStr, endStr, contact, name, tz);
      return jsonResponse_(res);
    }

    // Admin update status via GET
    if (action === "adminUpdateStatus") {
      var rowIndex = Number(params.rowIndex);
      var status = safeText_(params.status);
      if (!rowIndex || !status) {
        return jsonResponse_({ ok: false, message: "Missing rowIndex/status." });
      }

      var sheet = getAppSheet_();
      var lastRow = sheet.getLastRow();
      if (rowIndex < (HEADER_ROW_ + 1) || rowIndex > lastRow) {
        return jsonResponse_({ ok: false, message: "rowIndex out of range." });
      }

      // Column H = 8
      sheet.getRange(rowIndex, 8).setValue(status);
      return jsonResponse_({ ok: true });
    }

    return jsonResponse_({ ok: false, message: "Unknown action: " + action });
  } catch (err) {
    return jsonResponse_({ ok: false, message: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = safeText_(params.action || "");

    // 若不是表單送出（e.parameter 沒資料），再嘗試解析 JSON
    var jsonData = null;
    if (!action) {
      var raw = (e && e.postData && e.postData.contents) || "{}";
      try {
        jsonData = JSON.parse(raw);
      } catch (_) {
        jsonData = {};
      }
      action = safeText_((jsonData && jsonData.action) || "");
    }

    if (action === "reserve") {
      var dateStr = safeText_(params.date || (jsonData && jsonData.date));
      var startStr = safeText_(params.start || (jsonData && jsonData.start));
      var endStr = safeText_(params.end || (jsonData && jsonData.end));
      var contact = safeText_(params.contact || (jsonData && jsonData.contact));
      var name = safeText_(params.name || (jsonData && jsonData.name));
      var tz = getSpreadsheetTimeZone_();

      if (!dateStr || !startStr || !endStr || !contact || !name) {
        return jsonResponse_({ ok: false, message: "Missing required fields." });
      }

      var res = reserveAppointment_(dateStr, startStr, endStr, contact, name, tz);
      return jsonResponse_(res);
    }

    if (action === "adminUpdateStatus") {
      var rowIndex = Number(params.rowIndex || (jsonData && jsonData.rowIndex));
      var status = safeText_(params.status || (jsonData && jsonData.status));
      if (!rowIndex || !status) {
        return jsonResponse_({ ok: false, message: "Missing rowIndex/status." });
      }

      var sheet = getAppSheet_();
      var lastRow = sheet.getLastRow();
      if (rowIndex < (HEADER_ROW_ + 1) || rowIndex > lastRow) {
        return jsonResponse_({ ok: false, message: "rowIndex out of range." });
      }

      // Column H = 8
      sheet.getRange(rowIndex, 8).setValue(status);
      return jsonResponse_({ ok: true });
    }

    return jsonResponse_({ ok: false, message: "Unknown action: " + action });
  } catch (err) {
    return jsonResponse_({ ok: false, message: String(err && err.message ? err.message : err) });
  }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getAppSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(APP_SHEET_NAME_);
  if (!sheet) throw new Error("Sheet not found: " + APP_SHEET_NAME_);
  return sheet;
}

function getSpreadsheetTimeZone_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSpreadsheetTimeZone();
}

function getMonthAppointments_(year, month, timezone) {
  var sheet = getAppSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < (HEADER_ROW_ + 1)) return [];

  var values = sheet.getRange(HEADER_ROW_ + 1, 1, lastRow - HEADER_ROW_, 8).getValues(); // A:H
  var monthStartYMD = pad2_(month) ? String(year) + "-" + pad2_(month) + "-01" : ""; // always correct, keep readable
  var monthEndYMD = toYMD_(new Date(year, month, 0), timezone);

  var result = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var dateStr = toYMD_(row[1], timezone); // B
    if (!dateStr) continue;
    if (dateStr < monthStartYMD || dateStr > monthEndYMD) continue;

    var code = safeText_(row[0]); // A
    var start = toHM_(row[2], timezone); // C
    var end = toHM_(row[3], timezone); // D
    var contact = safeText_(row[4]); // E
    var name = safeText_(row[5]); // F
    var status = safeText_(row[7]); // H

    result.push({
      rowIndex: i + (HEADER_ROW_ + 1),
      code: code,
      date: dateStr,
      start: start,
      end: end,
      contact: contact,
      name: name,
      status: status
    });
  }
  return result;
}

function reserveAppointment_(dateStr, startStr, endStr, contact, name, timezone) {
  var sheet = getAppSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < (HEADER_ROW_ + 1)) lastRow = HEADER_ROW_ + 1;

  // Check conflict: same Date + Start + End where Status is not empty
  var values = sheet.getRange(HEADER_ROW_ + 1, 1, lastRow - HEADER_ROW_, 8).getValues(); // A:H
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var existingDate = toYMD_(row[1], timezone);
    var existingStart = toHM_(row[2], timezone);
    var existingEnd = toHM_(row[3], timezone);
    var existingStatus = safeText_(row[7]);

    if (
      existingDate === dateStr &&
      existingStart === startStr &&
      existingEnd === endStr &&
      existingStatus
    ) {
      return { ok: false, message: "此時段已被預約。" };
    }
  }

  // Append new row
  var code = generateCode_(timezone);
  var status = DEFAULT_RESERVE_STATUS_;
  // If you previously stored "Reserved" manually, admins can change it later.
  // (User-facing logic treats any non-empty status as reserved.)

  sheet.appendRow([code, dateStr, startStr, endStr, contact, name, "", status]);
  var newRowIndex = sheet.getLastRow();

  return { ok: true, rowIndex: newRowIndex, code: code };
}

function generateCode_(timezone) {
  var stamp = Utilities.formatDate(new Date(), timezone, "yyyyMMdd-HHmmss");
  var rand = Math.floor(Math.random() * 900 + 100); // 3 digits
  return "AP-" + stamp + "-" + rand;
}

function toYMD_(value, timezone) {
  if (value === null || value === undefined) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, timezone, "yyyy-MM-dd");
  }
  var s = safeText_(value);
  if (!s) return "";
  // Support "YYYY/MM/DD" -> "YYYY-MM-DD"
  s = s.replace(/\//g, "-");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Try parse
  var d = new Date(s);
  if (Object.prototype.toString.call(d) === "[object Date]" && !isNaN(d.getTime())) {
    return Utilities.formatDate(d, timezone, "yyyy-MM-dd");
  }
  return s;
}

function toHM_(value, timezone) {
  if (value === null || value === undefined) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, timezone, "HH:mm");
  }
  var s = safeText_(value);
  if (!s) return "";

  // Support "HH:mm:ss"
  var m3 = s.match(/^(\d{1,2}):(\d{2}):\d{2}$/);
  if (m3) {
    var hh3 = String(Number(m3[1])).padStart(2, "0");
    var mm3 = String(Number(m3[2])).padStart(2, "0");
    return hh3 + ":" + mm3;
  }

  // Normalize "H:mm" -> "HH:mm"
  var m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    var hh = String(Number(m[1])).padStart(2, "0");
    var mm = String(Number(m[2])).padStart(2, "0");
    return hh + ":" + mm;
  }
  // If it's something like "9:0", try parse
  var d = new Date("1970-01-01T" + s + ":00");
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, timezone, "HH:mm");
  }
  return s;
}

function pad2_(n) {
  return String(n).padStart(2, "0");
}
