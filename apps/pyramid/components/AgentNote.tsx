"use client";

import { t, type MessageKey } from "@/lib/i18n";
import type { Locale } from "@/types";

export function AgentNote({ locale, note }: { locale: Locale; note: MessageKey }) {
  return (
    <aside className="agent-note">
      <p className="agent-kicker">{t(locale, "agentKicker")}</p>
      <p>{t(locale, note)}</p>
    </aside>
  );
}
