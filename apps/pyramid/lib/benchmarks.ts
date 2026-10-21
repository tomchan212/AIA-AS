import snapshot from "@/data/benchmarks.json";

export interface BenchmarkItem {
  id: string;
  labelZh: string;
  labelEn: string;
  value: number | null;
  unit: string;
  asOf: string | null;
  sourceName: string;
  sourceUrl: string;
  note: string;
  refreshCadence: string;
}

export const BENCHMARKS = snapshot as { version: string; items: BenchmarkItem[] };

const months: Record<string, number> = { P1D: 0, P1M: 1, P2M: 2, P3M: 3, P6M: 6, P1Y: 12, P5Y: 60 };

export function benchmark(id: string) {
  return BENCHMARKS.items.find((item) => item.id === id) ?? null;
}

export function benchmarkNumber(id: string) {
  const item = benchmark(id);
  return item && typeof item.value === "number" ? item.value : null;
}

export function isStale(item: BenchmarkItem, today = new Date()) {
  if (item.value === null || !item.asOf) return false;
  const span = months[item.refreshCadence];
  if (span === undefined) return false;
  const asOf = new Date(`${item.asOf}T00:00:00Z`);
  if (Number.isNaN(asOf.getTime())) return false;
  if (span === 0) {
    const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    return asOf.getTime() < todayUtc;
  }
  const due = new Date(asOf);
  due.setUTCMonth(due.getUTCMonth() + span);
  return today.getTime() > due.getTime();
}

export function staleBenchmarks(today = new Date()) {
  return BENCHMARKS.items.filter((item) => isStale(item, today));
}
