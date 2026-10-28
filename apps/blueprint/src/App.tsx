import { useEffect, useState, type ReactNode } from "react";
import {
  AfterCompareChart,
  CumulativeWithdrawalChart,
  MedicalChart,
  PaidChart,
  SavingsChart,
  SurrenderChart,
  WithdrawalChart,
  WithdrawalVersusMedicalChart,
  YEARS,
  type YearRow,
} from "./charts";

const STORY = 14;

function money(hkd: number) {
  const value = Math.round((hkd + Number.EPSILON) * 100) / 100;
  return `HK$ ${value.toLocaleString("en-HK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function at(age: number) {
  const row = YEARS.find((item) => item.age === age);
  if (!row) throw new Error(`missing age ${age}`);
  return row;
}

const TITLES = [
  "封面",
  "兩張與一張",
  "儲蓄保費",
  "醫療保費",
  "每年繳付",
  "提取節奏",
  "提取圖",
  "累計提取",
  "提取與醫療",
  "方案 A 退保",
  "方案 B 退保",
  "提取後對照",
  "100 歲",
  "說明",
  "每年數字",
];

function Avatar() {
  return (
    <svg viewBox="0 0 120 120" className="mx-auto h-24 w-24" role="img" aria-label="Mandy 的手繪頭像">
      <circle cx="60" cy="64" r="40" fill="#FFE4C4" stroke="#1E293B" strokeWidth="3" />
      <path d="M28 58c2-24 18-38 32-38s30 14 32 38" fill="#1E293B" />
      <circle cx="46" cy="66" r="4" fill="#1E293B" />
      <circle cx="74" cy="66" r="4" fill="#1E293B" />
      <path d="M50 80c6 8 14 8 20 0" fill="none" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      <circle cx="38" cy="76" r="6" fill="#FB7185" opacity="0.85" />
      <circle cx="82" cy="76" r="6" fill="#FB7185" opacity="0.85" />
    </svg>
  );
}

function Card({
  children,
  tone = "white",
  className = "",
}: {
  children: ReactNode;
  tone?: "white" | "pink" | "yellow";
  className?: string;
}) {
  const toneClass = tone === "pink" ? "bg-rose-100" : tone === "yellow" ? "bg-[#FDE047]" : "bg-white";
  return <article className={`rounded-3xl border-2 border-ink/80 p-4 shadow-doodle ${toneClass} ${className}`}>{children}</article>;
}

function SlideShell({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div>
      {children}
      <p className="mt-4 text-xs font-bold text-cocoa">
        說明數字，不是保證，也不是要約。港元 = 美元 × 7.85。
        {n <= STORY ? ` · ${n} / ${STORY}` : " · 附錄"}
      </p>
    </div>
  );
}

function Story() {
  const y47 = at(47);
  const y60 = at(60);
  const y85 = at(85);
  const y100 = at(100);
  const milestones = [47, 57, 60, 70, 80, 85, 100] as const;

  return [
    <SlideShell n={1}>
      <Avatar />
      <h1 className="mt-3 text-center text-2xl font-extrabold leading-tight md:text-4xl">盈御 3 與自願醫保說明</h1>
      <p className="mx-auto mt-3 max-w-2xl text-center text-lg leading-8">
        方案 A：兩張盈御 3，儲蓄保費每年 HK$ 24,000，供 20 年。
        <br />
        方案 B：一張盈御 3，儲蓄保費每年 HK$ 39,000，供 10 年。
        <br />
        兩邊都另加同一列醫療保費，並由 60 歲起按建議書的現金提取舉例領錢。
      </p>
      <p className="mx-auto mt-4 w-fit rounded-full border-2 border-ink bg-[#FDE047] px-4 py-2 text-sm font-bold shadow-doodle">
        2019 年 37 歲投保 · 表由 38 歲起算
      </p>
    </SlideShell>,
    <SlideShell n={2}>
      <h2 className="text-2xl font-extrabold md:text-3xl">方案 A 是兩張單，方案 B 是一張單</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Card>
          <h3 className="text-lg font-extrabold">方案 A2</h3>
          <p className="mt-2 leading-7">10 年繳。第 1 年是 38 歲。建議書基本保費每年 3,000 美元。</p>
        </Card>
        <Card tone="yellow">
          <h3 className="text-lg font-extrabold">方案 A1</h3>
          <p className="mt-2 leading-7">10 年繳。第 1 年是 48 歲。48 歲之前這張單還未開始。</p>
        </Card>
        <Card tone="pink">
          <h3 className="text-lg font-extrabold">方案 B</h3>
          <p className="mt-2 leading-7">10 年繳。第 1 年是 38 歲。建議書基本保費每年 5,000 美元。</p>
        </Card>
      </div>
      <p className="mt-4 leading-7">圖上的儲蓄保費用總表的港元整數：方案 A 每年 HK$ 24,000，方案 B 每年 HK$ 39,000。建議書按 7.85 計是 HK$ 23,550 和 HK$ 39,250。</p>
    </SlideShell>,
    <SlideShell n={3}>
      <h2 className="text-2xl font-extrabold md:text-3xl">每年儲蓄保費</h2>
      <p className="mt-1 text-sm font-bold text-cocoa">方案 A 供到 57 歲。方案 B 供到 47 歲。</p>
      <SavingsChart />
      <p className="mt-2 text-sm leading-6">儲蓄本金：方案 A HK$ 480,000，方案 B HK$ 390,000，相差 HK$ 90,000。這兩個數未計醫療。</p>
    </SlideShell>,
    <SlideShell n={4}>
      <h2 className="text-2xl font-extrabold md:text-3xl">醫療保費</h2>
      <p className="mt-1 text-sm font-bold text-cocoa">兩份總表同一列，由 38 歲繳到 100 歲。</p>
      <MedicalChart />
      <p className="mt-2 text-sm leading-6">38 歲 {money(at(38).medical)}。100 歲 {money(y100.medical)}。繳到 100 歲合計 {money(2343128.8)}。</p>
    </SlideShell>,
    <SlideShell n={5}>
      <h2 className="text-2xl font-extrabold md:text-3xl">每年一共要繳多少</h2>
      <p className="mt-1 text-sm font-bold text-cocoa">當年儲蓄保費加上當年醫療保費。</p>
      <PaidChart />
      <p className="mt-2 text-sm leading-6">累計已繳：47 歲方案 A {money(y47.aPaid)}、方案 B {money(y47.bPaid)}。60 歲 {money(y60.aPaid)} 與 {money(y60.bPaid)}。100 歲 {money(y100.aPaid)} 與 {money(y100.bPaid)}。</p>
    </SlideShell>,
    <SlideShell n={6}>
      <h2 className="text-2xl font-extrabold md:text-3xl">提取節奏</h2>
      <p className="mt-1 text-sm leading-7 text-cocoa">金額來自三份建議書的現金提取舉例。方案 A 是 A2 加 A1。</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Card>
          <h3 className="font-extrabold">A2 · 38 歲開始</h3>
          <p className="mt-2 text-sm leading-6">60–74 歲每年 HK$ 23,550。75–85 歲每年 HK$ 31,400。86–100 歲每年 HK$ 39,250。合計 HK$ 1,287,400。</p>
        </Card>
        <Card tone="yellow">
          <h3 className="font-extrabold">A1 · 48 歲開始</h3>
          <p className="mt-2 text-sm leading-6">65–74 歲每年 HK$ 15,700。75–85 歲每年 HK$ 23,550。86–100 歲每年 HK$ 31,400。合計 HK$ 887,050。</p>
        </Card>
        <Card tone="pink">
          <h3 className="font-extrabold">方案 B</h3>
          <p className="mt-2 text-sm leading-6">60–64 歲每年 HK$ 23,550。65–74 歲每年 HK$ 39,250。75–84 歲每年 HK$ 54,950。85–100 歲每年 HK$ 70,650。合計 HK$ 2,190,150。</p>
        </Card>
      </div>
      <p className="mt-3 text-sm leading-6">60 至 100 歲，兩邊每年提取相同，只有 85 歲不同：方案 A 是 HK$ 54,950，方案 B 是 HK$ 70,650。終身相差 HK$ 15,700。</p>
    </SlideShell>,
    <SlideShell n={7}>
      <h2 className="text-2xl font-extrabold md:text-3xl">每年提取多少</h2>
      <p className="mt-1 text-sm font-bold text-cocoa">A2 和 A1 是方案 A 的兩張單。方案 B 的線在 85 歲高過它們的合計。</p>
      <WithdrawalChart />
    </SlideShell>,
    <SlideShell n={8}>
      <h2 className="text-2xl font-extrabold md:text-3xl">累計提取</h2>
      <CumulativeWithdrawalChart />
      <p className="mt-2 text-sm leading-6">到 100 歲，方案 A 共提取 {money(y100.wdACum)}，方案 B 共提取 {money(y100.wdBCum)}。</p>
    </SlideShell>,
    <SlideShell n={9}>
      <h2 className="text-2xl font-extrabold md:text-3xl">當年提取和當年醫療</h2>
      <p className="mt-1 text-sm leading-6 text-cocoa">這是兩個數放在一起看。建議書沒有把醫療保費從提取金額裡扣掉。</p>
      <WithdrawalVersusMedicalChart />
      <p className="mt-2 text-sm leading-6">60 至 81 歲，兩邊的提取都不少於當年醫療。82、83、84 歲兩邊都少於醫療。85 歲只有方案 A 少於醫療。86 至 88 歲兩邊都蓋過。89 至 100 歲兩邊都少於醫療。100 歲相差 {money(y100.medical - y100.wdA)}。</p>
    </SlideShell>,
    <SlideShell n={10}>
      <h2 className="text-2xl font-extrabold md:text-3xl">方案 A 退保價值</h2>
      <p className="mt-1 text-sm font-bold text-cocoa">虛線是不提取。實線是按現金提取舉例領錢之後。48 歲起是兩張單相加。</p>
      <SurrenderChart plan="A" />
      <p className="mt-2 text-sm leading-6">100 歲不提取 {money(y100.surrANowd)}。提取後 {money(y100.surrAAfter)}。</p>
    </SlideShell>,
    <SlideShell n={11}>
      <h2 className="text-2xl font-extrabold md:text-3xl">方案 B 退保價值</h2>
      <p className="mt-1 text-sm font-bold text-cocoa">虛線是不提取。實線是提取之後。提取後的線就是總表的可退保現金價值。</p>
      <SurrenderChart plan="B" />
      <p className="mt-2 text-sm leading-6">100 歲不提取 {money(y100.surrBNowd)}。提取後 {money(y100.surrBAfter)}。</p>
    </SlideShell>,
    <SlideShell n={12}>
      <h2 className="text-2xl font-extrabold md:text-3xl">提取之後，兩邊還剩多少</h2>
      <AfterCompareChart />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-right text-sm">
          <thead>
            <tr className="text-left">
              {["年齡", "A 提取", "B 提取", "A 提取後退保", "B 提取後退保"].map((label) => (
                <th key={label} className="whitespace-nowrap px-2 py-1 text-right first:text-left">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {milestones.map((age) => {
              const row = at(age);
              return (
                <tr key={age} className="odd:bg-white even:bg-rose-50">
                  <th className="px-2 py-1 text-left">{age}</th>
                  <td className="px-2 py-1 tabular-nums">{money(row.wdA)}</td>
                  <td className="px-2 py-1 tabular-nums">{money(row.wdB)}</td>
                  <td className="px-2 py-1 font-extrabold tabular-nums">{money(row.surrAAfter)}</td>
                  <td className="px-2 py-1 font-extrabold tabular-nums">{money(row.surrBAfter)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SlideShell>,
    <SlideShell n={13}>
      <h2 className="text-2xl font-extrabold md:text-3xl">100 歲</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card>
          <h3 className="text-xl font-extrabold">方案 A</h3>
          <p className="mt-3 leading-7">不提取的退保價值 {money(y100.surrANowd)}。已提取 {money(y100.wdACum)}。提取後的退保價值 {money(y100.surrAAfter)}。連醫療已繳 {money(y100.aPaid)}。</p>
        </Card>
        <Card tone="yellow">
          <h3 className="text-xl font-extrabold">方案 B</h3>
          <p className="mt-3 leading-7">不提取的退保價值 {money(y100.surrBNowd)}。已提取 {money(y100.wdBCum)}。提取後的退保價值 {money(y100.surrBAfter)}。連醫療已繳 {money(y100.bPaid)}。</p>
        </Card>
      </div>
      <p className="mt-4 leading-7">退保價值少掉的幅度，大於已經領走的現金。領錢之後，往後的非保證金額也會少。47 歲兩邊的退保價值仍低於已繳保費。57 歲兩邊都高過已繳保費，那時還沒有開始提取。</p>
    </SlideShell>,
    <SlideShell n={14}>
      <h2 className="text-2xl font-extrabold md:text-3xl">怎樣讀這些數</h2>
      <ul className="mt-4 space-y-3 leading-7">
        <li>退保價值大部分是非保證的終期分紅。保證現金價值只是其中一小部分。</li>
        <li>提取先從可套現的復歸紅利及其終期分紅扣除。超出的部分會動用保證現金價值，並減少基本金額。提取後的數字已經反映這件事。</li>
        <li>建議書裡的提取金額和年期，實際可以跟日後派發的非保證利益不同。</li>
        <li>85 歲那一年，方案 A 提取 HK$ 54,950，方案 B 提取 HK$ 70,650。當年醫療是 {money(y85.medical)}。</li>
        <li>這不是免遺產認證的承諾，也不是買賣要約。</li>
      </ul>
    </SlideShell>,
    <SlideShell n={15}>
      <h2 className="text-2xl font-extrabold md:text-3xl">附錄 · 每一年</h2>
      <p className="mt-2 text-sm font-bold text-cocoa">38 歲是 2020 年。提取後的退保價值不要用不提取的數字減去提取金額來估算。</p>
      <YearTable />
    </SlideShell>,
  ];
}

function YearTable() {
  const headers = ["年齡", "年份", "醫療", "A儲蓄", "B儲蓄", "A累計已繳", "B累計已繳", "A2提取", "A1提取", "A提取", "B提取", "A不提取退保", "B不提取退保", "A提取後退保", "B提取後退保"];
  const cells = (row: YearRow) => [
    row.year,
    row.medical,
    row.aSavings,
    row.bSavings,
    row.aPaid,
    row.bPaid,
    row.wdA2,
    row.wdA1,
    row.wdA,
    row.wdB,
    row.surrANowd,
    row.surrBNowd,
    row.surrAAfter,
    row.surrBAfter,
  ];
  return (
    <div className="mt-4 max-h-[28rem] overflow-auto rounded-2xl border-2 border-ink/80">
      <table className="w-full min-w-[88rem] text-right text-sm">
        <thead className="sticky top-0 bg-[#FDE047]">
          <tr>
            {headers.map((label) => (
              <th key={label} className="whitespace-nowrap px-2 py-2 text-right first:text-left">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {YEARS.map((row) => (
            <tr key={row.age} className="odd:bg-white even:bg-rose-50">
              <th className="whitespace-nowrap px-2 py-1.5 text-left tabular-nums">{row.age}</th>
              {cells(row).map((value, index) => (
                <td key={headers[index + 1]} className="whitespace-nowrap px-2 py-1.5 tabular-nums">{index === 0 ? value : money(Number(value))}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function readStart() {
  const n = Number(location.hash.replace("#", ""));
  if (Number.isInteger(n) && n >= 1 && n <= TITLES.length) return n - 1;
  return 0;
}

export default function App() {
  const slides = Story();
  const [index, setIndex] = useState(readStart);
  const [touchX, setTouchX] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "PageDown") setIndex((value) => Math.min(TITLES.length - 1, value + 1));
      if (event.key === "ArrowLeft" || event.key === "PageUp") setIndex((value) => Math.max(0, value - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const next = `#${index + 1}`;
    if (location.hash !== next) history.replaceState(null, "", next);
  }, [index]);

  useEffect(() => {
    const sync = () => {
      const n = Number(location.hash.replace("#", ""));
      if (Number.isInteger(n) && n >= 1 && n <= TITLES.length) setIndex(n - 1);
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-cocoa">CHAN MANDY · 盈御多元貨幣計劃 3 及自願醫保</p>
          <p className="text-sm">儲蓄保費用總表的港元。提取和退保價值來自 Plan A2、Plan A1、Plan B，按 1 美元 = 7.85 港元。</p>
        </div>
        <a className="doodle-btn" href={`${import.meta.env.BASE_URL}mandy.pptx`} download>
          下載簡報
        </a>
      </header>
      <section
        className="doodle-card min-h-[32rem] p-5 md:p-8"
        aria-label={TITLES[index]}
        tabIndex={-1}
        onTouchStart={(event) => setTouchX(event.changedTouches[0]?.clientX ?? null)}
        onTouchEnd={(event) => {
          if (touchX == null) return;
          const dx = (event.changedTouches[0]?.clientX ?? touchX) - touchX;
          if (dx < -48) setIndex((value) => Math.min(TITLES.length - 1, value + 1));
          if (dx > 48) setIndex((value) => Math.max(0, value - 1));
          setTouchX(null);
        }}
      >
        {slides[index]}
      </section>
      <nav className="mt-4 flex flex-wrap items-center gap-2" aria-label="簡報頁面">
        <button type="button" className="doodle-btn" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0}>上一頁</button>
        <button type="button" className="doodle-btn" onClick={() => setIndex((value) => Math.min(TITLES.length - 1, value + 1))} disabled={index === TITLES.length - 1}>下一頁</button>
        <div className="flex flex-wrap gap-1">
          {TITLES.map((title, i) => (
            <button key={title} type="button" className="doodle-btn px-2 py-1 text-xs" aria-pressed={i === index} aria-label={title} onClick={() => setIndex(i)}>
              {i < STORY ? i + 1 : "附"}
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
