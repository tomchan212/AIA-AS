"use client";

import { create } from "zustand";
import { clearDraft, loadDraft, saveDraft } from "@/lib/storage";
import type { InputMode, Locale, PyramidDraft, ThemeMode } from "@/types";

export const STEP_IDS = [
  "consent",
  "mode",
  "age",
  "dependants",
  "cashflow",
  "emergency",
  "life",
  "medical",
  "stable",
  "growth",
  "speculative",
  "risk0",
  "risk1",
  "risk2",
  "result",
] as const;

export type StepId = (typeof STEP_IDS)[number];

export function emptyDraft(): PyramidDraft {
  return {
    consent: false,
    mode: "quick",
    step: 0,
    locale: "zh-HK",
    theme: "light",
    sample: false,
    shareConsent: false,
    age: null,
    occupation: "",
    dependants: null,
    monthlyIncome: null,
    monthlyExpense: null,
    emergencyCash: null,
    lifeCover: null,
    criticalIllnessCover: null,
    medicalAnnualLimit: null,
    hasMedical: null,
    accidentCover: null,
    stableSavings: null,
    growthInvestments: null,
    speculative: null,
    liabilities: null,
    riskAnswers: [0, 0, 0, 0, 0, 0],
  };
}

interface PyramidState extends PyramidDraft {
  ready: boolean;
  hydrate: () => Promise<void>;
  patch: (partial: Partial<PyramidDraft>) => void;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemeMode) => void;
  setMode: (mode: InputMode) => void;
  go: (step: number) => void;
  reset: () => Promise<void>;
  loadSample: () => void;
}

export const usePyramidStore = create<PyramidState>((set, get) => ({
  ...emptyDraft(),
  ready: false,
  async hydrate() {
    try {
      const saved = await loadDraft();
      if (saved?.consent) set({ ...emptyDraft(), ...saved, ready: true });
      else set({ ready: true });
    } catch {
      set({ ready: true });
    }
  },
  patch(partial) {
    set({ ...partial, sample: partial.sample ?? false });
  },
  setLocale(locale) {
    set({ locale });
  },
  setTheme(theme) {
    set({ theme });
  },
  setMode(mode) {
    set({ mode, sample: false });
  },
  go(step) {
    set({ step: Math.min(STEP_IDS.length - 1, Math.max(0, step)) });
  },
  async reset() {
    await clearDraft();
    const { locale, theme } = get();
    set({ ...emptyDraft(), locale, theme, ready: true });
  },
  loadSample() {
    set({
      ...emptyDraft(),
      consent: true,
      ready: true,
      sample: true,
      mode: "pro",
      step: STEP_IDS.indexOf("result"),
      age: 35,
      occupation: "",
      dependants: 1,
      monthlyIncome: 30_000,
      monthlyExpense: 20_000,
      emergencyCash: 20_000,
      lifeCover: 300_000,
      criticalIllnessCover: 0,
      medicalAnnualLimit: 200_000,
      hasMedical: true,
      accidentCover: 0,
      stableSavings: 80_000,
      growthInvestments: 40_000,
      speculative: 90_000,
      liabilities: 1_000_000,
      riskAnswers: [2, 2, 3, 2, 3, 2],
    });
  },
}));

export function draftOf(state: PyramidState): PyramidDraft {
  const { ready: _ready, hydrate: _hydrate, patch: _patch, setLocale: _setLocale, setTheme: _setTheme, setMode: _setMode, go: _go, reset: _reset, loadSample: _loadSample, ...draft } = state;
  return draft;
}

export async function persistDraft(state: PyramidState) {
  if (!state.ready || !state.consent) return;
  await saveDraft(draftOf(state));
}
