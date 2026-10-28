import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MASTER_DATA, USD_HKD } from "../data";
import { hkd, usd } from "../format";

const wealth = MASTER_DATA.map((row) => ({
  age: row.age,
  planA: row.planA.combinedCashValueUSD,
  planB: row.planB.remainingCashValueUSD,
  withdrawn: row.planB.cumulativeWithdrawnUSD,
}));

const burden = Array.from({ length: 20 }, (_, index) => {
  const year = 2019 + index;
  const age = 37 + index;
  return {
    label: String(year).slice(2),
    planA: 3000,
    planB: year <= 2028 ? 5000 : 0,
    age,
  };
});

function axisUsd(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return `${value}`;
}

export function WealthChart({ currency }: { currency: "USD" | "HKD" }) {
  const factor = currency === "HKD" ? USD_HKD : 1;
  const rows = wealth.map((row) => ({ ...row, planA: row.planA * factor, planB: row.planB * factor, withdrawn: row.withdrawn * factor }));
  const show = currency === "USD" ? usd : hkd;
  return (
    <div className="doodle-card p-4 md:p-6">
      <h3 className="text-lg font-extrabold">現金價值與已提取金額</h3>
      <p className="mt-1 text-sm text-ink/70">只畫對照表列出的 9 個年度。啡線是方案 A 不提取的合計現金價值，深藍線是方案 B 提取後剩餘，粉紅是方案 B 累計已提取。</p>
      <div className="mt-4 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e7e5e4" />
            <XAxis dataKey="age" tick={{ fill: "#1E293B", fontSize: 12 }} />
            <YAxis tickFormatter={axisUsd} tick={{ fill: "#1E293B", fontSize: 12 }} width={48} />
            <Tooltip formatter={(value: number, name: string) => [show(value), name === "planA" ? "方案 A" : name === "planB" ? "方案 B 剩餘" : "方案 B 已提取"]} />
            <Legend formatter={(value) => (value === "planA" ? "方案 A" : value === "planB" ? "方案 B 剩餘" : "方案 B 已提取")} />
            <Area dataKey="withdrawn" fill="#FB7185" stroke="#FB7185" fillOpacity={0.35} />
            <Line dataKey="planA" stroke="#92400E" strokeWidth={3} dot={{ r: 3 }} />
            <Line dataKey="planB" stroke="#1E293B" strokeWidth={3} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function BurdenChart({ currency }: { currency: "USD" | "HKD" }) {
  const factor = currency === "HKD" ? USD_HKD : 1;
  const rows = burden.map((row) => ({ ...row, planA: row.planA * factor, planB: row.planB * factor }));
  return (
    <div className="doodle-card p-4 md:p-6">
      <h3 className="text-lg font-extrabold">2019–2038 年的儲蓄保費</h3>
      <p className="mt-1 text-sm text-ink/70">前 10 年方案 A 每年 3,000 美元，方案 B 每年 5,000 美元。2029 年起方案 B 的儲蓄保費是 0；方案 A 的對照表仍寫每年 3,000 美元，直到 2038 年。</p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows}>
            <CartesianGrid stroke="#e7e5e4" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#1E293B", fontSize: 11 }} interval={1} />
            <YAxis tickFormatter={axisUsd} tick={{ fill: "#1E293B", fontSize: 12 }} width={40} />
            <Tooltip formatter={(value: number) => (currency === "USD" ? usd(value) : hkd(value))} />
            <Legend formatter={(value) => (value === "planA" ? "方案 A" : "方案 B")} />
            <Bar dataKey="planA" fill="#92400E" radius={[6, 6, 0, 0]} />
            <Bar dataKey="planB" fill="#1E293B" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
