"use client";

import type { ReactNode } from "react";

interface StepInputProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function StepInput({ label, hint, error, children }: StepInputProps) {
  const errorId = error ? "step-error" : undefined;
  return (
    <label className="block">
      <span className="text-lg font-semibold">{label}</span>
      {hint ? <span className="mt-1 block text-sm text-ink/70 dark:text-paper/70">{hint}</span> : null}
      <span className="mt-3 block">{children}</span>
      {error ? <span id={errorId} className="mt-2 block text-sm font-semibold text-severe" role="alert">{error}</span> : null}
    </label>
  );
}
