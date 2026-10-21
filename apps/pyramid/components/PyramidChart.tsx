"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Art } from "@/components/Art";
import { formatPercent, formatHkd } from "@/lib/format";
import { layerLabel, statusLabel, t } from "@/lib/i18n";
import type { LayerAssessment, Locale } from "@/types";

const ART = { protection: "base", stable: "stable", growth: "growth", speculative: "top" } as const;

const FILL = {
  enough: "#1f7a4d",
  partial: "#9a6700",
  severe: "#b42318",
  ideal: "#8d6b1f",
};

interface PyramidChartProps {
  layers: LayerAssessment[];
  locale: Locale;
}

function stackBands(shares: number[]) {
  const count = shares.length;
  const gap = 8;
  const usable = 206 - gap * (count - 1);
  const total = shares.reduce((sum, share) => sum + share, 0) || 1;
  let heights = shares.map((share) => Math.max((share / total) * usable, 24));
  const sum = heights.reduce((totalHeight, height) => totalHeight + height, 0);
  heights = heights.map((height) => (height / sum) * usable);
  let y = 12;
  return heights.map((height, index) => {
    const top = y;
    const bottom = y + height;
    y = bottom + gap;
    const half = (step: number) => 18 + (step / count) * 76;
    return {
      points: `${100 - half(index + 0.2)},${top} ${100 + half(index + 0.2)},${top} ${100 + half(index + 1)},${bottom} ${100 - half(index + 1)},${bottom}`,
      labelY: (top + bottom) / 2,
      height,
    };
  });
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

export function PyramidChart({ layers, locale }: PyramidChartProps) {
  const reduce = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const reveal = () => {
      const box = node.getBoundingClientRect();
      if (box.top < 180 && box.top > -80 && box.bottom > 220) setLive(true);
    };
    reveal();
    window.addEventListener("scroll", reveal, { passive: true });
    window.addEventListener("resize", reveal);
    return () => {
      window.removeEventListener("scroll", reveal);
      window.removeEventListener("resize", reveal);
    };
  }, []);
  const order = [...layers].reverse();
  const idealVisual = order.map((layer) => Math.max(layer.idealShare, 0.08));
  const actualVisual = order.map((layer) => Math.max(layer.actualShare, 0.08));
  const idealBands = stackBands(idealVisual);
  const actualBands = stackBands(actualVisual);
  const caption = layers.map((layer) => `${layerLabel(locale, layer.id)} ${formatPercent(layer.actualShare, locale)} ${statusLabel(locale, layer.status)}`).join(", ");

  const column = (title: string, bands: { points: string; labelY: number; height: number }[], mode: "ideal" | "actual") => (
    <figure className="min-w-0 flex-1">
      <figcaption className="mb-2 text-center text-sm font-semibold">{title}</figcaption>
      <svg
        viewBox="0 0 200 230"
        className="mx-auto block h-56 w-full max-w-[200px] overflow-hidden"
        role="img"
        aria-label={`${title}. ${caption}`}
      >
        {order.map((layer, index) => {
          const path = bands[index];
          const fill = mode === "ideal"
            ? (index === order.length - 1 ? "#3aaa6d" : "#fff6ea")
            : { enough: "#3aaa6d", partial: "#f0c36a", severe: "#ef7d72" }[layer.status];
          return (
            <g
              key={`${mode}-${layer.id}`}
              className={reduce ? "pyramid-settled" : "pyramid-piece"}
              style={{ ["--i" as string]: order.length - 1 - index }}
            >
              <polygon points={path.points} fill={fill} stroke="#2a211c" strokeWidth="5" strokeLinejoin="round">
                <title>{`${layerLabel(locale, layer.id)} ${formatPercent(mode === "ideal" ? layer.idealShare : layer.actualShare, locale)}`}</title>
              </polygon>
            </g>
          );
        })}
      </svg>
    </figure>
  );

  return (
    <div ref={root} className={live ? "pyramid-live" : ""}>
      <div className="flex gap-3">
        {column(t(locale, "ideal"), idealBands, "ideal")}
        {column(t(locale, "actual"), actualBands, "actual")}
      </div>
      <ul className="mt-3 space-y-2">
        {layers.map((layer) => <LegendRow key={layer.id} layer={layer} locale={locale} live={live} />)}
      </ul>
    </div>
  );
}
