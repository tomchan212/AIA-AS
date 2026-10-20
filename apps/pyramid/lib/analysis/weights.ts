import { PYRAMID_CONFIG, type PyramidConfig } from "@/lib/config/pyramid";
import type { LayerId, RiskProfile } from "@/types";

export function clampAge(age: number, config: PyramidConfig = PYRAMID_CONFIG) {
  if (!Number.isFinite(age)) return { age: config.age.pivot, clamped: true };
  const rounded = Math.round(age);
  if (rounded < config.age.min || rounded > config.age.max) {
    return { age: Math.min(config.age.max, Math.max(config.age.min, rounded)), clamped: true };
  }
  return { age: rounded, clamped: false };
}

export function idealWeights(
  age: number,
  dependants: number,
  profile: RiskProfile,
  config: PyramidConfig = PYRAMID_CONFIG,
): Record<LayerId, number> {
  const next = { ...config.baseWeights[profile] };
  const { age: usableAge } = clampAge(age, config);
  const years = usableAge - config.age.pivot;
  const shift = Math.min(config.ageShiftCap, Math.abs(years) * config.ageShiftPerYear);
  if (years > 0) {
    const moved = Math.min(next.growth, shift);
    next.growth -= moved;
    next.stable += moved;
  } else if (years < 0) {
    const moved = Math.min(next.stable, shift);
    next.stable -= moved;
    next.growth += moved;
  }

  const wanted = Math.max(0, Math.round(dependants) || 0) * config.dependantShift;
  let pool = wanted;
  const fromSpeculative = Math.min(next.speculative, pool);
  next.speculative -= fromSpeculative;
  pool -= fromSpeculative;
  const fromGrowth = Math.min(next.growth, pool);
  next.growth -= fromGrowth;
  pool -= fromGrowth;
  const moved = wanted - pool;
  next.protection += moved / 2;
  next.stable += moved / 2;

  const sum = next.protection + next.stable + next.growth + next.speculative || 1;
  return {
    protection: next.protection / sum,
    stable: next.stable / sum,
    growth: next.growth / sum,
    speculative: next.speculative / sum,
  };
}
