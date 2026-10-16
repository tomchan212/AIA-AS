/** Hong Kong salaries tax estimate for the year of assessment 2026/27. */

export const TAX_YEAR = {
  id: "2026/27",
  from: "2026-04-01",
  to: "2027-03-31",
  basicAllowance: 145_000,
  rememberedAllowance: 132_000,
};

const BANDS = [
  { width: 50_000, bps: 200, label: "頭 $50,000", plain: "頭 5 萬只收 2%" },
  { width: 50_000, bps: 600, label: "下一截 $50,000", plain: "下一截 5 萬收 6%" },
  { width: 50_000, bps: 1000, label: "再下一截 $50,000", plain: "再下一截 5 萬收 10%" },
  { width: 50_000, bps: 1400, label: "再下一截 $50,000", plain: "再下一截 5 萬收 14%" },
  { width: Infinity, bps: 1700, label: "剩低嗰截", plain: "再多先收到 17%" },
];

const STANDARD_FIRST = 5_000_000;
const STANDARD_FIRST_BPS = 1500;
const STANDARD_REST_BPS = 1600;
const MPF_RATE_BPS = 500;
const MPF_MONTHLY_CAP = 1_500;
const MPF_ANNUAL_CAP = 18_000;
const MPF_MIN_MONTHLY = 7_100;

export function roundDollar(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number);
}

function applyBps(amount, bps) {
  return Math.round((Math.max(0, amount) * bps) / 10_000);
}

function monthContribution(income) {
  if (income < MPF_MIN_MONTHLY) return 0;
  return Math.min((income * MPF_RATE_BPS) / 10_000, MPF_MONTHLY_CAP);
}

export function estimateEmployeeMpf({ monthly = 0, payMonths = 12, bonus = 0 } = {}) {
  const pay = Math.max(0, Number(monthly) || 0);
  const months = Math.max(0, Number(payMonths) || 0);
  const worked = Math.min(12, months);
  if (worked <= 0) return 0;
  const extra = Math.max(0, Number(bonus) || 0) + pay * Math.max(0, months - 12);
  const normal = monthContribution(pay);
  let total = normal * worked;
  if (extra > 0) total = total - normal + monthContribution(pay + extra);
  return Math.min(roundDollar(total), MPF_ANNUAL_CAP);
}

export function estimateAnnualMpf(total) {
  const income = Math.max(0, Number(total) || 0);
  return estimateEmployeeMpf({ monthly: income / 12, payMonths: 12, bonus: 0 });
}

export function progressiveTax(chargeable) {
  let remaining = Math.max(0, roundDollar(chargeable));
  const slices = [];
  let tax = 0;
  for (const band of BANDS) {
    if (remaining <= 0) break;
    const amount = band.width === Infinity ? remaining : Math.min(remaining, band.width);
    const sliceTax = applyBps(amount, band.bps);
    slices.push({
      label: band.label,
      plain: band.plain,
      bps: band.bps,
      rate: band.bps / 10_000,
      amount,
      tax: sliceTax,
    });
    tax += sliceTax;
    remaining -= amount;
  }
  return { tax, slices };
}

export function standardTax(netIncome) {
  const income = Math.max(0, roundDollar(netIncome));
  const first = Math.min(income, STANDARD_FIRST);
  const rest = income - first;
  const firstTax = applyBps(first, STANDARD_FIRST_BPS);
  const restTax = applyBps(rest, STANDARD_REST_BPS);
  return { tax: firstTax + restTax, first, rest, firstTax, restTax };
}

export const TREASURE_CAPS = {
  vhisPerPerson: 8_000,
  annuityTvcCombined: 60_000,
};

export function calculateSalariesTax({ gross, mpf = 0, extraDeduction = 0, basicAllowance = TAX_YEAR.basicAllowance } = {}) {
  const income = Math.max(0, roundDollar(gross));
  const mpfDeduction = Math.min(income, Math.max(0, roundDollar(mpf)));
  const extra = Math.min(Math.max(0, income - mpfDeduction), Math.max(0, roundDollar(extraDeduction)));
  const deduction = mpfDeduction;
  const netIncome = income - mpfDeduction - extra;
  const allowance = Math.max(0, roundDollar(basicAllowance));
  const allowanceUsed = Math.min(netIncome, allowance);
  const chargeable = netIncome - allowanceUsed;
  const progressive = progressiveTax(chargeable);
  const standard = standardTax(netIncome);
  const method = progressive.tax <= standard.tax ? "progressive" : "standard";
  const tax = Math.min(progressive.tax, standard.tax);
  const provisionalFirst = roundDollar(tax * 0.75);
  const provisionalSecond = tax - provisionalFirst;
  return {
    year: TAX_YEAR.id,
    gross: income,
    mpf: deduction,
    extraDeduction: extra,
    netIncome,
    basicAllowance: allowance,
    allowanceUsed,
    chargeable,
    progressive,
    standard,
    method,
    tax,
    provisional: tax,
    totalDemand: tax * 2,
    firstInstalment: tax + provisionalFirst,
    secondInstalment: provisionalSecond,
    firstDue: "2028年1月左右",
    secondDue: "2028年4月左右",
  };
}

export function marginalRate(bill) {
  if (!bill || bill.chargeable <= 0 || bill.tax <= 0) {
    return { bps: 0, percent: 0, plain: "你未使交稅，所以而家冇下一截稅率。" };
  }
  if (bill.method === "standard") {
    const percent = bill.standard.rest > 0 ? 16 : 15;
    return { bps: percent * 100, percent, plain: `你賺得比較多，最後嗰截用一刀切 ${percent}%。` };
  }
  const last = bill.progressive.slices.filter((slice) => slice.amount > 0).at(-1);
  const percent = last.bps / 100;
  return { bps: last.bps, percent, plain: `你最後嗰截係 ${percent}%（${last.plain}）。` };
}

export function splitTreasure({ annuity = 0, vhis = 0, tvc = 0, vhisPeople = 1 } = {}) {
  const people = Math.min(9, Math.max(1, roundDollar(vhisPeople) || 1));
  const vhisPaid = Math.max(0, roundDollar(vhis));
  const tvcPaid = Math.max(0, roundDollar(tvc));
  const annuityPaid = Math.max(0, roundDollar(annuity));
  const vhisCap = TREASURE_CAPS.vhisPerPerson * people;
  const vhisAllowed = Math.min(vhisPaid, vhisCap);
  const tvcAllowed = Math.min(tvcPaid, TREASURE_CAPS.annuityTvcCombined);
  const annuityAllowed = Math.min(annuityPaid, TREASURE_CAPS.annuityTvcCombined - tvcAllowed);
  const sharedAllowed = tvcAllowed + annuityAllowed;
  return {
    people,
    vhisPaid,
    vhisCap,
    vhisAllowed,
    vhisExcess: vhisPaid - vhisAllowed,
    tvcPaid,
    tvcAllowed,
    annuityPaid,
    annuityAllowed,
    annuityExcess: annuityPaid - annuityAllowed,
    sharedCap: TREASURE_CAPS.annuityTvcCombined,
    sharedAllowed,
    sharedExcess: tvcPaid + annuityPaid - sharedAllowed,
    allowed: vhisAllowed + sharedAllowed,
  };
}

export function compareTreasure(base, treasure) {
  const before = calculateSalariesTax(base);
  const split = splitTreasure(treasure);
  const after = calculateSalariesTax({ ...base, extraDeduction: split.allowed });
  const spent = split.vhisPaid + split.annuityPaid + split.tvcPaid;
  const saved = before.tax - after.tax;
  return {
    before,
    after,
    split,
    spent,
    saved,
    netCost: Math.max(0, spent - saved),
    beforeRate: marginalRate(before),
    afterRate: marginalRate(after),
  };
}

export function incomeFromMonthly({ monthly = 0, payMonths = 12, bonus = 0 } = {}) {
  const pay = Math.max(0, Number(monthly) || 0);
  const months = Math.max(0, Number(payMonths) || 0);
  const extra = Math.max(0, Number(bonus) || 0);
  return roundDollar(pay * months + extra);
}
