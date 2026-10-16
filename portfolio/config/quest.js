/**
 * Quest presets and ward benchmarks. Amounts are integer cents.
 * Ward annual-limit benchmarks are planning defaults, not clinical advice.
 * [VERIFY] A licensed planner should confirm these before client use.
 */
export const QUEST_CONFIG = {
  version: 1,
  strictOrder: true,
  lastVerified: "2026-10-15",
  changelog: ["2026-10-15: four quest stages, ward benchmarks, rarity thresholds"],
  rarity: {
    ssrMinConfidence: 0.85,
    srMinConfidence: 0.6,
  },
  bands: {
    lowBelow: 0.4,
    moderateBelow: 0.8,
  },
  /** [VERIFY] Illustrative annual limits by ward class. */
  wardAnnualLimitCents: {
    GENERAL: 50_000_000,
    SEMI: 100_000_000,
    PRIVATE: 200_000_000,
  },
  sliders: {
    annualLimitCents: { min: 0, max: 200_000_000, step: 5_000_000 },
    ciSumAssuredCents: { min: 0, max: 500_000_000, step: 10_000_000 },
    lifeSumAssuredCents: { min: 0, max: 1_000_000_000, step: 10_000_000 },
    liabilitiesCents: { min: 0, max: 1_000_000_000, step: 5_000_000 },
    mpfCents: { min: 0, max: 300_000_000, step: 5_000_000 },
    cashCents: { min: 0, max: 300_000_000, step: 5_000_000 },
  },
};
