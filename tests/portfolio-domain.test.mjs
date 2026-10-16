import test from "node:test";
import assert from "node:assert/strict";
import { parseHkdToCents, formatHkdFromCents, roundHalfUpDiv } from "../portfolio/domain/money.js";
import { calculateTaxEstimate } from "../portfolio/domain/tax.js";
import { calculateProtectionGap } from "../portfolio/domain/gap.js";
import { isInForce } from "../portfolio/domain/policy.js";
import { TAX_YEAR_2025_26 } from "../portfolio/config/tax-2025-26.js";
import { DEFAULT_GAP_BENCHMARKS } from "../portfolio/config/gap-benchmarks.js";

const tax = TAX_YEAR_2025_26;
const gap = DEFAULT_GAP_BENCHMARKS;

test("parses HKD into integer cents and rejects floats beyond 2 dp", () => {
  assert.deepEqual(parseHkdToCents("8,000.50"), { ok: true, cents: 800050 });
  assert.equal(parseHkdToCents("8000.555").ok, false);
  assert.equal(parseHkdToCents("").ok, false);
  assert.equal(roundHalfUpDiv(15_000, 10_000), 2);
  assert.match(formatHkdFromCents(800000, "en"), /8,000\.00/);
});

test("VHIS cap is per insured person and does not offset the QDAP/TVC cap", () => {
  const result = calculateTaxEstimate({
    config: tax,
    tvcPaidCents: 4_000_000,
    netChargeableIncomeCents: 20_000_000,
    policies: [
      { id: "v1", isVhisCertified: true, currency: "HKD", insuredPersonKey: "本人", premiumPaidCents: 900_000 },
      { id: "v2", isVhisCertified: true, currency: "HKD", insuredPersonKey: "子女", premiumPaidCents: 300_000 },
      { id: "q1", isQdap: true, currency: "HKD", insuredPersonKey: "本人", premiumPaidCents: 5_000_000 },
      { id: "usd", isVhisCertified: true, currency: "USD", insuredPersonKey: "本人", premiumPaidCents: 100_000 },
    ],
  });

  assert.equal(result.vhis.claimedCents, 800_000 + 300_000);
  assert.equal(result.vhis.excessCents, 100_000);
  assert.equal(result.vhis.excluded.length, 1);
  assert.equal(result.annuity.tvcAllowedCents, 4_000_000);
  assert.equal(result.annuity.qdapAllowedCents, 2_000_000);
  assert.equal(result.annuity.excessCents, 3_000_000);
  assert.equal(result.totalDeductionCents, 1_100_000 + 6_000_000);
  assert.equal(result.saving.kind, "estimated");
  assert.equal(result.saving.beforeTaxCents, 1_600_000);
  assert.equal(result.disclaimer, "Estimate — not tax advice");
});

test("TVC is allowed before QDAP when both exceed the combined cap", () => {
  const result = calculateTaxEstimate({
    config: tax,
    tvcPaidCents: 7_000_000,
    policies: [{ id: "q1", isQdap: true, currency: "HKD", premiumPaidCents: 1_000_000 }],
  });
  assert.equal(result.annuity.tvcAllowedCents, 6_000_000);
  assert.equal(result.annuity.qdapAllowedCents, 0);
  assert.equal(result.saving.kind, "insufficient_data");
});

test("life gap uses the configured formula and excludes lapsed or unverified cover", () => {
  const client = {
    annualIncomeCents: 60_000_000,
    outstandingLiabilitiesCents: 200_000_000,
    dependantsFundCents: 50_000_000,
    liquidAssetsCents: 30_000_000,
    treatmentBufferCents: 20_000_000,
    ageYears: 70,
  };
  const policies = [
    { id: "life", category: "LIFE", currency: "HKD", inForce: true, coverage: { kind: "whole" }, sumAssuredCents: 200_000_000 },
    { id: "old", category: "LIFE", currency: "HKD", inForce: true, inceptionDate: "2010-01-01", coverage: { kind: "years", years: 10 }, sumAssuredCents: 9_000_000_00 },
    { id: "age", category: "CRITICAL_ILLNESS", currency: "HKD", inForce: true, coverage: { kind: "toAge", toAge: 65 }, sumAssuredCents: 500_000_00 },
    { id: "usd", category: "LIFE", currency: "USD", inForce: true, coverage: { kind: "whole" }, sumAssuredCents: 100 },
  ];
  const result = calculateProtectionGap({ client, policies, benchmarks: gap, today: new Date("2026-10-15T00:00:00+08:00") });
  const life = result.dimensions.find((row) => row.id === "life");
  const ci = result.dimensions.find((row) => row.id === "critical_illness");
  const medical = result.dimensions.find((row) => row.id === "medical");

  assert.equal(life.status, "ok");
  assert.equal(life.targetCents, 820_000_000);
  assert.equal(life.existingCents, 200_000_000);
  assert.equal(life.gapCents, 620_000_000);
  assert.equal(ci.status, "ok");
  assert.equal(ci.existingCents, 0);
  assert.equal(medical.status, "insufficient_data");
  assert.deepEqual(result.excluded.lapsedIds, ["old", "age"]);
  assert.deepEqual(result.excluded.unverifiedIds, []);
  assert.equal(isInForce(policies[2], { ageYears: null }), null);
  assert.equal(isInForce(policies[2], client), false);
});

test("missing income never fabricates a zero life gap", () => {
  const result = calculateProtectionGap({
    client: { outstandingLiabilitiesCents: 0, dependantsFundCents: 0, liquidAssetsCents: 0 },
    policies: [],
    benchmarks: gap,
  });
  const life = result.dimensions.find((row) => row.id === "life");
  assert.equal(life.status, "insufficient_data");
  assert.equal(life.gapCents, undefined);
  assert.ok(life.missing.includes("annualIncome"));
});
