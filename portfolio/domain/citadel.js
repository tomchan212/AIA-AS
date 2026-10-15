/** Maps gap feedback to citadel visuals. The UI must not invent a second score. */
export function citadelPresentation(feedback, stageId) {
  if (stageId === "SAVINGS_TREASURY" && feedback?.recordedCents != null) {
    return { tone: "gold", summon: false, shield: "vault", labelKey: "citadelVault" };
  }
  if (!feedback || feedback.band === "insufficient_data") {
    return { tone: "neutral", summon: false, shield: "idle", labelKey: "citadelNeutral" };
  }
  if (feedback.band === "low") {
    return { tone: "crimson", summon: true, shield: "cracked", labelKey: "citadelLow" };
  }
  if (feedback.band === "moderate") {
    return { tone: "amber", summon: false, shield: "partial", labelKey: "citadelMid" };
  }
  return { tone: "emerald", summon: false, shield: "charged", labelKey: "citadelHigh" };
}

export function anyCriticalGap(dimensions) {
  return dimensions.some((row) => row.status === "ok" && row.coverageRatio < 0.4);
}
