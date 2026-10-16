import test from "node:test";
import assert from "node:assert/strict";
import {
  TAX_YEAR,
  calculateSalariesTax,
  estimateAnnualMpf,
  estimateEmployeeMpf,
  incomeFromMonthly,
} from "../tax/calc.js";

test("2026/27 basic allowance matches the IRD example", () => {
  assert.equal(TAX_YEAR.basicAllowance, 145_000);
  const bill = calculateSalariesTax({ gross: 380_000, mpf: 0 });
  assert.equal(bill.chargeable, 235_000);
  assert.equal(bill.tax, 21_950);
  assert.equal(bill.method, "progressive");
  assert.equal(bill.progressive.slices[0].tax, 1_000);
  assert.equal(bill.progressive.slices[4].tax, 5_950);
});

test("monthly pay deducts 5 percent MPF up to the caps", () => {
  assert.equal(estimateEmployeeMpf({ monthly: 20_000, payMonths: 12 }), 12_000);
  assert.equal(estimateEmployeeMpf({ monthly: 40_000, payMonths: 12 }), 18_000);
  assert.equal(estimateEmployeeMpf({ monthly: 6_000, payMonths: 12 }), 0);
  const gross = incomeFromMonthly({ monthly: 20_000, payMonths: 12 });
  const bill = calculateSalariesTax({ gross, mpf: estimateEmployeeMpf({ monthly: 20_000, payMonths: 12 }) });
  assert.equal(bill.gross, 240_000);
  assert.equal(bill.mpf, 12_000);
  assert.equal(bill.chargeable, 83_000);
  assert.equal(bill.tax, 2_980);
  assert.equal(bill.totalDemand, 5_960);
  assert.equal(bill.firstInstalment, 5_215);
  assert.equal(bill.secondInstalment, 745);
});

test("a 13th month and a bonus only lift one month of MPF to the cap", () => {
  assert.equal(incomeFromMonthly({ monthly: 20_000, payMonths: 13, bonus: 0 }), 260_000);
  assert.equal(estimateEmployeeMpf({ monthly: 20_000, payMonths: 13 }), 12_500);
  assert.equal(estimateEmployeeMpf({ monthly: 6_000, payMonths: 12, bonus: 20_000 }), 1_300);
});

test("typing a yearly total assumes twelve equal months", () => {
  assert.equal(estimateAnnualMpf(240_000), 12_000);
  assert.equal(estimateAnnualMpf(60_000), 0);
  assert.equal(estimateAnnualMpf(1_000_000), 18_000);
});

test("income under the allowance pays nothing", () => {
  const bill = calculateSalariesTax({ gross: 100_000, mpf: 5_000 });
  assert.equal(bill.chargeable, 0);
  assert.equal(bill.tax, 0);
  assert.equal(bill.totalDemand, 0);
  assert.equal(bill.allowanceUsed, 95_000);
});

test("very high income uses the cheaper two-tier standard rate", () => {
  const bill = calculateSalariesTax({ gross: 6_000_000, mpf: 0 });
  assert.equal(bill.standard.tax, 910_000);
  assert.equal(bill.progressive.tax, 977_350);
  assert.equal(bill.method, "standard");
  assert.equal(bill.tax, 910_000);
});
