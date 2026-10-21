"use client";

import { create } from "zustand";
import { sampleDraft } from "@/lib/samples";
import { clearDraft, loadDraft, saveDraft } from "@/lib/storage";
import type { InputMode, Locale, PyramidDraft, RiskProfile, ThemeMode } from "@/types";

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
    incomeStability: null,
    history: [],
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
  loadSample: (rank?: RiskProfile) => void;
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
  loadSample(rank: RiskProfile = "stable") {
    const { history = [], locale, theme } = get();
    set({
      ...emptyDraft(),
      ...sampleDraft(rank),
      history,
      locale,
      theme,
      consent: true,
      ready: true,
      sample: true,
      mode: "pro",
      step: STEP_IDS.indexOf("result"),
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
