import { describe, expect, it } from "vitest";
import { analyzePyramid } from "@/lib/analysis/analyze";
import { benchmarkNumber } from "@/lib/benchmarks";
import { SAMPLE_RANKS, sampleDraft } from "@/lib/samples";
import type { PyramidAnswers, RiskProfile } from "@/types";

function reportFor(rank: RiskProfile) {
  const sample = sampleDraft(rank);
  const answers: PyramidAnswers = {
    age: sample.age ?? 0,
    occupation: "",
    dependants: sample.dependants ?? 0,
    monthlyIncome: sample.monthlyIncome ?? 0,
    monthlyExpense: sample.monthlyExpense ?? 0,
    emergencyCash: sample.emergencyCash ?? 0,
    lifeCover: sample.lifeCover ?? 0,
    criticalIllnessCover: sample.criticalIllnessCover ?? 0,
    medicalAnnualLimit: sample.medicalAnnualLimit ?? 0,
    hasMedical: sample.hasMedical,
    accidentCover: sample.accidentCover ?? 0,
    stableSavings: sample.stableSavings ?? 0,
    growthInvestments: sample.growthInvestments ?? 0,
    speculative: sample.speculative ?? 0,
    liabilities: sample.liabilities ?? 0,
    riskAnswers: sample.riskAnswers,
    mode: "pro",
  };
  return analyzePyramid(answers);
}

describe("anonymous samples", () => {
  it("offers one distinct pyramid for each risk rank near published medians", () => {
    const employment = benchmarkNumber("csd-median-employment-earnings");
    const household = benchmarkNumber("csd-median-household-income");
    expect(sampleDraft("conservative").monthlyIncome).toBe(employment);
    expect(sampleDraft("stable").monthlyIncome).toBe(household);
    expect(sampleDraft("balanced").monthlyIncome).toBe(household);
    const pictures = SAMPLE_RANKS.map((rank) => {
      const report = reportFor(rank);
      expect(report.riskProfile).toBe(rank);
      expect(report.totalAssets).toBeGreaterThan(0);
      return report.layers.map((layer) => layer.status).join("-");
    });
    expect(new Set(pictures).size).toBe(SAMPLE_RANKS.length);
  });
});
