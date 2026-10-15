export function isHongKongMobile(value) {
  const digits = String(value || "").replace(/\s+/g, "");
  return /^[456789]\d{7}$/.test(digits);
}

export function formatHongKongMobile(digits) {
  const raw = String(digits).replace(/\s+/g, "");
  return `${raw.slice(0, 4)} ${raw.slice(4)}`;
}

export function blankLead(number) {
  const raw = String(number || "").trim();
  if (!isHongKongMobile(raw)) {
    return { ok: false, message: "請輸入 8 位香港流動電話，字頭要係 4、5、6、7、8 或 9。" };
  }
  return {
    ok: true,
    row: {
      Name: "",
      "no.": formatHongKongMobile(raw),
      "status(accept/not)": "Pending",
      remarks: "",
    },
  };
}

export function toMarkdownTable(rows) {
  const header = "| Name | no. | status(accept/not) | remarks |";
  const rule = "| --- | --- | --- | --- |";
  const body = rows.map((row) => {
    const remarks = String(row.remarks || "").replace(/\|/g, "／").replace(/\n/g, " ");
    return `| ${row.Name} | ${row["no."]} | ${row["status(accept/not)"]} | ${remarks} |`;
  });
  return [header, rule, ...body].join("\n");
}

export function updateLeadStatus(rows, target, status) {
  const allowed = new Set(["accept", "not", "Pending"]);
  if (!allowed.has(status)) return { ok: false, message: "status 只可以是 accept、not 或 Pending。" };
  const needle = String(target || "").replace(/\s+/g, "");
  const index = rows.findIndex((row) => (row.Name && row.Name === target) || row["no."].replace(/\s+/g, "") === needle);
  if (index < 0) return { ok: false, message: "找不到這筆記錄。" };
  const next = rows.map((row, i) => (i === index ? { ...row, "status(accept/not)": status } : row));
  return { ok: true, rows: next };
}

export function parseStatusCommand(text) {
  const match = String(text || "").match(/(.+?)的?\s*status\s*改(?:為|成)\s*(accept|not|Pending)/i);
  if (!match) return null;
  return { target: match[1].replace(/^[將把]/, "").trim(), status: match[2].toLowerCase() === "pending" ? "Pending" : match[2].toLowerCase() };
}
