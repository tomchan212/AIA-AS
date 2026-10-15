import { sumCents } from "./money.js";
import { partitionPolicies } from "./policy.js";

function coverageRatio(existingCents, targetCents) {
  if (targetCents <= 0) return existingCents > 0 ? 1.5 : 1;
  const ratio = existingCents / targetCents;
  return Math.min(1.5, Math.max(0, ratio));
}

function resultForTarget({ id, existingCents, targetCents, steps }) {
  const gapCents = Math.max(0, targetCents - existingCents);
  return {
    id,
    status: "ok",
    existingCents,
    targetCents,
    gapCents,
    coverageRatio: coverageRatio(existingCents, targetCents),
    steps,
  };
}

function insufficient(id, missing, existingCents, approximate = false) {
  return { id, status: "insufficient_data", missing, existingCents, approximate };
}

function withPrecision(dimension, approximate) {
  return approximate ? { ...dimension, approximate: true } : dimension;
}

function categoryIsApproximate(policies, category) {
  return policies.some((policy) => policy.category === category && policy.precision === "approximate");
}

function sumField(policies, category, field) {
  return sumCents(
    policies
      .filter((policy) => policy.category === category && policy.currency === "HKD")
      .map((policy) => Math.max(0, policy[field] || 0))
  );
}

export function calculateProtectionGap({
  client,
  policies = [],
  benchmarks,
  today = new Date(),
}) {
  if (!benchmarks) throw new TypeError("gap benchmarks are required");
  const parts = partitionPolicies(policies, client, today);
  const inForceHkd = parts.inForce.filter((policy) => policy.currency === "HKD");
  const nonHkd = parts.inForce.filter((policy) => policy.currency !== "HKD");

  const lifeExisting = sumField(inForceHkd, "LIFE", "sumAssuredCents");
  const ciExisting = sumField(inForceHkd, "CRITICAL_ILLNESS", "sumAssuredCents");
  const medicalExisting = sumField(inForceHkd, "MEDICAL", "medicalAnnualLimitCents");
  const accidentExisting = sumField(inForceHkd, "ACCIDENT", "sumAssuredCents");

  const lifeMissing = [];
  if (client.annualIncomeCents == null) lifeMissing.push("annualIncome");
  if (client.outstandingLiabilitiesCents == null) lifeMissing.push("liabilities");
  if (client.dependantsFundCents == null) lifeMissing.push("dependantsFund");
  if (client.liquidAssetsCents == null) lifeMissing.push("liquidAssets");

  const lifeApprox = categoryIsApproximate(inForceHkd, "LIFE") || client.precision?.liabilities === "approximate" || client.precision?.liquidAssets === "approximate";
  const life = lifeMissing.length
    ? insufficient("life", lifeMissing, lifeExisting, lifeApprox)
    : withPrecision(resultForTarget({
        id: "life",
        existingCents: lifeExisting,
        targetCents: Math.max(
          0,
          client.annualIncomeCents * benchmarks.lifeIncomeMultiplier +
            client.outstandingLiabilitiesCents +
            client.dependantsFundCents -
            client.liquidAssetsCents
        ),
        steps: [
          { key: "income_x_multiplier", cents: client.annualIncomeCents * benchmarks.lifeIncomeMultiplier, multiplier: benchmarks.lifeIncomeMultiplier },
          { key: "liabilities", cents: client.outstandingLiabilitiesCents },
          { key: "dependants_fund", cents: client.dependantsFundCents },
          { key: "minus_liquid_assets", cents: -client.liquidAssetsCents },
          { key: "existing_life_cover", cents: lifeExisting },
        ],
      }), lifeApprox);

  const ciMissing = [];
  if (client.annualIncomeCents == null) ciMissing.push("annualIncome");
  if (client.treatmentBufferCents == null) ciMissing.push("treatmentBuffer");
  const ciApprox = categoryIsApproximate(inForceHkd, "CRITICAL_ILLNESS");
  const ci = ciMissing.length
    ? insufficient("critical_illness", ciMissing, ciExisting, ciApprox)
    : withPrecision(resultForTarget({
        id: "critical_illness",
        existingCents: ciExisting,
        targetCents:
          client.annualIncomeCents * benchmarks.ciIncomeMultiplier + client.treatmentBufferCents,
        steps: [
          { key: "income_x_multiplier", cents: client.annualIncomeCents * benchmarks.ciIncomeMultiplier, multiplier: benchmarks.ciIncomeMultiplier },
          { key: "treatment_buffer", cents: client.treatmentBufferCents },
          { key: "existing_ci_cover", cents: ciExisting },
        ],
      }), ciApprox);

  const medicalApprox = categoryIsApproximate(inForceHkd, "MEDICAL");
  const medical =
    client.preferredMedicalAnnualLimitCents == null
      ? insufficient("medical", ["preferredMedicalAnnualLimit"], medicalExisting, medicalApprox)
      : withPrecision(resultForTarget({
          id: "medical",
          existingCents: medicalExisting,
          targetCents: Math.max(0, client.preferredMedicalAnnualLimitCents),
          steps: [
            { key: "preferred_annual_limit", cents: client.preferredMedicalAnnualLimitCents },
            { key: "existing_medical_annual_limit", cents: medicalExisting },
          ],
        }), medicalApprox);

  const accident =
    client.accidentTargetCents == null
      ? insufficient("accident", ["accidentTarget"], accidentExisting)
      : resultForTarget({
          id: "accident",
          existingCents: accidentExisting,
          targetCents: Math.max(0, client.accidentTargetCents),
          steps: [
            { key: "target", cents: client.accidentTargetCents },
            { key: "existing_accident_cover", cents: accidentExisting },
          ],
        });

  return {
    benchmarkVersion: benchmarks.version,
    disclaimer: "Decision support only — not regulated advice",
    excluded: {
      lapsedIds: parts.lapsed.map((policy) => policy.id),
      unverifiedIds: parts.unverified.map((policy) => policy.id),
      nonHkdIds: nonHkd.map((policy) => policy.id),
    },
    dimensions: [life, ci, medical, accident],
  };
}
