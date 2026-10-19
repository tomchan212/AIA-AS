import { deleteTaxCalculation, listTaxCalculations } from "./records.js";

const host = document.getElementById("records");
let pendingDelete = "";

function money(value) {
  return `$${Math.round(Number(value) || 0).toLocaleString("en-HK")}`;
}

function when(iso) {
  if (!iso) return "剛剛";
  return new Intl.DateTimeFormat("zh-HK", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function line(label, value) {
  return `<p class="flex justify-between gap-3"><span class="text-ink/60">${label}</span><span class="font-extrabold">${value}</span></p>`;
}

function parentLine(record) {
  const amount = Number(record.parentAllowance) || 0;
  if (!amount) return "";
  const older = Number(record.parents60) || 0;
  const olderWith = Number(record.parents60With) || 0;
  const younger = Number(record.parents55) || 0;
  const youngerWith = Number(record.parents55With) || 0;
  const detail = [
    older ? `60歲或以上 ${older} 位${olderWith ? `，同住 ${olderWith} 位` : ""}` : "",
    younger ? `55至59歲 ${younger} 位${youngerWith ? `，同住 ${youngerWith} 位` : ""}` : "",
  ].filter(Boolean).join("；");
  return `${line("供養爸媽", money(amount))}${detail ? line("人數", escapeHtml(detail)) : ""}`;
}

function card(record) {
  const treasure = record.kind === "treasure";
  const confirm = pendingDelete === record.id;
  const parent = Number(record.parentAllowance) || 0;
  return `
    <article class="rounded-3xl bg-white p-4 shadow-sm">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-sm font-extrabold text-clay">${treasure ? "扣稅三寶試算" : "薪俸稅"} · ${escapeHtml(record.job || "未填")}</p>
          <p class="text-sm text-ink/60">${when(record.createdAtIso)}</p>
        </div>
        <p class="text-3xl font-extrabold">${money(treasure ? record.taxAfter : record.tax)}</p>
      </div>
      <div class="mt-3 space-y-1 text-base">
        ${line("一年總收入", money(record.gross))}
        ${line("強積金", money(record.mpf))}
        ${line(parent ? "免稅額合計" : "免稅額", money(record.allowance))}
        ${parentLine(record)}
        ${line("用來計稅", money(record.chargeable))}
        ${line("原本稅款", money(record.tax))}
        ${treasure ? line("三寶後稅款", money(record.taxAfter)) : ""}
        ${treasure ? line("慳返", money(record.savedAmount)) : ""}
        ${treasure ? line("年金 / 醫保 / TVC", `${money(record.annuity)} / ${money(record.vhis)} / ${money(record.tvc)}`) : ""}
      </div>
      <button type="button" class="mt-3 h-12 rounded-2xl border border-line px-4 font-extrabold text-clay" data-delete="${escapeHtml(record.id)}">${confirm ? "確認刪除" : "刪除"}</button>
    </article>`;
}

async function show() {
  host.innerHTML = `<p class="font-extrabold">載入紀錄…</p>`;
  try {
    const records = await listTaxCalculations();
    host.innerHTML = records.length
      ? `<div class="grid gap-3">${records.map(card).join("")}</div>`
      : `<p class="rounded-3xl bg-white p-5 font-extrabold">未有儲存的計算。去計稅頁計一次就會自動存低。</p>`;
  } catch {
    host.innerHTML = `<p class="rounded-3xl bg-white p-5 font-extrabold text-clay">未能讀取紀錄。請稍後再試。</p>`;
  }
  host.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.delete;
      if (pendingDelete !== id) {
        pendingDelete = id;
        await show();
        return;
      }
      pendingDelete = "";
      try {
        await deleteTaxCalculation(id);
      } catch {
        host.insertAdjacentHTML("afterbegin", `<p class="mb-3 font-extrabold text-clay">刪除失敗。</p>`);
      }
      await show();
    });
  });
}

show();
