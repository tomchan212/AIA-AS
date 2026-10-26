export interface PlanSlice {
  savingsPremium: number;
  totalAnnualOutflow: number;
  cumulativeOutflow: number;
  surrenderValue: number;
  netBenefit: number;
}

export interface PolicyYearData {
  policyYear: number;
  age: number;
  medicalPremium: number;
  planA: PlanSlice;
  planB: PlanSlice;
}

export const MASTER_DATA: PolicyYearData[] = [
  { policyYear: 1, age: 38, medicalPremium: 6056.8, planA: { savingsPremium: 24000, totalAnnualOutflow: 30056.8, cumulativeOutflow: 30056.8, surrenderValue: 0, netBenefit: -30056.8 }, planB: { savingsPremium: 39000, totalAnnualOutflow: 45056.8, cumulativeOutflow: 45056.8, surrenderValue: 0, netBenefit: -45056.8 } },
  { policyYear: 2, age: 39, medicalPremium: 6228, planA: { savingsPremium: 24000, totalAnnualOutflow: 30228, cumulativeOutflow: 60284.8, surrenderValue: 0, netBenefit: -60284.8 }, planB: { savingsPremium: 39000, totalAnnualOutflow: 45228, cumulativeOutflow: 90284.8, surrenderValue: 0, netBenefit: -90284.8 } },
  { policyYear: 3, age: 40, medicalPremium: 6482.4, planA: { savingsPremium: 24000, totalAnnualOutflow: 30482.4, cumulativeOutflow: 90767.2, surrenderValue: 19648.55, netBenefit: -71118.65 }, planB: { savingsPremium: 39000, totalAnnualOutflow: 45482.4, cumulativeOutflow: 135767.2, surrenderValue: 32750.2, netBenefit: -103017 } },
  { policyYear: 5, age: 42, medicalPremium: 7168, planA: { savingsPremium: 24000, totalAnnualOutflow: 31168, cumulativeOutflow: 152745.6, surrenderValue: 69001.5, netBenefit: -83744.1 }, planB: { savingsPremium: 39000, totalAnnualOutflow: 46168, cumulativeOutflow: 227745.6, surrenderValue: 115002.5, netBenefit: -112743.1 } },
  { policyYear: 8, age: 45, medicalPremium: 8325.6, planA: { savingsPremium: 24000, totalAnnualOutflow: 32325.6, cumulativeOutflow: 248603.2, surrenderValue: 161678, netBenefit: -86925.2 }, planB: { savingsPremium: 39000, totalAnnualOutflow: 47325.6, cumulativeOutflow: 368603.2, surrenderValue: 269463.8, netBenefit: -99139.4 } },
  { policyYear: 10, age: 47, medicalPremium: 8984.8, planA: { savingsPremium: 24000, totalAnnualOutflow: 32984.8, cumulativeOutflow: 314233.6, surrenderValue: 247604.7, netBenefit: -66628.9 }, planB: { savingsPremium: 39000, totalAnnualOutflow: 47984.8, cumulativeOutflow: 464233.6, surrenderValue: 412674.5, netBenefit: -51559.1 } },
  { policyYear: 15, age: 52, medicalPremium: 11612, planA: { savingsPremium: 24000, totalAnnualOutflow: 35612, cumulativeOutflow: 486004, surrenderValue: 420571.6, netBenefit: -65432.4 }, planB: { savingsPremium: 0, totalAnnualOutflow: 11612, cumulativeOutflow: 508293.6, surrenderValue: 585939.7, netBenefit: 77646.1 } },
  { policyYear: 18, age: 55, medicalPremium: 13212.8, planA: { savingsPremium: 24000, totalAnnualOutflow: 37212.8, cumulativeOutflow: 595934.4, surrenderValue: 611656.3, netBenefit: 15721.9 }, planB: { savingsPremium: 0, totalAnnualOutflow: 13212.8, cumulativeOutflow: 546252, surrenderValue: 733816.3, netBenefit: 187564.3 } },
  { policyYear: 20, age: 57, medicalPremium: 14701.6, planA: { savingsPremium: 24000, totalAnnualOutflow: 38701.6, cumulativeOutflow: 672472, surrenderValue: 761434.3, netBenefit: 88962.3 }, planB: { savingsPremium: 0, totalAnnualOutflow: 14701.6, cumulativeOutflow: 574488, surrenderValue: 856372.2, netBenefit: 281884.2 } },
  { policyYear: 25, age: 62, medicalPremium: 19800, planA: { savingsPremium: 0, totalAnnualOutflow: 19800, cumulativeOutflow: 757512, surrenderValue: 1026991.95, netBenefit: 269479.95 }, planB: { savingsPremium: 0, totalAnnualOutflow: 19800, cumulativeOutflow: 659528, surrenderValue: 1175718.05, netBenefit: 516190.05 } },
  { policyYear: 30, age: 67, medicalPremium: 25984.8, planA: { savingsPremium: 0, totalAnnualOutflow: 25984.8, cumulativeOutflow: 868476, surrenderValue: 1256973.4, netBenefit: 388497.4 }, planB: { savingsPremium: 0, totalAnnualOutflow: 25984.8, cumulativeOutflow: 770492, surrenderValue: 1429500.7, netBenefit: 659008.7 } },
  { policyYear: 40, age: 77, medicalPremium: 45153.6, planA: { savingsPremium: 0, totalAnnualOutflow: 45153.6, cumulativeOutflow: 1215420, surrenderValue: 1898310.55, netBenefit: 682890.55 }, planB: { savingsPremium: 0, totalAnnualOutflow: 45153.6, cumulativeOutflow: 1117436, surrenderValue: 2208314.9, netBenefit: 1090878.9 } },
  { policyYear: 50, age: 87, medicalPremium: 67096, planA: { savingsPremium: 0, totalAnnualOutflow: 67096, cumulativeOutflow: 1776668, surrenderValue: 3010859.65, netBenefit: 1234191.65 }, planB: { savingsPremium: 0, totalAnnualOutflow: 67096, cumulativeOutflow: 1678684, surrenderValue: 3670479.45, netBenefit: 1991795.45 } },
  { policyYear: 67, age: 100, medicalPremium: 85424.8, planA: { savingsPremium: 0, totalAnnualOutflow: 85424.8, cumulativeOutflow: 2343129, surrenderValue: 6349323.35, netBenefit: 4006194.35 }, planB: { savingsPremium: 0, totalAnnualOutflow: 85424.8, cumulativeOutflow: 2245145, surrenderValue: 7942355.25, netBenefit: 5697210.25 } },
];

export const SUMMARY_STATS = {
  clientName: "Mandy Chan",
  startingAge: 37,
  firstCoverageAge: 38,
  totalMedicalGross: 2343129,
  projectedMedicalSaved: 2119028,
  netMedicalCost: 224101,
  planAPrincipal: 480000,
  planBPrincipal: 390000,
  principalDifference: 90000,
  age100Difference: 1593031.9,
};

export const MILESTONES = [
  { age: 47, label: "47歲 · 第10年", hint: "方案B供完，現金價值超過儲蓄本金" },
  { age: 55, label: "55歲 · 第18年", hint: "方案A淨利益轉正" },
  { age: 57, label: "57歲 · 第20年", hint: "方案A供完" },
  { age: 70, label: "70歲", hint: "醫療保費較高的年期（估算）" },
  { age: 100, label: "100歲", hint: "說明書最後年度" },
];
