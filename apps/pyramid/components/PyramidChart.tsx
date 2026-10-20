"use client";

import { useEffect, useRef, useState } from "react";
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

export function PyramidChart({ layers, locale }: PyramidChartProps) {
  const root = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const reveal = () => {
      const box = node.getBoundingClientRect();
      if (box.top < window.innerHeight * 0.92 && box.bottom > 40) setLive(true);
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
      <svg viewBox="0 0 200 230" className={`mx-auto h-64 w-full max-w-[220px] ${mode === "ideal" ? "pyramid-soon" : "pyramid-late"}`} role="img" aria-label={`${title}. ${caption}`}>
        {order.map((layer, index) => {
          const path = bands[index];
          const fill = mode === "ideal" ? FILL.ideal : FILL[layer.status];
          return (
            <g key={`${mode}-${layer.id}`} className="pyramid-band" style={{ ["--i" as string]: index }}>
              <path d={path.d} fill={fill} opacity={mode === "ideal" ? 0.85 : 0.95}>
                <title>{`${layerLabel(locale, layer.id)} ${formatPercent(mode === "ideal" ? layer.idealShare : layer.actualShare, locale)}`}</title>
              </path>
              {path.height >= 22 ? (
                <text x="100" y={path.labelY} textAnchor="middle" dominantBaseline="middle" fill="#fffaf3" fontSize="11" fontWeight="700">
                  {formatPercent(mode === "ideal" ? layer.idealShare : layer.actualShare, locale)}
                </text>
              ) : null}
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
        {layers.map((layer) => (
          <li key={layer.id} className="legend-row flex items-start justify-between gap-3 text-sm">
            <span>
              <span className="dot-live mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: FILL[layer.status] }} aria-hidden="true" />
              {layerLabel(locale, layer.id)} · {statusLabel(locale, layer.status)}
            </span>
            <span className="font-semibold">{formatHkd(layer.actualAmount, locale)} / {formatPercent(layer.actualShare, locale)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
