"use client";

import { Art } from "@/components/Art";
import { t, type MessageKey } from "@/lib/i18n";
import type { Locale } from "@/types";

export function AgentNote({ locale, note }: { locale: Locale; note: MessageKey }) {
  return (
    <aside className="agent-note">
      <div className="flex items-start gap-3">
        <Art name="agent" className="art-inline" />
        <div>
          <p className="agent-kicker">{t(locale, "agentKicker")}</p>
          <p>{t(locale, note)}</p>
        </div>
      </div>
    </aside>
  );
}
