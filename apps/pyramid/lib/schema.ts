import { z } from "zod";
import type { Locale } from "@/types";
import { t } from "./i18n";

function money(locale: Locale) {
  const message = t(locale, "invalidMoney");
  return z.preprocess((value) => {
    if (typeof value === "number") return value;
    const text = String(value ?? "").replace(/,/g, "").trim();
    if (!text) return 0;
    return Number(text);
  }, z.number({ invalid_type_error: message }).finite().min(0, message).max(100_000_000, message));
}

export function ageSchema(locale: Locale) {
  const message = t(locale, "invalidAge");
  return z.object({
    age: z.preprocess((value) => Number(String(value ?? "").trim()), z.number({ invalid_type_error: message }).int().min(18, message).max(100, message)),
    occupation: z.string().trim().max(40, t(locale, "invalidText")).regex(/^[^<>]*$/, t(locale, "invalidText")),
  });
}

export function countSchema(locale: Locale) {
  const message = t(locale, "invalidPeople");
  return z.object({
    count: z.preprocess((value) => Number(String(value ?? "").trim()), z.number({ invalid_type_error: message }).int().min(0, message).max(20, message)),
  });
}

export function cashflowSchema(locale: Locale) {
  return z.object({ income: money(locale), expense: money(locale) });
}

export function amountSchema(locale: Locale) {
  return z.object({ amount: money(locale) });
}

export function lifeSchema(locale: Locale, pro: boolean) {
  return z.object({
    amount: money(locale),
    ci: pro ? money(locale) : z.string().optional(),
  });
}

export function speculativeSchema(locale: Locale, pro: boolean) {
  return z.object({
    amount: money(locale),
    debt: pro ? money(locale) : z.string().optional(),
  });
}

export function medicalAmountSchema(locale: Locale) {
  return z.object({
    amount: money(locale),
    accident: money(locale),
  });
}

export function choiceSchema(locale: Locale) {
  return z.object({ choice: z.enum(["yes", "no"], { required_error: t(locale, "pick") }) });
}

export function riskSchema(locale: Locale) {
  const message = t(locale, "pick");
  return z.object({
    first: z.coerce.number().int().min(1, message).max(4, message),
    second: z.coerce.number().int().min(1, message).max(4, message),
  });
}
