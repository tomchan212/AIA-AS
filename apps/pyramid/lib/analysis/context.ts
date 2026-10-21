import type { LayerAssessment, LayerId, PyramidAnswers, PyramidReport } from "@/types";
import { analyzePyramid } from "./analyze";

export type Band = "above" | "around" | "below" | "unknown";

export function purchasingPower(amount: number, annualPercent: number, years: number) {
  const principal = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const rate = Number.isFinite(annualPercent) ? annualPercent / 100 : 0;
  const span = Number.isFinite(years) ? Math.max(0, years) : 0;
  if (rate <= -1) return 0;
  return principal / (1 + rate) ** span;
}

export function compoundBalance(amount: number, annualPercent: number, years: number) {
  const principal = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const rate = Number.isFinite(annualPercent) ? annualPercent / 100 : 0;
  const span = Number.isFinite(years) ? Math.max(0, years) : 0;
  if (rate <= -1) return 0;
  return principal * (1 + rate) ** span;
}

export function medicalBand(limit: number | null, hasMedical: boolean | null, reference: number | null): Band {
  if (reference === null || reference <= 0) return "unknown";
  if (hasMedical === false) return "below";
  if (limit === null || !Number.isFinite(limit) || limit <= 0) return "unknown";
  if (limit >= reference) return "above";
  if (limit >= reference * 0.8) return "around";
  return "below";
}

export function peerBand(value: number, median: number | null): Band {
  if (median === null || median <= 0 || !Number.isFinite(value)) return "unknown";
  const ratio = Math.max(0, value) / median;
  if (ratio > 1.1) return "above";
  if (ratio < 0.9) return "below";
  return "around";
}

export function ageGrowthReference(age: number) {
  const years = Number.isFinite(age) ? age : 0;
  const share = Math.min(0.8, Math.max(0, (100 - years) / 100));
  return share;
}

export interface CashGap {
  kind: "none" | "shortfall" | "excess" | "cover";
  gap: number;
  monthly: { months: number; amount: number }[];
}

export function cashGap(layer: LayerAssessment): CashGap {
  const months = [6, 12, 24];
  if (layer.status === "enough") return { kind: "none", gap: 0, monthly: months.map((span) => ({ months: span, amount: 0 })) };
  if (layer.direction === "excess") {
    const gap = Math.max(0, layer.actualAmount - layer.idealAmount);
    return { kind: "excess", gap, monthly: months.map((span) => ({ months: span, amount: 0 })) };
  }
  const gap = Math.max(0, layer.idealAmount - layer.actualAmount);
  if (gap <= 0) return { kind: "cover", gap: 0, monthly: months.map((span) => ({ months: span, amount: 0 })) };
  return {
    kind: "shortfall",
    gap,
    monthly: months.map((span) => ({ months: span, amount: gap / span })),
  };
}

export function coverGap(target: number, held: number) {
  const safeTarget = Number.isFinite(target) ? Math.max(0, target) : 0;
  const safeHeld = Number.isFinite(held) ? Math.max(0, held) : 0;
  return Math.max(0, safeTarget - safeHeld);
}

export function jobLossStress(cash: number, monthlySpending: number, months: number) {
  const spending = Number.isFinite(monthlySpending) ? Math.max(0, monthlySpending) : 0;
  const held = Number.isFinite(cash) ? Math.max(0, cash) : 0;
  const span = Number.isFinite(months) ? Math.max(0, months) : 0;
  const need = spending * span;
  return {
    need,
    covered: held >= need,
    gap: Math.max(0, need - held),
    monthsCovered: spending > 0 ? held / spending : null,
  };
}

export function illnessStress(cash: number, dailyFee: number | null, days: number) {
  const held = Number.isFinite(cash) ? Math.max(0, cash) : 0;
  const span = Number.isFinite(days) ? Math.max(0, days) : 0;
  if (dailyFee === null || !Number.isFinite(dailyFee)) return { cost: null, covered: false, gap: null };
  const cost = Math.max(0, dailyFee) * span;
  return { cost, covered: held >= cost, gap: Math.max(0, cost - held) };
}

export function marketDrop(growth: number, speculative: number, drop: number) {
  const factor = Math.min(1, Math.max(0, 1 - drop));
  const growthValue = Math.max(0, growth);
  const speculativeValue = Math.max(0, speculative);
  return {
    growth: growthValue * factor,
    speculative: speculativeValue * factor,
    loss: (growthValue + speculativeValue) * Math.min(1, Math.max(0, drop)),
  };
}

export function rebalance(amounts: Record<LayerId, number>, id: LayerId, nextValue: number): Record<LayerId, number> {
  const order: LayerId[] = ["protection", "stable", "growth", "speculative"];
  const total = order.reduce((sum, key) => sum + Math.max(0, amounts[key] || 0), 0);
  const clamped = Math.min(total, Math.max(0, nextValue));
  const rest = total - clamped;
  const others = order.filter((key) => key !== id);
  const otherSum = others.reduce((sum, key) => sum + Math.max(0, amounts[key] || 0), 0);
  const next = { ...amounts, [id]: clamped };
  others.forEach((key) => {
    next[key] = otherSum > 0 ? rest * (Math.max(0, amounts[key] || 0) / otherSum) : rest / others.length;
  });
  return next;
}

export function analyzeAmounts(base: PyramidAnswers, amounts: Record<LayerId, number>) {
  return analyzePyramid({
    ...base,
    emergencyCash: amounts.protection,
    stableSavings: amounts.stable,
    growthInvestments: amounts.growth,
    speculative: amounts.speculative,
  });
}

export function lifeReference(annualIncome: number, multiplier: number, liabilities: number, cap: number) {
  const income = Number.isFinite(annualIncome) ? Math.max(0, annualIncome) : 0;
  const debt = Number.isFinite(liabilities) ? Math.max(0, liabilities) : 0;
  const chosen = Number.isFinite(multiplier) ? Math.min(cap, Math.max(0, multiplier)) : 0;
  return income * chosen + debt;
}

export function highRiskFlag(share: number, threshold: number) {
  return Number.isFinite(share) && share > threshold;
}

export function reportAmounts(report: PyramidReport): Record<LayerId, number> {
  return Object.fromEntries(report.layers.map((layer) => [layer.id, layer.actualAmount])) as Record<LayerId, number>;
}
