"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Art } from "@/components/Art";
import { formatPercent, formatHkd } from "@/lib/format";
import { layerLabel, statusLabel, t } from "@/lib/i18n";
import type { GapStatus, LayerAssessment, LayerId, Locale } from "@/types";

const ART = { protection: "base", stable: "stable", growth: "growth", speculative: "top" } as const;

interface PyramidChartProps {
  layers: LayerAssessment[];
  locale: Locale;
}

function pieceSrc(status: GapStatus | "ideal", id: LayerId) {
  return `/pyramid/art/pyramid/${status}-${id}.png`;
}

function useCountUp(target: number, live: boolean) {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!live || reduce) {
      setValue(target);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 900);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, live, reduce]);
  return value;
}

function LegendRow({ layer, locale, live }: { layer: LayerAssessment; locale: Locale; live: boolean }) {
  const amount = useCountUp(layer.actualAmount, live);
  return (
    <li className="legend-row grid grid-cols-1 gap-1 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-3">
      <span className="flex min-w-0 items-center gap-2">
        <Art name={ART[layer.id]} className="art-row" />
        <span>{layerLabel(locale, layer.id)} · {statusLabel(locale, layer.status)}</span>
      </span>
      <span className="font-semibold sm:text-right">{formatHkd(amount, locale)} / {formatPercent(layer.actualShare, locale)}</span>
    </li>
  );
}

function PyramidFigure({
  title,
  pieces,
  reduce,
}: {
  title: string;
  pieces: { id: LayerId; status: GapStatus | "ideal"; label: string }[];
  reduce: boolean | null;
}) {
  return (
    <figure className="min-w-0 flex-1">
      <figcaption className="mb-2 text-center text-sm font-semibold">{title}</figcaption>
      <div className="pyramid-stack" role="img" aria-label={`${title}. ${pieces.map((piece) => piece.label).join(", ")}`}>
        {pieces.map((piece, index) => (
          <img
            key={piece.id}
            src={pieceSrc(piece.status, piece.id)}
            alt=""
            className={reduce ? "pyramid-settled" : "pyramid-piece"}
            style={{ ["--i" as string]: index }}
          />
        ))}
      </div>
    </figure>
  );
}

export function PyramidChart({ layers, locale }: PyramidChartProps) {
  const reduce = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const reveal = () => {
      const box = node.getBoundingClientRect();
      const visible = box.bottom > 80 && box.top < window.innerHeight - 40;
      if (visible) setLive(true);
    };
    reveal();
    window.addEventListener("scroll", reveal, { passive: true });
    window.addEventListener("resize", reveal);
    return () => {
      window.removeEventListener("scroll", reveal);
      window.removeEventListener("resize", reveal);
    };
  }, []);

  return (
    <div ref={root} className={live ? "pyramid-live" : ""}>
      <div className="flex gap-3">
        <PyramidFigure
          title={t(locale, "ideal")}
          reduce={reduce}
          pieces={layers.map((layer) => ({
            id: layer.id,
            status: "ideal",
            label: `${layerLabel(locale, layer.id)} ${formatPercent(layer.idealShare, locale)}`,
          }))}
        />
        <PyramidFigure
          title={t(locale, "actual")}
          reduce={reduce}
          pieces={layers.map((layer) => ({
            id: layer.id,
            status: layer.status,
            label: `${layerLabel(locale, layer.id)} ${formatPercent(layer.actualShare, locale)} ${statusLabel(locale, layer.status)}`,
          }))}
        />
      </div>
      <ul className="mt-3 space-y-2">
        {layers.map((layer) => <LegendRow key={layer.id} layer={layer} locale={locale} live={live} />)}
      </ul>
    </div>
  );
}
