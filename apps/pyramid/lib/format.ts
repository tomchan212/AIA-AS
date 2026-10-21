import type { Locale } from "@/types";

export function formatHkd(value: number, locale: Locale) {
  const amount = Number.isFinite(value) ? Math.round(value) : 0;
  return new Intl.NumberFormat(locale === "en" ? "en-HK" : "zh-HK", {
    style: "currency",
    currency: "HKD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "en" ? "en-HK" : "zh-HK", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}
