import type { LayerId, RiskProfile } from "@/types";

/**
 * Adjustable planning assumptions for the pyramid page.
 * These are decision-support defaults, not a regulated needs analysis.
 * A licensed planner should replace them to match the agency's policy.
 *
 * Changelog:
 * - 2026-10-20: initial client-facing defaults.
 *   Life cover reference is 10× annual income, plus 1× per dependant, capped at 15×.
 *   Critical illness reference is 5× annual income.
 *   Emergency cash target is 3 months of spending, or 6 months when there is a dependant.
 *   Asset weights below are shares of financial assets (emergency cash, stable savings,
 *   growth investments, speculative holdings). Insurance sums assured are coverage
 *   checks and are not added into the asset pie.
 */
export const PYRAMID_CONFIG = {
  version: "2026-10-20",
  currency: "HKD",
  /** Used only to build the WhatsApp link. Do not render this on the page. */
  advisorWhatsApp: "85294729476",
  age: { min: 18, max: 100, pivot: 40 },
  emergencyMonths: { single: 3, withDependants: 6, partialRatio: 0.5, variableExtra: 3, variableCap: 12 },
  lifeIncomeMultiplier: 10,
  lifeDependantExtra: 1,
  lifeMultiplierCap: 15,
  ciIncomeMultiplier: 5,
  medicalAnnualLimitMin: 500_000,
  accidentIncomeMultiplier: 3,
  moneyCap: 1_000_000_000_000,
  ageShiftPerYear: 0.005,
  ageShiftCap: 0.2,
  dependantShift: 0.02,
  allocationEnoughRatio: 0.85,
  allocationPartialRatio: 0.5,
  speculativeComfortRatio: 1.25,
  speculativePartialShare: 0.1,
  scoreWeights: { protection: 0.4, stable: 0.25, growth: 0.2, speculative: 0.15 } as Record<LayerId, number>,
  statusPoints: { enough: 100, partial: 55, severe: 15 },
  riskQuestionCount: 6,
  riskScale: { min: 1, max: 4 },
  riskBands: [
    { max: 10, profile: "conservative" },
    { max: 14, profile: "stable" },
    { max: 19, profile: "balanced" },
    { max: 24, profile: "growth" },
  ] as { max: number; profile: RiskProfile }[],
  baseWeights: {
    conservative: { protection: 0.3, stable: 0.5, growth: 0.18, speculative: 0.02 },
    stable: { protection: 0.25, stable: 0.45, growth: 0.27, speculative: 0.03 },
    balanced: { protection: 0.2, stable: 0.4, growth: 0.35, speculative: 0.05 },
    growth: { protection: 0.15, stable: 0.3, growth: 0.45, speculative: 0.1 },
  } as Record<RiskProfile, Record<LayerId, number>>,
  layerOrder: ["protection", "stable", "growth", "speculative"] as LayerId[],
};

export type PyramidConfig = typeof PYRAMID_CONFIG;
