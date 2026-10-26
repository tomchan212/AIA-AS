import { MASTER_DATA } from "../data";
import { money } from "../format";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const lineRows = MASTER_DATA.map((row) => ({
  age: row.age,
  planA: row.planA.surrenderValue,
  planB: row.planB.surrenderValue,
  gap: row.planB.surrenderValue - row.planA.surrenderValue,
}));

const barYears = [1, 3, 5, 8, 10];
const barRows = barYears.map((year) => {
  const row = MASTER_DATA.find((item) => item.policyYear === year)!;
  return {
    label: `${row.age}歲`,
    planA: row.planA.totalAnnualOutflow,
    planB: row.planB.totalAnnualOutflow,
  };
});

function axisMoney(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}百萬`;
  if (value >= 10_000) return `${Math.round(value / 10_000)}萬`;
  return `${Math.round(value)}`;
}

function LineTip({ active, payload, label }: { active?: boolean; payload?: { value: number; dataKey: string }[]; label?: number }) {
  if (!active || !payload?.length) return null;
  const planA = payload.find((item) => item.dataKey === "planA")?.value ?? 0;
  const planB = payload.find((item) => item.dataKey === "planB")?.value ?? 0;
  return (
    <div className="rounded-2xl border-2 border-ink bg-white p-3 text-sm shadow-doodle">
      <p className="font-bold">{label}歲 · 退保現金價值</p>
      <p className="text-cocoa">方案 A {money(planA)}</p>
      <p>方案 B {money(planB)}</p>
      <p className="mt-1 font-bold text-blush">差距 {money(planB - planA)}</p>
    </div>
  );
}

export function WealthChart() {
  return (
    <div className="doodle-card p-4 md:p-6">
      <h3 className="text-lg font-extrabold">長線現金價值</h3>
      <p className="mt-1 text-sm text-ink/70">只畫說明書上有數字的年度。啡線是方案 A，深藍線是方案 B。</p>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={lineRows} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e7e5e4" />
            <XAxis dataKey="age" tick={{ fill: "#1E293B", fontSize: 12 }} />
            <YAxis tickFormatter={axisMoney} tick={{ fill: "#1E293B", fontSize: 12 }} width={56} />
            <Tooltip content={<LineTip />} />
            <Legend formatter={(value) => (value === "planA" ? "方案 A" : "方案 B")} />
            <ReferenceLine x={47} stroke="#FB7185" strokeDasharray="4 4" label={{ value: "B超過本金", fill: "#9F1239", fontSize: 11 }} />
            <ReferenceLine x={50} stroke="#1E293B" strokeDasharray="2 3" label={{ value: "B轉正", fill: "#1E293B", fontSize: 11 }} />
            <ReferenceLine x={55} stroke="#92400E" strokeDasharray="4 4" label={{ value: "A轉正", fill: "#78350F", fontSize: 11 }} />
            <Line type="monotone" dataKey="planA" stroke="#92400E" strokeWidth={3} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="planB" stroke="#1E293B" strokeWidth={3} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function BurdenChart() {
  return (
    <div className="doodle-card p-4 md:p-6">
      <h3 className="text-lg font-extrabold">前 10 年每年要付多少</h3>
      <p className="mt-1 text-sm text-ink/70">柱是儲蓄保費加同年自願醫保保費。兩條方案的醫保保費一樣，所以每年相差 HK$ 15,000，大約每月 HK$ 1,250。</p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barRows}>
            <CartesianGrid stroke="#e7e5e4" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#1E293B", fontSize: 12 }} />
            <YAxis tickFormatter={axisMoney} tick={{ fill: "#1E293B", fontSize: 12 }} width={48} />
            <Tooltip formatter={(value: number) => money(value)} />
            <Legend formatter={(value) => (value === "planA" ? "方案 A" : "方案 B")} />
            <Bar dataKey="planA" fill="#92400E" radius={[8, 8, 0, 0]} />
            <Bar dataKey="planB" fill="#1E293B" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
