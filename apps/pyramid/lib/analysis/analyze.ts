import { PYRAMID_CONFIG, type PyramidConfig } from "@/lib/config/pyramid";
import type {
  GapDirection,
  GapStatus,
  LayerAssessment,
  LayerId,
  Priority,
  PyramidAnswers,
  PyramidReport,
  RadarScores,
  ReasonCode,
} from "@/types";
import { scoreRisk } from "./risk";
import { clampAge, idealWeights } from "./weights";

interface CleanMoney {
  value: number;
  negative: boolean;
}

function cleanMoney(value: number, config: PyramidConfig): CleanMoney {
  if (!Number.isFinite(value)) return { value: 0, negative: false };
  if (value < 0) return { value: 0, negative: true };
  return { value: Math.min(config.moneyCap, value), negative: false };
}

function worst(statuses: GapStatus[]): GapStatus {
  if (statuses.includes("severe")) return "severe";
  if (statuses.includes("partial")) return "partial";
  return "enough";
}

function points(status: GapStatus, config: PyramidConfig) {
  return config.statusPoints[status];
}

function allocationStatus(actualShare: number, idealShare: number, config: PyramidConfig): { status: GapStatus; direction: GapDirection } {
  if (idealShare <= 0.02) {
    return actualShare > config.speculativePartialShare
      ? { status: "partial", direction: "excess" }
      : { status: "enough", direction: "balanced" };
  }
  const ratio = actualShare / idealShare;
  if (ratio >= config.allocationEnoughRatio) return { status: "enough", direction: "balanced" };
  if (ratio >= config.allocationPartialRatio) return { status: "partial", direction: "shortfall" };
  return { status: "severe", direction: "shortfall" };
}

function speculativeStatus(actualShare: number, idealShare: number, config: PyramidConfig): { status: GapStatus; direction: GapDirection } {
  if (actualShare <= idealShare * config.speculativeComfortRatio) {
    return { status: "enough", direction: "balanced" };
  }
  if (actualShare <= Math.max(idealShare * 2, config.speculativePartialShare)) {
    return { status: "partial", direction: "excess" };
  }
  return { status: "severe", direction: "excess" };
}

export function analyzePyramid(input: PyramidAnswers, config: PyramidConfig = PYRAMID_CONFIG): PyramidReport {
  const warnings: ReasonCode[] = [];
  const age = clampAge(input.age, config);
  if (age.clamped) warnings.push("age_clamped");
  const dependants = Math.max(0, Math.round(Number.isFinite(input.dependants) ? input.dependants : 0));

  const fields = {
    monthlyIncome: cleanMoney(input.monthlyIncome, config),
    monthlyExpense: cleanMoney(input.monthlyExpense, config),
    emergencyCash: cleanMoney(input.emergencyCash, config),
    lifeCover: cleanMoney(input.lifeCover, config),
    criticalIllnessCover: cleanMoney(input.criticalIllnessCover, config),
    medicalAnnualLimit: cleanMoney(input.medicalAnnualLimit, config),
    accidentCover: cleanMoney(input.accidentCover, config),
    stableSavings: cleanMoney(input.stableSavings, config),
    growthInvestments: cleanMoney(input.growthInvestments, config),
    speculative: cleanMoney(input.speculative, config),
    liabilities: cleanMoney(input.liabilities, config),
  };
  if (Object.values(fields).some((field) => field.negative)) warnings.push("negative_clamped");

  const annualIncome = fields.monthlyIncome.value * 12;
  const expense = fields.monthlyExpense.value;
  const emergencyTargetMonths = dependants > 0 ? config.emergencyMonths.withDependants : config.emergencyMonths.single;
  const emergencyMonths = expense > 0 ? fields.emergencyCash.value / expense : null;

  const risk = scoreRisk(input.riskAnswers, config);
  const weights = idealWeights(age.age, dependants, risk.profile, config);
  const amounts: Record<LayerId, number> = {
    protection: fields.emergencyCash.value,
    stable: fields.stableSavings.value,
    growth: fields.growthInvestments.value,
    speculative: fields.speculative.value,
  };
  const totalAssets = amounts.protection + amounts.stable + amounts.growth + amounts.speculative;
  if (totalAssets <= 0) warnings.push("no_assets");
  const shares = Object.fromEntries(
    config.layerOrder.map((id) => [id, totalAssets > 0 ? amounts[id] / totalAssets : 0]),
  ) as Record<LayerId, number>;

  const emergencyReasons: ReasonCode[] = [];
  let emergencyStatus: GapStatus = "enough";
  if (emergencyMonths == null) {
    emergencyStatus = fields.emergencyCash.value > 0 ? "partial" : "partial";
    emergencyReasons.push("emergency_unknown");
  } else if (emergencyMonths >= emergencyTargetMonths) {
    emergencyStatus = "enough";
  } else if (emergencyMonths >= emergencyTargetMonths * config.emergencyMonths.partialRatio) {
    emergencyStatus = "partial";
    emergencyReasons.push("emergency_short");
  } else {
    emergencyStatus = "severe";
    emergencyReasons.push("emergency_short");
  }

  const lifeMultiplier = Math.min(
    config.lifeMultiplierCap,
    config.lifeIncomeMultiplier + dependants * config.lifeDependantExtra,
  );
  const lifeTarget = annualIncome * lifeMultiplier + fields.liabilities.value;
  const lifeReasons: ReasonCode[] = [];
  let lifeStatus: GapStatus = "enough";
  if (annualIncome <= 0 && dependants > 0 && fields.lifeCover.value <= 0 && fields.liabilities.value <= 0) {
    lifeStatus = "severe";
    lifeReasons.push("life_dependants_no_income");
  } else if (lifeTarget > 0) {
    const ratio = fields.lifeCover.value / lifeTarget;
    if (ratio >= 1) lifeStatus = "enough";
    else if (ratio >= 0.4) {
      lifeStatus = "partial";
      lifeReasons.push("life_short");
    } else {
      lifeStatus = "severe";
      lifeReasons.push("life_short");
    }
  }

  const medicalReasons: ReasonCode[] = [];
  let medicalStatus: GapStatus = "enough";
  if (input.mode === "quick") {
    if (input.hasMedical !== true) {
      medicalStatus = "severe";
      medicalReasons.push("medical_missing");
    }
  } else if (fields.medicalAnnualLimit.value >= config.medicalAnnualLimitMin) {
    medicalStatus = "enough";
  } else if (fields.medicalAnnualLimit.value > 0) {
    medicalStatus = "partial";
    medicalReasons.push("medical_low");
  } else {
    medicalStatus = "severe";
    medicalReasons.push("medical_missing");
  }

  const extraReasons: ReasonCode[] = [];
  const extraStatuses: GapStatus[] = [];
  if (input.mode === "pro" && annualIncome > 0) {
    const ciTarget = annualIncome * config.ciIncomeMultiplier;
    const ciRatio = fields.criticalIllnessCover.value / ciTarget;
    if (ciRatio < 0.4) {
      extraStatuses.push("severe");
      extraReasons.push("ci_short");
    } else if (ciRatio < 1) {
      extraStatuses.push("partial");
      extraReasons.push("ci_short");
    }
    if (fields.accidentCover.value <= 0) {
      extraStatuses.push("partial");
      extraReasons.push("accident_missing");
    }
  }
  const ciTarget = annualIncome > 0 ? annualIncome * config.ciIncomeMultiplier : 0;

  const protectionStatus = worst([emergencyStatus, lifeStatus, medicalStatus, ...extraStatuses]);
  const protectionReasons = [...emergencyReasons, ...lifeReasons, ...medicalReasons, ...extraReasons];
  const protectionIdealAmount = Math.max(emergencyTargetMonths * expense, weights.protection * totalAssets);

  function bucket(id: Exclude<LayerId, "protection">, judge: typeof allocationStatus): LayerAssessment {
    const judged = judge(shares[id], weights[id], config);
    const reasons: ReasonCode[] = [];
    if (judged.direction === "shortfall" && judged.status !== "enough") reasons.push("allocation_short");
    if (judged.direction === "excess" && judged.status !== "enough") reasons.push("allocation_excess");
    return {
      id,
      status: judged.status,
      direction: judged.direction,
      actualAmount: amounts[id],
      idealAmount: weights[id] * totalAssets,
      actualShare: shares[id],
      idealShare: weights[id],
      reasons,
    };
  }

  const layers: LayerAssessment[] = [
    {
      id: "protection",
      status: protectionStatus,
      direction: protectionStatus === "enough" ? "balanced" : "shortfall",
      actualAmount: amounts.protection,
      idealAmount: protectionIdealAmount,
      actualShare: shares.protection,
      idealShare: weights.protection,
      reasons: protectionReasons,
    },
    bucket("stable", allocationStatus),
    bucket("growth", allocationStatus),
    bucket("speculative", speculativeStatus),
  ];

  const healthScore = Math.round(
    config.layerOrder.reduce((sum, id) => {
      const layer = layers.find((item) => item.id === id);
      return sum + config.scoreWeights[id] * points(layer?.status ?? "severe", config);
    }, 0),
  );

  const radar: RadarScores = {
    protection: points(protectionStatus, config),
    savings: points(layers.find((layer) => layer.id === "stable")?.status ?? "severe", config),
    investment: points(layers.find((layer) => layer.id === "growth")?.status ?? "severe", config),
    riskControl: points(layers.find((layer) => layer.id === "speculative")?.status ?? "severe", config),
    liquidity: points(emergencyStatus, config),
  };

  const priorities: Priority[] = layers
    .filter((layer) => layer.status !== "enough")
    .map((layer) => ({
      id: `${layer.id}-${layer.reasons[0] ?? layer.direction}`,
      layer: layer.id,
      status: layer.status,
      reason: layer.reasons[0] ?? (layer.direction === "excess" ? "allocation_excess" : "allocation_short"),
      rankScore: config.scoreWeights[layer.id] * (layer.status === "severe" ? 2 : 1),
    }))
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 3);

  return {
    riskProfile: risk.profile,
    riskScore: risk.score,
    riskAnswered: risk.answered,
    healthScore,
    layers,
    radar,
    priorities,
    warnings,
    emergencyMonths,
    emergencyTargetMonths,
    lifeTarget,
    lifeMultiplier,
    ciTarget,
    annualIncome,
    totalAssets,
    idealWeights: weights,
  };
}
