import test from "node:test";
import assert from "node:assert/strict";
import { anyCriticalGap, citadelPresentation } from "../portfolio/domain/citadel.js";

test("insufficient data stays idle and does not summon an adviser", () => {
  const view = citadelPresentation({ band: "insufficient_data", coverageRatio: null }, "CI_BARRIER");
  assert.equal(view.tone, "neutral");
  assert.equal(view.shield, "idle");
  assert.equal(view.summon, false);
});

test("a low ratio is a cracked shield and may summon an adviser", () => {
  const view = citadelPresentation({ band: "low", coverageRatio: 0.24 }, "LIFE_FORTRESS");
  assert.equal(view.tone, "crimson");
  assert.equal(view.shield, "cracked");
  assert.equal(view.summon, true);
});

test("savings stays gold and does not use a threat shield", () => {
  const view = citadelPresentation({ band: "insufficient_data", recordedCents: 100 }, "SAVINGS_TREASURY");
  assert.equal(view.tone, "gold");
  assert.equal(view.summon, false);
});

test("critical gap ignores dimensions that are not calculated", () => {
  assert.equal(anyCriticalGap([{ status: "insufficient_data", coverageRatio: null }, { status: "ok", coverageRatio: 0.8 }]), false);
  assert.equal(anyCriticalGap([{ status: "ok", coverageRatio: 0.24 }]), true);
});
