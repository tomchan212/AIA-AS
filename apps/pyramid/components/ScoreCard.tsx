"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { reasonAction, statusLabel, t } from "@/lib/i18n";
import type { Locale, Priority } from "@/types";
import { layerLabel } from "@/lib/i18n";

interface ScoreCardProps {
  score: number;
  locale: Locale;
  priorities: Priority[];
}

export function ScoreCard({ score, locale, priorities }: ScoreCardProps) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? score : 0);

  useEffect(() => {
    if (reduce) {
      setShown(score);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 700);
      const eased = 1 - (1 - progress) ** 3;
      setShown(Math.round(score * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduce, score]);

  const tone = score >= 75 ? "#1f7a4d" : score >= 45 ? "#9a6700" : "#b42318";
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - shown / 100);

  return (
    <section className="glass-card relative overflow-hidden" aria-labelledby="score-title">
      {reduce ? null : (
        <div className="confetti no-print" aria-hidden="true">
          {Array.from({ length: 16 }, (_, index) => <i key={index} style={{ ["--i" as string]: index }} />)}
        </div>
      )}
      <h2 id="score-title" className="relative z-10 text-lg font-semibold">{t(locale, "score")}</h2>
      <div className="score-pop relative z-10 mt-2 flex flex-wrap items-center gap-4">
        <svg viewBox="0 0 120 120" className="h-24 w-24 shrink-0" aria-hidden="true">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(28,25,21,0.12)" strokeWidth="10" />
          <circle className="score-ring" cx="60" cy="60" r={radius} fill="none" stroke={tone} strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
        </svg>
        <p className="text-6xl font-bold tracking-tight" aria-live="polite">{shown}</p>
      </div>
      <p className="relative z-10 text-sm text-ink/70 dark:text-paper/70">0–100</p>
      <h3 className="relative z-10 mt-5 text-base font-semibold">{t(locale, "priorities")}</h3>
      {priorities.length ? (
        <ol className="mt-2 space-y-3">
          {priorities.map((item, index) => (
            <li key={item.id} className="priority-card relative z-10 rounded-2xl bg-white p-3 dark:bg-white/10">
              <p className="font-semibold">{index + 1}. {layerLabel(locale, item.layer)} · {statusLabel(locale, item.status)}</p>
              <p className="mt-1 text-sm">{reasonAction(locale, item.reason)}</p>
            </li>
          ))}
        </ol>
      ) : <p className="mt-2">{t(locale, "none")}</p>}
    </section>
  );
}
