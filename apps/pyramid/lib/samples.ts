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

const samples: Record<RiskProfile, SampleNumbers> = {
  conservative: {
    age: 35,
    dependants: 1,
    monthlyIncome: 30_000,
    monthlyExpense: 20_000,
    emergencyCash: 150_000,
    lifeCover: 4_000_000,
    criticalIllnessCover: 1_800_000,
    medicalAnnualLimit: 800_000,
    hasMedical: true,
    accidentCover: 200_000,
    stableSavings: 230_000,
    growthInvestments: 20_000,
    speculative: 0,
    liabilities: 0,
    riskAnswers: [1, 1, 1, 1, 1, 1],
  },
  stable: {
    age: 35,
    dependants: 1,
    monthlyIncome: 30_000,
    monthlyExpense: 20_000,
    emergencyCash: 20_000,
    lifeCover: 300_000,
    criticalIllnessCover: 0,
    medicalAnnualLimit: 200_000,
    hasMedical: true,
    accidentCover: 0,
    stableSavings: 80_000,
    growthInvestments: 40_000,
    speculative: 90_000,
    liabilities: 1_000_000,
    riskAnswers: [2, 2, 3, 2, 3, 2],
  },
  balanced: {
    age: 35,
    dependants: 1,
    monthlyIncome: 30_000,
    monthlyExpense: 20_000,
    emergencyCash: 120_000,
    lifeCover: 2_000_000,
    criticalIllnessCover: 1_800_000,
    medicalAnnualLimit: 600_000,
    hasMedical: true,
    accidentCover: 100_000,
    stableSavings: 200_000,
    growthInvestments: 165_000,
    speculative: 15_000,
    liabilities: 0,
    riskAnswers: [3, 3, 3, 3, 3, 3],
  },
  growth: {
    age: 35,
    dependants: 1,
    monthlyIncome: 30_000,
    monthlyExpense: 20_000,
    emergencyCash: 70_000,
    lifeCover: 4_000_000,
    criticalIllnessCover: 800_000,
    medicalAnnualLimit: 200_000,
    hasMedical: true,
    accidentCover: 50_000,
    stableSavings: 20_000,
    growthInvestments: 250_000,
    speculative: 160_000,
    liabilities: 0,
    riskAnswers: [4, 4, 4, 4, 4, 4],
  },
};

export function sampleDraft(rank: RiskProfile): SampleNumbers {
  return samples[rank];
}
