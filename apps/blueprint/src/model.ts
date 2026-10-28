import { AVF_HKD, MASTER_DATA, USD_HKD, withdrawalAtAge, type PolicyYearData } from "./data";

export interface YearLine {
  calendarYear: number;
  policyYear: number;
  age: number;
  avfHKD: number | null;
  avfApproximate: boolean;
  planA: {
    savingsPremiumUSD: number;
    cumulativeSavingsUSD: number;
    combinedCashValueUSD: number | null;
    approximate: boolean;
    note: string;
  };
  planB: {
    savingsPremiumUSD: number;
    cumulativeSavingsUSD: number;
    annualWithdrawalUSD: number;
    cumulativeWithdrawnUSD: number;
    listedCumulativeWithdrawnUSD: number | null;
    remainingCashValueUSD: number | null;
    note: string;
  };
}

export function yearLine(age: number): YearLine {
  const safeAge = Math.min(100, Math.max(37, Math.round(age)));
  const policyYear = safeAge - 36;
  const planAPremium = policyYear <= 20 ? 3000 : 0;
  const planACumulative = policyYear <= 10 ? 3000 * policyYear : policyYear <= 20 ? 30000 + 3000 * (policyYear - 10) : 60000;
  const planBPremium = policyYear <= 10 ? 5000 : 0;
  const planBCumulative = policyYear <= 10 ? 5000 * policyYear : 50000;
  let withdrawn = 0;
  for (let current = 60; current <= safeAge; current += 1) withdrawn += withdrawalAtAge(current);
  const snap = MASTER_DATA.find((row) => row.age === safeAge);
  const avf = AVF_HKD[safeAge];
  return {
    calendarYear: 1982 + safeAge,
    policyYear,
    age: safeAge,
    avfHKD: avf?.amount ?? null,
    avfApproximate: avf?.approximate ?? false,
    planA: {
      savingsPremiumUSD: planAPremium,
      cumulativeSavingsUSD: planACumulative,
      combinedCashValueUSD: snap ? snap.planA.combinedCashValueUSD : null,
      approximate: snap?.planA.approximate ?? false,
      note: snap?.planA.note ?? "這一年的現金價值沒有列在對照表。",
    },
    planB: {
      savingsPremiumUSD: planBPremium,
      cumulativeSavingsUSD: planBCumulative,
      annualWithdrawalUSD: withdrawalAtAge(safeAge),
      cumulativeWithdrawnUSD: withdrawn,
      listedCumulativeWithdrawnUSD: snap && snap.age >= 60 ? snap.planB.cumulativeWithdrawnUSD : null,
      remainingCashValueUSD: snap ? snap.planB.remainingCashValueUSD : null,
      note: snap?.planB.medicalOffsetStatus ?? "這一年的剩餘現金價值沒有列在對照表。",
    },
  };
}

export function allYears() {
  return Array.from({ length: 64 }, (_, index) => yearLine(37 + index));
}

export function rowAtAge(age: number): { row: PolicyYearData; snapped: boolean } {
  const line = yearLine(age);
  const snap = MASTER_DATA.find((item) => item.age === line.age);
  return { row: snap ?? MASTER_DATA[0], snapped: !snap };
}

export type QuizChoice = "A" | "B";

export function diagnose(answers: QuizChoice[]) {
  const scoreB = answers.filter((answer) => answer === "B").length;
  if (scoreB === answers.length - scoreB) {
    return {
      plan: "平手" as const,
      title: "兩種安排都說得通",
      body: "三題沒有明顯偏向。可以先看 47 歲的供款結束，以及 60 歲方案 B 開始提取的那一行。這不是購買建議。",
    };
  }
  if (scoreB < answers.length / 2) {
    return {
      plan: "A" as const,
      title: "比較貼近方案 A · 兩張單接力",
      body: "你較想每年供 3,000 美元，並讓兩張單一直滾存、不從戶口提錢。對照表寫兩張單合計本金 60,000 美元，100 歲合計現金價值 1,858,945 美元。這只是按三題整理。",
    };
  }
  return {
    plan: "B" as const,
    title: "比較貼近方案 B · 供 10 年，60 歲起提取",
    body: "你較想一張單供完就停，並在 60 歲後按對照表每年提取。基本本金是 50,000 美元。提取後 100 歲對照表仍列剩餘 1,011,765 美元。這只是按三題整理。",
  };
}

export function medicalCovered(age: number, avfHKD: number) {
  const withdrawalHKD = withdrawalAtAge(age) * USD_HKD;
  if (withdrawalHKD <= 0) return { withdrawalHKD, covered: false, gapHKD: avfHKD };
  return { withdrawalHKD, covered: withdrawalHKD + 0.01 >= avfHKD, gapHKD: Math.max(0, avfHKD - withdrawalHKD) };
}
