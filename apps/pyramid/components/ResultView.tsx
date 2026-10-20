"use client";

import dynamic from "next/dynamic";
import { ConsultantCTA } from "@/components/ConsultantCTA";
import { PyramidChart } from "@/components/PyramidChart";
import { ScoreCard } from "@/components/ScoreCard";
import { formatHkd, formatPercent } from "@/lib/format";
import { layerLabel, profileLabel, reasonAction, statusLabel, t } from "@/lib/i18n";
import type { Locale, PyramidAnswers, PyramidReport } from "@/types";

const GapRadarChart = dynamic(() => import("@/components/GapRadarChart").then((mod) => mod.GapRadarChart), { ssr: false });

interface ResultViewProps {
  locale: Locale;
  report: PyramidReport;
  answers: PyramidAnswers;
  onShare: () => void;
}

export function summaryText(locale: Locale, report: PyramidReport, answers: PyramidAnswers) {
  const lines = [
    t(locale, "title"),
    `${t(locale, "score")}: ${report.healthScore}`,
    `${t(locale, "riskLabel")}: ${profileLabel(locale, report.riskProfile)}`,
    `${t(locale, "assetTotal")}: ${formatHkd(report.totalAssets, locale)}`,
    `${t(locale, "coverTarget")}: ${formatHkd(report.lifeTarget, locale)} (${report.lifeMultiplier}${t(locale, "ofIncome")})`,
    ...report.layers.map((layer) => `${layerLabel(locale, layer.id)}: ${statusLabel(locale, layer.status)} ${formatPercent(layer.actualShare, locale)} / ${formatHkd(layer.actualAmount, locale)}`),
    ...report.priorities.map((item, index) => `${index + 1}. ${layerLabel(locale, item.layer)} — ${reasonAction(locale, item.reason)}`),
    answers.occupation ? answers.occupation : "",
    t(locale, "disclaimer"),
  ];
  return lines.filter(Boolean).join("\n");
}

export function ResultView({ locale, report, answers, onShare }: ResultViewProps) {
  const severe = report.layers.some((layer) => layer.status === "severe");
  const summary = summaryText(locale, report, answers);
  return (
    <div id="pyramid-report" className="space-y-4">
      {report.warnings.length ? (
        <ul className="glass-card text-sm">
          {report.warnings.map((warning) => <li key={warning}>{reasonAction(locale, warning)}</li>)}
        </ul>
      ) : null}
      <ScoreCard score={report.healthScore} locale={locale} priorities={report.priorities} />
      <section className="glass-card" aria-labelledby="chart-title">
        <h2 id="chart-title" className="text-lg font-semibold">{t(locale, "result")}</h2>
        <PyramidChart layers={report.layers} locale={locale} />
        <p className="mt-3 text-sm text-ink/70 dark:text-paper/70">
          {t(locale, "coverTarget")} {formatHkd(report.lifeTarget, locale)} · {report.emergencyMonths == null ? "—" : report.emergencyMonths.toFixed(1)} {t(locale, "months")} / {report.emergencyTargetMonths}
        </p>
      </section>
      <section className="glass-card" aria-labelledby="radar-title">
        <h2 id="radar-title" className="text-lg font-semibold">{t(locale, "radar")}</h2>
        <GapRadarChart radar={report.radar} locale={locale} />
      </section>
      <ConsultantCTA locale={locale} severe={severe} summary={summary} onConsent={onShare} />
      <p className="text-sm">{t(locale, "disclaimer")}</p>
    </div>
  );
}
