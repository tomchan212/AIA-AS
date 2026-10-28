import { useEffect, useState, type ReactNode } from "react";
import yearsJson from "./years.json";

const STORY = 17;

type YearRow = {
  year: number;
  age: number;
  policyYear: number;
  medical: number;
  medicalCumulative: number;
  aSavings: number;
  aAnnual: number;
  aPaid: number;
  aSurrender: number;
  aWithdrawable: number | null;
  bSavings: number;
  bAnnual: number;
  bPaid: number;
  bSurrender: number;
};

const YEARS = yearsJson as YearRow[];

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
  "醫療保費",
  "兩筆保費",
  "方案 A",
  "方案 B",
  "首十年",
  "儲蓄本金",
  "已繳保費",
  "退保價值",
  "兩邊對照",
  "47 與 57 歲",
  "可供提取",
  "100 歲",
  "分拆",
  "鎖定與延繳",
  "更換受保人",
  "怎樣看",
  "每年數字",
];

function Avatar() {
  return (
    <svg viewBox="0 0 120 120" className="mx-auto h-28 w-28" role="img" aria-label="Mandy 的手繪頭像">
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
      <p className="mt-5 text-xs font-bold text-cocoa">
        說明數字，不是保證，也不是要約。
        {n <= STORY ? ` · ${n} / ${STORY}` : " · 附錄"}
      </p>
    </div>
  );
}

function Story() {
  const y38 = at(38);
  const y47 = at(47);
  const y57 = at(57);
  const y60 = at(60);
  const y70 = at(70);
  const y79 = at(79);
  const y100 = at(100);
  const medicalAges = [38, 47, 60, 70, 80, 100] as const;
  const paidAges = [60, 70, 80, 90, 100] as const;
  const compareAges = [47, 57, 60, 100] as const;

  return [
    <SlideShell n={1}>
      <Avatar />
      <h1 className="mt-4 text-center text-2xl font-extrabold leading-tight md:text-4xl">盈御 3 與自願醫保說明</h1>
      <p className="mx-auto mt-3 max-w-2xl text-center text-lg leading-8">
        CHAN MANDY：方案 A 每年儲蓄保費 HK$ 24,000，供 20 年。
        <br />
        方案 B 每年儲蓄保費 HK$ 39,000，供 10 年。兩邊都另加同一列醫療保費。
      </p>
      <p className="mx-auto mt-4 w-fit rounded-full border-2 border-ink bg-[#FDE047] px-4 py-2 text-sm font-bold shadow-doodle">
        2019 年 37 歲投保 · 總表由 38 歲起算
      </p>
    </SlideShell>,
    <SlideShell n={2}>
      <h2 className="text-2xl font-extrabold md:text-3xl">醫療保費會隨年齡上升</h2>
      <p className="mt-2 text-sm font-bold text-cocoa">數字是兩份總表裡的「醫療計劃」欄，兩邊相同。</p>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        {medicalAges.map((age, i) => (
          <Card key={age} tone={i % 2 ? "pink" : "white"} className="text-center">
            <p className="font-bold">{age} 歲</p>
            <p className="mt-2 text-sm font-extrabold whitespace-nowrap sm:text-lg">{money(at(age).medical)}</p>
          </Card>
        ))}
      </div>
      <p className="mt-4 leading-7">38 歲是 HK$ 6,056.80。100 歲是 HK$ 85,424.80。這筆保費每年都要繳，方案 A 和方案 B 用的是同一列。</p>
    </SlideShell>,
    <SlideShell n={3}>
      <h2 className="text-2xl font-extrabold md:text-3xl">每年有兩筆保費</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card>
          <h3 className="text-xl font-extrabold text-cocoa">自願醫保</h3>
          <p className="mt-3 leading-7">總表的「醫療計劃」。用來付住院和手術的帳單。由 38 歲繳到 100 歲，金額逐年增加。</p>
        </Card>
        <Card tone="yellow">
          <h3 className="text-xl font-extrabold text-cocoa">盈御 3 儲蓄</h3>
          <p className="mt-3 leading-7">總表的「盈御多元貨幣計劃 3」。方案 A 供 20 年，方案 B 供 10 年。供完之後這欄是 0，醫療保費仍然繼續。</p>
        </Card>
      </div>
    </SlideShell>,
    <SlideShell n={4}>
      <h2 className="text-2xl font-extrabold md:text-3xl">方案 A：儲蓄保費供 20 年</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card>
          <p className="leading-8">38–57 歲，每年 HK$ 24,000。20 年儲蓄本金 HK$ 480,000。58 歲起這欄是 0。</p>
        </Card>
        <Card tone="pink">
          <p className="leading-8">38 歲連醫療一起是 {money(y38.aAnnual)}。47 歲（第 10 年）累計已繳 {money(y47.aPaid)}，可退保現金價值 {money(y47.aSurrender)}。</p>
        </Card>
      </div>
    </SlideShell>,
    <SlideShell n={5}>
      <h2 className="text-2xl font-extrabold md:text-3xl">方案 B：儲蓄保費供 10 年</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card>
          <p className="leading-8">38–47 歲，每年 HK$ 39,000。10 年儲蓄本金 HK$ 390,000。48 歲起儲蓄保費是 0，醫療保費繼續。</p>
        </Card>
        <Card tone="yellow">
          <p className="leading-8">38 歲連醫療一起是 {money(y38.bAnnual)}。47 歲累計已繳 {money(y47.bPaid)}，可退保現金價值 {money(y47.bSurrender)}。</p>
        </Card>
      </div>
    </SlideShell>,
    <SlideShell n={6}>
      <h2 className="text-2xl font-extrabold md:text-3xl">頭 10 年要拿出多少</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Card>
          <p className="font-bold text-cocoa">只計醫療</p>
          <p className="mt-2 font-extrabold">首年 {money(y38.medical)}</p>
          <p className="mt-2 font-extrabold">10 年累計 {money(y47.medicalCumulative)}</p>
        </Card>
        <Card tone="pink">
          <p className="font-bold text-cocoa">方案 A</p>
          <p className="mt-2 font-extrabold">首年 {money(y38.aAnnual)}</p>
          <p className="mt-2 font-extrabold">10 年累計 {money(y47.aPaid)}</p>
        </Card>
        <Card tone="yellow">
          <p className="font-bold text-cocoa">方案 B</p>
          <p className="mt-2 font-extrabold">首年 {money(y38.bAnnual)}</p>
          <p className="mt-2 font-extrabold">10 年累計 {money(y47.bPaid)}</p>
        </Card>
      </div>
      <p className="mt-4 leading-7">儲蓄保費每年相差 HK$ 15,000，大約每月 HK$ 1,250。醫療保費兩邊一樣，要另計。</p>
    </SlideShell>,
    <SlideShell n={7}>
      <h2 className="text-2xl font-extrabold md:text-3xl">儲蓄本金</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card>
          <h3 className="text-xl font-extrabold">方案 A</h3>
          <p className="mt-3 text-2xl font-extrabold leading-8">24,000 × 20 年 = HK$ 480,000</p>
        </Card>
        <Card tone="yellow">
          <h3 className="text-xl font-extrabold">方案 B</h3>
          <p className="mt-3 text-2xl font-extrabold leading-8">39,000 × 10 年 = HK$ 390,000</p>
        </Card>
      </div>
      <p className="mt-4 leading-7">方案 B 的儲蓄本金少 HK$ 90,000。這兩個數未計醫療。醫療繳到 100 歲，兩邊都是 {money(y100.medicalCumulative)}。</p>
    </SlideShell>,
    <SlideShell n={8}>
      <h2 className="text-2xl font-extrabold md:text-3xl">連醫療在內，累計已繳</h2>
      <p className="mt-2 text-sm font-bold text-cocoa">由 38 歲加到該歲。儲蓄保費停了之後，仍然加上當年的醫療保費。</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-right text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-2 py-1">年齡</th>
              <th className="px-2 py-1 text-right">只計醫療</th>
              <th className="px-2 py-1 text-right">方案 A</th>
              <th className="px-2 py-1 text-right">方案 B</th>
            </tr>
          </thead>
          <tbody>
            {paidAges.map((age, i) => {
              const row = at(age);
              return (
                <tr key={age} className={i % 2 ? "bg-[#FDE047]" : "bg-white"}>
                  <th className="rounded-l-xl px-2 py-2 text-left">{age} 歲</th>
                  <td className="px-2 py-2 tabular-nums">{money(row.medicalCumulative)}</td>
                  <td className="px-2 py-2 font-extrabold tabular-nums">{money(row.aPaid)}</td>
                  <td className="rounded-r-xl px-2 py-2 font-extrabold tabular-nums">{money(row.bPaid)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SlideShell>,
    <SlideShell n={9}>
      <h2 className="text-2xl font-extrabold md:text-3xl">可退保現金價值</h2>
      <p className="mt-2 text-sm font-bold text-cocoa">總表的「可退保現金價值」。當中有非保證部分。</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {paidAges.map((age) => (
          <Card key={age}>
            <p className="font-extrabold">{age} 歲</p>
            <p className="mt-2 text-sm">方案 A {money(at(age).aSurrender)}</p>
            <p className="mt-1 text-sm font-extrabold">方案 B {money(at(age).bSurrender)}</p>
          </Card>
        ))}
      </div>
    </SlideShell>,
    <SlideShell n={10}>
      <h2 className="text-2xl font-extrabold md:text-3xl">四個年齡放在一起</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1">年齡</th>
              <th className="px-2 py-1">方案 A 退保</th>
              <th className="px-2 py-1">方案 B 退保</th>
            </tr>
          </thead>
          <tbody>
            {compareAges.map((age, i) => (
              <tr key={age} className={i % 2 ? "bg-rose-100" : "bg-white"}>
                <th className="rounded-l-xl px-2 py-3">{age} 歲</th>
                <td className="px-2 py-3 font-extrabold tabular-nums">{money(at(age).aSurrender)}</td>
                <td className="rounded-r-xl px-2 py-3 font-extrabold tabular-nums">{money(at(age).bSurrender)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SlideShell>,
    <SlideShell n={11}>
      <h2 className="text-2xl font-extrabold md:text-3xl">47 歲仍低於已繳，57 歲高過已繳</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card>
          <h3 className="text-xl font-extrabold">47 歲</h3>
          <p className="mt-3 leading-7">方案 A 已繳 {money(y47.aPaid)}，退保 {money(y47.aSurrender)}。方案 B 已繳 {money(y47.bPaid)}，退保 {money(y47.bSurrender)}。兩邊的退保價值都還沒有蓋過已繳保費。</p>
        </Card>
        <Card tone="yellow">
          <h3 className="text-xl font-extrabold">57 歲</h3>
          <p className="mt-3 leading-7">方案 A 已繳 {money(y57.aPaid)}，退保 {money(y57.aSurrender)}。方案 B 已繳 {money(y57.bPaid)}，退保 {money(y57.bSurrender)}。兩邊的退保價值都高過當時的累計已繳。</p>
        </Card>
      </div>
    </SlideShell>,
    <SlideShell n={12}>
      <h2 className="text-2xl font-extrabold md:text-3xl">可供提取金額</h2>
      <p className="mt-2 leading-7">兩份總表這一欄的數字相同，由 41 歲列到 79 歲。80 歲起是空白。下面用方案 A 的表。</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Card><p className="font-bold">47 歲</p><p className="mt-2 text-xl font-extrabold">{money(y47.aWithdrawable ?? 0)}</p></Card>
        <Card tone="pink"><p className="font-bold">60 歲</p><p className="mt-2 text-xl font-extrabold">{money(y60.aWithdrawable ?? 0)}</p></Card>
        <Card tone="yellow"><p className="font-bold">79 歲</p><p className="mt-2 text-xl font-extrabold">{money(y79.aWithdrawable ?? 0)}</p></Card>
      </div>
      <p className="mt-4 text-sm leading-6">70 歲是 {money(y70.aWithdrawable ?? 0)}。這欄不是每年預定領走的金額，總表也沒有列出領走之後還剩多少。</p>
    </SlideShell>,
    <SlideShell n={13}>
      <h2 className="text-2xl font-extrabold md:text-3xl">100 歲</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card>
          <h3 className="text-xl font-extrabold">方案 A</h3>
          <p className="mt-3 leading-7">可退保現金價值 {money(y100.aSurrender)}。連醫療在內已繳 {money(y100.aPaid)}。當年醫療保費 {money(y100.medical)}。</p>
        </Card>
        <Card tone="yellow">
          <h3 className="text-xl font-extrabold">方案 B</h3>
          <p className="mt-3 leading-7">可退保現金價值 {money(y100.bSurrender)}。連醫療在內已繳 {money(y100.bPaid)}。當年醫療保費同樣是 {money(y100.medical)}。</p>
        </Card>
      </div>
    </SlideShell>,
    <SlideShell n={14}>
      <h2 className="text-2xl font-extrabold md:text-3xl">保單可以分拆</h2>
      <p className="mt-4 text-lg leading-8">由第 3 個保單年度終結後，或供款期完結後，以較後者為準，可以申請把一部分保單價值分到另一張保單。分拆要公司核准。分出來的保單，生效日跟原來那張一樣。這是產品簡介裡的安排，不是這兩份總表已經辦好的事。</p>
    </SlideShell>,
    <SlideShell n={15}>
      <h2 className="text-2xl font-extrabold md:text-3xl">鎖定，以及延繳保費</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card>
          <h3 className="text-xl font-extrabold">紅利鎖定</h3>
          <p className="mt-3 leading-7">由第 15 個保單年度終結後起，每個年度終結後 30 日內可鎖定一次。比例 10% 至 70%。鎖定戶口的利息不是保證。鎖定滿一年可以解鎖，比例 10% 至 100%。</p>
        </Card>
        <Card tone="yellow">
          <h3 className="text-xl font-extrabold">延繳保費</h3>
          <p className="mt-3 leading-7">只適用 3 年、5 年及 10 年供款，所以只對方案 B。指定情況包括被裁、結婚、離婚、子女出生或領養、買入住宅、更改主要居住地。每份保單只可申請一次，寬限期最多 365 日。</p>
        </Card>
      </div>
    </SlideShell>,
    <SlideShell n={16}>
      <h2 className="text-2xl font-extrabold md:text-3xl">可以更換受保人</h2>
      <p className="mt-4 text-lg leading-8">由第 1 個保單年度終結後起，受保人在生時，可申請無限次更改受保人，也可以指定第二受保人。要公司批准。卓越成績獎最高一項是獲產品簡介所指的全球大學排名首 10 位取錄，獎金 2,800 美元，約 HK$ 21,980（按 7.85）。同一位受保人的所有盈御 3 保單只付一次。這不是免遺產認證的承諾。</p>
    </SlideShell>,
    <SlideShell n={17}>
      <h2 className="text-2xl font-extrabold md:text-3xl">怎樣看這兩套安排</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card>
          <h3 className="text-xl font-extrabold">方案 A 較接近的情況</h3>
          <p className="mt-3 leading-7">想每年少付 HK$ 15,000 儲蓄保費。可以接受供到 57 歲。100 歲的可退保現金價值是 {money(y100.aSurrender)}。</p>
        </Card>
        <Card tone="yellow">
          <h3 className="text-xl font-extrabold">方案 B 較接近的情況</h3>
          <p className="mt-3 leading-7">想 47 歲後不再繳這張儲蓄保單。儲蓄本金少 HK$ 90,000。100 歲的可退保現金價值是 {money(y100.bSurrender)}。</p>
        </Card>
      </div>
    </SlideShell>,
    <SlideShell n={18}>
      <h2 className="text-2xl font-extrabold md:text-3xl">附錄 · 每一年</h2>
      <p className="mt-2 text-sm font-bold text-cocoa">38 歲是 2020 年。已繳由 38 歲累加。可供提取金額在 80 歲起是空白。可退保現金價值含非保證部分。</p>
      <div className="mt-4 max-h-[28rem] overflow-auto rounded-2xl border-2 border-ink/80">
        <table className="w-full min-w-[68rem] text-right text-sm">
          <thead className="sticky top-0 bg-[#FDE047]">
            <tr>
              {["年齡", "年份", "醫療", "A 儲蓄", "A 年繳", "A 累計已繳", "A 退保", "A 可供提取", "B 儲蓄", "B 年繳", "B 累計已繳", "B 退保"].map((label) => (
                <th key={label} className="whitespace-nowrap px-2 py-2 text-right first:text-left">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {YEARS.map((row) => (
              <tr key={row.age} className="odd:bg-white even:bg-rose-50">
                <th className="whitespace-nowrap px-2 py-1.5 text-left tabular-nums">{row.age}</th>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{row.year}</td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{money(row.medical)}</td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{money(row.aSavings)}</td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{money(row.aAnnual)}</td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{money(row.aPaid)}</td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{money(row.aSurrender)}</td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{row.aWithdrawable == null ? "—" : money(row.aWithdrawable)}</td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{money(row.bSavings)}</td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{money(row.bAnnual)}</td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{money(row.bPaid)}</td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{money(row.bSurrender)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SlideShell>,
  ];
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
          <p className="text-sm">保費和可退保現金價值來自方案 A、方案 B 兩份總表。38 歲是 2020 年。</p>
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
        <button type="button" className="doodle-btn" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0}>
          上一頁
        </button>
        <button type="button" className="doodle-btn" onClick={() => setIndex((value) => Math.min(TITLES.length - 1, value + 1))} disabled={index === TITLES.length - 1}>
          下一頁
        </button>
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
