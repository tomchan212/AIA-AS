export const USD_HKD = 7.8;

export interface PlanAYear {
  savingsPremiumUSD: number;
  cumulativeSavingsUSD: number;
  combinedCashValueUSD: number;
  note: string;
  /** 對照表給的是整數概算，不是建議書上的逐元數字。 */
  approximate: boolean;
}

export interface PlanBYear {
  savingsPremiumUSD: number;
  cumulativeSavingsUSD: number;
  annualWithdrawalUSD: number;
  cumulativeWithdrawnUSD: number;
  remainingCashValueUSD: number;
  medicalOffsetStatus: string;
}

export interface PolicyYearData {
  calendarYear: number;
  policyYear: number;
  age: number;
  avfMedicalRiderHKD: number;
  avfApproximate: boolean;
  planA: PlanAYear;
  planB: PlanBYear;
}

/**
 * 只收錄對照表裡寫明的年度。中間年份沒有建議書逐行，頁面不會用直線估算現金價值。
 * 60 歲與 65 歲的方案 A 現金價值、以及 39／65／75 歲的醫保保費，在對照表是整數，標成概算。
 */
export const MASTER_DATA: PolicyYearData[] = [
  {
    calendarYear: 2019, policyYear: 1, age: 37, avfMedicalRiderHKD: 7044.8, avfApproximate: false,
    planA: { savingsPremiumUSD: 3000, cumulativeSavingsUSD: 3000, combinedCashValueUSD: 0, note: "第一張單開始供款，每年 3,000 美元。", approximate: false },
    planB: { savingsPremiumUSD: 5000, cumulativeSavingsUSD: 5000, annualWithdrawalUSD: 0, cumulativeWithdrawnUSD: 0, remainingCashValueUSD: 0, medicalOffsetStatus: "仍在供款，尚未提取。" },
  },
  {
    calendarYear: 2020, policyYear: 2, age: 38, avfMedicalRiderHKD: 7311.2, avfApproximate: false,
    planA: { savingsPremiumUSD: 3000, cumulativeSavingsUSD: 6000, combinedCashValueUSD: 0, note: "第一張單仍未列出現金價值。", approximate: false },
    planB: { savingsPremiumUSD: 5000, cumulativeSavingsUSD: 10000, annualWithdrawalUSD: 0, cumulativeWithdrawnUSD: 0, remainingCashValueUSD: 0, medicalOffsetStatus: "仍在供款，尚未提取。" },
  },
  {
    calendarYear: 2021, policyYear: 3, age: 39, avfMedicalRiderHKD: 7600, avfApproximate: true,
    planA: { savingsPremiumUSD: 3000, cumulativeSavingsUSD: 9000, combinedCashValueUSD: 2470, note: "對照表寫第一張單由第 3 年起有現金價值。", approximate: false },
    planB: { savingsPremiumUSD: 5000, cumulativeSavingsUSD: 15000, annualWithdrawalUSD: 0, cumulativeWithdrawnUSD: 0, remainingCashValueUSD: 4120, medicalOffsetStatus: "仍在供款，尚未提取。" },
  },
  {
    calendarYear: 2029, policyYear: 10, age: 47, avfMedicalRiderHKD: 10689.6, avfApproximate: false,
    planA: { savingsPremiumUSD: 3000, cumulativeSavingsUSD: 30000, combinedCashValueUSD: 31542, note: "第一張單供滿 10 年，現金價值 31,542 美元，高過已繳 30,000 美元。對照表此年的儲蓄保費仍是 3,000 美元，累計本金仍是 30,000 美元。", approximate: false },
    planB: { savingsPremiumUSD: 0, cumulativeSavingsUSD: 50000, annualWithdrawalUSD: 0, cumulativeWithdrawnUSD: 0, remainingCashValueUSD: 52570, medicalOffsetStatus: "儲蓄供款在這一期結束。現金價值 52,570 美元，高過基本本金 50,000 美元。" },
  },
  {
    calendarYear: 2039, policyYear: 20, age: 57, avfMedicalRiderHKD: 12763.2, avfApproximate: false,
    planA: { savingsPremiumUSD: 0, cumulativeSavingsUSD: 60000, combinedCashValueUSD: 96998, note: "第二張單亦供滿。兩張單合計本金 60,000 美元，合計現金價值 96,998 美元。", approximate: false },
    planB: { savingsPremiumUSD: 0, cumulativeSavingsUSD: 50000, annualWithdrawalUSD: 0, cumulativeWithdrawnUSD: 0, remainingCashValueUSD: 109092, medicalOffsetStatus: "尚未開始提取。對照表的戶口價值是 109,092 美元。" },
  },
  {
    calendarYear: 2042, policyYear: 23, age: 60, avfMedicalRiderHKD: 14425.6, avfApproximate: false,
    planA: { savingsPremiumUSD: 0, cumulativeSavingsUSD: 60000, combinedCashValueUSD: 115000, note: "對照表把兩張單的現金價值寫成約 115,000 美元，是整數概算。", approximate: true },
    planB: { savingsPremiumUSD: 0, cumulativeSavingsUSD: 50000, annualWithdrawalUSD: 3000, cumulativeWithdrawnUSD: 3000, remainingCashValueUSD: 128500, medicalOffsetStatus: "開始每年提取 3,000 美元。" },
  },
  {
    calendarYear: 2047, policyYear: 28, age: 65, avfMedicalRiderHKD: 18500, avfApproximate: true,
    planA: { savingsPremiumUSD: 0, cumulativeSavingsUSD: 60000, combinedCashValueUSD: 160000, note: "對照表把兩張單的現金價值寫成約 160,000 美元，是整數概算。", approximate: true },
    planB: { savingsPremiumUSD: 0, cumulativeSavingsUSD: 50000, annualWithdrawalUSD: 5000, cumulativeWithdrawnUSD: 21000, remainingCashValueUSD: 174390, medicalOffsetStatus: "這一年提取 5,000 美元。對照表的累計提取是 21,000 美元。" },
  },
  {
    calendarYear: 2057, policyYear: 38, age: 75, avfMedicalRiderHKD: 32000, avfApproximate: true,
    planA: { savingsPremiumUSD: 0, cumulativeSavingsUSD: 60000, combinedCashValueUSD: 386388, note: "兩張單合計現金價值 386,388 美元。", approximate: false },
    planB: { savingsPremiumUSD: 0, cumulativeSavingsUSD: 50000, annualWithdrawalUSD: 7000, cumulativeWithdrawnUSD: 78000, remainingCashValueUSD: 257168, medicalOffsetStatus: "這一年提取 7,000 美元。對照表的累計提取是 78,000 美元，剩餘價值 257,168 美元。" },
  },
  {
    calendarYear: 2082, policyYear: 63, age: 100, avfMedicalRiderHKD: 85424.8, avfApproximate: false,
    planA: { savingsPremiumUSD: 0, cumulativeSavingsUSD: 60000, combinedCashValueUSD: 1858945, note: "兩張單合計現金價值 1,858,945 美元。", approximate: false },
    planB: { savingsPremiumUSD: 0, cumulativeSavingsUSD: 50000, annualWithdrawalUSD: 9000, cumulativeWithdrawnUSD: 290000, remainingCashValueUSD: 1011765, medicalOffsetStatus: "對照表寫累計提取 290,000 美元，提取後仍餘 1,011,765 美元。" },
  },
];

export const MILESTONES = [
  { age: 47, label: "2029 · 47歲", hint: "B 供完；A 第一張單的現金價值超過本金" },
  { age: 57, label: "2039 · 57歲", hint: "A 第二張單供完" },
  { age: 60, label: "2042 · 60歲", hint: "B 開始每年提取 3,000 美元" },
  { age: 75, label: "2057 · 75歲", hint: "B 對照表累計提取 78,000 美元" },
  { age: 100, label: "2082 · 100歲", hint: "說明書最後一行" },
];

export const WITHDRAWAL_BANDS = [
  { fromAge: 60, toAge: 63, annualUSD: 3000, label: "60–63 歲" },
  { fromAge: 64, toAge: 74, annualUSD: 5000, label: "64–74 歲" },
  { fromAge: 75, toAge: 82, annualUSD: 7000, label: "75–82 歲" },
  { fromAge: 83, toAge: 100, annualUSD: 9000, label: "83–100 歲" },
];

export function withdrawalAtAge(age: number) {
  return WITHDRAWAL_BANDS.find((band) => age >= band.fromAge && age <= band.toAge)?.annualUSD ?? 0;
}

/** 四段提取加總。60 至 100 歲共 41 年，合計 285,000 美元，與對照表寫的 290,000 美元相差 5,000 美元。 */
export function withdrawalSum() {
  return WITHDRAWAL_BANDS.reduce((sum, band) => sum + (band.toAge - band.fromAge + 1) * band.annualUSD, 0);
}
