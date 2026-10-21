import { describe, expect, it } from "vitest";
import { BENCHMARKS, benchmarkNumber, isStale } from "@/lib/benchmarks";

describe("benchmark snapshot", () => {
  it("has unique sourced items and leaves unverified figures blank", () => {
    const ids = BENCHMARKS.items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(benchmarkNumber("csd-median-household-income")).toBe(30_000);
    expect(benchmarkNumber("csd-cpi-composite-yoy")).toBe(1.7);
    expect(benchmarkNumber("vhis-standard-annual-limit")).toBe(420_000);
    expect(benchmarkNumber("ha-acute-inpatient-day")).toBe(300);
    expect(benchmarkNumber("private-inpatient-typical")).toBeNull();
    expect(benchmarkNumber("csd-median-earnings-by-age")).toBeNull();
    for (const item of BENCHMARKS.items) {
      expect(item.sourceUrl.startsWith("https://")).toBe(true);
      expect(item.labelZh.length).toBeGreaterThan(0);
      expect(item.labelEn.length).toBeGreaterThan(0);
    }
  });

  it("flags a figure only after its refresh window", () => {
    const income = BENCHMARKS.items.find((item) => item.id === "csd-median-household-income");
    expect(income).toBeTruthy();
    expect(isStale(income!, new Date("2026-06-30T00:00:00Z"))).toBe(false);
    expect(isStale(income!, new Date("2026-10-21T00:00:00Z"))).toBe(true);
    const missing = BENCHMARKS.items.find((item) => item.id === "private-inpatient-typical");
    expect(isStale(missing!, new Date("2026-10-21T00:00:00Z"))).toBe(false);
  });
});
