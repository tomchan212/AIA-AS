import {
  TAX_YEAR,
  calculateSalariesTax,
  estimateAnnualMpf,
  estimateEmployeeMpf,
  incomeFromMonthly,
} from "./calc.js";

const JOBS = ["文職", "IT", "零售", "飲食", "教育", "銷售", "醫療", "建造", "Freelance", "其他"];
const app = document.getElementById("app");
const explain = document.getElementById("explain");

const state = {
  step: 0,
  job: "文職",
  jobOther: "",
  mode: "monthly",
  monthly: "",
  payMonths: 12,
  bonus: "",
  annual: "",
  error: "",
  explainId: "",
};

const EXPLAIN = {
  start: {
    title: "呢頁係做咩？",
    paragraphs: [
      "香港打工，賺到一定程度就要交薪俸稅。即係將你一年賺到嘅錢，交一截畀政府。",
      "未交過完全冇問題。你只要話我知賺幾多，我當你單身、冇仔女、冇供養爸媽，再自動扣強積金，計一個大概數。",
      "真正幾多，以稅務局張單為準。呢度係幫你心中有個譜，唔使被張單嚇親。",
    ],
  },
  year: {
    title: "點解係 4月 到 3月？",
    paragraphs: [
      "政府計稅唔係跟日曆 1月到 12月。佢由每年 4月1日 計到下一年 3月31日，當係一個稅年。",
      "好似學校學期，唔係元旦截止。而家要計嘅，係 2026年4月1日 至 2027年3月31日入袋嘅錢。",
    ],
  },
  job: {
    title: "做咩工有冇影響？",
    paragraphs: [
      "冇。問你做邊行，只係想好似朋友咁問句「你做咩㗎」，頁面親切啲。",
      "計稅只睇你賺幾多，唔睇你個職銜。",
    ],
  },
  mode: {
    title: "月薪定全年總數？",
    paragraphs: [
      "兩種講法，揀你覺得易講嘅。",
      "每個月出糧，就話我知一個月幾多、一年出幾多個月。有雙糧就當 13 個月。",
      "如果你份工唔穩定、做 freelance，或者你自己已經加好晒，就直接打全年總數。",
    ],
  },
  monthly: {
    title: "每個月袋幾多？",
    paragraphs: [
      "填未扣強積金之前，糧單上面「人工」嗰個數。例如每月二萬，就打 20000。",
      "唔好自己先減強積金，部機後面會減。",
    ],
  },
  months: {
    title: "一年出幾多個月？",
    paragraphs: [
      "多數人一年出 12 個月糧。",
      "年尾多一個月人工，即係雙糧，就填 13。有更多花紅先填 14 或者再多。",
    ],
  },
  bonus: {
    title: "花紅佣金放邊？",
    paragraphs: [
      "如果花紅未計入「每個月幾多」入面，就寫喺度。冇就留 0 或者留空。",
      "佣金、一次性獎金都當呢度。",
    ],
  },
  annual: {
    title: "全年總數包咩？",
    paragraphs: [
      "由 2026年4月1日 到 2027年3月31日，人工、雙糧、花紅、佣金全部加埋。",
      "唔使自己扣強積金。我當你分 12 個月出，再自動扣。",
    ],
  },
  gross: {
    title: "一年總共賺咗幾多",
    paragraphs: [
      "呢個係你個稅年入袋嘅全部錢，未扣強積金，亦未扣稅。",
      "可以當成：糧單加花紅，未俾任何人抽水之前嘅總和。",
    ],
  },
  mpf: {
    title: "強積金係咩？",
    paragraphs: [
      "強積金即係強迫儲蓄，幫你退休。打工仔每個月將人工嘅 5% 放進個戶口，但一個月最多 $1,500，一年計稅最多當 $18,000。",
      "一個月人工低過 $7,100，通常你自己唔使供。",
      "政府當呢筆錢未係你自由花用，所以計稅前先扣走。好似收咗 $100 紅包，其中 $5 即刻放進豬兜，稅局只會就剩低嘅錢計。",
      "花紅會加落出糧嗰一個月，但嗰個月一樣最多扣 $1,500。呢個係估算，真實供款以你強積金單為準。",
    ],
  },
  allowance: {
    title: "免稅額係咩？",
    paragraphs: [
      "免稅額即係政府話：頭一截錢當你用嚟生活，唔收稅。未過呢條線，稅係 $0。",
      "你而家單身、冇仔女、冇供養爸媽，呢個稅年每個人有 $145,000。",
      "好多人記得 $132,000。嗰個係舊稅年嘅數。由 2026年4月開始，政府將呢份「免費額」提高到 $145,000。",
    ],
  },
  chargeable: {
    title: "用來計稅嘅錢",
    paragraphs: [
      "算法好直白：一年賺到嘅，減走強積金，再減走 $145,000。剩低嗰截先拿去計稅。",
      "如果減完係 0，代表你未踏入要交稅嘅範圍。",
      "稅務局叫呢截做應課稅入息實額。你記住「扣完免稅額剩低幾多」就得。",
    ],
  },
  bands: {
    title: "點解唔係成筆都同一個百分比？",
    paragraphs: [
      "政府唔係成筆錢收同一個百分比。頭 $50,000 只收 2%，跟住每一截 $50,000 慢慢加到 6%、10%、14%，剩低先收到 17%。",
      "好似搭的士：起步平，越遠越貴，但頭嗰截永遠都係平價，唔會倒回頭加價。",
      "稅務局叫呢個做累進稅率。",
    ],
  },
  method: {
    title: "點解有時唔用一截截計？",
    paragraphs: [
      "如果賺得非常多，一截截計可能貴過另一個計法：未減 $145,000 之前，直接大約收 15%。政府會自動揀平啲嗰個。",
      "頭 $500 萬用 15%，再多嘅部分先用 16%。多數人工未去到呢一層。",
      "你唔使自己比較，部機已經幫你揀平嘅。",
    ],
  },
  tax: {
    title: "最後要交幾多？",
    paragraphs: [
      "呢個係你 2026/27 呢個稅年，大約真正要交嘅稅。",
      "我當你單身，未計供養爸媽、仔女、自願醫保或者年金。如果你有呢啲，真實稅單可能更少。",
      "政府舊一個稅年（2025/26）有一次過減稅，最多減 $3,000。呢個稅年未有公布同一樣嘅減稅，所以呢度冇減。",
      "真正幾多，以稅務局張單為準。",
    ],
  },
  instalments: {
    title: "分幾多期？幾時交？",
    paragraphs: [
      "香港通常唔使每月扣稅。稅年 2027年3月31日完結之後，大概 5月先收到報稅表，稅單再遲幾個月。",
      "張單多數分兩期。第一期大約 2028年1月：交今年真正要交嘅稅，再加下一年預繳嘅 75%。第二期大約 2028年4月：交剩低 25% 預繳。",
      "預繳即係政府叫你先交明年大概咁多，等你明年唔使一次過拿一大筆出嚟。稅單上面可能寫「暫繳稅」，意思就係預繳。",
      "如果你以前未交過稅，張單個總數會睇落大過「今年真正要交」大約一倍。其中一半係預繳，明年會計返畀你扣。日期以張單為準。",
    ],
  },
};

function money(value) {
  return `$${Math.round(Number(value) || 0).toLocaleString("en-HK")}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function jobLabel() {
  if (state.job === "其他" && state.jobOther.trim()) return state.jobOther.trim();
  return state.job || "你";
}

function explainButton(id, hint = "") {
  const label = hint ? `💡 咩黎架？${hint}` : "💡 咩黎架？（詳細白話文解釋）";
  return `<button type="button" class="mt-2 block text-left text-base font-extrabold text-clay underline decoration-2 underline-offset-4" data-explain="${id}">${label}</button>`;
}

function shell(inner) {
  const labels = ["做邊行", "點出糧", "賺幾多", "交幾多"];
  const progress = state.step === 0
    ? ""
    : `<ol class="mb-4 grid grid-cols-4 gap-2">${labels.map((label, index) => {
        const current = index + 1 === state.step;
        const done = index + 1 < state.step;
        return `<li class="rounded-2xl px-1 py-2 text-center text-sm font-extrabold ${current ? "bg-clay text-white" : done ? "bg-white text-leaf" : "bg-white/70 text-ink/45"}">${label}</li>`;
      }).join("")}</ol>`;
  app.innerHTML = `${progress}<section class="rounded-3xl bg-white p-5 shadow-card">${inner}</section>`;
  app.querySelectorAll("[data-explain]").forEach((button) => {
    button.addEventListener("click", () => openExplain(button.dataset.explain));
  });
}

function renderWelcome() {
  shell(`
    <p class="text-base font-extrabold text-clay">未交過稅？冇事。</p>
    <h2 class="mt-1 text-3xl font-extrabold leading-tight">我一步步話你知，你大概要交幾多畀政府。</h2>
    <p class="mt-3">而家計緊 ${escapeHtml(TAX_YEAR.from.slice(0, 4))}年4月1日 至 ${escapeHtml(TAX_YEAR.to.slice(0, 4))}年3月31日。我當你單身，冇仔女，強積金自動扣。</p>
    ${explainButton("start")}
    ${explainButton("year")}
    <button type="button" id="start" class="mt-6 h-14 w-full rounded-2xl bg-clay text-xl font-extrabold text-white">開始計</button>
  `);
  app.querySelector("#start").addEventListener("click", () => {
    state.step = 1;
    render();
  });
}

function renderJob() {
  shell(`
    <h2 class="text-3xl font-extrabold leading-tight">你做邊行㗎？</h2>
    <p class="mt-2">揀一個就得，純粹想親切啲。計稅唔會用到。</p>
    ${explainButton("job")}
    <div class="mt-4 grid grid-cols-2 gap-3">
      ${JOBS.map((job) => `<button type="button" class="h-14 rounded-2xl border-2 text-lg font-extrabold ${state.job === job ? "border-clay bg-clay text-white" : "border-line bg-paper"}" data-job="${escapeHtml(job)}">${escapeHtml(job)}</button>`).join("")}
    </div>
    ${state.job === "其他" ? `<label class="mt-4 block font-extrabold">想寫得具體啲？<input id="job-other" class="mt-2 h-14 w-full rounded-2xl border-2 border-line bg-paper px-4 text-xl font-bold" maxlength="20" value="${escapeHtml(state.jobOther)}" placeholder="例如：設計師"></label>` : ""}
    <div class="mt-5 grid grid-cols-2 gap-3">
      <button type="button" id="back" class="h-14 rounded-2xl border-2 border-line font-extrabold">返轉頭</button>
      <button type="button" id="next" class="h-14 rounded-2xl bg-clay font-extrabold text-white">下一步</button>
    </div>
  `);
  app.querySelectorAll("[data-job]").forEach((button) => {
    button.addEventListener("click", () => {
      state.job = button.dataset.job;
      render();
    });
  });
  app.querySelector("#job-other")?.addEventListener("input", (event) => {
    state.jobOther = event.target.value;
  });
  app.querySelector("#back").addEventListener("click", () => {
    state.step = 0;
    render();
  });
  app.querySelector("#next").addEventListener("click", () => {
    state.step = 2;
    render();
  });
}

function renderMode() {
  const card = (mode, title, detail) => `
    <button type="button" data-mode="${mode}" class="rounded-3xl border-2 p-4 text-left ${state.mode === mode ? "border-clay bg-[#fff8f3]" : "border-line bg-paper"}">
      <span class="block text-xl font-extrabold">${title}</span>
      <span class="mt-1 block text-base">${detail}</span>
    </button>`;
  shell(`
    <h2 class="text-3xl font-extrabold leading-tight">你想點話我知賺幾多？</h2>
    <p class="mt-2">計緊 2026年4月1日 至 2027年3月31日入袋嘅錢。</p>
    ${explainButton("mode")}
    <div class="mt-4 grid gap-3">
      ${card("monthly", "我每個月出糧", "話我知一個月幾多，同埋一年出幾多個月。")}
      ${card("annual", "我知道全年總數", "直接打全包宴總共幾多錢。")}
    </div>
    <div class="mt-5 grid grid-cols-2 gap-3">
      <button type="button" id="back" class="h-14 rounded-2xl border-2 border-line font-extrabold">返轉頭</button>
      <button type="button" id="next" class="h-14 rounded-2xl bg-clay font-extrabold text-white">下一步</button>
    </div>
  `);
  app.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      state.error = "";
      render();
    });
  });
  app.querySelector("#back").addEventListener("click", () => {
    state.step = 1;
    render();
  });
  app.querySelector("#next").addEventListener("click", () => {
    state.step = 3;
    state.error = "";
    render();
  });
}

function moneyField(id, label, value, explainId, placeholder) {
  return `
    <label class="mt-4 block font-extrabold" for="${id}">${label}
      <span class="mt-2 flex h-16 items-center rounded-2xl border-2 border-line bg-paper px-4">
        <span class="text-2xl font-extrabold text-ink/50">$</span>
        <input id="${id}" inputmode="decimal" autocomplete="off" class="h-full w-full bg-transparent px-2 text-2xl font-extrabold outline-none" value="${escapeHtml(value)}" placeholder="${placeholder}">
      </span>
    </label>
    ${explainButton(explainId)}`;
}

function renderAmount() {
  const fields = state.mode === "monthly"
    ? `
      ${moneyField("monthly", "每個月未扣強積金，袋幾多？", state.monthly, "monthly", "20000")}
      <div class="mt-4">
        <p class="font-extrabold">一年出幾多個月糧？</p>
        <div class="mt-2 grid grid-cols-[3.5rem_1fr_3.5rem] items-center gap-3">
          <button type="button" id="months-down" class="h-14 rounded-2xl border-2 border-line text-2xl font-extrabold" aria-label="減少一個月">−</button>
          <p class="text-center text-3xl font-extrabold">${state.payMonths} 個月</p>
          <button type="button" id="months-up" class="h-14 rounded-2xl border-2 border-line text-2xl font-extrabold" aria-label="增加一個月">+</button>
        </div>
        <p class="mt-1 text-base text-ink/70">有雙糧就調到 13。</p>
        ${explainButton("months")}
      </div>
      ${moneyField("bonus", "仲有冇一次過花紅或佣金？冇就留空。", state.bonus, "bonus", "0")}`
    : moneyField("annual", "全包宴總共賺咗幾多？", state.annual, "annual", "240000");
  shell(`
    <h2 class="text-3xl font-extrabold leading-tight">${state.mode === "monthly" ? "每個月袋幾多？" : "全年總共袋幾多？"}</h2>
    <p class="mt-2">${escapeHtml(jobLabel())}，我哋計 2026年4月 至 2027年3月。</p>
    ${fields}
    ${state.error ? `<p class="mt-3 font-extrabold text-clay" role="alert">${escapeHtml(state.error)}</p>` : ""}
    <div class="mt-5 grid grid-cols-2 gap-3">
      <button type="button" id="back" class="h-14 rounded-2xl border-2 border-line font-extrabold">返轉頭</button>
      <button type="button" id="calc" class="h-14 rounded-2xl bg-clay font-extrabold text-white">計畀我睇</button>
    </div>
  `);
  const bindMoney = (id, key) => {
    app.querySelector(`#${id}`)?.addEventListener("input", (event) => {
      const clean = event.target.value.replace(/[^\d.]/g, "");
      state[key] = clean;
      event.target.value = clean;
    });
  };
  bindMoney("monthly", "monthly");
  bindMoney("bonus", "bonus");
  bindMoney("annual", "annual");
  app.querySelector("#months-down")?.addEventListener("click", () => {
    state.payMonths = Math.max(1, state.payMonths - 1);
    render();
  });
  app.querySelector("#months-up")?.addEventListener("click", () => {
    state.payMonths = Math.min(18, state.payMonths + 1);
    render();
  });
  app.querySelector("#back").addEventListener("click", () => {
    state.step = 2;
    state.error = "";
    render();
  });
  app.querySelector("#calc").addEventListener("click", () => {
    const ready = currentIncome();
    if (!ready.ok) {
      state.error = ready.message;
      render();
      return;
    }
    state.error = "";
    state.step = 4;
    render();
  });
}

function currentIncome() {
  if (state.mode === "annual") {
    const total = Number(state.annual);
    if (!total) return { ok: false, message: "打全年總數先，例如 240000。" };
    return { ok: true, gross: total, mpf: estimateAnnualMpf(total) };
  }
  const monthly = Number(state.monthly);
  if (!monthly) return { ok: false, message: "打每個月幾多先，例如 20000。" };
  const bonus = Number(state.bonus) || 0;
  return {
    ok: true,
    gross: incomeFromMonthly({ monthly, payMonths: state.payMonths, bonus }),
    mpf: estimateEmployeeMpf({ monthly, payMonths: state.payMonths, bonus }),
  };
}

function bandBlock(bill) {
  if (!bill.chargeable) {
    return `<p class="mt-3">你未踏入要交稅嘅範圍，所以冇稅率分佈。</p>${explainButton("bands")}`;
  }
  if (bill.method === "standard") {
    return `
      <p class="mt-3">你賺得比較多，一刀切計法平過一截截加。</p>
      <p class="mt-2 text-2xl font-extrabold">${money(bill.standard.tax)}</p>
      <p>一截截計會係 ${money(bill.progressive.tax)}，所以用平啲嗰個。</p>
      ${explainButton("method")}`;
  }
  const slices = bill.progressive.slices.filter((slice) => slice.amount > 0);
  const colors = ["#f3d7b0", "#e7b48a", "#d98a55", "#c4622d", "#8c3d22"];
  const total = slices.reduce((sum, slice) => sum + slice.amount, 0) || 1;
  return `
    <div class="mt-3 flex h-4 overflow-hidden rounded-full">${slices.map((slice, index) => `<span style="width:${(slice.amount / total) * 100}%;background:${colors[index]}"></span>`).join("")}</div>
    <ul class="mt-3 space-y-2">
      ${slices.map((slice) => `<li class="flex items-start justify-between gap-3"><span>${escapeHtml(slice.plain)}</span><span class="font-extrabold">${money(slice.tax)}</span></li>`).join("")}
    </ul>
    <p class="mt-3">一刀切 15% 會係 ${money(bill.standard.tax)}，貴過而家呢個計法，所以用一截截。</p>
    ${explainButton("bands", "一截截點計")}
    ${explainButton("method", "點解唔用 15%")}`;
}

function renderResult() {
  const income = currentIncome();
  const bill = calculateSalariesTax(income);
  const zero = bill.tax === 0;
  shell(`
    <p class="text-base font-extrabold text-clay">${escapeHtml(jobLabel())}，計好了。</p>
    <h2 class="mt-1 text-xl font-extrabold">${zero ? "你今年未使交稅。" : "你今年大約要交"}</h2>
    <p class="mt-2 text-5xl font-extrabold tracking-tight ${zero ? "text-leaf" : ""}">${money(bill.tax)}</p>
    <p class="mt-2">${zero ? "扣完強積金都未過免稅額，政府呢年唔收你錢。" : "呢個係今年真正要交嘅稅，未計預繳下一年。"}</p>
    ${explainButton("tax")}
    <div class="mt-5 space-y-3 rounded-3xl bg-paper p-4">
      <div>
        <p class="text-base text-ink/70">你一年總共賺咗</p>
        <p class="text-2xl font-extrabold">${money(bill.gross)}</p>
        ${explainButton("gross")}
      </div>
      <div>
        <p class="text-base text-ink/70">強積金已自動扣咗</p>
        <p class="text-2xl font-extrabold">− ${money(bill.mpf)}</p>
        ${explainButton("mpf")}
      </div>
      <div>
        <p class="text-base text-ink/70">政府送畀你嘅免稅額</p>
        <p class="text-2xl font-extrabold">− ${money(bill.basicAllowance)}</p>
        <p class="text-base">賺唔夠呢條線，通常唔使交。舊年係 ${money(TAX_YEAR.rememberedAllowance)}，呢個稅年係 ${money(TAX_YEAR.basicAllowance)}。</p>
        ${explainButton("allowance")}
      </div>
      <div>
        <p class="text-base text-ink/70">扣完之後用來計稅嘅錢</p>
        <p class="text-2xl font-extrabold">${money(bill.chargeable)}</p>
        ${explainButton("chargeable")}
      </div>
    </div>
    <div class="mt-4">
      <h3 class="text-xl font-extrabold">${bill.chargeable && bill.method === "standard" ? "點解用一刀切？" : "稅率點樣一截截加"}</h3>
      ${bandBlock(bill)}
    </div>
    <div class="mt-4 rounded-3xl bg-paper p-4">
      <h3 class="text-xl font-extrabold">${zero ? "幾時要交？" : "分兩期交"}</h3>
      ${zero
        ? `<p class="mt-2">未使交，所以都未使諗分幾期。你仍可能收到報稅表，填完計出嚟都係 $0。</p>`
        : `<p class="mt-2">預繳下一年，估算同今年一樣：${money(bill.provisional)}。張單睇落大約 ${money(bill.totalDemand)}，其中一半係預繳，明年會扣返。</p>
           <p class="mt-3 font-extrabold">第一期，${escapeHtml(bill.firstDue)}</p>
           <p class="text-2xl font-extrabold">${money(bill.firstInstalment)}</p>
           <p>今年嘅稅 ${money(bill.tax)} ＋ 預繳嘅 75% ${money(bill.firstInstalment - bill.tax)}</p>
           <p class="mt-3 font-extrabold">第二期，${escapeHtml(bill.secondDue)}</p>
           <p class="text-2xl font-extrabold">${money(bill.secondInstalment)}</p>
           <p>剩低 25% 預繳。</p>`}
      ${explainButton("instalments")}
    </div>
    <button type="button" id="again" class="mt-5 h-14 w-full rounded-2xl border-2 border-line font-extrabold">再計過</button>
  `);
  app.querySelector("#again").addEventListener("click", () => {
    state.step = 3;
    render();
  });
}

function render() {
  if (state.step === 0) renderWelcome();
  else if (state.step === 1) renderJob();
  else if (state.step === 2) renderMode();
  else if (state.step === 3) renderAmount();
  else renderResult();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openExplain(id) {
  const copy = EXPLAIN[id];
  if (!copy) return;
  state.explainId = id;
  document.getElementById("explain-title").textContent = copy.title;
  const body = document.getElementById("explain-body");
  body.replaceChildren();
  for (const paragraph of copy.paragraphs) {
    const p = document.createElement("p");
    p.textContent = paragraph;
    body.appendChild(p);
  }
  explain.hidden = false;
  explain.classList.remove("hidden");
  explain.classList.add("flex");
  document.getElementById("explain-close").focus();
}

function closeExplain() {
  state.explainId = "";
  explain.hidden = true;
  explain.classList.add("hidden");
  explain.classList.remove("flex");
}

document.getElementById("explain-close").addEventListener("click", closeExplain);
explain.addEventListener("click", (event) => {
  if (event.target === explain) closeExplain();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeExplain();
});

render();
