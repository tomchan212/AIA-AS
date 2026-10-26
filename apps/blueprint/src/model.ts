import { MASTER_DATA, type PolicyYearData } from "./data";

export function viewAtAge(age: number): PolicyYearData {
  const target = Math.min(100, Math.max(38, Math.round(age)));
  return MASTER_DATA.find((row) => row.age === target) ?? MASTER_DATA[0];
}

export function leadText(view: PolicyYearData) {
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
      body: "三題裡長跑和衝刺各佔一半。可以先看 47 歲和 55 歲：方案 B 在第 10 年現金價值已超過儲蓄本金，方案 A 的淨利益在第 18 年轉正。這不是購買建議。",
    };
  }
  if (scoreA > scoreB) {
    return {
      plan: "A" as const,
      title: "比較貼近方案 A · 20年長跑",
      body: "你較在意前十年少付一些。方案 A 每年儲蓄保費 HK$ 24,000，供 20 年。說明書上現金價值在第 17 年超過已繳儲蓄本金，淨利益在第 18 年轉正。這只是按三題整理，不是叫你買這張保單。",
    };
  }
  return {
    plan: "B" as const,
    title: "比較貼近方案 B · 10年衝刺",
    body: "你較想早點供完儲蓄部分。方案 B 每年儲蓄保費 HK$ 39,000，供 10 年。第 10 年現金價值已高過已繳儲蓄本金，淨利益在第 13 年轉正。這只是按三題整理，不是叫你買這張保單。",
  };
}
