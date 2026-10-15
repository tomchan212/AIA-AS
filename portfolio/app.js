import { QUEST_CONFIG } from "./config/quest.js";
import { TAX_YEAR_2025_26 } from "./config/tax-2025-26.js";
import { DEFAULT_GAP_BENCHMARKS } from "./config/gap-benchmarks.js";
import { formatHkdFromCents } from "./domain/money.js";
import { calculateTaxEstimate } from "./domain/tax.js";
import { calculateProtectionGap } from "./domain/gap.js";
import { emptyDraft, projectQuest, provided } from "./domain/quest.js";
import { translate } from "./i18n.js";
import { clearDraft, loadDraft, saveDraft } from "./storage/draft-store.js";
import { createQuestController } from "./quest-ui.js";

let lang = localStorage.getItem("portfolio-lang") === "en" ? "en" : "zh-HK";
let draft = emptyDraft();
let saveTimer = 0;
let controller = null;

const $ = (id) => document.getElementById(id);
const t = (key) => translate(lang, key);

function h(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (value != null && value !== false) node.setAttribute(key, String(value));
  }
  for (const child of children) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function applyChrome() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  $("lang-toggle").textContent = lang === "en" ? "中文" : "EN";
  const theme = document.body.dataset.theme === "dark";
  $("theme-toggle").textContent = theme ? "Light" : "Dark";
  $("theme-toggle").setAttribute("aria-pressed", theme ? "true" : "false");
  $("mode-toggle").textContent = draft.mode === "pro" ? t("modeQuick") : t("modePro");
  document.title = `${t("pageTitle")} · AIA`;
}

function money(cents) {
  return formatHkdFromCents(cents, lang);
}

function radar(dimensions) {
  const plotted = dimensions.filter((row) => row.status === "ok");
  if (plotted.length < 3) return h("p", { class: "note" }, [t("insufficient")]);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 280 280");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", t("gapTitle"));
  const point = (index, ratio) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / plotted.length;
    const length = 96 * Math.min(ratio, 1);
    return [140 + length * Math.cos(angle), 140 + length * Math.sin(angle)];
  };
  for (const ring of [0.5, 1]) {
    const shape = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    shape.setAttribute("points", plotted.map((_, index) => point(index, ring).join(",")).join(" "));
    shape.setAttribute("fill", "none");
    shape.setAttribute("stroke", "currentColor");
    shape.setAttribute("opacity", "0.25");
    svg.append(shape);
  }
  const area = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  area.setAttribute("points", plotted.map((row, index) => point(index, row.coverageRatio).join(",")).join(" "));
  area.setAttribute("fill", "rgba(218,41,28,0.28)");
  area.setAttribute("stroke", "#da291c");
  svg.append(area);
  return svg;
}

function renderResults() {
  const body = $("results-body");
  body.replaceChildren();
  if (!$("consent").checked) {
    body.append(h("p", { class: "empty-state" }, [t("needConsent")]));
    return;
  }
  const projected = projectQuest(draft, QUEST_CONFIG);
  const tax = calculateTaxEstimate({
    policies: projected.policies,
    tvcPaidCents: projected.tvcPaidCents,
    netChargeableIncomeCents: projected.netChargeableIncomeCents,
    config: TAX_YEAR_2025_26,
  });
  const gap = calculateProtectionGap({ client: projected.client, policies: projected.policies, benchmarks: DEFAULT_GAP_BENCHMARKS });
  body.append(
    h("p", { class: "disclaimer-banner" }, [`${tax.disclaimer} · ${tax.assessmentYear}`]),
    h("p", {}, [`${t("claimed")}: ${money(tax.totalDeductionCents)}`]),
    tax.saving.kind === "estimated"
      ? h("p", {}, [`${t("saving")}: ${money(tax.saving.savingCents)}`])
      : h("p", { class: "note" }, [t("insufficient")]),
    h("div", { class: "radar-wrap" }, [
      radar(gap.dimensions),
      h("table", { class: "gap-table" }, [
        h("thead", {}, [h("tr", {}, [t("gapTitle"), t("existing"), t("target"), t("gap"), t("ratio")].map((label) => h("th", {}, [label])))]),
        h("tbody", {}, gap.dimensions.map((row) => h("tr", {}, [
          h("td", {}, [`${t({ life: "dimLife", critical_illness: "dimCi", medical: "dimMedical", accident: "dimAccident" }[row.id])}${row.approximate ? ` · ${t("approximate")}` : ""}`]),
          h("td", {}, [money(row.existingCents)]),
          h("td", {}, [row.status === "ok" ? money(row.targetCents) : t("insufficient")]),
          h("td", {}, [row.status === "ok" ? money(row.gapCents) : "—"]),
          h("td", {}, [row.status === "ok" ? `${Math.round(row.coverageRatio * 100)}%` : "—"]),
        ]))),
      ]),
    ])
  );
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveDraft(draft).catch(() => {
      $("storage-note").textContent = t("storageError");
    });
  }, 400);
}

function updateDraft(mutator, options = {}) {
  mutator(draft);
  scheduleSave();
  renderResults();
  if (options.render !== false) controller.render();
  applyChrome();
}

function loadSample() {
  draft = emptyDraft();
  draft.pro = {
    annualIncomeCents: 60_000_000,
    dependantsFundCents: 50_000_000,
    treatmentBufferCents: 20_000_000,
    accidentTargetCents: 100_000_000,
    netChargeableIncomeCents: 20_000_000,
    tvcPaidCents: 4_000_000,
    vhisPremiumCents: 900_000,
    qdapPremiumCents: 5_000_000,
    qdap: true,
  };
  draft.stages.MEDICAL_SHIELD.answers = {
    planType: provided("VHIS", "exact", "PRO_FORM"),
    wardClass: provided("GENERAL", "approximate"),
    annualLimitCents: provided(40_000_000, "approximate"),
  };
  draft.stages.CI_BARRIER.answers = { sumAssuredCents: provided(50_000_000, "approximate") };
  draft.stages.LIFE_FORTRESS.answers = {
    sumAssuredCents: provided(200_000_000, "approximate"),
    liabilitiesCents: provided(200_000_000, "exact", "PRO_FORM"),
  };
  draft.stages.SAVINGS_TREASURY.answers = {
    mpfCents: provided(20_000_000, "approximate"),
    cashCents: provided(10_000_000, "approximate"),
  };
  $("consent").checked = true;
  scheduleSave();
  renderResults();
  controller.render();
}

async function resetDraft() {
  draft = emptyDraft();
  $("consent").checked = false;
  clearTimeout(saveTimer);
  try {
    await clearDraft();
  } catch {
    $("storage-note").textContent = t("storageError");
  }
  history.pushState(null, "", "#/quest/MEDICAL_SHIELD/0");
  renderResults();
  controller.render();
}

function bootTheme() {
  const storedTheme = localStorage.getItem("portfolio-theme");
  const storedMotion = localStorage.getItem("portfolio-motion");
  if (storedTheme === "dark" || (!storedTheme && matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.body.dataset.theme = "dark";
  }
  if (storedMotion === "reduce" || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.body.dataset.motion = "reduce";
  }
}

async function boot() {
  bootTheme();
  try {
    const stored = await loadDraft();
    if (stored?.version === 1 && stored.stages) draft = stored;
  } catch {
    $("storage-note").textContent = t("storageError");
  }
  controller = createQuestController({
    root: $("quest-root"),
    fortress: $("fortress"),
    progress: $("quest-progress"),
    getDraft: () => draft,
    updateDraft,
    isConsented: () => $("consent").checked,
    t,
    formatMoney: money,
  });
  $("consent").addEventListener("change", () => {
    renderResults();
    controller.render();
  });
  $("lang-toggle").addEventListener("click", () => {
    lang = lang === "en" ? "zh-HK" : "en";
    localStorage.setItem("portfolio-lang", lang);
    applyChrome();
    renderResults();
    controller.render();
  });
  $("theme-toggle").addEventListener("click", () => {
    document.body.dataset.theme = document.body.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("portfolio-theme", document.body.dataset.theme);
    applyChrome();
  });
  $("motion-toggle").addEventListener("click", () => {
    document.body.dataset.motion = document.body.dataset.motion === "reduce" ? "full" : "reduce";
    localStorage.setItem("portfolio-motion", document.body.dataset.motion);
  });
  $("mode-toggle").addEventListener("click", () => {
    updateDraft((next) => {
      next.mode = next.mode === "pro" ? "quick" : "pro";
    });
    if (draft.mode === "pro") history.pushState(null, "", "#/pro");
    else history.pushState(null, "", "#/quest/MEDICAL_SHIELD/0");
    controller.render();
  });
  $("sample-btn").addEventListener("click", loadSample);
  $("clear-btn").addEventListener("click", () => {
    resetDraft().catch(() => {
      $("storage-note").textContent = t("storageError");
    });
  });
  $("print-btn").addEventListener("click", () => window.print());
  applyChrome();
  renderResults();
  controller.render();
}

boot();
