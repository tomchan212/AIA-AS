import { describe, expect, it } from "vitest";
import { PYRAMID_CONFIG } from "@/lib/config/pyramid";
import type { LayerAssessment, PyramidAnswers } from "@/types";
import { analyzePyramid } from "./analyze";
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
} from "./context";

function layer(overrides: Partial<LayerAssessment>): LayerAssessment {
  return {
    id: "stable",
    status: "partial",
    direction: "shortfall",
    actualAmount: 40,
    idealAmount: 100,
    actualShare: 0.2,
    idealShare: 0.5,
    reasons: ["allocation_short"],
    ...overrides,
  };
}

function answers(overrides: Partial<PyramidAnswers> = {}): PyramidAnswers {
  return {
    age: 40,
    occupation: "",
    dependants: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    emergencyCash: 0,
    lifeCover: 0,
    criticalIllnessCover: 0,
    medicalAnnualLimit: 0,
    hasMedical: null,
    accidentCover: 0,
    stableSavings: 0,
    growthInvestments: 0,
    speculative: 0,
    liabilities: 0,
    riskAnswers: [],
    mode: "quick",
    ...overrides,
  };
}

describe("context calculations", () => {
  it("projects purchasing power and a deposit balance", () => {
    expect(purchasingPower(100_000, 1.7, 1)).toBeCloseTo(100_000 / 1.017);
    expect(purchasingPower(100_000, 1.7, 10)).toBeCloseTo(100_000 / 1.017 ** 10);
    expect(purchasingPower(0, 1.7, 5)).toBe(0);
    expect(purchasingPower(-20, 1.7, 5)).toBe(0);
    expect(compoundBalance(10_000, 0.001, 5)).toBeCloseTo(10_000 * 1.00001 ** 5);
    expect(compoundBalance(10_000, -100, 1)).toBe(0);
  });

  it("places a medical limit around the reference without treating zero as advice", () => {
    expect(medicalBand(500_000, true, 420_000)).toBe("above");
    expect(medicalBand(400_000, true, 420_000)).toBe("around");
    expect(medicalBand(100_000, true, 420_000)).toBe("below");
    expect(medicalBand(null, false, 420_000)).toBe("below");
    expect(medicalBand(null, null, 420_000)).toBe("unknown");
    expect(medicalBand(100, true, null)).toBe("unknown");
  });

  it("compares income with a median band, including empty medians", () => {
    expect(peerBand(30_000, 30_000)).toBe("around");
    expect(peerBand(40_000, 30_000)).toBe("above");
    expect(peerBand(10_000, 30_000)).toBe("below");
    expect(peerBand(0, 30_000)).toBe("below");
    expect(peerBand(30_000, null)).toBe("unknown");
    expect(peerBand(Number.NaN, 30_000)).toBe("unknown");
  });

  it("uses 100 minus age as a capped discussion share", () => {
    expect(ageGrowthReference(35)).toBeCloseTo(0.65);
    expect(ageGrowthReference(100)).toBe(0);
    expect(ageGrowthReference(130)).toBe(0);
    expect(ageGrowthReference(15)).toBe(0.8);
  });

  it("turns a cash shortfall into 6, 12 and 24 month illustrations", () => {
    const short = cashGap(layer({}));
    expect(short.kind).toBe("shortfall");
    expect(short.gap).toBe(60);
    expect(short.monthly.map((item) => item.amount)).toEqual([10, 5, 2.5]);
    expect(cashGap(layer({ status: "enough", direction: "balanced", actualAmount: 100, idealAmount: 80 })).kind).toBe("none");
    const excess = cashGap(layer({ status: "severe", direction: "excess", actualAmount: 90, idealAmount: 20 }));
    expect(excess.kind).toBe("excess");
    expect(excess.gap).toBe(70);
    expect(excess.monthly.every((item) => item.amount === 0)).toBe(true);
    expect(coverGap(1_000_000, 400_000)).toBe(600_000);
    expect(coverGap(0, 0)).toBe(0);
    expect(coverGap(-5, -10)).toBe(0);
  });

  it("stresses job loss, a public-fee illness, and a market drop", () => {
    expect(jobLossStress(60_000, 20_000, 6)).toMatchObject({ need: 120_000, covered: false, gap: 60_000, monthsCovered: 3 });
    expect(jobLossStress(0, 0, 6).monthsCovered).toBeNull();
    expect(jobLossStress(-100, -50, -2)).toMatchObject({ need: 0, covered: true, gap: 0 });
    expect(illnessStress(1_000, 300, 7)).toMatchObject({ cost: 2_100, covered: false, gap: 1_100 });
    expect(illnessStress(5_000, null, 7).cost).toBeNull();
    expect(marketDrop(100, 50, 0.2)).toMatchObject({ growth: 80, speculative: 40, loss: 30 });
    expect(marketDrop(100, 0, 1.5).growth).toBe(0);
    expect(highRiskFlag(0.11, 0.1)).toBe(true);
    expect(highRiskFlag(0.1, 0.1)).toBe(false);
  });

  it("keeps the what-if total unchanged and still scores through the pyramid", () => {
    const moved = rebalance({ protection: 40, stable: 30, growth: 20, speculative: 10 }, "speculative", 40);
    const total = moved.protection + moved.stable + moved.growth + moved.speculative;
    expect(total).toBeCloseTo(100);
    expect(moved.speculative).toBeCloseTo(40);
    const report = analyzeAmounts(answers({
      monthlyIncome: 40_000,
      monthlyExpense: 20_000,
      emergencyCash: 120_000,
      lifeCover: 4_800_000,
      hasMedical: true,
      stableSavings: 400_000,
      growthInvestments: 350_000,
      speculative: 50_000,
    }), moved);
    expect(report.totalAssets).toBeCloseTo(100);
    expect(report.healthScore).toBeGreaterThanOrEqual(0);
    expect(report.healthScore).toBeLessThanOrEqual(100);
  });

  it("leaves the emergency target unchanged unless adviser mode marks income as variable", () => {
    const steady = analyzePyramid(answers({ dependants: 1, monthlyExpense: 10_000, emergencyCash: 60_000 }));
    const variable = analyzePyramid(answers({ dependants: 1, monthlyExpense: 10_000, emergencyCash: 60_000, incomeStability: "variable" }));
    expect(steady.emergencyTargetMonths).toBe(PYRAMID_CONFIG.emergencyMonths.withDependants);
    expect(variable.emergencyTargetMonths).toBe(9);
  });

  it("caps an edited life-cover multiplier", () => {
    expect(lifeReference(120_000, 10, 50_000, 15)).toBe(1_250_000);
    expect(lifeReference(120_000, 40, 0, 15)).toBe(1_800_000);
    expect(lifeReference(0, 10, 0, 15)).toBe(0);
  });
});
