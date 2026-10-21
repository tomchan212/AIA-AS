import type { PyramidDraft, RiskProfile } from "@/types";

export const SAMPLE_RANKS = ["conservative", "stable", "balanced", "growth"] as const satisfies readonly RiskProfile[];

type SampleNumbers = Pick<
  PyramidDraft,
  | "age"
  | "dependants"
  | "monthlyIncome"
  | "monthlyExpense"
  | "emergencyCash"
  | "lifeCover"
  | "criticalIllnessCover"
  | "medicalAnnualLimit"
  | "hasMedical"
  | "accidentCover"
  | "stableSavings"
  | "growthInvestments"
  | "speculative"
  | "liabilities"
  | "riskAnswers"
>;

/**
 * Incomes sit near the Q1 2026 C&SD medians in data/benchmarks.json:
 * employment earnings HK$21,000 and household income HK$30,000.
 * Spending is illustrative, not an official expenditure figure.
 */
const samples: Record<RiskProfile, SampleNumbers> = {
  conservative: {
    age: 60,
    dependants: 0,
    monthlyIncome: 21_000,
    monthlyExpense: 14_000,
    emergencyCash: 80_000,
    lifeCover: 2_600_000,
    criticalIllnessCover: 1_300_000,
    medicalAnnualLimit: 500_000,
    hasMedical: true,
    accidentCover: 100_000,
    stableSavings: 280_000,
    growthInvestments: 15_000,
    speculative: 0,
    liabilities: 0,
    riskAnswers: [1, 1, 1, 1, 1, 1],
  },
  stable: {
    age: 42,
    dependants: 1,
    monthlyIncome: 30_000,
    monthlyExpense: 20_000,
    emergencyCash: 40_000,
    lifeCover: 1_500_000,
    criticalIllnessCover: 200_000,
    medicalAnnualLimit: 200_000,
    hasMedical: true,
    accidentCover: 0,
    stableSavings: 120_000,
    growthInvestments: 50_000,
    speculative: 40_000,
    liabilities: 800_000,
    riskAnswers: [2, 2, 2, 2, 2, 2],
  },
  balanced: {
    age: 35,
    dependants: 1,
    monthlyIncome: 30_000,
    monthlyExpense: 18_000,
    emergencyCash: 120_000,
    lifeCover: 2_200_000,
    criticalIllnessCover: 1_200_000,
    medicalAnnualLimit: 450_000,
    hasMedical: true,
    accidentCover: 150_000,
    stableSavings: 180_000,
    growthInvestments: 170_000,
    speculative: 15_000,
    liabilities: 0,
    riskAnswers: [3, 3, 3, 3, 3, 3],
  },
  growth: {
    age: 28,
    dependants: 0,
    monthlyIncome: 25_000,
    monthlyExpense: 16_000,
    emergencyCash: 30_000,
    lifeCover: 1_000_000,
    criticalIllnessCover: 200_000,
    medicalAnnualLimit: 150_000,
    hasMedical: true,
    accidentCover: 50_000,
    stableSavings: 20_000,
    growthInvestments: 180_000,
    speculative: 90_000,
    liabilities: 0,
    riskAnswers: [4, 4, 4, 4, 4, 4],
  },
};

export function sampleDraft(rank: RiskProfile): SampleNumbers {
  return samples[rank];
}
