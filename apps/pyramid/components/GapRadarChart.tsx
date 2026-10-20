"use client";

import { motion, useReducedMotion } from "framer-motion";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { t } from "@/lib/i18n";
import type { Locale, RadarScores } from "@/types";

interface GapRadarChartProps {
  radar: RadarScores;
  locale: Locale;
}

export function GapRadarChart({ radar, locale }: GapRadarChartProps) {
  const reduce = useReducedMotion();
  const rows = [
    { subject: t(locale, "radarProtection"), score: radar.protection },
    { subject: t(locale, "radarSavings"), score: radar.savings },
    { subject: t(locale, "radarInvestment"), score: radar.investment },
    { subject: t(locale, "radarRisk"), score: radar.riskControl },
    { subject: t(locale, "radarLiquidity"), score: radar.liquidity },
  ];
  return (
    <div>
      <motion.div
        className="h-64 overflow-hidden"
        aria-hidden="true"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={rows} outerRadius="58%" margin={{ top: 28, right: 36, bottom: 28, left: 36 }}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "currentColor", fontSize: 12 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="score" stroke="#1f7a4d" fill="#1f7a4d" fillOpacity={0.45} isAnimationActive={!reduce} animationDuration={1600} animationEasing="ease-out" />
          </RadarChart>
        </ResponsiveContainer>
      </motion.div>
      <table className="mt-2 w-full text-sm">
        <caption className="sr-only">{t(locale, "radar")}</caption>
        <tbody>
          {rows.map((row) => (
            <tr key={row.subject} className="radar-row border-t border-ink/10">
              <th scope="row" className="py-2 text-left font-semibold">{row.subject}</th>
              <td className="py-2 text-right">{row.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
