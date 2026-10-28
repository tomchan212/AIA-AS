import { useMemo, useState } from "react";
import { BadgeCheck, Sparkles } from "lucide-react";
import { BurdenChart, WealthChart } from "./components/Charts";
import { MILESTONES, USD_HKD, WITHDRAWAL_BANDS, withdrawalSum } from "./data";
import { hkdMoney, money } from "./format";
import { diagnose, medicalCovered, rowAtAge, type QuizChoice } from "./model";

const POWERS = [
  { title: "9 種貨幣", body: "產品簡介列明可選人民幣、英鎊、美元、澳元、加元、港元、澳門幣（只適用於澳門繕發）、歐元及新加坡元。由第 2 個保單年度終結後起，每個保單年度終結後 30 日內可申請轉換。轉換後價值按新貨幣重算。" },
  { title: "保單分拆", body: "由第 3 個保單年度終結後，或供款期完結後（以較後者為準），可申請把部分價值分到另一張保單。要公司核准。" },
  { title: "紅利鎖定與解鎖", body: "由第 15 個保單年度終結後起，每個年度終結後 30 日內可鎖定一次。轉移的復歸紅利及終期分紅百分比須相同，不可低於 10% 或高於 70%。鎖定戶口利息並非保證。鎖定滿 1 年後可解鎖，比例 10% 至 100%。" },
  { title: "精神上無行為能力", body: "由第 3 個保單年度終結後起，可預先指定一名 18 歲或以上的家庭成員，以及保單價值的 10% 至 100%。每份保單只支付一次，要公司批准，支付會減少保單價值。" },
  { title: "延繳保費", body: "只適用於 3 年、5 年及 10 年供款期，所以對應方案 B 這張 10 年供款的保單。指定情況包括被裁退、結婚、離婚、子女出生或領養、買入新住宅，或更改主要居住地。每份保單只可申請一次，寬限期最多 365 日。" },
  { title: "更換受保人", body: "由第 1 個保單年度終結後起，可在受保人在生時申請無限次更改受保人，亦可指定第二受保人。卓越成績獎最高一項是獲全球大學排名首 10 位取錄，獎金 2,800 美元。同一受保人的所有盈御 3 保單只支付一次。" },
];

const QUESTIONS: { prompt: string; a: string; b: string }[] = [
  { prompt: "你想怎樣完成儲蓄供款？", a: "每年 3,000 美元，第一張供完再接第二張", b: "每年 5,000 美元，一張單供 10 年就停" },
  { prompt: "60 歲後你想怎樣處理這筆錢？", a: "留在戶口繼續滾，不提取", b: "按對照表每年提取一筆" },
  { prompt: "你更在意哪一個結果？", a: "100 歲時兩張單合計現金價值較高", b: "供款較少，同時 60 歲後有提取金額" },
];

function Avatar() {
  return (
    <svg viewBox="0 0 120 120" className="h-24 w-24" role="img" aria-label="Mandy 的手繪頭像">
      <circle cx="60" cy="62" r="40" fill="#FFE4C4" stroke="#1E293B" strokeWidth="3" />
      <path d="M28 58c2-24 18-38 32-38s30 14 32 38" fill="#1E293B" />
      <circle cx="46" cy="66" r="4" fill="#1E293B" />
      <circle cx="74" cy="66" r="4" fill="#1E293B" />
      <path d="M50 80c6 8 14 8 20 0" fill="none" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      <circle cx="38" cy="76" r="6" fill="#FB7185" opacity="0.85" />
      <circle cx="82" cy="76" r="6" fill="#FB7185" opacity="0.85" />
    </svg>
  );
}

export default function App() {
  const [currency, setCurrency] = useState<"USD" | "HKD">("USD");
  const [age, setAge] = useState(47);
  const [power, setPower] = useState(0);
  const [answers, setAnswers] = useState<(QuizChoice | null)[]>([null, null, null]);
  const selected = useMemo(() => rowAtAge(age), [age]);
  const row = selected.row;
  const result = answers.every(Boolean) ? diagnose(answers as QuizChoice[]) : null;
  const cover = medicalCovered(row.age, row.avfMedicalRiderHKD);
  const bandTotal = withdrawalSum();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <header className="doodle-card flex flex-col gap-4 p-5 md:flex-row md:items-center md:p-7">
        <Avatar />
        <div className="min-w-0 flex-1">
          <p className="inline-block -rotate-1 rounded-full border-2 border-ink bg-blush px-3 py-1 text-sm font-bold text-white">CHAN MANDY · 2019 年 37 歲投保</p>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight md:text-4xl">方案 A（兩張單接力，每年 3,000 美元）對方案 B（一張單每年 5,000 美元，60 歲起提取）</h1>
          <p className="mt-2 text-sm leading-6 text-ink/80">1982 年出生。匯率按對照表使用 1 美元 = {USD_HKD} 港元。現金價值含非保證部分，不是保證回報，也不是要約。</p>
          <div className="mt-3 flex gap-2" role="group" aria-label="切換幣別">
            {(["USD", "HKD"] as const).map((item) => (
              <button key={item} type="button" className="doodle-btn" aria-pressed={currency === item} onClick={() => setCurrency(item)}>{item === "USD" ? "美元" : "港元"}</button>
            ))}
          </div>
        </div>
      </header>

      <section className="mt-4 grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border-2 border-ink/80 bg-paper px-4 py-3">
          <p className="text-xs font-bold text-cocoa">方案 A 兩張單本金</p>
          <p className="mt-1 text-lg font-extrabold">{money(60000, currency)}</p>
          <p className="mt-1 text-xs leading-5 text-ink/70">每張 3,000 美元 × 10 年。2029 年那一行的累計仍是 30,000 美元，第二張單的 30,000 美元要到 2039 年才計入。</p>
        </article>
        <article className="rounded-2xl border-2 border-ink/80 bg-paper px-4 py-3">
          <p className="text-xs font-bold text-cocoa">方案 B 基本本金</p>
          <p className="mt-1 text-lg font-extrabold">{money(50000, currency)}</p>
          <p className="mt-1 text-xs leading-5 text-ink/70">5,000 美元 × 10 年。對照表另寫含保費徵費合計 52,500 美元，下面的本金比較用 50,000 美元。</p>
        </article>
        <article className="rounded-2xl border-2 border-ink/80 bg-paper px-4 py-3">
          <p className="text-xs font-bold text-cocoa">方案 B 四段提取加總</p>
          <p className="mt-1 text-lg font-extrabold">{money(bandTotal, currency)}</p>
          <p className="mt-1 text-xs leading-5 text-ink/70">60–63 歲 3,000、64–74 歲 5,000、75–82 歲 7,000、83–100 歲 9,000，共 {bandTotal.toLocaleString("zh-TW")} 美元。對照表在 100 歲寫 290,000 美元，多了 5,000 美元。</p>
        </article>
      </section>

      <section className="doodle-card mt-6 p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">拉到哪一年</h2>
            <p className="text-sm text-ink/70">{selected.snapped ? `所選 ${age} 歲沒有逐行數字，下面顯示不超過這個年齡的最近一筆：${row.calendarYear} 年、${row.age} 歲。` : `${row.calendarYear} 年，第 ${row.policyYear} 年，${row.age} 歲。`}</p>
          </div>
        </div>
        <label className="mt-4 block text-sm font-bold" htmlFor="age-slider">年齡 {age} 歲</label>
        <input id="age-slider" className="mt-2 w-full accent-rose-500" type="range" min={37} max={100} value={age} onChange={(event) => setAge(Number(event.target.value))} />
        <div className="mt-3 flex flex-wrap gap-2">
          {MILESTONES.map((item) => (
            <button key={item.age} type="button" className="doodle-btn" aria-pressed={age === item.age} onClick={() => setAge(item.age)}>
              {item.label}
              <span className="mt-1 block text-xs font-medium opacity-80">{item.hint}</span>
            </button>
          ))}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <article className="rounded-3xl border-2 border-ink/80 bg-amber-50 p-4">
            <h3 className="text-lg font-extrabold">方案 A · 兩張單</h3>
            {row.planA.approximate ? <p className="mt-2 inline-block rounded-full bg-blush px-3 py-1 text-xs font-bold text-white">這格現金價值是對照表的整數概算</p> : null}
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt>今年儲蓄保費</dt><dd className="font-bold">{money(row.planA.savingsPremiumUSD, currency)}</dd></div>
              <div className="flex justify-between gap-3"><dt>累計儲蓄本金</dt><dd className="font-bold">{money(row.planA.cumulativeSavingsUSD, currency)}</dd></div>
              <div className="flex justify-between gap-3"><dt>合計現金價值</dt><dd className="font-bold">{money(row.planA.combinedCashValueUSD, currency)}</dd></div>
              <div className="flex justify-between gap-3"><dt>AVF 普通房保費</dt><dd className="font-bold">{hkdMoney(row.avfMedicalRiderHKD, currency)}{row.avfApproximate ? "（概算）" : ""}</dd></div>
            </dl>
            <p className="mt-3 text-sm leading-6">{row.planA.note}</p>
          </article>
          <article className="rounded-3xl border-2 border-ink/80 bg-white p-4">
            <h3 className="text-lg font-extrabold">方案 B · 一張單</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt>今年儲蓄保費</dt><dd className="font-bold">{money(row.planB.savingsPremiumUSD, currency)}</dd></div>
              <div className="flex justify-between gap-3"><dt>累計基本本金</dt><dd className="font-bold">{money(row.planB.cumulativeSavingsUSD, currency)}</dd></div>
              <div className="flex justify-between gap-3"><dt>今年提取</dt><dd className="font-bold">{money(row.planB.annualWithdrawalUSD, currency)}</dd></div>
              <div className="flex justify-between gap-3"><dt>對照表累計提取</dt><dd className="font-bold">{money(row.planB.cumulativeWithdrawnUSD, currency)}</dd></div>
              <div className="flex justify-between gap-3"><dt>提取後剩餘</dt><dd className="font-bold">{money(row.planB.remainingCashValueUSD, currency)}</dd></div>
            </dl>
            <p className="mt-3 text-sm leading-6">{row.planB.medicalOffsetStatus}</p>
          </article>
        </div>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <WealthChart currency={currency} />
        <BurdenChart currency={currency} />
      </section>

      <section className="doodle-card mt-6 p-5">
        <h2 className="text-xl font-extrabold">方案 B 的四段提取</h2>
        <p className="mt-1 text-sm text-ink/70">下面用四段年期加總。它和 100 歲那一行寫的 290,000 美元不相等，所以兩處都保留，不把其中一個改成另一個。</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {WITHDRAWAL_BANDS.map((band) => {
            const years = band.toAge - band.fromAge + 1;
            const active = age >= band.fromAge && age <= band.toAge;
            return (
              <article key={band.label} className={`rounded-2xl border-2 p-3 ${active ? "border-blush bg-rose-50" : "border-ink/20"}`}>
                <p className="text-sm font-extrabold">{band.label}</p>
                <p className="mt-1 text-sm">每年 {money(band.annualUSD, currency)}</p>
                <p className="text-xs text-ink/70">{years} 年，小計 {money(years * band.annualUSD, currency)}</p>
              </article>
            );
          })}
        </div>
        {row.age >= 60 ? (
          <div className="mt-4 rounded-3xl border-2 border-dashed border-ink p-4 text-sm leading-6">
            <p>這筆對照年度的 AVF 普通房保費是 {hkdMoney(row.avfMedicalRiderHKD, currency)}。方案 B 當年提取是 {money(row.planB.annualWithdrawalUSD, currency)}，即 {hkdMoney(row.planB.annualWithdrawalUSD * USD_HKD, "HKD")}。</p>
            {cover.covered ? (
              <p className="mt-2 flex items-start gap-2 font-bold text-emerald-800"><BadgeCheck aria-hidden="true" />提取金額高於或等於這一年列出的醫保保費。</p>
            ) : (
              <p className="mt-2 font-bold text-rose-700">提取金額未蓋過這一年列出的醫保保費，還差 {hkdMoney(cover.gapHKD, "HKD")}。不是每一年都能用提取金額付清保費。</p>
            )}
          </div>
        ) : <p className="mt-4 text-sm">60 歲之前對照表沒有提取。</p>}
        <p className="mt-3 text-xs leading-5 text-ink/60">若按四段連續加，65 歲的累計是 22,000 美元（4×3,000 + 2×5,000），對照表寫 21,000 美元；75 歲按四段是 74,000 美元，對照表寫 78,000 美元。卡片上的累計提取沿用對照表，四段小計另行標明。</p>
      </section>

      <section className="doodle-card mt-6 p-5">
        <h2 className="text-xl font-extrabold">盈御 3 產品簡介上的六項安排</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {POWERS.map((item, index) => (
            <button key={item.title} type="button" className="doodle-btn" aria-pressed={power === index} onClick={() => setPower(index)}>{item.title}</button>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6">{POWERS[power].body}</p>
      </section>

      <section className="doodle-card mt-6 p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="text-blush" />
          <h2 className="text-xl font-extrabold">三題小測驗</h2>
        </div>
        <div className="mt-4 space-y-4">
          {QUESTIONS.map((question, index) => (
            <fieldset key={question.prompt}>
              <legend className="text-sm font-bold">{index + 1}. {question.prompt}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["A", "B"] as const).map((choice) => (
                  <button key={choice} type="button" className="doodle-btn" aria-pressed={answers[index] === choice} onClick={() => setAnswers((current) => current.map((item, itemIndex) => itemIndex === index ? choice : item))}>
                    {choice === "A" ? question.a : question.b}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        {result ? (
          <div className="mt-4 rounded-3xl border-2 border-dashed border-blush bg-rose-50 p-4">
            <p className="text-xs font-bold text-rose-700">{result.plan === "平手" ? "平手" : `較貼近方案 ${result.plan}`}</p>
            <h3 className="mt-1 text-lg font-extrabold">{result.title}</h3>
            <p className="mt-2 text-sm leading-6">{result.body}</p>
          </div>
        ) : null}
      </section>

      <section className="doodle-card mt-6 p-5 text-sm leading-6">
        <h2 className="text-xl font-extrabold">建議書對照</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>PlanA2.pdf：2019 年第一張單，每年 3,000 美元，10 年，第 10 年現金價值 31,542 美元。</li>
          <li>PlanA1.pdf：2029 年第二張單，每年 3,000 美元，10 年，第 10 年現金價值 31,542 美元。2039 年兩張合計 96,998 美元。</li>
          <li>PlanB.pdf：每年 5,000 美元，10 年，第 10 年現金價值 52,570 美元；60 歲後的提取與剩餘價值。</li>
          <li>avf-premium-insert-tc.pdf：AVF 普通房附加契約保費。已列明的有 7,044.80、7,311.20、10,689.60、12,763.20、14,425.60、25,001.60、43,409.60 港元。</li>
          <li>GlobalPowerMultiCurrencyPlan3 產品簡介：上面六項安排的條款範圍。</li>
        </ul>
        <p className="mt-3 text-xs leading-5 text-ink/60">這次重做時，這五份 PDF 沒有附在對話裡，所以頁面只用你貼上的對照表，沒有逐格重讀建議書。39 歲、65 歲、75 歲的醫保保費，以及 60 歲、65 歲的方案 A 現金價值，在表上是整數。沒有列出的年齡不會估算現金價值。提取金額未必每一年都高於 AVF 保費，100 歲的 9,000 美元約等於 70,200 港元，低於表上的 85,424.80 港元。</p>
      </section>
    </main>
  );
}
