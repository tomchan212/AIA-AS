import { USD_HKD } from "./data";

export function usd(value: number) {
  return `USD ${value.toLocaleString("zh-TW", { maximumFractionDigits: 2 })}`;
}

export function hkd(value: number) {
  return `HK$ ${value.toLocaleString("zh-TW", { maximumFractionDigits: 2 })}`;
}

export function money(valueUSD: number, currency: "USD" | "HKD") {
  return currency === "USD" ? usd(valueUSD) : hkd(valueUSD * USD_HKD);
}

export function hkdMoney(valueHKD: number, currency: "USD" | "HKD") {
  return currency === "HKD" ? hkd(valueHKD) : usd(valueHKD / USD_HKD);
}
