"use client";

import { useEffect, useRef, useState } from "react";
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
  const root = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const reveal = () => {
      const box = node.getBoundingClientRect();
      if (box.top < window.innerHeight * 0.92 && box.bottom > 40) setLive(true);
    };
    reveal();
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setLive(true);
    });
    observer.observe(node);
    window.addEventListener("scroll", reveal, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", reveal);
    };
  }, []);
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
        ref={root}
        className="h-72"
        aria-hidden="true"
        initial={reduce ? false : { opacity: 0, scale: 0.86, rotate: -6 }}
        animate={live || reduce ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0.86, rotate: -6 }}
        transition={{ type: "spring", stiffness: 140, damping: 16 }}
      >
        {live ? <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={rows} outerRadius="70%">
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "currentColor", fontSize: 12 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="score" stroke="#1f7a4d" fill="#1f7a4d" fillOpacity={0.45} isAnimationActive={!reduce} animationDuration={1600} animationEasing="ease-out" />
          </RadarChart>
        </ResponsiveContainer> : null}
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
