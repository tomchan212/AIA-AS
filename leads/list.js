export function isHongKongMobile(value) {
  const digits = String(value || "").replace(/\s+/g, "");
  return /^[456789]\d{7}$/.test(digits);
}

export function digitsOnly(value) {
  return String(value || "").replace(/\s+/g, "");
}

export function formatHongKongMobile(digits) {
  const raw = digitsOnly(digits);
  return `${raw.slice(0, 4)} ${raw.slice(4)}`;
}

export function emptyBook() {
  return { queue: [], retry: [], talked: [], unregistered: [] };
}

export function calledNumbers(book) {
  const known = new Set();
  for (const item of book.retry || []) known.add(digitsOnly(item.no));
  for (const item of book.talked || []) known.add(digitsOnly(item["no."]));
  for (const item of book.unregistered || []) known.add(digitsOnly(item.no));
  return known;
}

export function knownNumbers(book) {
  const known = calledNumbers(book);
  for (const item of book.queue || []) known.add(digitsOnly(item.no));
  return known;
}

export function generateCallList({ heads, prefix = "", count = 10, known = new Set(), random = Math.random }) {
  const selected = [...new Set((heads || []).map((head) => String(head)))].filter((head) => /^[456789]$/.test(head));
  const start = digitsOnly(prefix);
  if (!selected.length) return { ok: false, message: "請先選字頭。" };
  if (start && !/^[456789]\d{0,6}$/.test(start)) {
    return { ok: false, message: "開頭只可以係 1 至 7 位，而且第一位要係 4、5、6、7、8 或 9。" };
  }
  if (start && !selected.includes(start[0])) {
    return { ok: false, message: "開頭第一位要係已選的字頭。" };
  }
  const size = Math.max(1, Math.min(50, Number(count) || 10));
  const numbers = [];
  const seen = new Set(known);
  let attempts = 0;
  while (numbers.length < size && attempts < size * 40) {
    attempts += 1;
    const head = start ? start : selected[Math.floor(random() * selected.length)];
    let digits = head;
    while (digits.length < 8) digits += String(Math.floor(random() * 10));
    digits = digits.slice(0, 8);
    if (!isHongKongMobile(digits) || !selected.includes(digits[0]) || seen.has(digits)) continue;
    if (start && !digits.startsWith(start)) continue;
    seen.add(digits);
    numbers.push(formatHongKongMobile(digits));
  }
  if (!numbers.length) return { ok: false, message: "沒有新的未打號碼可以生成。" };
  return { ok: true, numbers };
}

function withoutNumber(book, number) {
  const needle = digitsOnly(number);
  return {
    queue: (book.queue || []).filter((item) => digitsOnly(item.no) !== needle),
    retry: (book.retry || []).filter((item) => digitsOnly(item.no) !== needle),
    talked: (book.talked || []).filter((item) => digitsOnly(item["no."]) !== needle),
    unregistered: (book.unregistered || []).filter((item) => digitsOnly(item.no) !== needle),
  };
}

export function classifyNumber(book, number, outcome, at = new Date().toISOString()) {
  if (!isHongKongMobile(number)) {
    return { ok: false, message: "請輸入 8 位香港流動電話，字頭要係 4、5、6、7、8 或 9。" };
  }
  const formatted = formatHongKongMobile(number);
  const next = withoutNumber(book, formatted);
  if (outcome === "no_answer" || outcome === "busy") {
    next.retry = [...next.retry, { no: formatted, reason: outcome, at }];
  } else if (outcome === "unregistered") {
    next.unregistered = [...next.unregistered, { no: formatted, at }];
  } else if (outcome === "talked") {
    next.talked = [...next.talked, { Name: "", "no.": formatted, "status(accept/not)": "Pending", remarks: "", at }];
  } else {
    return { ok: false, message: "未知結果。" };
  }
  return { ok: true, book: next };
}

export function saveRecord(book, { number, outcome, name = "", status = "Pending", remarks = "", at }) {
  if (!isHongKongMobile(number)) {
    return { ok: false, message: "請輸入 8 位香港流動電話，字頭要係 4、5、6、7、8 或 9。" };
  }
  const formatted = formatHongKongMobile(number);
  const stamp = at || new Date().toISOString();
  const next = withoutNumber(book, formatted);
  if (outcome === "no_answer" || outcome === "busy") {
    next.retry = [...next.retry, { no: formatted, reason: outcome, remarks, at: stamp }];
  } else if (outcome === "unregistered") {
    next.unregistered = [...next.unregistered, { no: formatted, remarks, at: stamp }];
  } else if (outcome === "talked") {
    if (!["accept", "not", "Pending"].includes(status)) {
      return { ok: false, message: "status 只可以是 accept、not 或 Pending。" };
    }
    next.talked = [
      ...next.talked,
      { Name: name, "no.": formatted, "status(accept/not)": status, remarks, at: stamp },
    ];
  } else {
    return { ok: false, message: "未知結果。" };
  }
  return { ok: true, book: next };
}

export function replaceQueue(book, numbers) {
  const known = calledNumbers(book);
  const queue = [];
  for (const number of numbers) {
    const digits = digitsOnly(number);
    if (!isHongKongMobile(digits) || known.has(digits)) continue;
    known.add(digits);
    queue.push({ no: formatHongKongMobile(digits) });
  }
  return { ...book, queue };
}

export const MARKDOWN_PAGE_SIZE = 8;

export function pageOf(items, page = 1, pageSize = MARKDOWN_PAGE_SIZE) {
  const sorted = [...items].sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  const size = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(sorted.length / size));
  const current = Math.min(Math.max(1, page), pageCount);
  return {
    page: current,
    pageCount,
    items: sorted.slice((current - 1) * size, current * size),
  };
}

export function hongKongStamp(iso) {
  const date = new Date(iso || Date.now());
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-HK", {
      timeZone: "Asia/Hong_Kong",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function markdownTable(rows) {
  const header = "| Name | no. | status(accept/not) | remarks |";
  const rule = "| --- | --- | --- | --- |";
  const body = rows.map((row) => {
    const remarks = String(row.remarks || "").replace(/\|/g, "／").replace(/\n/g, " ");
    return `| ${row.Name} | ${row["no."]} | ${row["status(accept/not)"]} | ${remarks} |`;
  });
  return [header, rule, ...body].join("\n");
}

export function toMarkdownTable(rows) {
  return markdownPages(rows).map((page) => page.markdown).join("\n\n");
}

export function markdownPages(rows, pageSize = MARKDOWN_PAGE_SIZE) {
  const sorted = [...rows].sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
  const size = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(sorted.length / size));
  const pages = [];
  for (let page = 1; page <= pageCount; page += 1) {
    const slice = sorted.slice((page - 1) * size, page * size);
    const lines = [`## 第 ${page} 頁，共 ${pageCount} 頁`];
    let lastDate = "";
    let lastTime = "";
    if (!slice.length) lines.push("", "未有記錄。");
    for (const row of slice) {
      const stamp = hongKongStamp(row.at);
      if (stamp.date !== lastDate) {
        lines.push("", `### ${stamp.date}`);
        lastDate = stamp.date;
        lastTime = "";
      }
      if (stamp.time !== lastTime) {
        lines.push("", `#### ${stamp.time}`, "", markdownTable([row]));
        lastTime = stamp.time;
      } else {
        lines.push(`| ${row.Name} | ${row["no."]} | ${row["status(accept/not)"]} | ${String(row.remarks || "").replace(/\|/g, "／").replace(/\n/g, " ")} |`);
      }
    }
    pages.push({ page, pageCount, rows: slice, markdown: lines.join("\n").trim() });
  }
  return pages;
}

export function updateLeadStatus(rows, target, status) {
  const allowed = new Set(["accept", "not", "Pending"]);
  if (!allowed.has(status)) return { ok: false, message: "status 只可以是 accept、not 或 Pending。" };
  const needle = digitsOnly(target);
  const index = rows.findIndex((row) => (row.Name && row.Name === target) || digitsOnly(row["no."]) === needle);
  if (index < 0) return { ok: false, message: "找不到這筆記錄。" };
  const next = rows.map((row, i) => (i === index ? { ...row, "status(accept/not)": status } : row));
  return { ok: true, rows: next };
}

export function parseStatusCommand(text) {
  const match = String(text || "").match(/(.+?)的?\s*status\s*改(?:為|成)\s*(accept|not|Pending)/i);
  if (!match) return null;
  return {
    target: match[1].replace(/^[將把]/, "").trim(),
    status: match[2].toLowerCase() === "pending" ? "Pending" : match[2].toLowerCase(),
  };
}
