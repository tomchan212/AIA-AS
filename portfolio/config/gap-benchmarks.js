/**
 * Default protection-gap benchmarks for decision support.
 * Agencies may replace multipliers. These are NOT a regulated needs analysis.
 * [VERIFY] A licensed planner must confirm the methodology before client use.
 */
export const DEFAULT_GAP_BENCHMARKS = {
  version: "2026-10-15",
  changelog: ["2026-10-15: initial default multipliers"],
  /** Life target = income × multiplier + liabilities + dependants fund − liquid assets. */
  lifeIncomeMultiplier: 10,
  /** Critical illness target = income × multiplier + treatment buffer. */
  ciIncomeMultiplier: 5,
};
