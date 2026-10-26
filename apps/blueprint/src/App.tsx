import { useMemo, useState } from "react";
import { HeartPulse, PiggyBank, Sparkles, Timer, Trophy } from "lucide-react";
import { BurdenChart, WealthChart } from "./components/Charts";
import { MASTER_DATA, MILESTONES, SUMMARY_STATS } from "./data";
import { money, signedMoney } from "./format";
import { diagnose, leadText, viewAtAge, type QuizChoice } from "./model";

const POWERS = [
  { title: "9 種貨幣可換", body: "由第 2 個保單年度起，說明書列明每年可轉換一次貨幣，而且不用驗身。實際幣種以保單條款為準。" },
  { title: "一張保單可以分拆", body: "由第 3 年起可以把一張保單拆成多張，方便日後把價值分給不同的人。怎麼拆、拆多少，以當時條款為準。" },
  { title: "紅利鎖定與解鎖", body: "由第 15 年起，說明書寫明可把一部分非保證紅利鎖定，比例約 10% 至 70%，之後也可以解鎖。鎖定不等於保證增值。" },
  { title: "精神上無行為能力時的提取", body: "可預先指定一名 18 歲或以上的人，在指定情況下提取現金價值的 10% 至 100%。要符合保單上的定義和手續。" },
  { title: "保費寬限期可延長", body: "說明書提到結婚、子女出生或轉工時，寬限期可延長至 365 日。是否適用要看當時的申請條件。" },
  { title: "可更換受保人", body: "說明書寫明受保人可以更換，用來把保單交到下一代。另有最高 USD 2,800 的學業獎學金項目，要符合公布的條件。" },
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
  const badgeA = view.planA.netBenefit >= 0 ? "淨利益已是正數" : view.planA.surrenderValue > SUMMARY_STATS.planAPrincipal && view.age >= 57 ? "供款期已過" : undefined;
  const badgeB = view.age >= 47 && view.planB.surrenderValue >= SUMMARY_STATS.planBPrincipal ? "現金價值已超過儲蓄本金" : undefined;

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
        <Metric label="說明書上的累計支出（方案 A 至 100 歲）" value={money(SUMMARY_STATS.totalMedicalGross)} note="這是方案 A 到 100 歲的累計支出，裡面有儲蓄保費和醫保保費。" />
        <Metric label="說明書列出的醫療節省示意" value={money(SUMMARY_STATS.projectedMedicalSaved)} note={`扣掉後的淨醫療成本示意是 ${money(SUMMARY_STATS.netMedicalCost)}。`} />
        <Metric label="方案 B 在 100 歲的現金價值" value={money(MASTER_DATA[MASTER_DATA.length - 1].planB.surrenderValue)} note="方案 A 同期是較低的現金價值。兩者都含非保證部分。" />
      </section>

      <section className="doodle-card mt-6 p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">拉到 Mandy 幾歲</h2>
            <p className="text-sm text-ink/70">{view.estimated ? "這個年齡介乎兩個說明書年度之間，下面是直線估算。" : `說明書第 ${view.policyYear} 年，Mandy ${view.age} 歲。`}</p>
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
        <p className="mt-3 text-xs leading-5 text-ink/60">淨利益 = 退保現金價值 − 累計已付。第 10 年方案 B 的現金價值高過已繳儲蓄本金 HK$ 390,000，但連醫保在內的淨利益仍是負數，要到第 15 年才轉正。</p>
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
          <p className="mt-1 text-sm">方案 A {money(SUMMARY_STATS.planAPrincipal)}。方案 B {money(SUMMARY_STATS.planBPrincipal)}，本金少 {money(SUMMARY_STATS.principalDifference)}。</p>
        </article>
        <article className="doodle-card p-4">
          <HeartPulse className="text-blush" />
          <h3 className="mt-2 font-extrabold">什麼時候追平已付的錢</h3>
          <p className="mt-1 text-sm">方案 A 的淨利益在第 18 年轉正。方案 B 的現金價值在第 10 年已超過儲蓄本金，淨利益在第 15 年轉正。</p>
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

      <p className="mt-6 text-xs leading-5 text-ink/60">此頁用 Mandy Chan 37 歲的說明書年度表做對比。退保價值、紅利和醫療節省都可能與實際不同，並非保證，亦非銷售要約。中間年齡是相鄰年度的直線估算。</p>
    </main>
  );
}
