"use client";

import { useEffect, useMemo, useState } from "react";
import { PyramidChart } from "@/components/PyramidChart";
import { GapRadarChart } from "@/components/GapRadarChart";
import {
  ageGrowthReference,
  analyzeAmounts,
  cashGap,
  compoundBalance,
  coverGap,
  highRiskFlag,
  illnessStress,
  jobLossStress,
  lifeReference,
  marketDrop,
  medicalBand,
  peerBand,
  purchasingPower,
  rebalance,
  reportAmounts,
  type Band,
} from "@/lib/analysis/context";
import { BENCHMARKS, benchmark, benchmarkNumber, isStale, staleBenchmarks } from "@/lib/benchmarks";
import { PYRAMID_CONFIG } from "@/lib/config/pyramid";
import { formatHkd, formatPercent } from "@/lib/format";
import { decryptHistory, encryptHistory } from "@/lib/historyFile";
import { layerLabel, t } from "@/lib/i18n";
import { usePyramidStore } from "@/lib/store";
import type { LayerId, Locale, PyramidAnswers, PyramidReport, ScorePoint } from "@/types";

const LEARN: { id: LayerId; href: string; what: "learnProtectionWhat" | "learnStableWhat" | "learnGrowthWhat" | "learnSpeculativeWhat"; why: "learnProtectionWhy" | "learnStableWhy" | "learnGrowthWhy" | "learnSpeculativeWhy"; how: "learnProtectionHow" | "learnStableHow" | "learnGrowthHow" | "learnSpeculativeHow" }[] = [
  { id: "protection", href: "https://www.ifec.org.hk/web/en/moneyessentials/savings.page", what: "learnProtectionWhat", why: "learnProtectionWhy", how: "learnProtectionHow" },
  { id: "stable", href: "https://www.mpfa.org.hk/en/mpf-system/mandatory-contributions/employees", what: "learnStableWhat", why: "learnStableWhy", how: "learnStableHow" },
  { id: "growth", href: "https://www.ifec.org.hk/web/en/moneyessentials/financial-planning/getting-started.page", what: "learnGrowthWhat", why: "learnGrowthWhy", how: "learnGrowthHow" },
  { id: "speculative", href: "https://www.ifec.org.hk/web/en/moneyessentials/financial-planning/getting-started.page", what: "learnSpeculativeWhat", why: "learnSpeculativeWhy", how: "learnSpeculativeHow" },
];

const GLOSSARY = ["glossCritical", "glossVhis", "glossMpf", "glossLiquidity", "glossHibor", "glossCpi"] as const;

function bandWord(locale: Locale, band: Band) {
  if (band === "above") return t(locale, "bandAbove");
  if (band === "below") return t(locale, "bandBelow");
  if (band === "around") return t(locale, "bandAround");
  return t(locale, "unavailable");
}

function rateLabel(value: number | null) {
  return value === null ? "—" : `${value}%`;
}

export function Insights({ locale, report, answers }: { locale: Locale; report: PyramidReport; answers: PyramidAnswers }) {
  const sample = usePyramidStore((item) => item.sample);
  const patch = usePyramidStore((item) => item.patch);
  const history = usePyramidStore((item) => item.history ?? []);
  const [peer, setPeer] = useState(false);
  const [multiplier, setMultiplier] = useState(report.lifeMultiplier);
  const [amounts, setAmounts] = useState<Record<LayerId, number> | null>(null);
  const [days, setDays] = useState(7);
  const [jobMonths, setJobMonths] = useState(6);
  const [note, setNote] = useState("");
  const [passphrase, setPassphrase] = useState("");

  useEffect(() => {
    if (sample) return;
    const today = new Date().toISOString().slice(0, 10);
    const current = usePyramidStore.getState().history ?? [];
    const last = current[current.length - 1];
    if (last?.at === today && last.score === report.healthScore) return;
    const next = (last?.at === today ? current.slice(0, -1) : current).concat({ at: today, score: report.healthScore }).slice(-36);
    usePyramidStore.getState().patch({ history: next, sample: false });
  }, [report.healthScore, sample]);

  useEffect(() => { setAmounts(null); setMultiplier(report.lifeMultiplier); }, [report.healthScore, report.totalAssets, report.lifeMultiplier]);

  useEffect(() => {
    const openForPrint = () => {
      document.querySelectorAll("details").forEach((node) => {
        if (!(node instanceof HTMLDetailsElement)) return;
        node.dataset.printRestore = node.open ? "open" : "closed";
        node.open = true;
      });
    };
    const restore = () => {
      document.querySelectorAll("details").forEach((node) => {
        if (!(node instanceof HTMLDetailsElement)) return;
        if (node.dataset.printRestore === "closed") node.open = false;
        delete node.dataset.printRestore;
      });
    };
    window.addEventListener("beforeprint", openForPrint);
    window.addEventListener("afterprint", restore);
    return () => {
      window.removeEventListener("beforeprint", openForPrint);
      window.removeEventListener("afterprint", restore);
    };
  }, []);

  const baseAmounts = reportAmounts(report);
  const activeAmounts = amounts ?? baseAmounts;
  const preview = useMemo(() => analyzeAmounts(answers, activeAmounts), [answers, activeAmounts]);
  const cpi = benchmarkNumber("csd-cpi-composite-yoy");
  const savingsRate = benchmarkNumber("hkma-savings-deposit-rate");
  const vhis = benchmarkNumber("vhis-standard-annual-limit");
  const dailyFee = benchmarkNumber("ha-acute-inpatient-day");
  const household = benchmarkNumber("csd-median-household-income");
  const earnings = benchmarkNumber("csd-median-employment-earnings");
  const emergencyLow = benchmarkNumber("ifec-emergency-months-low") ?? 3;
  const emergencyHigh = benchmarkNumber("ifec-emergency-months-high") ?? 6;
  const medical = medicalBand(answers.mode === "pro" ? answers.medicalAnnualLimit : null, answers.hasMedical, vhis);
  const growthShare = (report.layers.find((layer) => layer.id === "growth")?.actualShare ?? 0) + (report.layers.find((layer) => layer.id === "speculative")?.actualShare ?? 0);
  const ageShare = ageGrowthReference(answers.age);
  const lifeGap = coverGap(report.lifeTarget, answers.lifeCover);
  const illness = illnessStress(answers.emergencyCash, dailyFee, days);
  const job = jobLossStress(answers.emergencyCash, answers.monthlyExpense, jobMonths);
  const dropped = marketDrop(answers.growthInvestments, answers.speculative, 0.3);
  const droppedReport = analyzeAmounts(answers, { ...baseAmounts, growth: dropped.growth, speculative: dropped.speculative });
  const altLife = lifeReference(report.annualIncome, multiplier, answers.liabilities, PYRAMID_CONFIG.lifeMultiplierCap);
  const stale = staleBenchmarks();

  const move = (id: LayerId, value: number) => setAmounts(rebalance(activeAmounts, id, value));

  async function exportHistory() {
    if (passphrase.length < 4) { setNote(t(locale, "historyFailed")); return; }
    const file = await encryptHistory(passphrase, history);
    const url = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "pyramid-score-history.json";
    link.click();
    URL.revokeObjectURL(url);
    setNote(t(locale, "historySaved"));
  }

  async function importHistory(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const next = await decryptHistory(passphrase, parsed);
      patch({ history: next.slice(-36), sample });
      setNote(t(locale, "historyLoaded"));
    } catch {
      setNote(t(locale, "historyFailed"));
    }
  }

  return (
    <div className="space-y-4">
      <section className="glass-card" aria-labelledby="how-title">
        <h2 id="how-title" className="text-lg font-semibold">{t(locale, "howTitle")}</h2>
        <p className="mt-2 text-sm">{t(locale, "howEmergency", { single: PYRAMID_CONFIG.emergencyMonths.single, family: PYRAMID_CONFIG.emergencyMonths.withDependants, low: emergencyLow, high: emergencyHigh, extra: PYRAMID_CONFIG.emergencyMonths.variableExtra, cap: PYRAMID_CONFIG.emergencyMonths.variableCap })}</p>
        <p className="mt-2 text-sm">{t(locale, "howLife", { base: PYRAMID_CONFIG.lifeIncomeMultiplier, extra: PYRAMID_CONFIG.lifeDependantExtra, cap: PYRAMID_CONFIG.lifeMultiplierCap })}</p>
        <p className="mt-2 text-sm">{t(locale, "howMedical")}</p>
        <p className="mt-2 text-sm">{t(locale, "howInflation")}</p>
        <p className="mt-2 text-sm">{t(locale, "howAge")}</p>
        <p className="mt-2 text-sm">{t(locale, "howPeer")}</p>
        {answers.mode === "pro" ? (
          <div className="mt-3">
            <p className="text-sm font-semibold">{t(locale, "stabilityLead")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className={answers.incomeStability === "steady" ? "tool tool-on" : "tool"} aria-pressed={answers.incomeStability === "steady"} onClick={() => patch({ incomeStability: "steady", sample })}>{t(locale, "stabilitySteady")}</button>
              <button type="button" className={answers.incomeStability === "variable" ? "tool tool-on" : "tool"} aria-pressed={answers.incomeStability === "variable"} onClick={() => patch({ incomeStability: "variable", sample })}>{t(locale, "stabilityVariable")}</button>
            </div>
          </div>
        ) : null}
        <label className="mt-4 block text-sm font-semibold" htmlFor="life-multiplier">{t(locale, "lifeTry")}</label>
        <input id="life-multiplier" className="mt-2 w-full" type="range" min={1} max={PYRAMID_CONFIG.lifeMultiplierCap} value={multiplier} onChange={(event) => setMultiplier(Number(event.target.value))} />
        <p className="text-sm">{t(locale, "lifeAlt", { amount: formatHkd(altLife, locale) })}</p>
      </section>

      <section className="glass-card" aria-labelledby="medical-title">
        <h2 id="medical-title" className="text-lg font-semibold">{t(locale, "medicalTitle")}</h2>
        <p className="mt-2 text-sm">{t(locale, medical === "above" ? "medicalAbove" : medical === "around" ? "medicalAround" : medical === "below" ? "medicalBelow" : "medicalUnknown", { amount: formatHkd(vhis ?? 0, locale) })}</p>
      </section>

      <section className="glass-card" aria-labelledby="inflation-title">
        <h2 id="inflation-title" className="text-lg font-semibold">{t(locale, "inflationTitle")}</h2>
        <p className="mt-1 text-sm">{t(locale, "asOfLabel")} {benchmark("csd-cpi-composite-yoy")?.asOf} · {rateLabel(cpi)} · {t(locale, "asOfLabel")} {benchmark("hkma-savings-deposit-rate")?.asOf} · {rateLabel(savingsRate)}</p>
        <ul className="mt-2 space-y-2 text-sm">
          {[1, 5, 10].map((years) => (
            <li key={years}>{t(locale, "inflationLine", { years, amount: formatHkd(answers.emergencyCash + answers.stableSavings, locale), power: formatHkd(purchasingPower(answers.emergencyCash + answers.stableSavings, cpi ?? 0, years), locale), saved: formatHkd(compoundBalance(answers.emergencyCash + answers.stableSavings, savingsRate ?? 0, years), locale) })}</li>
          ))}
        </ul>
      </section>

      <section className="glass-card" aria-labelledby="age-title">
        <h2 id="age-title" className="text-lg font-semibold">{t(locale, "ageTitle")}</h2>
        <p className="mt-2 text-sm">{t(locale, "ageLine", { reference: formatPercent(ageShare, locale), actual: formatPercent(growthShare, locale) })}</p>
        {highRiskFlag(report.layers.find((layer) => layer.id === "speculative")?.actualShare ?? 0, PYRAMID_CONFIG.speculativePartialShare) ? <p className="mt-2 text-sm font-semibold">{t(locale, "ageHighRisk", { threshold: formatPercent(PYRAMID_CONFIG.speculativePartialShare, locale) })}</p> : null}
      </section>

      <section className="glass-card" aria-labelledby="peer-title">
        <h2 id="peer-title" className="text-lg font-semibold">{t(locale, "peerTitle")}</h2>
        <label className="mt-2 flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={peer} onChange={(event) => setPeer(event.target.checked)} />
          <span>{t(locale, "peerOptIn")}</span>
        </label>
        {peer ? (
          <div className="mt-2 space-y-1 text-sm">
            <p>{t(locale, "peerIncome", { median: formatHkd(earnings ?? 0, locale), band: bandWord(locale, peerBand(answers.monthlyIncome, earnings)) })}</p>
            <p>{t(locale, "peerHousehold", { median: formatHkd(household ?? 0, locale), band: bandWord(locale, peerBand(answers.monthlyIncome, household)) })}</p>
          </div>
        ) : null}
      </section>

      <section className="glass-card" aria-labelledby="what-if-title">
        <h2 id="what-if-title" className="text-lg font-semibold">{t(locale, "whatIfTitle")}</h2>
        <p className="mt-2 text-sm">{t(locale, "whatIfLead")}</p>
        <div className="mt-3 space-y-3">
          {PYRAMID_CONFIG.layerOrder.map((id) => (
            <label key={id} className="block text-sm">
              <span className="font-semibold">{layerLabel(locale, id)} · {formatHkd(activeAmounts[id], locale)}</span>
              <input className="mt-1 w-full" type="range" min={0} max={Math.max(report.totalAssets, 1)} value={activeAmounts[id]} onChange={(event) => move(id, Number(event.target.value))} />
            </label>
          ))}
        </div>
        <button type="button" className="tool mt-3" onClick={() => setAmounts(null)}>{t(locale, "whatIfReset")}</button>
        <p className="mt-3 text-sm font-semibold">{t(locale, "score")} {preview.healthScore}</p>
        <PyramidChart layers={preview.layers} locale={locale} forceLive />
        <GapRadarChart radar={preview.radar} locale={locale} />
      </section>

      <section className="glass-card" aria-labelledby="gap-title">
        <h2 id="gap-title" className="text-lg font-semibold">{t(locale, "gapTitle")}</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {report.layers.filter((layer) => layer.status !== "enough").map((layer) => {
            const gap = cashGap(layer);
            if (layer.id === "protection" && gap.kind !== "shortfall") {
              return <li key={layer.id}>{t(locale, "gapCover", { layer: layerLabel(locale, layer.id), life: formatHkd(lifeGap, locale) })}</li>;
            }
            if (gap.kind === "excess") return <li key={layer.id}>{t(locale, "gapExcess", { layer: layerLabel(locale, layer.id), gap: formatHkd(gap.gap, locale) })}</li>;
            return <li key={layer.id}>{t(locale, "gapShort", { layer: layerLabel(locale, layer.id), gap: formatHkd(gap.gap, locale), six: formatHkd(gap.monthly[0]?.amount ?? 0, locale), twelve: formatHkd(gap.monthly[1]?.amount ?? 0, locale), twoYears: formatHkd(gap.monthly[2]?.amount ?? 0, locale) })}</li>;
          })}
        </ul>
      </section>

      <section className="glass-card" aria-labelledby="stress-title">
        <h2 id="stress-title" className="text-lg font-semibold">{t(locale, "stressTitle")}</h2>
        <label className="mt-2 block text-sm" htmlFor="job-months">{t(locale, "stressJob", { months: jobMonths, need: formatHkd(job.need, locale), result: job.covered ? t(locale, "stressCovered") : t(locale, "stressShort", { gap: formatHkd(job.gap, locale) }) })}</label>
        <input id="job-months" className="mt-1 w-full" type="range" min={1} max={12} value={jobMonths} onChange={(event) => setJobMonths(Number(event.target.value))} />
        <label className="mt-3 block text-sm" htmlFor="illness-days">{t(locale, "stressDays")}</label>
        <input id="illness-days" className="field mt-1" inputMode="numeric" value={days} onChange={(event) => setDays(Math.max(0, Number(event.target.value) || 0))} />
        <p className="mt-2 text-sm">{t(locale, "stressIllness", { fee: formatHkd(dailyFee ?? 0, locale), days, cost: formatHkd(illness.cost ?? 0, locale), result: illness.covered ? t(locale, "stressCovered") : t(locale, "stressShort", { gap: formatHkd(illness.gap ?? 0, locale) }) })}</p>
        <p className="mt-2 text-sm">{t(locale, "stressMarket", { drop: formatPercent(0.3, locale), loss: formatHkd(dropped.loss, locale), score: droppedReport.healthScore })}</p>
      </section>

      <section className="glass-card" aria-labelledby="learn-title">
        <h2 id="learn-title" className="text-lg font-semibold">{t(locale, "learnTitle")}</h2>
        <div className="mt-3 space-y-3">
          {LEARN.map((card) => (
            <article key={card.id} className="rounded-2xl border border-ink/10 p-3 text-sm">
              <h3 className="font-semibold">{layerLabel(locale, card.id)}</h3>
              <p><span className="font-semibold">{t(locale, "learnWhat")}. </span>{t(locale, card.what)}</p>
              <p><span className="font-semibold">{t(locale, "learnWhy")}. </span>{t(locale, card.why)}</p>
              <p><span className="font-semibold">{t(locale, "learnHow")}. </span>{t(locale, card.how, { low: emergencyLow, high: emergencyHigh, rate: rateLabel(benchmarkNumber("mpfa-contribution-rate")), cap: formatHkd(benchmarkNumber("mpfa-max-relevant-income") ?? 0, locale), threshold: formatPercent(PYRAMID_CONFIG.speculativePartialShare, locale) })}</p>
              <a className="mt-1 inline-block font-semibold underline" href={card.href} target="_blank" rel="noopener noreferrer">{t(locale, "learnLink")}</a>
            </article>
          ))}
        </div>
        <h3 className="mt-4 font-semibold">{t(locale, "glossTitle")}</h3>
        <dl className="mt-2 space-y-2 text-sm">
          {GLOSSARY.map((key) => <div key={key}><dd>{t(locale, key)}</dd></div>)}
        </dl>
      </section>

      <section className="glass-card" aria-labelledby="history-title">
        <h2 id="history-title" className="text-lg font-semibold">{t(locale, "historyTitle")}</h2>
        {history.length === 0 ? <p className="mt-2 text-sm">{t(locale, "historyEmpty")}</p> : <ScoreTrend locale={locale} history={history} />}
        <label className="mt-3 block text-sm" htmlFor="history-pass">{t(locale, "historyPassphrase")}</label>
        <input id="history-pass" className="field mt-1" type="password" autoComplete="new-password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} />
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="tool" onClick={() => { void exportHistory(); }}>{t(locale, "historyExport")}</button>
          <label className="tool cursor-pointer">{t(locale, "historyImport")}<input className="sr-only" type="file" accept="application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importHistory(file); }} /></label>
        </div>
        {note ? <p className="mt-2 text-sm" role="status">{note}</p> : null}
      </section>

      <section className="glass-card" aria-labelledby="sources-title">
        <details className="sources-drawer">
          <summary id="sources-title" className="flex flex-wrap items-center gap-2">
            <span>{t(locale, "sourcesTitle")}</span>
            {stale.length ? <span className="rounded-full border border-dashed px-2 py-0.5 text-xs font-semibold">{t(locale, "staleBadge")}</span> : null}
          </summary>
          <p className="mt-2 text-sm">{t(locale, "sourcesLead")}</p>
          <ul className="mt-3 space-y-3 text-sm">
            {BENCHMARKS.items.map((item) => (
              <li key={item.id}>
                <p className="font-semibold">{locale === "en" ? item.labelEn : item.labelZh}{isStale(item) ? ` · ${t(locale, "staleBadge")}` : ""}</p>
                <p>{item.value === null ? t(locale, "unavailable") : `${item.value} ${item.unit}`} · {t(locale, "asOfLabel")} {item.asOf ?? "—"}</p>
                <p>{item.note}</p>
                <a className="underline" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.sourceName}</a>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section className="print-formulas">
        <h2>{t(locale, "printFormulasTitle")}</h2>
        <p>{t(locale, "howEmergency", { single: PYRAMID_CONFIG.emergencyMonths.single, family: PYRAMID_CONFIG.emergencyMonths.withDependants, low: emergencyLow, high: emergencyHigh, extra: PYRAMID_CONFIG.emergencyMonths.variableExtra, cap: PYRAMID_CONFIG.emergencyMonths.variableCap })}</p>
        <p>{t(locale, "howLife", { base: PYRAMID_CONFIG.lifeIncomeMultiplier, extra: PYRAMID_CONFIG.lifeDependantExtra, cap: PYRAMID_CONFIG.lifeMultiplierCap })}</p>
        <p>{t(locale, "howInflation")}</p>
        <ul>
          {BENCHMARKS.items.filter((item) => item.asOf).map((item) => (
            <li key={item.id}>{locale === "en" ? item.labelEn : item.labelZh} · {t(locale, "asOfLabel")} {item.asOf}</li>
          ))}
        </ul>
        <p>{BENCHMARKS.version}</p>
      </section>
    </div>
  );
}

function ScoreTrend({ history, locale }: { history: ScorePoint[]; locale: Locale }) {
  const width = 280;
  const height = 72;
  const min = Math.min(...history.map((point) => point.score), 0);
  const max = Math.max(...history.map((point) => point.score), 100);
  const points = history.map((point, index) => {
    const x = history.length === 1 ? width / 2 : (index / (history.length - 1)) * width;
    const y = height - ((point.score - min) / Math.max(1, max - min)) * height;
    return `${x},${y}`;
  }).join(" ");
  return (
    <div className="mt-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-20 w-full" role="img" aria-label={t(locale, "historyTitle")}>
        <polyline fill="none" stroke="currentColor" strokeWidth="3" points={points} />
      </svg>
      <table className="w-full text-sm">
        <tbody>
          {history.map((point) => (
            <tr key={`${point.at}-${point.score}`} className="border-t border-ink/10">
              <th scope="row" className="py-1 text-left">{point.at}</th>
              <td className="py-1 text-right">{point.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
