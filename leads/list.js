const SURNAMES = ["陳", "李", "張", "黃", "林", "吳", "劉", "何", "周", "梁", "羅", "鄭", "郭", "謝", "許", "鄧", "馮", "蔡", "曾", "彭"];
const GIVEN = ["偉成", "嘉怡", "俊傑", "曉彤", "家豪", "詠詩", "子軒", "凱晴", "志明", "美玲", "浩然", "思穎", "柏霖", "雅文", "梓朗", "芷晴", "樂軒", "婉婷", "睿哲", "可兒"];
const MOBILE_PREFIXES = ["4", "5", "6", "7", "8", "9"];

export function isHongKongMobile(value) {
  const digits = String(value || "").replace(/\s+/g, "");
  return /^[456789]\d{7}$/.test(digits);
}

export function formatHongKongMobile(digits) {
  const raw = String(digits).replace(/\s+/g, "");
  return `${raw.slice(0, 4)} ${raw.slice(4)}`;
}

function pick(list, random) {
  return list[Math.floor(random() * list.length)];
}

export function createLeadList(count, random = Math.random) {
  const size = Math.max(1, Math.min(50, Number(count) || 10));
  const usedNames = new Set();
  const usedNumbers = new Set();
  const rows = [];
  let salt = 0;
  while (rows.length < size && salt < size * 30) {
    salt += 1;
    const name = `${pick(SURNAMES, random)}${pick(GIVEN, random)}`;
    const number = randomMobile(random, salt);
    if (usedNames.has(name) || usedNumbers.has(number) || !isHongKongMobile(number)) continue;
    usedNames.add(name);
    usedNumbers.add(number);
    rows.push({
      Name: name,
      "no.": number,
      "status(accept/not)": "Pending",
      remarks: "虛擬名單，請勿當真實客戶致電",
    });
  }
  return rows;
}

function randomMobile(random, salt) {
  const prefix = pick(MOBILE_PREFIXES, random);
  let rest = "";
  for (let i = 0; i < 7; i += 1) rest += String(Math.floor(random() * 10));
  const mixed = String((Number(prefix + rest) + salt) % 100000000).padStart(8, "0");
  const digits = MOBILE_PREFIXES.includes(mixed[0]) ? mixed : `${prefix}${mixed.slice(1)}`;
  return formatHongKongMobile(digits.slice(0, 8));
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
  const index = rows.findIndex((row) => row.Name === target || row["no."].replace(/\s+/g, "") === needle);
  if (index < 0) return { ok: false, message: "找不到這位名單。" };
  const next = rows.map((row, i) => (i === index ? { ...row, "status(accept/not)": status } : row));
  return { ok: true, rows: next };
}

export function parseStatusCommand(text) {
  const match = String(text || "").match(/(.+?)的?\s*status\s*改(?:為|成)\s*(accept|not|Pending)/i);
  if (!match) return null;
  return { target: match[1].replace(/^[將把]/, "").trim(), status: match[2].toLowerCase() === "pending" ? "Pending" : match[2].toLowerCase() };
}
