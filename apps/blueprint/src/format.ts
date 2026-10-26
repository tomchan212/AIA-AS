export function money(value: number) {
  const amount = Number.isFinite(value) ? value : 0;
  return `HK$ ${amount.toLocaleString("zh-TW", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function signedMoney(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${money(value)}`;
}
