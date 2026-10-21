"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Art } from "@/components/Art";
import { t } from "@/lib/i18n";
import { advisorWhatsAppUrl } from "@/lib/whatsapp";
import type { Locale } from "@/types";

interface ConsultantCTAProps {
  locale: Locale;
  severe: boolean;
  summary: string;
  onConsent: () => void;
}

export function ConsultantCTA({ locale, severe, summary, onConsent }: ConsultantCTAProps) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);

  const whatsappUrl = advisorWhatsAppUrl(`${t(locale, "whatsappIntro")}\n\n${summary}`);

  function confirm() {
    if (!agreed) return;
    onConsent();
    setShown(true);
    setOpen(false);
    const opened = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    if (!opened) window.location.assign(whatsappUrl);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="glass-card" aria-labelledby="cta-title">
      <Art name="guide" className="art-spot" />
      <h2 id="cta-title" className="text-lg font-semibold">{severe ? t(locale, "contactSevere") : t(locale, "contact")}</h2>
      <motion.button
        type="button"
        className={`mt-4 h-14 w-full rounded-2xl text-base font-semibold text-white ${severe ? "bg-severe" : "bg-enough"}`}
        onClick={() => setOpen(true)}
        animate={severe && !reduce ? { scale: [1, 1.02, 1] } : undefined}
        transition={severe && !reduce ? { repeat: Infinity, duration: 1.8 } : undefined}
      >
        {t(locale, "contact")}
      </motion.button>
      {shown ? (
        <div className="mt-4">
          <h3 className="font-semibold">{t(locale, "summary")}</h3>
          <pre className="mt-2 whitespace-pre-wrap rounded-2xl bg-white/70 p-3 text-sm dark:bg-black/20">{summary}</pre>
          <div className="mt-3 flex gap-2">
            <button type="button" className="h-12 flex-1 rounded-2xl border border-ink/15 font-semibold" onClick={copy}>{copied ? t(locale, "copied") : t(locale, "copy")}</button>
            <a className="flex h-12 flex-1 items-center justify-center rounded-2xl bg-ink font-semibold text-paper" href={whatsappUrl} target="_blank" rel="noopener noreferrer">{t(locale, "booking")}</a>
          </div>
        </div>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/50 p-4" role="dialog" aria-modal="true" aria-labelledby="share-title">
          <div className="dialog-pop w-full max-w-md rounded-3xl bg-paper p-5 text-ink dark:bg-[#221c16] dark:text-paper">
            <h2 id="share-title" className="text-xl font-semibold">{t(locale, "shareTitle")}</h2>
            <p className="mt-2 text-sm">{t(locale, "shareBody")}</p>
            <label className="mt-4 flex items-start gap-3">
              <input type="checkbox" className="mt-1 h-5 w-5" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
              <span>{t(locale, "shareConsent")}</span>
            </label>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" className="h-12 rounded-2xl border border-ink/15 font-semibold" onClick={() => setOpen(false)}>{t(locale, "cancel")}</button>
              <button type="button" className="h-12 rounded-2xl bg-ink font-semibold text-paper disabled:opacity-40" disabled={!agreed} onClick={confirm}>{t(locale, "shareConfirm")}</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
