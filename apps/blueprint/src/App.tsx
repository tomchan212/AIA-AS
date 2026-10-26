import { useMemo, useState } from "react";
import { HeartPulse, PiggyBank, Sparkles, Timer, Trophy } from "lucide-react";
import { BurdenChart, WealthChart } from "./components/Charts";
import { MILESTONES, SUMMARY_STATS } from "./data";
import { money, signedMoney } from "./format";
import { diagnose, leadText, viewAtAge, type QuizChoice } from "./model";

const POWERS = [
  { title: "9 種貨幣可換", body: "產品簡介列明可選人民幣、英鎊、美元、澳元、加元、港元、澳門幣（只適用於澳門繕發）、歐元及新加坡元。貨幣轉換由第 2 個保單年度終結後起，每個保單年度終結後 30 日內可行使。轉換後價值會按新貨幣重算。" },
  { title: "保單可以分拆", body: "由第 3 個保單年度終結後，或供款期完結後（以較後者為準），可申請把部分保單價值分到另一張保單。分拆要公司核准。" },
  { title: "紅利鎖定與解鎖", body: "由第 15 個保單年度終結後起，每個年度終結後 30 日內可鎖定一次。轉移的復歸紅利及終期分紅百分比須相同，不可低於 10% 或高於 70%。鎖定戶口利息並非保證。行使鎖定 1 年後可以解鎖，解鎖百分比為 10% 至 100%。" },
  { title: "精神上無行為能力選項", body: "由第 3 個保單年度終結後起，可預先指定一名 18 歲或以上的家庭成員，以及保單價值的 10% 至 100%。每份保單只支付一次，而且要公司批准。支付會減少保單價值。" },
  { title: "延繳保費寬限期", body: "產品簡介寫明這項只適用於 3 年、5 年及 10 年供款期，所以對應這頁的方案 B，不適用於供 20 年的方案 A。指定情況包括被裁退、結婚、離婚、子女出生或領養、買入新住宅，或更改主要居住地。每份保單只可申請一次，寬限期最多延長至 365 日。" },
  { title: "可更換受保人", body: "由第 1 個保單年度終結後起，可在受保人在生時申請無限次更改受保人，亦可指定第二受保人。卓越成績獎最高一項是獲全球大學排名首 10 位取錄，獎金 2,800 美元；同一受保人的所有盈御 3 保單只支付一次。須符合當時規則。" },
];

const QUESTIONS: { prompt: string; a: string; b: string }[] = [
  { prompt: "你想用多少年卸下儲蓄供款？", a: "輕鬆分 20 年", b: "10 年集中供完" },
  { prompt: "前 10 年每年多留 HK$ 15,000，對你重不重要？", a: "很重要，想少付一點", b: "還好，每年約 HK$ 45,000 沒壓力" },
  { prompt: "你更在意哪一件事？", a: "收支平衡，同時有終身醫療說明", b: "少付本金，並看長線現金價值" },
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

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border-2 border-ink/80 bg-paper px-4 py-3">
      <p className="text-xs font-bold text-cocoa">{label}</p>
      <p className="mt-1 text-lg font-extrabold">{value}</p>
      <p className="mt-1 text-xs leading-5 text-ink/70">{note}</p>
    </div>
  );
}

function PlanColumn({ name, tone, plan, badge }: { name: string; tone: string; plan: { totalAnnualOutflow: number; cumulativeOutflow: number; surrenderValue: number; netBenefit: number }; badge?: string }) {
  return (
    <article className={`rounded-3xl border-2 border-ink/80 p-4 ${tone}`}>
      <h3 className="text-lg font-extrabold">{name}</h3>
      {badge ? <p className="mt-2 inline-block rounded-full bg-blush px-3 py-1 text-xs font-bold text-white">{badge}</p> : null}
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-3"><dt>今年要付</dt><dd className="font-bold">{money(plan.totalAnnualOutflow)}</dd></div>
        <div className="flex justify-between gap-3"><dt>累計已付</dt><dd className="font-bold">{money(plan.cumulativeOutflow)}</dd></div>
        <div className="flex justify-between gap-3"><dt>退保現金價值</dt><dd className="font-bold">{money(plan.surrenderValue)}</dd></div>
        <div className="flex justify-between gap-3"><dt>淨利益</dt><dd className="font-bold">{signedMoney(plan.netBenefit)}</dd></div>
      </dl>
    </article>
  );
}

export default function App() {
  const [age, setAge] = useState(47);
  const [openPower, setOpenPower] = useState(0);
  const [answers, setAnswers] = useState<(QuizChoice | null)[]>([null, null, null]);
  const view = useMemo(() => viewAtAge(age), [age]);
  const result = answers.every(Boolean) ? diagnose(answers as QuizChoice[]) : null;
  const badgeFor = (net: number, surrender: number, principal: number) => {
    if (net >= 0) return "淨利益已是正數";
    if (surrender >= principal) return "現金價值已超過儲蓄本金";
    return undefined;
  };
  const badgeA = badgeFor(view.planA.netBenefit, view.planA.surrenderValue, SUMMARY_STATS.planAPrincipal);
  const badgeB = badgeFor(view.planB.netBenefit, view.planB.surrenderValue, SUMMARY_STATS.planBPrincipal);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <header className="doodle-card flex flex-col gap-4 p-5 md:flex-row md:items-center md:p-7">
        <Avatar />
        <div className="min-w-0 flex-1">
          <p className="inline-block -rotate-1 rounded-full border-2 border-ink bg-blush px-3 py-1 text-sm font-bold text-white">Mandy Chan · 37歲說明</p>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight md:text-4xl">雙引擎說明：方案 A（20年長跑）對方案 B（10年衝刺）</h1>
          <p className="mt-2 text-sm leading-6 text-ink/80">同一份自願醫保保費，配上兩種儲蓄供款節奏。數字來自這份說明書的年度表，不是保證回報，也不是要約。</p>
        </div>
      </header>

      <section className="mt-4 grid gap-3 md:grid-cols-3">
        <Metric label="自願醫保保費合計（38歲至100歲）" value={money(SUMMARY_STATS.totalMedicalPremium)} note="兩份說明書的醫療保費欄加總。頁尾印成 HK$ 2,343,129，相差 0.2 元。" />
        <Metric label="說明書寫的可節省醫療保費" value={money(SUMMARY_STATS.illustratedMedicalSaved)} note="這兩個數直接印在說明書頁尾，此頁沒有另外推算節省方法。" />
        <Metric label="方案 B 在 100 歲的現金價值" value={money(SUMMARY_STATS.planBAge100Value)} note={`方案 A 同期是 ${money(SUMMARY_STATS.planAAge100Value)}。現金價值含非保證部分。`} />
      </section>

      <section className="doodle-card mt-6 p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">拉到 Mandy 幾歲</h2>
            <p className="text-sm text-ink/70">第 {view.policyYear} 年，Mandy {view.age} 歲。38 至 100 歲每一行都來自說明書，累計已付按每年保費加總。</p>
          </div>
          <p className="rounded-full border-2 border-dashed border-blush px-3 py-1 text-sm font-bold text-rose-700">{leadText(view)}</p>
        </div>
        <label className="mt-4 block text-sm font-bold" htmlFor="age-slider">年齡 {view.age} 歲</label>
        <input id="age-slider" className="mt-2 w-full accent-rose-500" type="range" min={38} max={100} value={age} onChange={(event) => setAge(Number(event.target.value))} />
        <div className="mt-3 flex flex-wrap gap-2">
          {MILESTONES.map((item) => (
            <button key={item.age} type="button" className="doodle-btn" aria-pressed={age === item.age} onClick={() => setAge(item.age)}>
              {item.label}
              <span className="mt-1 block text-xs font-medium opacity-80">{item.hint}</span>
            </button>
          ))}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <PlanColumn name="方案 A · 每年儲蓄 HK$ 24,000，供 20 年" tone="bg-amber-50" plan={view.planA} badge={badgeA} />
          <PlanColumn name="方案 B · 每年儲蓄 HK$ 39,000，供 10 年" tone="bg-white" plan={view.planB} badge={badgeB} />
        </div>
        <p className="mt-3 text-xs leading-5 text-ink/60">淨利益 = 可退保現金價值 − 累計已付（儲蓄保費加自願醫保保費）。方案 B 在第 10 年現金價值已高過儲蓄本金 HK$ 390,000，淨利益要到第 13 年（50 歲）才轉正。方案 A 的現金價值在第 17 年超過儲蓄本金，淨利益在第 18 年轉正。說明書在供款期之後的累積欄有幾行對不上每年保費，此頁改為自行累加。</p>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <WealthChart />
        <BurdenChart />
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-2">
        <article className="doodle-card p-4">
          <Timer className="text-cocoa" />
          <h3 className="mt-2 font-extrabold">每年要拿出多少</h3>
          <p className="mt-1 text-sm">方案 A 供款年大約 HK$ 30,000–38,000。方案 B 前 10 年大約 HK$ 45,000–48,000。</p>
        </article>
        <article className="doodle-card p-4">
          <PiggyBank className="text-cocoa" />
          <h3 className="mt-2 font-extrabold">儲蓄本金總共付多少</h3>
          <p className="mt-1 text-sm">方案 A {money(SUMMARY_STATS.planAPrincipal)}。方案 B {money(SUMMARY_STATS.planBPrincipal)}，本金少 {money(SUMMARY_STATS.planAPrincipal - SUMMARY_STATS.planBPrincipal)}。</p>
        </article>
        <article className="doodle-card p-4">
          <HeartPulse className="text-blush" />
          <h3 className="mt-2 font-extrabold">什麼時候追平已付的錢</h3>
          <p className="mt-1 text-sm">方案 A 在第 17 年現金價值超過儲蓄本金，淨利益在第 18 年轉正。方案 B 在第 10 年現金價值已超過儲蓄本金，淨利益在第 13 年轉正。</p>
        </article>
        <article className="doodle-card p-4">
          <Trophy className="text-cocoa" />
          <h3 className="mt-2 font-extrabold">100 歲的現金價值</h3>
          <p className="mt-1 text-sm">方案 A {money(6349323.35)}。方案 B {money(7942355.25)}，多 {money(SUMMARY_STATS.age100Difference)}。含非保證部分。</p>
        </article>
      </section>

      <section className="doodle-card mt-6 p-5">
        <h2 className="text-xl font-extrabold">盈御 3 說明書上的六項安排</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {POWERS.map((item, index) => (
            <button key={item.title} type="button" className="doodle-btn" aria-pressed={openPower === index} onClick={() => setOpenPower(index)}>{item.title}</button>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6">{POWERS[openPower].body}</p>
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
            <p className="text-xs font-bold uppercase tracking-wide text-rose-700">{result.plan === "平手" ? "平手" : `較貼近方案 ${result.plan}`}</p>
            <h3 className="mt-1 text-lg font-extrabold">{result.title}</h3>
            <p className="mt-2 text-sm leading-6">{result.body}</p>
          </div>
        ) : null}
      </section>

      <p className="mt-6 text-xs leading-5 text-ink/60">數字來自 Mandy Chan 37 歲的兩份年度表，以及《盈御多元貨幣儲蓄保險計劃 3》產品簡介。可退保現金價值包含非保證的復歸紅利和終期分紅，並非保證，亦非銷售要約。說明書最後三行把 98 至 100 歲的保單年度印成 65 至 67，與「38 歲為第 1 年」不符，此頁改按年齡顯示為第 61 至 63 年。匯率備註為 1 美元 = 7.85 港元。</p>
    </main>
  );
}
