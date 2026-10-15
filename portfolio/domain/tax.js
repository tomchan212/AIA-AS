import { roundHalfUpDiv, sumCents } from "./money.js";

function progressiveTaxCents(netChargeableIncomeCents, config) {
  const income = Math.max(0, netChargeableIncomeCents);
  let cursor = 0;
  let remaining = income;
  let numerator = 0;
  for (const band of config.progressiveBands) {
    const width = band.upToCents == null ? remaining : Math.max(0, band.upToCents - cursor);
    const slice = Math.min(remaining, width);
    numerator += slice * band.rateBps;
    remaining -= slice;
    cursor += slice;
    if (remaining <= 0) break;
  }
  return roundHalfUpDiv(numerator, 10_000);
}

function groupVhis(policies, capCents) {
  const paidByPerson = new Map();
  const excluded = [];
  for (const policy of policies) {
    if (!policy.isVhisCertified) continue;
    if (policy.currency !== "HKD") {
      excluded.push({ id: policy.id, reason: "non_hkd" });
      continue;
    }
    const key = String(policy.insuredPersonKey || "").trim() || "unspecified";
    paidByPerson.set(key, (paidByPerson.get(key) || 0) + Math.max(0, policy.premiumPaidCents || 0));
  }

  const perInsuredPerson = [];
  for (const [insuredPersonKey, paidCents] of paidByPerson) {
    const allowedCents = Math.min(paidCents, capCents);
    perInsuredPerson.push({
      insuredPersonKey,
      paidCents,
      allowedCents,
      excessCents: paidCents - allowedCents,
      capCents,
    });
  }
  perInsuredPerson.sort((a, b) => a.insuredPersonKey.localeCompare(b.insuredPersonKey, "zh-HK"));

  return {
    perInsuredPerson,
    claimedCents: sumCents(perInsuredPerson.map((row) => row.allowedCents)),
    excessCents: sumCents(perInsuredPerson.map((row) => row.excessCents)),
    excluded,
  };
}

function combineQdapTvc(policies, tvcPaidCents, capCents) {
  const excluded = [];
  let qdapPaidCents = 0;
  for (const policy of policies) {
    if (!policy.isQdap) continue;
    if (policy.currency !== "HKD") {
      excluded.push({ id: policy.id, reason: "non_hkd" });
      continue;
    }
    qdapPaidCents += Math.max(0, policy.premiumPaidCents || 0);
  }
  const tvc = Math.max(0, tvcPaidCents || 0);
  const tvcAllowedCents = Math.min(tvc, capCents);
  const qdapAllowedCents = Math.min(qdapPaidCents, capCents - tvcAllowedCents);
  const claimedCents = tvcAllowedCents + qdapAllowedCents;
  return {
    tvcPaidCents: tvc,
    tvcAllowedCents,
    tvcExcessCents: tvc - tvcAllowedCents,
    qdapPaidCents,
    qdapAllowedCents,
    qdapExcessCents: qdapPaidCents - qdapAllowedCents,
    claimedCents,
    excessCents: tvc + qdapPaidCents - claimedCents,
    capCents,
    order: ["TVC", "QDAP"],
    excluded,
  };
}

/**
 * VHIS cap is per insured person. QDAP and TVC share one combined cap.
 * The two caps do not offset each other. TVC is allowed before QDAP.
 */
export function calculateTaxEstimate({
  policies = [],
  tvcPaidCents = 0,
  netChargeableIncomeCents = null,
  config,
}) {
  if (!config) throw new TypeError("tax config is required");
  const vhis = groupVhis(policies, config.vhisPerInsuredCapCents);
  const annuity = combineQdapTvc(policies, tvcPaidCents, config.qdapTvcCombinedCapCents);
  const totalDeductionCents = vhis.claimedCents + annuity.claimedCents;

  let saving = { kind: "insufficient_data", missing: ["netChargeableIncome"] };
  if (netChargeableIncomeCents != null) {
    const beforeCents = progressiveTaxCents(netChargeableIncomeCents, config);
    const afterCents = progressiveTaxCents(netChargeableIncomeCents - totalDeductionCents, config);
    saving = {
      kind: "estimated",
      netChargeableIncomeCents,
      beforeTaxCents: beforeCents,
      afterTaxCents: afterCents,
      savingCents: beforeCents - afterCents,
    };
  }

  return {
    assessmentYear: config.assessmentYear,
    sourceUrl: config.sourceUrl,
    lastVerified: config.lastVerified,
    assumptions: [
      "premiums_entered_are_amounts_paid_in_the_year_of_assessment",
      "vhis_only_if_marked_certified_plan",
      "qdap_tvc_cap_is_combined_tvc_first",
      "progressive_rates_only_no_allowances_no_standard_rate_no_tax_reduction",
      "non_hkd_premiums_excluded",
    ],
    vhis,
    annuity,
    totalDeductionCents,
    saving,
    disclaimer: "Estimate — not tax advice",
  };
}
