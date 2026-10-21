import type { PyramidDraft } from "@/types";

const ENTERED_NUMBER_KEYS = [
  "age",
  "dependants",
  "monthlyIncome",
  "monthlyExpense",
  "emergencyCash",
  "lifeCover",
  "criticalIllnessCover",
  "medicalAnnualLimit",
  "accidentCover",
  "stableSavings",
  "growthInvestments",
  "speculative",
  "liabilities",
] as const satisfies readonly (keyof PyramidDraft)[];

export function hasEnteredNumber(draft: Pick<PyramidDraft, (typeof ENTERED_NUMBER_KEYS)[number]>) {
  return ENTERED_NUMBER_KEYS.some((key) => typeof draft[key] === "number" && Number.isFinite(draft[key]));
}

export function shouldConfirmSampleReplace(draft: Pick<PyramidDraft, "consent" | "sample" | (typeof ENTERED_NUMBER_KEYS)[number]>) {
  return Boolean(draft.consent && !draft.sample && hasEnteredNumber(draft));
}
