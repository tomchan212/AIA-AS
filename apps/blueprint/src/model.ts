import { MASTER_DATA, type PlanSlice, type PolicyYearData } from "./data";

export interface YearView extends PolicyYearData {
  estimated: boolean;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function mixPlan(left: PlanSlice, right: PlanSlice, t: number): PlanSlice {
  return {
    savingsPremium: lerp(left.savingsPremium, right.savingsPremium, t),
    totalAnnualOutflow: lerp(left.totalAnnualOutflow, right.totalAnnualOutflow, t),
    cumulativeOutflow: lerp(left.cumulativeOutflow, right.cumulativeOutflow, t),
    surrenderValue: lerp(left.surrenderValue, right.surrenderValue, t),
    netBenefit: lerp(left.netBenefit, right.netBenefit, t),
  };
}

export function viewAtAge(age: number): YearView {
  const target = Math.min(100, Math.max(38, Math.round(age)));
  const exact = MASTER_DATA.find((row) => row.age === target);
  if (exact) return { ...exact, estimated: false };
  let lower = MASTER_DATA[0];
  let upper = MASTER_DATA[MASTER_DATA.length - 1];
  for (let index = 0; index < MASTER_DATA.length - 1; index += 1) {
    if (MASTER_DATA[index].age <= target && MASTER_DATA[index + 1].age >= target) {
      lower = MASTER_DATA[index];
      upper = MASTER_DATA[index + 1];
      break;
    }
  }
  const span = upper.age - lower.age || 1;
  const t = (target - lower.age) / span;
  return {
    policyYear: lerp(lower.policyYear, upper.policyYear, t),
    age: target,
    medicalPremium: lerp(lower.medicalPremium, upper.medicalPremium, t),
    planA: mixPlan(lower.planA, upper.planA, t),
    planB: mixPlan(lower.planB, upper.planB, t),
    estimated: true,
  };
}

export function leadText(view: YearView) {
  const gap = view.planB.surrenderValue - view.planA.surrenderValue;
  const leader = gap >= 0 ? "方案 B" : "方案 A";
  return `${leader} 現金價值領先 HK$ ${Math.abs(gap).toLocaleString("zh-TW", { maximumFractionDigits: 2 })}`;
}

export type QuizChoice = "A" | "B";

export function diagnose(answers: QuizChoice[]) {
  const scoreB = answers.filter((answer) => answer === "B").length;
  const scoreA = answers.length - scoreB;
  if (scoreA === scoreB) {
    return {
      plan: "平手" as const,
      title: "兩條路都說得通",
      body: "三題裡長跑和衝刺各佔一半。可以先看第 10 年和第 18 年：一邊早點停下供款，一邊前十年每年少付約 HK$ 15,000。這不是購買建議。",
    };
  }
  if (scoreA > scoreB) {
    return {
      plan: "A" as const,
      title: "比較貼近方案 A · 20年長跑",
      body: "你較在意前十年的現金流，也接受把供款攤長。方案 A 每年儲蓄保費 HK$ 24,000，說明書上淨利益在第 18 年轉正。這只是按三題整理，不是叫你買這張保單。",
    };
  }
  return {
    plan: "B" as const,
    title: "比較貼近方案 B · 10年衝刺",
    body: "你較想早點供完儲蓄部分，也接受前十年每年多付約 HK$ 15,000。方案 B 在第 10 年的退保現金價值已高過已繳儲蓄本金，百歲現金價值亦較高。這只是按三題整理，不是叫你買這張保單。",
  };
}
