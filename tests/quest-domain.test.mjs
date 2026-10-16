import test from "node:test";
import assert from "node:assert/strict";
import {
  STAGE_ORDER,
  STAGE_STEPS,
  assignStatToSlot,
  computeStageFeedback,
  deriveDocumentRarity,
  deriveQuestStatuses,
  deriveRewardLevel,
  deriveStageStatus,
  emptyDraft,
  noneConfirmed,
  projectQuest,
  provided,
  unknown,
  visibleSteps,
} from "../portfolio/domain/quest.js";
import { QUEST_CONFIG } from "../portfolio/config/quest.js";
import { DEFAULT_GAP_BENCHMARKS } from "../portfolio/config/gap-benchmarks.js";
import { encryptJson, decryptJson } from "../portfolio/storage/draft-crypto.js";
import { calculateProtectionGap } from "../portfolio/domain/gap.js";

test("every quest input screen has at most two fields", () => {
  for (const stageId of STAGE_ORDER) {
    for (const step of STAGE_STEPS[stageId]) {
      if (step.kind === "input") assert.ok(step.fields.length >= 1 && step.fields.length <= 2);
    }
  }
});

test("end users unlock stages in order; skip does not grant a reward", () => {
  const draft = emptyDraft();
  let statuses = deriveQuestStatuses(draft.stages, { strictOrder: true, mode: "quick" });
  assert.equal(statuses.MEDICAL_SHIELD, "available");
  assert.equal(statuses.CI_BARRIER, "locked");

  draft.stages.MEDICAL_SHIELD.answers.planType = unknown();
  statuses = deriveQuestStatuses(draft.stages, { strictOrder: true, mode: "quick" });
  assert.equal(statuses.MEDICAL_SHIELD, "skipped");
  assert.equal(deriveRewardLevel("MEDICAL_SHIELD", draft.stages.MEDICAL_SHIELD.answers), null);
  assert.equal(statuses.CI_BARRIER, "available");
  assert.equal(statuses.LIFE_FORTRESS, "locked");
});

test("professional mode can open every stage", () => {
  const statuses = deriveQuestStatuses(emptyDraft().stages, { strictOrder: true, mode: "pro" });
  assert.deepEqual(Object.values(statuses), ["available", "available", "available", "available"]);
});

test("reward level follows data quality, not cover size", () => {
  const answers = {
    planType: noneConfirmed(),
  };
  assert.equal(deriveStageStatus("MEDICAL_SHIELD", answers), "completed");
  assert.equal(deriveRewardLevel("MEDICAL_SHIELD", answers), 2);

  const approximate = {
    planType: provided("VHIS", "approximate"),
    wardClass: provided("GENERAL", "approximate"),
    annualLimitCents: provided(40_000_000, "approximate"),
  };
  assert.equal(deriveRewardLevel("MEDICAL_SHIELD", approximate), 1);

  const exact = {
    sumAssuredCents: provided(50_000_000, "exact", "PRO_FORM"),
  };
  assert.equal(deriveRewardLevel("CI_BARRIER", exact), 2);

  const ocr = {
    sumAssuredCents: { kind: "provided", value: 1, precision: "exact", source: "OCR", reviewedByUser: true },
  };
  assert.equal(deriveRewardLevel("CI_BARRIER", ocr), 3);
});

test("medical feedback uses the ward benchmark and labels approximate input", () => {
  const feedback = computeStageFeedback(
    "MEDICAL_SHIELD",
    {
      planType: provided("OTHER", "exact"),
      wardClass: provided("GENERAL", "approximate"),
      annualLimitCents: provided(10_000_000, "approximate"),
    },
    DEFAULT_GAP_BENCHMARKS,
    {},
    QUEST_CONFIG
  );
  assert.equal(feedback.targetCents, 50_000_000);
  assert.equal(feedback.existingCents, 10_000_000);
  assert.equal(feedback.band, "low");
  assert.equal(feedback.approximate, true);
});

test("missing income never becomes a zero critical-illness ratio", () => {
  const feedback = computeStageFeedback(
    "CI_BARRIER",
    { sumAssuredCents: provided(100_000_000, "exact", "PRO_FORM") },
    DEFAULT_GAP_BENCHMARKS,
    {},
    QUEST_CONFIG
  );
  assert.equal(feedback.band, "insufficient_data");
  assert.equal(feedback.coverageRatio, null);
  assert.equal(feedback.existingCents, 100_000_000);
});

test("confirmed absence is not the same as unknown", () => {
  assert.equal(deriveStageStatus("CI_BARRIER", { sumAssuredCents: noneConfirmed() }), "completed");
  assert.equal(deriveStageStatus("CI_BARRIER", { sumAssuredCents: unknown() }), "skipped");
  const hidden = visibleSteps("MEDICAL_SHIELD", { planType: noneConfirmed() });
  assert.equal(hidden.some((step) => step.fields?.includes("annualLimitCents")), false);
});

test("assignment rejects a premium placed in a sum-assured slot", () => {
  const rejected = assignStatToSlot({ field: "annualPremiumCents", value: 1 }, "LIFE");
  assert.equal(rejected.ok, false);
  const accepted = assignStatToSlot({ field: "sumAssuredCents", value: 2 }, "LIFE");
  assert.equal(accepted.ok, true);
  assert.equal(accepted.answer.source, "OCR");
  assert.equal(accepted.answer.reviewedByUser, true);
});

test("document rarity is deterministic", () => {
  const fields = [
    { required: true, confidence: 0.9 },
    { required: true, confidence: 0.95 },
  ];
  assert.equal(deriveDocumentRarity(fields, QUEST_CONFIG), "SSR");
  assert.equal(deriveDocumentRarity([{ required: true, confidence: 0.7 }], QUEST_CONFIG), "SR");
  assert.equal(deriveDocumentRarity([{ required: true, confidence: 0.2 }], QUEST_CONFIG), "R");
});

test("quest projection feeds liabilities and liquid assets without inventing income", () => {
  const draft = emptyDraft();
  draft.stages.LIFE_FORTRESS.answers = {
    sumAssuredCents: provided(200_000_000, "approximate"),
    liabilitiesCents: provided(50_000_000, "exact", "PRO_FORM"),
  };
  draft.stages.SAVINGS_TREASURY.answers = {
    mpfCents: noneConfirmed(),
    cashCents: provided(10_000_000, "approximate"),
  };
  const projected = projectQuest(draft, QUEST_CONFIG);
  assert.equal(projected.client.annualIncomeCents, null);
  assert.equal(projected.client.outstandingLiabilitiesCents, 50_000_000);
  assert.equal(projected.client.liquidAssetsCents, 10_000_000);
  const gap = calculateProtectionGap({
    client: projected.client,
    policies: projected.policies,
    benchmarks: DEFAULT_GAP_BENCHMARKS,
  });
  const life = gap.dimensions.find((row) => row.id === "life");
  assert.equal(life.status, "insufficient_data");
  assert.equal(life.approximate, true);
  assert.equal(life.gapCents, undefined);
});

test("draft encryption round-trips without writing localStorage", async () => {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  const payload = await encryptJson(key, { hello: "保單", cents: 800000 });
  assert.equal(typeof localStorage, "undefined");
  const decoded = await decryptJson(key, payload);
  assert.deepEqual(decoded, { hello: "保單", cents: 800000 });
});
