import { PYRAMID_CONFIG, type PyramidConfig } from "@/lib/config/pyramid";
import type { RiskProfile } from "@/types";

export function scoreRisk(answers: number[], config: PyramidConfig = PYRAMID_CONFIG) {
  const valid = answers.filter(
    (answer) => Number.isFinite(answer) && answer >= config.riskScale.min && answer <= config.riskScale.max,
  );
  if (!valid.length) {
    return { score: 0, profile: "balanced" as RiskProfile, answered: 0 };
  }
  const average = valid.reduce((sum, answer) => sum + answer, 0) / valid.length;
  const score = Math.round(average * config.riskQuestionCount);
  const profile = config.riskBands.find((band) => score <= band.max)?.profile ?? "growth";
  return { score, profile, answered: valid.length };
}
