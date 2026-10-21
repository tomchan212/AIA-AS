import { describe, expect, it } from "vitest";
import { emptyDraft, usePyramidStore } from "@/lib/store";
import { shouldConfirmSampleReplace } from "@/lib/sampleGuard";

const blank = emptyDraft();

describe("sample replace confirmation", () => {
  it("asks only when a consented draft already has a number and is not an example", () => {
    expect(shouldConfirmSampleReplace(blank)).toBe(false);
    expect(shouldConfirmSampleReplace({ ...blank, consent: true, age: 36 })).toBe(true);
    expect(shouldConfirmSampleReplace({ ...blank, consent: true, dependants: 0 })).toBe(true);
    expect(shouldConfirmSampleReplace({ ...blank, consent: true, sample: true, age: 36 })).toBe(false);
    expect(shouldConfirmSampleReplace({ ...blank, age: 36 })).toBe(false);
    expect(shouldConfirmSampleReplace({ ...blank, consent: true, monthlyIncome: Number.NaN })).toBe(false);
  });

  it("keeps score history, language, and theme when an example replaces the draft", () => {
    const history = [{ at: "2026-10-01", score: 41 }];
    usePyramidStore.setState({ ...emptyDraft(), ready: true, consent: true, monthlyIncome: 21000, history, sample: false, locale: "en", theme: "dark" });
    usePyramidStore.getState().loadSample("growth");
    const next = usePyramidStore.getState();
    expect(next.sample).toBe(true);
    expect(next.history).toEqual(history);
    expect(next.locale).toBe("en");
    expect(next.theme).toBe("dark");
    expect(next.monthlyIncome).not.toBe(21000);
  });
});
