import { useEffect, useState, type ReactNode } from "react";
import yearsJson from "./years.json";

const RATE = 7.85;
const STORY = 17;

type YearRow = {
  year: number;
  age: number;
  a2Year: number;
  a1Year: number | null;
  bYear: number;
  aPremiumUSD: number;
  bPremiumUSD: number;
  aSurrenderUSD: number;
  a2SurrenderUSD: number;
  a1SurrenderUSD: number;
  bSurrenderUSD: number;
  withdrawalHKD: number;
  cumulativeWithdrawalHKD: number;
};

const YEARS = yearsJson as YearRow[];

function usdToHkd(usd: number) {
  return Math.round(usd * RATE * 100) / 100;
}

function money(hkd: number) {
  return `HK$ ${hkd.toLocaleString("en-HK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function money0(hkd: number) {
  return `HK$ ${hkd.toLocaleString("en-HK", { maximumFractionDigits: 0 })}`;
}

function at(age: number) {
  const row = YEARS.find((item) => item.age === age);
  if (!row) throw new Error(`missing age ${age}`);
  return row;
}

const AVF = [
  ["37 歲", 7044.8],
  ["47 歲", 10689.6],
  ["60 歲", 14425.6],
  ["70 歲", 25001.6],
  ["80 歲", 43409.6],
] as const;

const BANDS = [
  ["60–63 歲", "每年 HK$ 23,550", "4 年"],
  ["64–74 歲", "每年 HK$ 39,250", "11 年"],
  ["75–82 歲", "每年 HK$ 54,950", "8 年"],
  ["83–100 歲", "每年 HK$ 70,650", "18 年"],
] as const;

const TITLES = [
  "封面",
  "醫療保費",
  "兩件事",
  "方案 A",
  "A 合計",
  "方案 B",
  "提取節奏",
  "60 歲對照",
  "B 不提取",
  "每年拿出",
  "本金",
  "兩邊對照",
  "分拆",
  "鎖定",
  "應急",
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
  const a47 = usdToHkd(at(47).aSurrenderUSD);
  const a57 = usdToHkd(at(57).aSurrenderUSD);
  const a67 = usdToHkd(at(67).aSurrenderUSD);
  const a77 = usdToHkd(at(77).aSurrenderUSD);
  const a100 = usdToHkd(at(100).aSurrenderUSD);
  const milestones = [
    ["47 歲", "只有第一張", a47],
    ["57 歲", "第一張第 20 年 + 第二張第 10 年", a57],
    ["67 歲", "第一張第 30 年 + 第二張第 20 年", a67],
    ["77 歲", "第一張第 40 年 + 第二張第 30 年", a77],
    ["100 歲", "第一張第 63 年 + 第二張第 53 年", a100],
  ] as const;
  const bAges = [47, 57, 65, 75, 85, 100] as const;
  const compare = [
    [47, "A 只有第一張"],
    [57, "A 兩張相加"],
    [67, "A 兩張相加"],
    [100, "A 兩張相加"],
  ] as const;

  return [
    <SlideShell n={1}>
      <Avatar />
      <h1 className="mt-4 text-center text-2xl font-extrabold leading-tight md:text-4xl">財富累積與終身醫療說明</h1>
      <p className="mx-auto mt-3 max-w-2xl text-center text-lg leading-8">
        CHAN MANDY：方案 A 每年 HK$ 23,550，兩張單接力。
        <br />
        方案 B 每年 HK$ 39,250，供 10 年，60 歲起按指定金額提取。
      </p>
      <p className="mx-auto mt-4 w-fit rounded-full border-2 border-ink bg-[#FDE047] px-4 py-2 text-sm font-bold shadow-doodle">
        2019 年 37 歲投保 · 建議書由 38 歲起算
      </p>
    </SlideShell>,
    <SlideShell n={2}>
      <h2 className="text-2xl font-extrabold md:text-3xl">醫療保費會隨年齡上升</h2>
      <p className="mt-2 text-sm font-bold text-cocoa">下面是先前列出的 AVF 普通房年保費，不是這三份儲蓄建議書裡的數字。</p>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {AVF.map(([label, amount], i) => (
          <Card key={label} tone={i % 2 ? "pink" : "white"} className="text-center">
            <p className="font-bold">{label}</p>
            <p className="mt-2 text-sm font-extrabold whitespace-nowrap sm:text-lg">{money(amount)}</p>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-lg leading-8">
        如果退休後沒有一筆可以動用的錢，這些保費就要從生活開支裡付。儲蓄保單的作用，是先把錢滾大，再用提取出來的金額去付這張醫療保單。
      </p>
    </SlideShell>,
    <SlideShell n={3}>
      <h2 className="text-2xl font-extrabold md:text-3xl">兩件事一起看</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card>
          <h3 className="text-xl font-extrabold text-cocoa">自願醫保</h3>
          <p className="mt-3 leading-7">用來付住院和手術的帳單。這裡用的是普通房的年保費。它每年要繳，而且會隨年齡增加。</p>
        </Card>
        <Card tone="yellow">
          <h3 className="text-xl font-extrabold text-cocoa">盈御 3 儲蓄</h3>
          <p className="mt-3 leading-7">把保費滾成退保發還金額。當中大部分是非保證的復歸紅利和終期分紅。提取之後還剩多少，這三份建議書沒有計算。</p>
        </Card>
      </div>
    </SlideShell>,
    <SlideShell n={4}>
      <h2 className="text-2xl font-extrabold md:text-3xl">方案 A：兩張單，一張供完再供下一張</h2>
      <p className="mt-2 leading-7">
        每張每年基本保費 3,000 美元，即 HK$ 23,550。各供 10 年。第一張建議書由 38 歲起算；第二張由 48 歲起算，不是 47 歲。
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card>
          <h3 className="text-xl font-extrabold">第一張 · Plan A2</h3>
          <p className="mt-3 leading-7">38–47 歲，每年 HK$ 23,550。10 年本金 HK$ 235,500。47 歲退保發還金額 {money(a47)}，高過已繳的 30,000 美元。</p>
        </Card>
        <Card tone="pink">
          <h3 className="text-xl font-extrabold">第二張 · Plan A1</h3>
          <p className="mt-3 leading-7">48–57 歲，每年 HK$ 23,550。10 年本金 HK$ 235,500。57 歲這張單自己的退保發還金額亦是 {money(a47)}。</p>
        </Card>
      </div>
    </SlideShell>,
    <SlideShell n={5}>
      <h2 className="text-2xl font-extrabold md:text-3xl">方案 A：兩張單加在一起</h2>
      <p className="mt-2 text-sm font-bold text-cocoa">同一年的兩個退保發還金額相加。匯率 1 美元 = 7.85 港元。</p>
      <ul className="mt-4 space-y-2">
        {milestones.map(([age, note, amount], i) => (
          <li key={age} className={`grid items-center gap-2 rounded-2xl border-2 border-ink/80 px-4 py-3 md:grid-cols-[7rem_1fr_auto] ${i % 2 ? "bg-[#FDE047]" : "bg-white"}`}>
            <span className="font-extrabold">{age}</span>
            <span>{note}</span>
            <span className="text-lg font-extrabold">{money(amount)}</span>
          </li>
        ))}
      </ul>
    </SlideShell>,
    <SlideShell n={6}>
      <h2 className="text-2xl font-extrabold md:text-3xl">方案 B：一張單，供 10 年</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <Card>
          <p className="text-lg leading-8">
            38–47 歲，每年基本保費 5,000 美元，即 HK$ 39,250。
            10 年本金 50,000 美元，即 HK$ 392,500。
            47 歲退保發還金額 52,570 美元 = {money(usdToHkd(at(47).bSurrenderUSD))}。
            48 歲起這張單不再繳儲蓄保費。
          </p>
        </Card>
        <Card tone="yellow" className="flex flex-col justify-center text-center">
          <p className="font-bold">比方案 A 少付的本金</p>
          <p className="mt-2 text-3xl font-extrabold text-blush">{money0(78500)}</p>
          <p className="mt-2">471,000 − 392,500 = 78,500</p>
        </Card>
      </div>
    </SlideShell>,
    <SlideShell n={7}>
      <h2 className="text-2xl font-extrabold md:text-3xl">方案 B：60 歲起的提取節奏</h2>
      <p className="mt-2 text-sm font-bold text-cocoa">這是指定的領錢方式。Plan B 建議書假設全程沒有提取，所以沒有「領完還剩多少」。</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BANDS.map(([ages, amount, years], i) => (
          <Card key={ages} tone={i % 2 ? "pink" : "white"} className="text-center">
            <p className="font-extrabold">{ages}</p>
            <p className="mt-2 font-bold">{amount}</p>
            <p className="mt-2 text-sm">{years}</p>
          </Card>
        ))}
      </div>
      <p className="mt-4 leading-7">四段自己加總是 HK$ 2,237,250。若寫成 227 萬或 HK$ 2,276,500，會多出大約一年的 HK$ 39,250。簡報用四段加總。</p>
    </SlideShell>,
    <SlideShell n={8}>
      <h2 className="text-2xl font-extrabold md:text-3xl">60 歲這一年：提取金額高於列出的醫保保費</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card>
          <p className="font-bold text-cocoa">AVF 普通房</p>
          <p className="mt-2 text-3xl font-extrabold">{money(14425.6)}</p>
        </Card>
        <Card tone="yellow">
          <p className="font-bold text-cocoa">方案 B 提取</p>
          <p className="mt-2 text-3xl font-extrabold">{money(23550)}</p>
        </Card>
      </div>
      <p className="mt-4 leading-7">
        23,550 − 14,425.60 = 9,124.40。這一年提取金額付完列出的保費後，還剩 HK$ 9,124.40。
        這不代表往後每一年都夠。100 歲若仍領 HK$ 70,650，而保費是 HK$ 85,424.80，就差 HK$ 14,774.80。
      </p>
    </SlideShell>,
    <SlideShell n={9}>
      <h2 className="text-2xl font-extrabold md:text-3xl">方案 B 如果不提取，建議書上的退保發還金額</h2>
      <p className="mt-2 text-sm font-bold text-cocoa">這些數字假設沒有提錢。不能把它們當成「領走養老金之後的餘額」。</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {bAges.map((age) => (
          <Card key={age}>
            <p className="font-extrabold">{age} 歲</p>
            <p className="mt-2 text-xl font-extrabold">{money(usdToHkd(at(age).bSurrenderUSD))}</p>
          </Card>
        ))}
      </div>
    </SlideShell>,
    <SlideShell n={10}>
      <h2 className="text-2xl font-extrabold md:text-3xl">前 10 年，每年要拿出多少</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card>
          <h3 className="text-xl font-extrabold">方案 A</h3>
          <p className="mt-3 text-lg leading-8">每年 HK$ 23,550，大約每月 HK$ 1,962。</p>
        </Card>
        <Card tone="pink">
          <h3 className="text-xl font-extrabold">方案 B</h3>
          <p className="mt-3 text-lg leading-8">每年 HK$ 39,250，大約每月 HK$ 3,271。</p>
        </Card>
      </div>
      <p className="mt-4 text-lg">相差 HK$ 15,700 一年，大約每月 HK$ 1,308。這只算儲蓄保費，未計醫保。</p>
    </SlideShell>,
    <SlideShell n={11}>
      <h2 className="text-2xl font-extrabold md:text-3xl">總共放入的儲蓄本金</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card>
          <h3 className="text-xl font-extrabold">方案 A</h3>
          <p className="mt-3 text-2xl font-extrabold leading-8">23,550 × 20 年 = HK$ 471,000</p>
        </Card>
        <Card tone="yellow">
          <h3 className="text-xl font-extrabold">方案 B</h3>
          <p className="mt-3 text-2xl font-extrabold leading-8">39,250 × 10 年 = HK$ 392,500</p>
        </Card>
      </div>
      <p className="mt-4 text-sm leading-6">
        方案 B 少付 HK$ 78,500。建議書另有保費徵費：A 每張每年約 3.05 美元，B 的年繳總保費欄是 5,005.05 美元。上面的本金用基本保費 3,000 和 5,000 美元。
      </p>
    </SlideShell>,
    <SlideShell n={12}>
      <h2 className="text-2xl font-extrabold md:text-3xl">若全程不提取，兩邊的退保發還金額</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[36rem] border-separate border-spacing-y-2 text-left">
          <thead>
            <tr className="text-sm">
              <th className="px-3">年齡</th>
              <th className="px-3">方案 A</th>
              <th className="px-3">方案 B</th>
            </tr>
          </thead>
          <tbody>
            {compare.map(([age, note], i) => (
              <tr key={age} className={i % 2 ? "bg-rose-100" : "bg-white"}>
                <th className="rounded-l-2xl border-y-2 border-l-2 border-ink/80 px-3 py-3">{age} 歲</th>
                <td className="border-y-2 border-ink/80 px-3 py-3">
                  <span className="block font-extrabold">{money(usdToHkd(at(age).aSurrenderUSD))}</span>
                  <span className="text-sm">{note}</span>
                </td>
                <td className="rounded-r-2xl border-y-2 border-r-2 border-ink/80 px-3 py-3 font-extrabold">{money(usdToHkd(at(age).bSurrenderUSD))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SlideShell>,
    <SlideShell n={13}>
      <h2 className="text-2xl font-extrabold md:text-3xl">保單可以分拆</h2>
      <p className="mt-4 text-lg leading-8">
        由第 3 個保單年度終結後，或供款期完結後，以較後者為準，可以申請把一部分保單價值分到另一張保單。分拆要公司核准。分出來的保單，生效日跟原來那張一樣。這是產品簡介裡的安排，不是這三份建議書已經辦好的事。
      </p>
    </SlideShell>,
    <SlideShell n={14}>
      <h2 className="text-2xl font-extrabold md:text-3xl">紅利可以鎖定，也可以解鎖</h2>
      <p className="mt-4 text-lg leading-8">
        由第 15 個保單年度終結後起，每個年度終結後 30 日內可鎖定一次。轉到鎖定戶口的復歸紅利和終期分紅，百分比要一樣，不可低於 10%，也不可高於 70%。鎖定戶口的利息不是保證。鎖定滿一年之後可以解鎖，比例是 10% 至 100%。解鎖和鎖定都會改變以後的非保證金額。
      </p>
    </SlideShell>,
    <SlideShell n={15}>
      <h2 className="text-2xl font-extrabold md:text-3xl">兩項應急安排</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card>
          <h3 className="text-xl font-extrabold">精神上無行為能力</h3>
          <p className="mt-3 leading-7">由第 3 個保單年度終結後起，可預先指定一名 18 歲或以上的家人，以及保單價值的 10% 至 100%。每份保單只付一次，要公司批准，付了會減少保單價值。</p>
        </Card>
        <Card tone="yellow">
          <h3 className="text-xl font-extrabold">延繳保費</h3>
          <p className="mt-3 leading-7">只適用 3 年、5 年及 10 年供款。所以只對方案 B 這張 10 年供款的保單，不對供 20 年節奏的兩張方案 A。指定情況包括被裁、結婚、離婚、子女出生或領養、買入住宅、更改主要居住地。每份保單只可申請一次，寬限期最多 365 日。</p>
        </Card>
      </div>
    </SlideShell>,
    <SlideShell n={16}>
      <h2 className="text-2xl font-extrabold md:text-3xl">可以更換受保人</h2>
      <p className="mt-4 text-lg leading-8">
        由第 1 個保單年度終結後起，受保人在生時，可申請無限次更改受保人，也可以指定第二受保人。要公司批准，並符合當時的年齡和可保利益規則。卓越成績獎最高一項，是獲產品簡介所指的全球大學排名首 10 位取錄，獎金 2,800 美元，約 HK$ 21,980（按 7.85）。同一位受保人的所有盈御 3 保單只付一次。這不是免遺產認證的承諾。實際能不能這樣過戶，要看當時的保單條款和適用法律。
      </p>
    </SlideShell>,
    <SlideShell n={17}>
      <h2 className="text-2xl font-extrabold md:text-3xl">怎樣看這兩套安排</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Card>
          <h3 className="text-xl font-extrabold">方案 A 較接近的情況</h3>
          <p className="mt-3 leading-7">想每年少付 HK$ 15,700。可以接受供款分成兩段，直到 57 歲。不打算從戶口提錢。100 歲兩張單合計的退保發還金額，在建議書上是 {money(a100)}。</p>
        </Card>
        <Card tone="yellow">
          <h3 className="text-xl font-extrabold">方案 B 較接近的情況</h3>
          <p className="mt-3 leading-7">想 47 歲後不再繳這張儲蓄保單。本金少 HK$ 78,500。60 歲後按四段金額用錢。建議書沒有算出提取後還剩多少；不提取的話，100 歲是 {money(usdToHkd(at(100).bSurrenderUSD))}。</p>
        </Card>
      </div>
    </SlideShell>,
    <SlideShell n={18}>
      <h2 className="text-2xl font-extrabold md:text-3xl">附錄 · 每一年</h2>
      <p className="mt-2 text-sm font-bold text-cocoa">港元 = 美元 × 7.85。退保發還金額含非保證紅利。方案 B 的退保欄假設沒有提取。38 歲是 2020 年，對應建議書第 1 年。</p>
      <div className="mt-4 max-h-[28rem] overflow-auto rounded-2xl border-2 border-ink/80">
        <table className="w-full min-w-[52rem] text-right text-sm">
          <thead className="sticky top-0 bg-[#FDE047] text-left">
            <tr>
              {["年齡", "年份", "A 年保費", "A 退保發還", "B 年保費", "B 退保發還（不提取）", "B 提取", "B 累計提取"].map((label) => (
                <th key={label} className="whitespace-nowrap px-2 py-2 text-right first:text-left">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {YEARS.map((row) => (
              <tr key={row.age} className="odd:bg-white even:bg-rose-50">
                <th className="whitespace-nowrap px-2 py-1.5 text-left tabular-nums">{row.age}</th>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{row.year}</td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{money(usdToHkd(row.aPremiumUSD))}</td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{money(usdToHkd(row.aSurrenderUSD))}</td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{money(usdToHkd(row.bPremiumUSD))}</td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{money(usdToHkd(row.bSurrenderUSD))}</td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{money(row.withdrawalHKD)}</td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{money(row.cumulativeWithdrawalHKD)}</td>
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
          <p className="text-sm font-bold text-cocoa">CHAN MANDY · 盈御多元貨幣計劃 3</p>
          <p className="text-sm">數字來自 Plan A2、Plan A1、Plan B 三份建議書。匯率 1 美元 = 7.85 港元。</p>
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
