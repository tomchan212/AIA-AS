/** Integer minor units. 1 HKD = 100 cents. Never use floats for money. */

export function roundHalfUpDiv(numerator, denominator) {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator <= 0) {
    throw new TypeError("roundHalfUpDiv expects positive integer denominator");
  }
  const sign = numerator < 0 ? -1 : 1;
  const abs = Math.abs(numerator);
  return sign * Math.floor((abs + Math.floor(denominator / 2)) / denominator);
}

/**
 * Parse a user-entered HKD amount into cents.
 * Accepts "8000", "8,000", "8000.5", "8000.50". Rejects more than 2 decimal places.
 */
export function parseHkdToCents(input) {
  const raw = String(input ?? "").trim().replace(/,/g, "").replace(/^[HK$港元幣\s]+/i, "");
  if (raw === "") return { ok: false, code: "empty" };
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return { ok: false, code: "invalid" };
  const [whole, frac = ""] = raw.split(".");
  const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  if (!Number.isSafeInteger(cents)) return { ok: false, code: "overflow" };
  return { ok: true, cents };
}

export function formatHkdFromCents(cents, locale = "zh-HK") {
  const value = Number(cents);
  if (!Number.isSafeInteger(value)) return "—";
  const amount = value / 100;
  return new Intl.NumberFormat(locale === "en" ? "en-HK" : "zh-HK", {
    style: "currency",
    currency: "HKD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function sumCents(values) {
  return values.reduce((total, value) => {
    const n = Number(value) || 0;
    if (!Number.isSafeInteger(n)) throw new TypeError("cents must be safe integers");
    return total + n;
  }, 0);
}
