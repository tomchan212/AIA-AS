/**
 * Year of assessment 2025/26 deduction caps and salaries tax progressive bands.
 * [VERIFY] Confirm against the current IRD pamphlet before relying on a client review.
 *
 * Sources (checked 2026-10-15):
 * - https://www.ird.gov.hk/eng/pdf/pam61e.pdf
 * - https://www.ird.gov.hk/eng/faq/vhis_qp.htm
 * - https://www.gov.hk/en/residents/taxes/salaries/allowances/deductions/annuity.htm
 *
 * This estimate does NOT apply personal allowances, two-tiered standard rate,
 * or the one-off tax reduction. It only shows the progressive-rate effect of
 * the VHIS and QDAP/TVC deductions on a user-entered net chargeable income.
 */
export const TAX_YEAR_2025_26 = {
  assessmentYear: "2025/26",
  effectiveFrom: "2025-04-01",
  lastVerified: "2026-10-15",
  sourceUrl: "https://www.ird.gov.hk/eng/pdf/pam61e.pdf",
  changelog: ["2026-10-15: initial YA 2025/26 caps and progressive bands"],
  /** HK$8,000 per insured person. */
  vhisPerInsuredCapCents: 800_000,
  /** Combined cap for QDAP premiums + MPF TVC. TVC is allowed first. */
  qdapTvcCombinedCapCents: 6_000_000,
  progressiveBands: [
    { upToCents: 5_000_000, rateBps: 200 },
    { upToCents: 10_000_000, rateBps: 600 },
    { upToCents: 15_000_000, rateBps: 1000 },
    { upToCents: 20_000_000, rateBps: 1400 },
    { upToCents: null, rateBps: 1700 },
  ],
};

export const TAX_TABLES = {
  "2025/26": TAX_YEAR_2025_26,
};
