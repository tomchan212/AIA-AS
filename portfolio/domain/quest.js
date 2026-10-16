export const STAGE_ORDER = Object.freeze([
  "MEDICAL_SHIELD",
  "CI_BARRIER",
  "LIFE_FORTRESS",
  "SAVINGS_TREASURY",
]);

/** Each input step has at most two fields. */
export const STAGE_STEPS = Object.freeze({
  MEDICAL_SHIELD: Object.freeze([
    Object.freeze({ kind: "intro" }),
    Object.freeze({ kind: "input", fields: Object.freeze(["planType"]) }),
    Object.freeze({ kind: "input", fields: Object.freeze(["wardClass", "annualLimitCents"]), when: "has_plan" }),
    Object.freeze({ kind: "complete" }),
  ]),
  CI_BARRIER: Object.freeze([
    Object.freeze({ kind: "intro" }),
    Object.freeze({ kind: "input", fields: Object.freeze(["sumAssuredCents"]) }),
    Object.freeze({ kind: "complete" }),
  ]),
  LIFE_FORTRESS: Object.freeze([
    Object.freeze({ kind: "intro" }),
    Object.freeze({ kind: "input", fields: Object.freeze(["sumAssuredCents"]) }),
    Object.freeze({ kind: "input", fields: Object.freeze(["liabilitiesCents"]) }),
    Object.freeze({ kind: "complete" }),
  ]),
  SAVINGS_TREASURY: Object.freeze([
    Object.freeze({ kind: "intro" }),
    Object.freeze({ kind: "input", fields: Object.freeze(["mpfCents"]) }),
    Object.freeze({ kind: "input", fields: Object.freeze(["cashCents"]) }),
    Object.freeze({ kind: "complete" }),
  ]),
});

const SLOT_FIELDS = Object.freeze({
  MEDICAL: Object.freeze(["annualLimitCents", "wardClass", "planType"]),
  CRITICAL_ILLNESS: Object.freeze(["sumAssuredCents"]),
  LIFE: Object.freeze(["sumAssuredCents", "liabilitiesCents"]),
  SAVINGS: Object.freeze(["mpfCents", "cashCents"]),
});

export function provided(value, precision, source = "QUICK_INPUT") {
  return { kind: "provided", value, precision, source, reviewedByUser: source !== "OCR" ? true : false };
}

export function noneConfirmed() {
  return { kind: "none_confirmed" };
}

export function unknown() {
  return { kind: "unknown" };
}

export function visibleSteps(stageId, answers = {}) {
  return STAGE_STEPS[stageId].filter((step) => {
    if (step.when !== "has_plan") return true;
    return answers.planType?.kind === "provided";
  });
}

function settled(answer) {
  return answer?.kind === "provided" || answer?.kind === "none_confirmed";
}

function requiredKeys(stageId, answers) {
  if (stageId === "MEDICAL_SHIELD") {
    if (answers.planType?.kind === "none_confirmed") return ["planType"];
    if (answers.planType?.kind === "provided") return ["planType", "wardClass", "annualLimitCents"];
    return ["planType"];
  }
  if (stageId === "CI_BARRIER") return ["sumAssuredCents"];
  if (stageId === "LIFE_FORTRESS") return ["sumAssuredCents", "liabilitiesCents"];
  return ["mpfCents", "cashCents"];
}

export function deriveStageStatus(stageId, answers = {}) {
  const keys = requiredKeys(stageId, answers);
  if (keys.some((key) => answers[key]?.kind === "unknown")) return "skipped";
  if (keys.every((key) => settled(answers[key]))) return "completed";
  return "in_progress";
}

function hasAny(answers = {}) {
  return Object.values(answers).some(Boolean);
}

export function deriveQuestStatuses(stages = {}, { strictOrder = true, mode = "quick" } = {}) {
  const statuses = {};
  let previousDone = true;
  for (const stageId of STAGE_ORDER) {
    const answers = stages[stageId]?.answers || {};
    const intrinsic = deriveStageStatus(stageId, answers);
    const openMode = mode === "pro" || !strictOrder;
    if (!openMode && !previousDone) statuses[stageId] = "locked";
    else if (intrinsic === "completed" || intrinsic === "skipped") statuses[stageId] = intrinsic;
    else if (hasAny(answers)) statuses[stageId] = "in_progress";
    else statuses[stageId] = "available";
    previousDone = statuses[stageId] === "completed" || statuses[stageId] === "skipped";
  }
  return statuses;
}

export function deriveRewardLevel(stageId, answers = {}) {
  if (deriveStageStatus(stageId, answers) !== "completed") return null;
  const providedAnswers = Object.values(answers).filter((answer) => answer?.kind === "provided");
  const ocrConfirmed =
    providedAnswers.length > 0 &&
    providedAnswers.every((answer) => answer.source === "OCR" && answer.reviewedByUser === true);
  if (ocrConfirmed) return 3;
  if (providedAnswers.every((answer) => answer.precision === "exact")) return 2;
  return 1;
}

function bandFor(ratio, config) {
  if (ratio == null) return "insufficient_data";
  if (ratio < config.bands.lowBelow) return "low";
  if (ratio < config.bands.moderateBelow) return "moderate";
  return "strong";
}

function ratio(existing, target) {
  if (target <= 0) return existing > 0 ? 1.5 : 1;
  return Math.min(1.5, Math.max(0, existing / target));
}

function centsOf(answer) {
  if (answer?.kind === "none_confirmed") return 0;
  if (answer?.kind === "provided") return answer.value;
  return null;
}

export function computeStageFeedback(stageId, draftAnswers = {}, benchmarks, clientProfile = {}, questConfig) {
  if (!questConfig) throw new TypeError("quest config is required");
  if (stageId === "MEDICAL_SHIELD") return medicalFeedback(draftAnswers, questConfig);
  if (stageId === "CI_BARRIER") return ciFeedback(draftAnswers.sumAssuredCents, benchmarks, clientProfile, questConfig);
  if (stageId === "LIFE_FORTRESS") return lifeFeedback(draftAnswers, benchmarks, clientProfile, questConfig);
  return savingsFeedback(draftAnswers);
}

function medicalFeedback(answers, questConfig) {
  const plan = answers.planType;
  if (!plan || plan.kind === "unknown") {
    return { coverageRatio: null, band: "insufficient_data", approximate: false, explain: [{ key: "plan_unknown" }] };
  }
  if (plan.kind === "none_confirmed") {
    return {
      coverageRatio: null,
      band: "insufficient_data",
      existingCents: 0,
      deliberateZero: true,
      approximate: false,
      explain: [{ key: "no_medical_plan" }],
    };
  }
  const ward = answers.wardClass;
  const limit = answers.annualLimitCents;
  if (ward?.kind !== "provided" || centsOf(limit) == null) {
    return { coverageRatio: null, band: "insufficient_data", approximate: false, explain: [{ key: "medical_incomplete" }] };
  }
  const target = questConfig.wardAnnualLimitCents[ward.value];
  if (target == null) {
    return { coverageRatio: null, band: "insufficient_data", approximate: false, explain: [{ key: "ward_unconfigured" }] };
  }
  const existing = centsOf(limit);
  const coverageRatio = ratio(existing, target);
  return {
    coverageRatio,
    band: bandFor(coverageRatio, questConfig),
    existingCents: existing,
    targetCents: target,
    approximate: limit.precision === "approximate",
    explain: [
      { key: "existing_medical_annual_limit", cents: existing },
      { key: "ward_benchmark", cents: target },
    ],
  };
}

function ciFeedback(answer, benchmarks, clientProfile, questConfig) {
  const existing = centsOf(answer);
  if (answer?.kind === "unknown" || existing == null) {
    return { coverageRatio: null, band: "insufficient_data", approximate: false, explain: [{ key: "cover_unknown" }] };
  }
  const income = clientProfile.annualIncomeCents;
  const buffer = clientProfile.treatmentBufferCents;
  if (income == null || buffer == null || !benchmarks) {
    return {
      coverageRatio: null,
      band: "insufficient_data",
      existingCents: existing,
      deliberateZero: answer.kind === "none_confirmed",
      approximate: answer.precision === "approximate",
      explain: [{ key: "existing_ci_cover", cents: existing }, { key: "income_or_buffer_missing" }],
    };
  }
  const target = income * benchmarks.ciIncomeMultiplier + buffer;
  const coverageRatio = ratio(existing, target);
  return {
    coverageRatio,
    band: bandFor(coverageRatio, questConfig),
    existingCents: existing,
    targetCents: target,
    approximate: answer.precision === "approximate",
    explain: [
      { key: "existing_ci_cover", cents: existing },
      { key: "target", cents: target },
    ],
  };
}

function lifeFeedback(answers, benchmarks, clientProfile, questConfig) {
  const existing = centsOf(answers.sumAssuredCents);
  const liabilities = centsOf(answers.liabilitiesCents);
  if (answers.sumAssuredCents?.kind === "unknown" || answers.liabilitiesCents?.kind === "unknown") {
    return { coverageRatio: null, band: "insufficient_data", approximate: false, explain: [{ key: "life_unknown" }] };
  }
  if (
    existing == null ||
    liabilities == null ||
    clientProfile.annualIncomeCents == null ||
    clientProfile.dependantsFundCents == null ||
    clientProfile.liquidAssetsCents == null ||
    !benchmarks
  ) {
    return {
      coverageRatio: null,
      band: "insufficient_data",
      existingCents: existing,
      approximate: answers.sumAssuredCents?.precision === "approximate",
      explain: [
        existing == null ? { key: "life_cover_missing" } : { key: "existing_life_cover", cents: existing },
        liabilities == null ? { key: "liabilities_missing" } : { key: "liabilities", cents: liabilities },
      ],
    };
  }
  const target = Math.max(
    0,
    clientProfile.annualIncomeCents * benchmarks.lifeIncomeMultiplier +
      liabilities +
      clientProfile.dependantsFundCents -
      clientProfile.liquidAssetsCents
  );
  const coverageRatio = ratio(existing, target);
  return {
    coverageRatio,
    band: bandFor(coverageRatio, questConfig),
    existingCents: existing,
    targetCents: target,
    approximate: answers.sumAssuredCents?.precision === "approximate" || answers.liabilitiesCents?.precision === "approximate",
    explain: [
      { key: "existing_life_cover", cents: existing },
      { key: "target", cents: target },
    ],
  };
}

function savingsFeedback(answers) {
  const mpf = centsOf(answers.mpfCents);
  const cash = centsOf(answers.cashCents);
  if (mpf == null || cash == null) {
    return { coverageRatio: null, band: "insufficient_data", approximate: false, explain: [{ key: "savings_incomplete" }] };
  }
  return {
    coverageRatio: null,
    band: "insufficient_data",
    recordedCents: mpf + cash,
    approximate: answers.mpfCents?.precision === "approximate" || answers.cashCents?.precision === "approximate",
    explain: [
      { key: "mpf", cents: mpf },
      { key: "cash", cents: cash },
      { key: "liquid_assets", cents: mpf + cash },
    ],
  };
}

export function deriveDocumentRarity(fields, questConfig) {
  const required = fields.filter((field) => field.required);
  if (!required.length) return "R";
  if (required.every((field) => field.confidence >= questConfig.rarity.ssrMinConfidence)) return "SSR";
  if (required.every((field) => field.confidence >= questConfig.rarity.srMinConfidence)) return "SR";
  return "R";
}

export function assignStatToSlot(stat, slotId) {
  const allowed = SLOT_FIELDS[slotId];
  if (!allowed || !allowed.includes(stat.field)) return { ok: false, code: "incompatible" };
  return {
    ok: true,
    slotId,
    field: stat.field,
    answer: {
      kind: "provided",
      value: stat.value,
      precision: "exact",
      source: "OCR",
      reviewedByUser: true,
    },
  };
}

function sumLiquid(mpf, cash) {
  const mpfCents = centsOf(mpf);
  const cashCents = centsOf(cash);
  if (mpfCents == null || cashCents == null) return null;
  return mpfCents + cashCents;
}

export function projectQuest(draft, questConfig) {
  const medical = draft.stages?.MEDICAL_SHIELD?.answers || {};
  const ci = draft.stages?.CI_BARRIER?.answers || {};
  const life = draft.stages?.LIFE_FORTRESS?.answers || {};
  const savings = draft.stages?.SAVINGS_TREASURY?.answers || {};
  const pro = draft.pro || {};
  const policies = [];

  const medicalLimit = centsOf(medical.annualLimitCents);
  if (medical.planType?.kind === "provided" && medicalLimit != null) {
    policies.push({
      id: "quest-medical",
      category: "MEDICAL",
      currency: "HKD",
      inForce: true,
      coverage: { kind: "whole" },
      medicalAnnualLimitCents: medicalLimit,
      premiumPaidCents: pro.vhisPremiumCents || 0,
      sumAssuredCents: 0,
      isVhisCertified: medical.planType.value === "VHIS" && (pro.vhisPremiumCents || 0) > 0,
      isQdap: false,
      precision: medical.annualLimitCents.precision,
    });
  }
  const ciCover = centsOf(ci.sumAssuredCents);
  if (ciCover != null) {
    policies.push({
      id: "quest-ci",
      category: "CRITICAL_ILLNESS",
      currency: "HKD",
      inForce: true,
      coverage: { kind: "whole" },
      sumAssuredCents: ciCover,
      medicalAnnualLimitCents: 0,
      premiumPaidCents: 0,
      isVhisCertified: false,
      isQdap: false,
      precision: ci.sumAssuredCents?.precision,
    });
  }
  const lifeCover = centsOf(life.sumAssuredCents);
  if (lifeCover != null) {
    policies.push({
      id: "quest-life",
      category: "LIFE",
      currency: "HKD",
      inForce: true,
      coverage: { kind: "whole" },
      sumAssuredCents: lifeCover,
      medicalAnnualLimitCents: 0,
      premiumPaidCents: 0,
      isVhisCertified: false,
      isQdap: pro.qdap === true,
      precision: life.sumAssuredCents?.precision,
    });
  }
  if (pro.qdapPremiumCents) {
    policies.push({
      id: "quest-qdap",
      category: "SAVINGS_ANNUITY",
      currency: "HKD",
      inForce: true,
      coverage: { kind: "whole" },
      sumAssuredCents: 0,
      medicalAnnualLimitCents: 0,
      premiumPaidCents: pro.qdapPremiumCents,
      isVhisCertified: false,
      isQdap: true,
      precision: "exact",
    });
  }

  const wardTarget =
    medical.wardClass?.kind === "provided" ? questConfig.wardAnnualLimitCents[medical.wardClass.value] : null;
  return {
    client: {
      annualIncomeCents: pro.annualIncomeCents ?? null,
      outstandingLiabilitiesCents: centsOf(life.liabilitiesCents),
      dependantsFundCents: pro.dependantsFundCents ?? null,
      liquidAssetsCents: sumLiquid(savings.mpfCents, savings.cashCents),
      treatmentBufferCents: pro.treatmentBufferCents ?? null,
      preferredMedicalAnnualLimitCents: wardTarget ?? pro.preferredMedicalAnnualLimitCents ?? null,
      accidentTargetCents: pro.accidentTargetCents ?? null,
      ageYears: pro.ageYears ?? null,
    },
    policies,
    tvcPaidCents: pro.tvcPaidCents || 0,
    netChargeableIncomeCents: pro.netChargeableIncomeCents ?? null,
  };
}

export function emptyDraft() {
  return {
    version: 1,
    mode: "quick",
    pro: {},
    stages: Object.fromEntries(STAGE_ORDER.map((stageId) => [stageId, { answers: {}, stepIndex: 0, updatedAt: null }])),
  };
}
