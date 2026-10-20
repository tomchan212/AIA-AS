"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { formatPercent, formatHkd } from "@/lib/format";
import { layerLabel, statusLabel, t } from "@/lib/i18n";
import type { LayerAssessment, Locale } from "@/types";

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

function stackBands(visual: number[], total: number) {
  let cursor = 16;
  return visual.map((share) => {
    const top = cursor;
    const bottom = cursor + (share / total) * 198;
    cursor = bottom;
    const edge = (y: number) => {
      const progress = (y - 16) / 198;
      const half = 18 + progress * 74;
      return [100 - half, 100 + half];
    };
    const [leftTop, rightTop] = edge(top);
    const [leftBottom, rightBottom] = edge(bottom);
    return {
      d: `M ${leftTop} ${top} L ${rightTop} ${top} L ${rightBottom} ${bottom} L ${leftBottom} ${bottom} Z`,
      labelY: (top + bottom) / 2,
      height: bottom - top,
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
    <li className="legend-row flex items-start justify-between gap-3 text-sm">
      <span>
        <span className="dot-live mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: FILL[layer.status] }} aria-hidden="true" />
        {layerLabel(locale, layer.id)} · {statusLabel(locale, layer.status)}
      </span>
      <span className="font-semibold">{formatHkd(amount, locale)} / {formatPercent(layer.actualShare, locale)}</span>
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
      const mid = window.innerHeight * 0.62;
      if (box.top < mid && box.bottom > window.innerHeight * 0.22) setLive(true);
    };
    reveal();
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) setLive(true);
    });
    observer.observe(node);
    window.addEventListener("scroll", reveal, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", reveal);
    };
  }, []);
  const order = [...layers].reverse();
  const idealVisual = order.map((layer) => Math.max(layer.idealShare, 0.08));
  const actualVisual = order.map((layer) => Math.max(layer.actualShare, 0.08));
  const idealTotal = idealVisual.reduce((sum, value) => sum + value, 0);
  const actualTotal = actualVisual.reduce((sum, value) => sum + value, 0);
  const idealBands = stackBands(idealVisual, idealTotal);
  const actualBands = stackBands(actualVisual, actualTotal);
  const caption = layers.map((layer) => `${layerLabel(locale, layer.id)} ${formatPercent(layer.actualShare, locale)} ${statusLabel(locale, layer.status)}`).join(", ");

  const column = (title: string, bands: { d: string; labelY: number; height: number }[], mode: "ideal" | "actual") => (
    <figure className="min-w-0 flex-1">
      <figcaption className="mb-2 text-center text-sm font-semibold">{title}</figcaption>
      <motion.svg
        viewBox="0 0 200 230"
        className="mx-auto h-64 w-full max-w-[220px]"
        role="img"
        aria-label={`${title}. ${caption}`}
        animate={reduce ? undefined : { y: [0, -5, 0] }}
        transition={reduce ? undefined : { delay: 1.6, duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      >
        {order.map((layer, index) => {
          const path = bands[index];
          const fill = mode === "ideal" ? FILL.ideal : FILL[layer.status];
          const fromBottom = order.length - 1 - index;
          return (
            <motion.g
              key={`${mode}-${layer.id}`}
              initial={reduce ? false : { opacity: 0, y: 28 }}
              animate={live || reduce ? { opacity: mode === "ideal" ? 0.9 : 1, y: 0 } : { opacity: 0, y: 28 }}
              transition={{ duration: 0.55, delay: (mode === "actual" ? 0.45 : 0) + fromBottom * 0.16, ease: [0.16, 0.84, 0.24, 1] }}
            >
              <path d={path.d} fill={fill}>
                <title>{`${layerLabel(locale, layer.id)} ${formatPercent(mode === "ideal" ? layer.idealShare : layer.actualShare, locale)}`}</title>
              </path>
              {path.height >= 22 ? (
                <text x="100" y={path.labelY} textAnchor="middle" dominantBaseline="middle" fill="#fffaf3" fontSize="11" fontWeight="700">
                  {formatPercent(mode === "ideal" ? layer.idealShare : layer.actualShare, locale)}
                </text>
              ) : null}
            </motion.g>
          );
        })}
      </motion.svg>
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
