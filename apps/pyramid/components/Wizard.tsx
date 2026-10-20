"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useForm } from "react-hook-form";
import { ResultView } from "@/components/ResultView";
import { StepInput } from "@/components/StepInput";
import { analyzePyramid } from "@/lib/analysis/analyze";
import { t } from "@/lib/i18n";
import { ageSchema, amountSchema, cashflowSchema, choiceSchema, countSchema, lifeSchema, medicalAmountSchema, riskSchema, speculativeSchema } from "@/lib/schema";
import { STEP_IDS, persistDraft, usePyramidStore } from "@/lib/store";
import type { PyramidAnswers } from "@/types";

const RISK = [
  ["q1", ["q1a", "q1b", "q1c", "q1d"]],
  ["q2", ["q2a", "q2b", "q2c", "q2d"]],
  ["q3", ["q3a", "q3b", "q3c", "q3d"]],
  ["q4", ["q4a", "q4b", "q4c", "q4d"]],
  ["q5", ["q5a", "q5b", "q5c", "q5d"]],
  ["q6", ["q6a", "q6b", "q6c", "q6d"]],
] as const;

function answersFromState(): PyramidAnswers {
  const state = usePyramidStore.getState();
  return {
    age: state.age ?? 40,
    occupation: state.occupation,
    dependants: state.dependants ?? 0,
    monthlyIncome: state.monthlyIncome ?? 0,
    monthlyExpense: state.monthlyExpense ?? 0,
    emergencyCash: state.emergencyCash ?? 0,
    lifeCover: state.lifeCover ?? 0,
    criticalIllnessCover: state.criticalIllnessCover ?? 0,
    medicalAnnualLimit: state.medicalAnnualLimit ?? 0,
    hasMedical: state.hasMedical,
    accidentCover: state.accidentCover ?? 0,
    stableSavings: state.stableSavings ?? 0,
    growthInvestments: state.growthInvestments ?? 0,
    speculative: state.speculative ?? 0,
    liabilities: state.liabilities ?? 0,
    riskAnswers: state.riskAnswers,
    mode: state.mode,
  };
}

export function Wizard() {
  const reduce = useReducedMotion();
  const state = usePyramidStore();
  const [consentTick, setConsentTick] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const stepId = STEP_IDS[state.step] ?? "consent";
  const locale = state.locale;

  useEffect(() => {
    void state.hydrate();
  }, [state.hydrate]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.classList.toggle("dark", state.theme === "dark");
  }, [locale, state.theme]);

  useEffect(() => {
    if (!state.ready || !state.consent) return;
    const timer = window.setTimeout(() => { void persistDraft(usePyramidStore.getState()); }, 400);
    return () => window.clearTimeout(timer);
  }, [state]);

  const report = useMemo(() => (stepId === "result" ? analyzePyramid(answersFromState()) : null), [stepId, state]);

  if (!state.ready) return <p className="p-6">{t(locale, "loading")}</p>;

  const progress = `${Math.round((state.step / (STEP_IDS.length - 1)) * 100)}%`;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-4 py-6">
      <a className="sr-only focus:not-sr-only" href="#step-panel">{t(locale, "title")}</a>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t(locale, "title")}</h1>
          <p className="mt-1 text-sm text-ink/70 dark:text-paper/70">{t(locale, "lead")}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="tool" onClick={() => state.setLocale(locale === "zh-HK" ? "en" : "zh-HK")}>{t(locale, "lang")}</button>
          <button type="button" className="tool" onClick={() => state.setTheme(state.theme === "dark" ? "light" : "dark")}>{state.theme === "dark" ? t(locale, "themeLight") : t(locale, "theme")}</button>
        </div>
      </header>
      <p className="disclaimer">{t(locale, "disclaimer")}</p>
      <div className="my-4 h-2 overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
        <div className="h-full bg-enough" style={{ width: progress }} />
      </div>
      <p className="mb-3 text-sm font-semibold">{t(locale, "step", { n: state.step + 1, total: STEP_IDS.length })}</p>
      {state.sample ? <p className="mb-3 rounded-2xl bg-gold/15 px-3 py-2 text-sm font-semibold">{t(locale, "sampleOn")}</p> : null}
      <AnimatePresence mode="wait">
        <motion.div
          id="step-panel"
          key={stepId}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {stepId === "consent" ? <Consent locale={locale} ticked={consentTick} error={consentError} onTick={setConsentTick} onNext={() => {
            if (!consentTick) { setConsentError(true); return; }
            state.patch({ consent: true });
            state.go(1);
          }} /> : null}
          {stepId === "mode" ? <ModePick /> : null}
          {stepId === "age" ? <AgeStep /> : null}
          {stepId === "dependants" ? <CountStep /> : null}
          {stepId === "cashflow" ? <CashflowStep /> : null}
          {stepId === "emergency" ? <MoneyStep field="emergencyCash" label="emergency" hint="emergencyHint" /> : null}
          {stepId === "life" ? <LifeStep /> : null}
          {stepId === "medical" ? <MedicalStep /> : null}
          {stepId === "stable" ? <MoneyStep field="stableSavings" label="stable" hint="stableHint" /> : null}
          {stepId === "growth" ? <MoneyStep field="growthInvestments" label="growth" hint="growthHint" /> : null}
          {stepId === "speculative" ? <SpeculativeStep /> : null}
          {stepId.startsWith("risk") ? <RiskStep page={Number(stepId.slice(4))} /> : null}
          {stepId === "result" && report ? <ResultView locale={locale} report={report} answers={answersFromState()} onShare={() => state.patch({ shareConsent: true, sample: state.sample })} /> : null}
        </motion.div>
      </AnimatePresence>
      <div className="no-print mt-6 flex flex-wrap gap-2">
        {state.step > 0 ? <button type="button" className="tool" onClick={() => state.go(state.step - 1)}>{t(locale, "back")}</button> : null}
        <button type="button" className="tool" onClick={() => state.loadSample()}>{t(locale, "sample")}</button>
        <button type="button" className="tool" onClick={() => { void state.reset(); setConsentTick(false); }}>{t(locale, "clear")}</button>
        {stepId === "result" ? <button type="button" className="tool" onClick={() => window.print()}>{t(locale, "report")}</button> : null}
      </div>
      {state.consent ? <p className="no-print mt-3 text-xs text-ink/60 dark:text-paper/60">{t(locale, "saved")}</p> : null}
      {stepId === "result" ? <p className="no-print mt-1 text-xs text-ink/60 dark:text-paper/60">{t(locale, "reportHint")}</p> : null}
    </main>
  );
}

function NavButtons({ label }: { label: string }) {
  return <button type="submit" className="mt-5 h-14 w-full rounded-2xl bg-ink text-base font-semibold text-paper">{label}</button>;
}

function Consent({ locale, ticked, error, onTick, onNext }: { locale: "zh-HK" | "en"; ticked: boolean; error: boolean; onTick: (value: boolean) => void; onNext: () => void }) {
  return (
    <section className="glass-card" aria-labelledby="pics-title">
      <h2 id="pics-title" className="text-xl font-semibold">{t(locale, "picsTitle")}</h2>
      <div className="mt-3 space-y-2 text-sm">
        <p>{t(locale, "picsPurpose")}</p>
        <p>{t(locale, "picsUse")}</p>
        <p>{t(locale, "picsTransfer")}</p>
        <p>{t(locale, "picsRights")}</p>
        <p>{t(locale, "picsLimit")}</p>
      </div>
      <label className="mt-4 flex items-start gap-3">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={ticked} onChange={(event) => { onTick(event.target.checked); }} />
        <span>{t(locale, "consent")}</span>
      </label>
      {error && !ticked ? <p className="mt-2 text-sm font-semibold text-severe" role="alert">{t(locale, "required")}</p> : null}
      <button type="button" className="mt-5 h-14 w-full rounded-2xl bg-ink font-semibold text-paper" onClick={onNext}>{t(locale, "continue")}</button>
    </section>
  );
}

function ModePick() {
  const locale = usePyramidStore((item) => item.locale);
  const setMode = usePyramidStore((item) => item.setMode);
  const go = usePyramidStore((item) => item.go);
  const step = usePyramidStore((item) => item.step);
  const choose = (mode: "quick" | "pro") => { setMode(mode); go(step + 1); };
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold">{t(locale, "modeTitle")}</h2>
      <button type="button" className="glass-card w-full text-left" onClick={() => choose("quick")}><span className="text-xl font-semibold">{t(locale, "quick")}</span><span className="mt-1 block text-sm">{t(locale, "quickDetail")}</span></button>
      <button type="button" className="glass-card w-full text-left" onClick={() => choose("pro")}><span className="text-xl font-semibold">{t(locale, "pro")}</span><span className="mt-1 block text-sm">{t(locale, "proDetail")}</span></button>
    </section>
  );
}

function AgeStep() {
  const locale = usePyramidStore((item) => item.locale);
  const mode = usePyramidStore((item) => item.mode);
  const age = usePyramidStore((item) => item.age);
  const occupation = usePyramidStore((item) => item.occupation);
  const patch = usePyramidStore((item) => item.patch);
  const go = usePyramidStore((item) => item.go);
  const step = usePyramidStore((item) => item.step);
  const form = useForm({ resolver: zodResolver(ageSchema(locale)), defaultValues: { age: age ?? "", occupation } });
  return (
    <form className="glass-card" onSubmit={form.handleSubmit((values) => { patch({ age: Number(values.age), occupation: values.occupation }); go(step + 1); })}>
      <StepInput label={t(locale, "age")} error={form.formState.errors.age?.message?.toString()}>
        <input className="field" inputMode="numeric" aria-invalid={Boolean(form.formState.errors.age)} {...form.register("age")} />
      </StepInput>
      {mode === "pro" ? (
        <div className="mt-4">
          <StepInput label={t(locale, "occupation")} error={form.formState.errors.occupation?.message?.toString()}>
            <input className="field" maxLength={40} {...form.register("occupation")} />
          </StepInput>
        </div>
      ) : null}
      <NavButtons label={t(locale, "next")} />
    </form>
  );
}

function CountStep() {
  const locale = usePyramidStore((item) => item.locale);
  const dependants = usePyramidStore((item) => item.dependants);
  const patch = usePyramidStore((item) => item.patch);
  const go = usePyramidStore((item) => item.go);
  const step = usePyramidStore((item) => item.step);
  const form = useForm({ resolver: zodResolver(countSchema(locale)), defaultValues: { count: dependants ?? 0 } });
  return (
    <form className="glass-card" onSubmit={form.handleSubmit((values) => { patch({ dependants: Number(values.count) }); go(step + 1); })}>
      <StepInput label={t(locale, "dependants")} error={form.formState.errors.count?.message?.toString()}>
        <input className="field" inputMode="numeric" {...form.register("count")} />
      </StepInput>
      <NavButtons label={t(locale, "next")} />
    </form>
  );
}

function CashflowStep() {
  const locale = usePyramidStore((item) => item.locale);
  const income = usePyramidStore((item) => item.monthlyIncome);
  const expense = usePyramidStore((item) => item.monthlyExpense);
  const patch = usePyramidStore((item) => item.patch);
  const go = usePyramidStore((item) => item.go);
  const step = usePyramidStore((item) => item.step);
  const form = useForm({ resolver: zodResolver(cashflowSchema(locale)), defaultValues: { income: income ?? "", expense: expense ?? "" } });
  return (
    <form className="glass-card" onSubmit={form.handleSubmit((values) => { patch({ monthlyIncome: Number(values.income), monthlyExpense: Number(values.expense) }); go(step + 1); })}>
      <StepInput label={t(locale, "income")} error={form.formState.errors.income?.message?.toString()}>
        <input className="field" inputMode="decimal" {...form.register("income")} />
      </StepInput>
      <div className="mt-4">
        <StepInput label={t(locale, "expense")} error={form.formState.errors.expense?.message?.toString()}>
          <input className="field" inputMode="decimal" {...form.register("expense")} />
        </StepInput>
      </div>
      <NavButtons label={t(locale, "next")} />
    </form>
  );
}

function MoneyStep({ field, label, hint }: { field: "emergencyCash" | "stableSavings" | "growthInvestments" | "speculative" | "lifeCover"; label: "emergency" | "stable" | "growth" | "speculative" | "life"; hint: "emergencyHint" | "stableHint" | "growthHint" | "speculativeHint" | "lifeHint" }) {
  const locale = usePyramidStore((item) => item.locale);
  const current = usePyramidStore((item) => item[field]);
  const patch = usePyramidStore((item) => item.patch);
  const go = usePyramidStore((item) => item.go);
  const step = usePyramidStore((item) => item.step);
  const form = useForm({ resolver: zodResolver(amountSchema(locale)), defaultValues: { amount: current ?? "" } });
  return (
    <form className="glass-card" onSubmit={form.handleSubmit((values) => { patch({ [field]: Number(values.amount) }); go(step + 1); })}>
      <StepInput label={t(locale, label)} hint={t(locale, hint)} error={form.formState.errors.amount?.message?.toString()}>
        <input className="field" inputMode="decimal" {...form.register("amount")} />
      </StepInput>
      <NavButtons label={t(locale, "next")} />
    </form>
  );
}

function LifeStep() {
  const mode = usePyramidStore((item) => item.mode);
  const locale = usePyramidStore((item) => item.locale);
  const lifeCover = usePyramidStore((item) => item.lifeCover);
  const criticalIllnessCover = usePyramidStore((item) => item.criticalIllnessCover);
  const patch = usePyramidStore((item) => item.patch);
  const go = usePyramidStore((item) => item.go);
  const step = usePyramidStore((item) => item.step);
  const form = useForm({
    resolver: zodResolver(lifeSchema(locale, mode === "pro")),
    defaultValues: { amount: lifeCover ?? "", ci: criticalIllnessCover ?? "" },
  });
  return (
    <form className="glass-card" onSubmit={form.handleSubmit((values) => {
      patch({ lifeCover: Number(values.amount), criticalIllnessCover: mode === "pro" ? Number(values.ci || 0) : 0 });
      go(step + 1);
    })}>
      <StepInput label={t(locale, "life")} hint={t(locale, "lifeHint")} error={form.formState.errors.amount?.message?.toString()}>
        <input className="field" inputMode="decimal" {...form.register("amount")} />
      </StepInput>
      {mode === "pro" ? (
        <div className="mt-4">
          <StepInput label={t(locale, "ci")}>
            <input className="field" inputMode="decimal" {...form.register("ci")} />
          </StepInput>
        </div>
      ) : null}
      <NavButtons label={t(locale, "next")} />
    </form>
  );
}

function MedicalStep() {
  const mode = usePyramidStore((item) => item.mode);
  const locale = usePyramidStore((item) => item.locale);
  const hasMedical = usePyramidStore((item) => item.hasMedical);
  const medicalAnnualLimit = usePyramidStore((item) => item.medicalAnnualLimit);
  const accidentCover = usePyramidStore((item) => item.accidentCover);
  const patch = usePyramidStore((item) => item.patch);
  const go = usePyramidStore((item) => item.go);
  const step = usePyramidStore((item) => item.step);
  const choice = useForm({ resolver: zodResolver(choiceSchema(locale)), defaultValues: { choice: hasMedical == null ? undefined : hasMedical ? "yes" : "no" } });
  const amounts = useForm({ resolver: zodResolver(medicalAmountSchema(locale)), defaultValues: { amount: medicalAnnualLimit ?? "", accident: accidentCover ?? "" } });
  if (mode === "quick") {
    return (
      <form className="glass-card" onSubmit={choice.handleSubmit((values) => { patch({ hasMedical: values.choice === "yes" }); go(step + 1); })}>
        <fieldset>
          <legend className="text-lg font-semibold">{t(locale, "medicalYes")}</legend>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="choice"><input type="radio" value="yes" {...choice.register("choice")} />{t(locale, "yes")}</label>
            <label className="choice"><input type="radio" value="no" {...choice.register("choice")} />{t(locale, "no")}</label>
          </div>
          {choice.formState.errors.choice ? <p className="mt-2 text-sm font-semibold text-severe" role="alert">{choice.formState.errors.choice.message}</p> : null}
        </fieldset>
        <NavButtons label={t(locale, "next")} />
      </form>
    );
  }
  return (
    <form className="glass-card" onSubmit={amounts.handleSubmit((values) => { patch({ medicalAnnualLimit: Number(values.amount), accidentCover: Number(values.accident || 0), hasMedical: Number(values.amount) > 0 }); go(step + 1); })}>
      <StepInput label={t(locale, "medicalLimit")} error={amounts.formState.errors.amount?.message?.toString()}>
        <input className="field" inputMode="decimal" {...amounts.register("amount")} />
      </StepInput>
      <div className="mt-4">
        <StepInput label={t(locale, "accident")}>
          <input className="field" inputMode="decimal" {...amounts.register("accident")} />
        </StepInput>
      </div>
      <NavButtons label={t(locale, "next")} />
    </form>
  );
}

function SpeculativeStep() {
  const mode = usePyramidStore((item) => item.mode);
  const locale = usePyramidStore((item) => item.locale);
  const speculative = usePyramidStore((item) => item.speculative);
  const liabilities = usePyramidStore((item) => item.liabilities);
  const patch = usePyramidStore((item) => item.patch);
  const go = usePyramidStore((item) => item.go);
  const step = usePyramidStore((item) => item.step);
  const form = useForm({ resolver: zodResolver(speculativeSchema(locale, mode === "pro")), defaultValues: { amount: speculative ?? "", debt: liabilities ?? "" } });
  return (
    <form className="glass-card" onSubmit={form.handleSubmit((values) => { patch({ speculative: Number(values.amount), liabilities: mode === "pro" ? Number(values.debt || 0) : 0 }); go(step + 1); })}>
      <StepInput label={t(locale, "speculative")} hint={t(locale, "speculativeHint")} error={form.formState.errors.amount?.message?.toString()}>
        <input className="field" inputMode="decimal" {...form.register("amount")} />
      </StepInput>
      {mode === "pro" ? (
        <div className="mt-4">
          <StepInput label={t(locale, "liabilities")} hint={t(locale, "liabilitiesHint")}>
            <input className="field" inputMode="decimal" {...form.register("debt")} />
          </StepInput>
        </div>
      ) : null}
      <NavButtons label={t(locale, "next")} />
    </form>
  );
}

function RiskStep({ page }: { page: number }) {
  const locale = usePyramidStore((item) => item.locale);
  const riskAnswers = usePyramidStore((item) => item.riskAnswers);
  const patch = usePyramidStore((item) => item.patch);
  const go = usePyramidStore((item) => item.go);
  const step = usePyramidStore((item) => item.step);
  const first = RISK[page * 2];
  const second = RISK[page * 2 + 1];
  const form = useForm({
    resolver: zodResolver(riskSchema(locale)),
    defaultValues: { first: riskAnswers[page * 2] || undefined, second: riskAnswers[page * 2 + 1] || undefined },
  });
  return (
    <form className="glass-card" onSubmit={form.handleSubmit((values) => {
      const next = [...riskAnswers];
      next[page * 2] = Number(values.first);
      next[page * 2 + 1] = Number(values.second);
      patch({ riskAnswers: next });
      go(step + 1);
    })}>
      <h2 className="text-xl font-semibold">{t(locale, "riskTitle")}</h2>
      {[first, second].map((question, index) => (
        <fieldset key={question[0]} className="mt-4">
          <legend className="font-semibold">{t(locale, question[0])}</legend>
          <div className="mt-2 grid gap-2">
            {question[1].map((option, optionIndex) => (
              <label key={option} className="choice">
                <input type="radio" value={optionIndex + 1} {...form.register(index === 0 ? "first" : "second")} />
                {t(locale, option)}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {form.formState.errors.first || form.formState.errors.second ? <p className="mt-2 text-sm font-semibold text-severe" role="alert">{t(locale, "pick")}</p> : null}
      <NavButtons label={t(locale, "next")} />
    </form>
  );
}
