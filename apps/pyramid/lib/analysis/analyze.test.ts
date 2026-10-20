import { describe, expect, it } from "vitest";
import { PYRAMID_CONFIG } from "@/lib/config/pyramid";
import type { PyramidAnswers } from "@/types";
import { analyzePyramid } from "./analyze";
import { scoreRisk } from "./risk";
import { idealWeights } from "./weights";

function answers(overrides: Partial<PyramidAnswers> = {}): PyramidAnswers {
  return {
    age: 40,
    occupation: "",
    dependants: 0,
    monthlyIncome: 40_000,
    monthlyExpense: 20_000,
    emergencyCash: 120_000,
    lifeCover: 4_800_000,
    criticalIllnessCover: 0,
    medicalAnnualLimit: 0,
    hasMedical: true,
    accidentCover: 0,
    stableSavings: 400_000,
    growthInvestments: 350_000,
    speculative: 50_000,
    liabilities: 0,
    riskAnswers: [],
    mode: "quick",
    ...overrides,
  };
}

describe("risk and ideal weights", () => {
  it("maps questionnaire averages onto the four profiles", () => {
    expect(scoreRisk([]).profile).toBe("balanced");
    expect(scoreRisk([1, 1, 1, 1, 1, 1])).toMatchObject({ score: 6, profile: "conservative" });
    expect(scoreRisk([4, 4, 4, 4, 4, 4])).toMatchObject({ score: 24, profile: "growth" });
    expect(scoreRisk([3, 3, 3])).toMatchObject({ score: 18, profile: "balanced", answered: 3 });
  });

  it("shifts savings up with age and protection up with dependants", () => {
    const older = idealWeights(70, 0, "balanced");
    const younger = idealWeights(18, 0, "balanced");
    const family = idealWeights(40, 3, "balanced");
    expect(older.stable).toBeCloseTo(0.55);
    expect(older.growth).toBeCloseTo(0.2);
    expect(younger.growth).toBeGreaterThan(PYRAMID_CONFIG.baseWeights.balanced.growth);
    expect(family.protection).toBeGreaterThan(0.2);
    expect(family.speculative).toBe(0);
    for (const weights of [older, younger, family]) {
      const sum = weights.protection + weights.stable + weights.growth + weights.speculative;
      expect(sum).toBeCloseTo(1);
    }
  });
});

describe("analyzePyramid", () => {
  it("scores a matched pyramid at 100", () => {
    const report = analyzePyramid(answers());
    expect(report.healthScore).toBe(100);
    expect(report.layers.every((layer) => layer.status === "enough")).toBe(true);
    expect(report.emergencyMonths).toBe(6);
    expect(report.lifeMultiplier).toBe(10);
    expect(report.lifeTarget).toBe(4_800_000);
    expect(report.priorities).toHaveLength(0);
  });

  it("marks thin protection as a severe gap", () => {
    const report = analyzePyramid(answers({
      emergencyCash: 20_000,
      lifeCover: 0,
      hasMedical: false,
      stableSavings: 0,
      growthInvestments: 0,
      speculative: 0,
    }));
    const protection = report.layers.find((layer) => layer.id === "protection");
    expect(protection?.status).toBe("severe");
    expect(protection?.reasons).toEqual(expect.arrayContaining(["emergency_short", "life_short", "medical_missing"]));
    expect(report.healthScore).toBeLessThan(60);
    expect(report.priorities[0]?.layer).toBe("protection");
  });

  it("handles zero income, dependants, and negative assets", () => {
    const idle = analyzePyramid(answers({
      monthlyIncome: 0,
      monthlyExpense: 0,
      emergencyCash: 0,
      lifeCover: 0,
      dependants: 0,
      stableSavings: 0,
      growthInvestments: 0,
      speculative: 0,
    }));
    expect(idle.lifeTarget).toBe(0);
    expect(idle.warnings).toContain("no_assets");
    expect(idle.layers.find((layer) => layer.id === "protection")?.reasons).toContain("emergency_unknown");

    const carers = analyzePyramid(answers({
      monthlyIncome: 0,
      lifeCover: 0,
      liabilities: 0,
      dependants: 2,
      hasMedical: true,
    }));
    expect(carers.layers.find((layer) => layer.id === "protection")?.reasons).toContain("life_dependants_no_income");
    expect(carers.lifeMultiplier).toBe(12);

    const negative = analyzePyramid(answers({ emergencyCash: -500, stableSavings: -1 }));
    expect(negative.warnings).toContain("negative_clamped");
    expect(negative.totalAssets).toBe(350_000 + 50_000);
  });

  it("clamps an extreme age and flags speculative excess", () => {
    const aged = analyzePyramid(answers({ age: 130 }));
    expect(aged.warnings).toContain("age_clamped");
    expect(aged.idealWeights.stable).toBeGreaterThan(0.5);

    const risky = analyzePyramid(answers({
      emergencyCash: 20_000,
      stableSavings: 0,
      growthInvestments: 0,
      speculative: 80_000,
      lifeCover: 4_800_000,
      hasMedical: true,
    }));
    const speculative = risky.layers.find((layer) => layer.id === "speculative");
    expect(speculative?.status).toBe("severe");
    expect(speculative?.direction).toBe("excess");
    expect(speculative?.reasons).toContain("allocation_excess");
  });

  it("uses professional cover amounts instead of the yes or no medical flag", () => {
    const low = analyzePyramid(answers({
      mode: "pro",
      hasMedical: true,
      medicalAnnualLimit: 100_000,
      criticalIllnessCover: 100_000,
      accidentCover: 0,
    }));
    const reasons = low.layers.find((layer) => layer.id === "protection")?.reasons ?? [];
    expect(reasons).toEqual(expect.arrayContaining(["medical_low", "ci_short", "accident_missing"]));

    const full = analyzePyramid(answers({
      mode: "pro",
      medicalAnnualLimit: 1_000_000,
      criticalIllnessCover: 2_400_000,
      accidentCover: 1_000_000,
    }));
    expect(full.layers.find((layer) => layer.id === "protection")?.status).toBe("enough");
  });
});
