import type { ReactElement } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import yearsJson from "./years.json";

export type YearRow = {
  age: number;
  year: number;
  medical: number;
  aSavings: number;
  bSavings: number;
  aPaid: number;
  bPaid: number;
  wdA2: number;
  wdA1: number;
  wdA: number;
  wdB: number;
  wdACum: number;
  wdBCum: number;
  surrANowd: number;
  surrBNowd: number;
  surrAAfter: number;
  surrBAfter: number;
};

export const YEARS = yearsJson as YearRow[];
const INK = "#1E293B";
const COCOA = "#92400E";
const BLUSH = "#FB7185";
const GOLD = "#D97706";

function money(hkd: number) {
  const value = Math.round((hkd + Number.EPSILON) * 100) / 100;
  return `HK$ ${value.toLocaleString("en-HK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function axisTick(value: number) {
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(value % 1000000 === 0 ? 0 : 1)}百萬`;
  if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}千`;
  return String(value);
}

function ChartFrame({ children }: { children: ReactElement }) {
  return (
    <div className="mt-3 h-64 w-full md:h-80">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function tip() {
  return (
    <Tooltip
      formatter={(value) => money(Number(value))}
      labelFormatter={(label) => `${label} 歲`}
      contentStyle={{ border: "2px solid #1E293B", borderRadius: 12, background: "#fff" }}
    />
  );
}

function axes() {
  return (
    <>
      <CartesianGrid stroke="#e7e5e4" />
      <XAxis dataKey="age" tick={{ fill: INK, fontSize: 12 }} interval={9} />
      <YAxis tick={{ fill: INK, fontSize: 12 }} tickFormatter={axisTick} width={64} />
      {tip()}
    </>
  );
}

function Key({ items }: { items: { color: string; label: string }[] }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-4 rounded-sm" style={{ background: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function SavingsChart() {
  const data = YEARS.filter((row) => row.age <= 57);
  return (
    <>
    <ChartFrame>
      <BarChart data={data}>
        {axes()}
        <Bar dataKey="aSavings" name="方案 A 儲蓄" fill={COCOA} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="bSavings" name="方案 B 儲蓄" fill={BLUSH} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ChartFrame>
    <Key items={[{ color: COCOA, label: "方案 A 儲蓄" }, { color: BLUSH, label: "方案 B 儲蓄" }]} />
    </>
  );
}

export function MedicalChart() {
  return (
    <>
    <ChartFrame>
      <LineChart data={YEARS}>
        {axes()}
        <Line type="linear" dataKey="medical" name="醫療保費" stroke={COCOA} strokeWidth={2.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ChartFrame>
    <Key items={[{ color: COCOA, label: "醫療保費" }]} />
    </>
  );
}

export function PaidChart() {
  const data = YEARS.map((row) => ({ ...row, aAnnual: row.aSavings + row.medical, bAnnual: row.bSavings + row.medical }));
  return (
    <>
    <ChartFrame>
      <LineChart data={data}>
        {axes()}
        <Line type="linear" dataKey="aAnnual" name="方案 A 年繳" stroke={COCOA} strokeWidth={2.5} dot={false} isAnimationActive={false} />
        <Line type="linear" dataKey="bAnnual" name="方案 B 年繳" stroke={BLUSH} strokeWidth={2.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ChartFrame>
    <Key items={[{ color: COCOA, label: "方案 A 年繳" }, { color: BLUSH, label: "方案 B 年繳" }]} />
    </>
  );
}

export function WithdrawalChart() {
  const data = YEARS.filter((row) => row.age >= 60);
  return (
    <>
    <ChartFrame>
      <LineChart data={data}>
        {axes()}
        <Line type="stepAfter" dataKey="wdA2" name="方案 A2" stroke={COCOA} strokeWidth={2.5} dot={false} isAnimationActive={false} />
        <Line type="stepAfter" dataKey="wdA1" name="方案 A1" stroke={GOLD} strokeWidth={2.5} dot={false} isAnimationActive={false} />
        <Line type="stepAfter" dataKey="wdB" name="方案 B" stroke={BLUSH} strokeWidth={2.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ChartFrame>
    <Key items={[{ color: COCOA, label: "方案 A2" }, { color: GOLD, label: "方案 A1" }, { color: BLUSH, label: "方案 B" }]} />
    </>
  );
}

export function CumulativeWithdrawalChart() {
  const data = YEARS.filter((row) => row.age >= 60);
  return (
    <>
    <ChartFrame>
      <LineChart data={data}>
        {axes()}
        <Line type="linear" dataKey="wdACum" name="方案 A 累計提取" stroke={COCOA} strokeWidth={2.5} dot={false} isAnimationActive={false} />
        <Line type="linear" dataKey="wdBCum" name="方案 B 累計提取" stroke={BLUSH} strokeWidth={2.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ChartFrame>
    <Key items={[{ color: COCOA, label: "方案 A 累計提取" }, { color: BLUSH, label: "方案 B 累計提取" }]} />
    </>
  );
}

export function WithdrawalVersusMedicalChart() {
  const data = YEARS.filter((row) => row.age >= 60);
  return (
    <>
    <ChartFrame>
      <LineChart data={data}>
        {axes()}
        <Line type="linear" dataKey="medical" name="當年醫療" stroke={INK} strokeWidth={2.5} dot={false} isAnimationActive={false} />
        <Line type="linear" dataKey="wdA" name="方案 A 提取" stroke={COCOA} strokeWidth={2.5} dot={false} isAnimationActive={false} />
        <Line type="linear" dataKey="wdB" name="方案 B 提取" stroke={BLUSH} strokeWidth={2.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ChartFrame>
    <Key items={[{ color: INK, label: "當年醫療" }, { color: COCOA, label: "方案 A 提取" }, { color: BLUSH, label: "方案 B 提取" }]} />
    </>
  );
}

export function SurrenderChart({ plan }: { plan: "A" | "B" }) {
  const nowd = plan === "A" ? "surrANowd" : "surrBNowd";
  const after = plan === "A" ? "surrAAfter" : "surrBAfter";
  return (
    <>
    <ChartFrame>
      <LineChart data={YEARS}>
        {axes()}
        <Line type="linear" dataKey={nowd} name="不提取" stroke={INK} strokeDasharray="6 4" strokeWidth={2.5} dot={false} isAnimationActive={false} />
        <Line type="linear" dataKey={after} name="提取後" stroke={plan === "A" ? COCOA : BLUSH} strokeWidth={2.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ChartFrame>
    <Key items={[{ color: INK, label: "不提取" }, { color: plan === "A" ? COCOA : BLUSH, label: "提取後" }]} />
    </>
  );
}

export function AfterCompareChart() {
  return (
    <>
    <ChartFrame>
      <LineChart data={YEARS}>
        {axes()}
        <Line type="linear" dataKey="surrAAfter" name="方案 A 提取後" stroke={COCOA} strokeWidth={2.5} dot={false} isAnimationActive={false} />
        <Line type="linear" dataKey="surrBAfter" name="方案 B 提取後" stroke={BLUSH} strokeWidth={2.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ChartFrame>
    <Key items={[{ color: COCOA, label: "方案 A 提取後" }, { color: BLUSH, label: "方案 B 提取後" }]} />
    </>
  );
}
