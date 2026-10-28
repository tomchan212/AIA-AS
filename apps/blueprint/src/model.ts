import { MASTER_DATA, USD_HKD, withdrawalAtAge, type PolicyYearData } from "./data";

export function rowAtAge(age: number): { row: PolicyYearData; snapped: boolean } {
  const target = Math.min(100, Math.max(37, Math.round(age)));
  const exact = MASTER_DATA.find((row) => row.age === target);
  if (exact) return { row: exact, snapped: false };
  const earlier = [...MASTER_DATA].reverse().find((row) => row.age < target) ?? MASTER_DATA[0];
  return { row: earlier, snapped: true };
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
