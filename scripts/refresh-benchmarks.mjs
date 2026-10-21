import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "data/benchmarks.json");
const copies = [
  resolve(root, "apps/pyramid/data/benchmarks.json"),
  resolve(root, "apps/pyramid/public/data/benchmarks.json"),
];

const required = ["id", "labelZh", "labelEn", "value", "unit", "asOf", "sourceName", "sourceUrl", "note", "refreshCadence"];

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const raw = JSON.parse(await readFile(source, "utf8"));
if (!raw.version || !Array.isArray(raw.items)) fail("benchmarks.json needs version and items");
const ids = new Set();
for (const item of raw.items) {
  for (const key of required) {
    if (!(key in item)) fail(`${item.id ?? "item"} is missing ${key}`);
  }
  if (ids.has(item.id)) fail(`duplicate id ${item.id}`);
  ids.add(item.id);
  if (item.value !== null && typeof item.value !== "number") fail(`${item.id} value must be a number or null`);
  if (item.asOf && Number.isNaN(Date.parse(item.asOf))) fail(`${item.id} has an invalid asOf`);
  try {
    const url = new URL(item.sourceUrl);
    if (url.protocol !== "https:") fail(`${item.id} source must be https`);
  } catch {
    fail(`${item.id} has an invalid sourceUrl`);
  }
}

if (process.argv.includes("--refresh-hkma")) {
  const response = await fetch("https://api.hkma.gov.hk/public/market-data-and-statistics/monthly-statistical-bulletin/er-ir/hkd-ir-periodaverage?pagesize=1&sortby=end_of_month&sortorder=desc");
  if (!response.ok) fail(`HKMA API returned ${response.status}`);
  const payload = await response.json();
  const row = payload?.result?.records?.[0];
  const rate = row?.savings_deposit_rate;
  if (typeof rate !== "number" || !row.end_of_month) fail("HKMA payload did not include a savings deposit rate");
  const item = raw.items.find((entry) => entry.id === "hkma-savings-deposit-rate");
  item.value = rate;
  item.asOf = `${row.end_of_month}-01`;
  item.note = `Period-average savings deposit rate quoted by major licensed banks on deposits of less than HK$100,000. Refreshed from the HKMA public API for ${row.end_of_month}. The figure is percent per annum.`;
  raw.version = new Date().toISOString().slice(0, 10);
  await writeFile(source, `${JSON.stringify(raw, null, 2)}\n`);
  console.log(`updated savings deposit rate to ${rate} for ${row.end_of_month}`);
}

for (const copy of copies) {
  await mkdir(dirname(copy), { recursive: true });
  await copyFile(source, copy);
}

const today = new Date();
const nulls = raw.items.filter((item) => item.value === null).map((item) => item.id);
console.log(`version ${raw.version}; ${raw.items.length} items; ${nulls.length} without a verified value`);
if (nulls.length) console.log(`unverified: ${nulls.join(", ")}`);
console.log("copied snapshot to the pyramid app");
