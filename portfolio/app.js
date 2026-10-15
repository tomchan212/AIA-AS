import { TAX_YEAR_2025_26 } from "./config/tax-2025-26.js";
import { DEFAULT_GAP_BENCHMARKS } from "./config/gap-benchmarks.js";
import { parseHkdToCents, formatHkdFromCents } from "./domain/money.js";
import { calculateTaxEstimate } from "./domain/tax.js";
import { calculateProtectionGap } from "./domain/gap.js";
import { translate } from "./i18n.js";

const policies = [];
let lang = localStorage.getItem("portfolio-lang") === "en" ? "en" : "zh-HK";
const DIM_KEYS = { life: "dimLife", critical_illness: "dimCi", medical: "dimMedical", accident: "dimAccident" };
const CATEGORY_KEYS = {
  LIFE: "catLife",
  CRITICAL_ILLNESS: "catCi",
  MEDICAL: "catMedical",
  ACCIDENT: "catAccident",
  SAVINGS_ANNUITY: "catSavings",
  OTHER: "catOther",
};

const $ = (id) => document.getElementById(id);

function t(key) {
  return translate(lang, key);
}

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
  $("theme-toggle").setAttribute("aria-pressed", theme ? "true" : "false");
  $("theme-toggle").textContent = theme ? "Light" : "Dark";
  const reduce = document.body.dataset.motion === "reduce";
  $("motion-toggle").setAttribute("aria-pressed", reduce ? "true" : "false");
  document.title = `${t("pageTitle")} · AIA`;
}

function optionalCents(id) {
  const raw = $(id).value.trim();
  if (raw === "") return { ok: true, cents: null };
  const parsed = parseHkdToCents(raw);
  return parsed.ok ? { ok: true, cents: parsed.cents } : parsed;
}

function optionalInt(id) {
  const raw = $(id).value.trim();
  if (raw === "") return { ok: true, value: null };
  if (!/^\d{1,3}$/.test(raw)) return { ok: false, code: "invalid" };
  return { ok: true, value: Number(raw) };
}

function readClient() {
  const fields = ["income", "liabilities", "dependants", "liquid", "treatment", "medical-pref", "accident-target", "nci", "tvc"];
  const parsed = {};
  for (const id of fields) {
    const result = optionalCents(id);
    if (!result.ok) return { ok: false, field: id };
    parsed[id] = result.cents;
  }
  const age = optionalInt("age");
  if (!age.ok) return { ok: false, field: "age" };
  return {
    ok: true,
    client: {
      annualIncomeCents: parsed.income,
      outstandingLiabilitiesCents: parsed.liabilities,
      dependantsFundCents: parsed.dependants,
      liquidAssetsCents: parsed.liquid,
      treatmentBufferCents: parsed.treatment,
      preferredMedicalAnnualLimitCents: parsed["medical-pref"],
      accidentTargetCents: parsed["accident-target"],
      ageYears: age.value,
    },
    netChargeableIncomeCents: parsed.nci,
    tvcPaidCents: parsed.tvc ?? 0,
  };
}

function readPolicy(event) {
  event.preventDefault();
  const premium = optionalCents("premium-paid");
  const sum = optionalCents("sum-assured");
  const medical = optionalCents("medical-limit");
  const years = optionalInt("coverage-years");
  const toAge = optionalInt("coverage-age");
  const product = $("product").value.trim();
  if (!product || !premium.ok || !sum.ok || !medical.ok || !years.ok || !toAge.ok) {
    $("policy-error").textContent = t("insufficient");
    return;
  }
  const kind = $("coverage-kind").value;
  if (kind === "years" && years.value == null) {
    $("policy-error").textContent = t("years");
    return;
  }
  if (kind === "toAge" && toAge.value == null) {
    $("policy-error").textContent = t("toAge");
    return;
  }
  policies.push({
    id: crypto.randomUUID(),
    productName: product,
    insurerCode: $("insurer").value.trim(),
    category: $("category").value,
    currency: $("currency").value,
    premiumPaidCents: premium.cents ?? 0,
    sumAssuredCents: sum.cents ?? 0,
    medicalAnnualLimitCents: medical.cents ?? 0,
    isVhisCertified: $("vhis").checked,
    isQdap: $("qdap").checked,
    insuredPersonKey: $("insured").value.trim() || "unspecified",
    inForce: $("in-force").checked,
    inceptionDate: $("inception").value,
    coverage:
      kind === "years"
        ? { kind, years: years.value }
        : kind === "toAge"
          ? { kind, toAge: toAge.value }
          : { kind: "whole" },
  });
  $("policy-form").reset();
  $("in-force").checked = true;
  $("policy-error").textContent = "";
  render();
}

function renderPolicies() {
  const list = $("policy-list");
  list.replaceChildren();
  if (!policies.length) {
    list.append(h("p", { class: "empty-state" }, [t("emptyPolicies")]));
    return;
  }
  for (const policy of policies) {
    const card = h("article", { class: "policy-card" }, [
      h("div", {}, [
        h("strong", {}, [policy.productName]),
        h("div", { class: "note" }, [
          `${t(CATEGORY_KEYS[policy.category])} · ${policy.currency} · ${policy.insuredPersonKey}`,
        ]),
      ]),
      h("button", { type: "button", class: "portfolio-tool", "data-remove": policy.id }, [t("remove")]),
    ]);
    card.querySelector("button").addEventListener("click", () => {
      const index = policies.findIndex((item) => item.id === policy.id);
      if (index >= 0) policies.splice(index, 1);
      render();
    });
    list.append(card);
  }
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
  const cx = 140;
  const cy = 140;
  const radius = 96;
  const point = (index, ratio) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / plotted.length;
    const length = radius * Math.min(ratio, 1);
    return [cx + length * Math.cos(angle), cy + length * Math.sin(angle)];
  };
  for (const ring of [0.5, 1]) {
    const poly = plotted.map((_, index) => point(index, ring).join(",")).join(" ");
    const shape = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    shape.setAttribute("points", poly);
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
  plotted.forEach((row, index) => {
    const [x, y] = point(index, 1.18);
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", String(x));
    label.setAttribute("y", String(y));
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-size", "12");
    label.setAttribute("fill", "currentColor");
    label.textContent = t(DIM_KEYS[row.id]);
    svg.append(label);
  });
  return svg;
}

function renderResults(snapshot) {
  const body = $("results-body");
  body.replaceChildren();
  if (!$("consent").checked) {
    body.append(h("p", { class: "empty-state" }, [t("needConsent")]));
    return;
  }
  const { tax, gapResult, generatedAt } = snapshot;
  const taxCard = h("article", { class: "metric-card" }, [
    h("h3", {}, [t("taxTitle")]),
    h("p", { class: "disclaimer-banner" }, [`${tax.disclaimer} · ${tax.assessmentYear}`]),
    h("p", {}, [`${t("claimed")}: ${money(tax.totalDeductionCents)}`]),
    h("p", {}, [`VHIS ${t("claimed")}: ${money(tax.vhis.claimedCents)} · ${t("excess")}: ${money(tax.vhis.excessCents)}`]),
    h("p", {}, [`TVC ${t("claimed")}: ${money(tax.annuity.tvcAllowedCents)} · QDAP ${t("claimed")}: ${money(tax.annuity.qdapAllowedCents)}`]),
    tax.saving.kind === "estimated"
      ? h("p", {}, [`${t("saving")}: ${money(tax.saving.savingCents)}`])
      : h("p", { class: "note" }, [t("insufficient")]),
  ]);

  const table = h("table", { class: "gap-table" }, [
    h("thead", {}, [h("tr", {}, [h("th", {}, [t("gapTitle")]), h("th", {}, [t("existing")]), h("th", {}, [t("target")]), h("th", {}, [t("gap")]), h("th", {}, [t("ratio")])])]),
    h("tbody", {}, gapResult.dimensions.map((row) => h("tr", {}, [
      h("td", {}, [t(DIM_KEYS[row.id])]),
      h("td", {}, [money(row.existingCents)]),
      h("td", {}, [row.status === "ok" ? money(row.targetCents) : t("insufficient")]),
      h("td", {}, [row.status === "ok" ? money(row.gapCents) : "—"]),
      h("td", {}, [row.status === "ok" ? `${Math.round(row.coverageRatio * 100)}%${row.coverageRatio > 1 ? ` (${t("overflow")})` : ""}` : "—"]),
    ]))),
  ]);

  const explains = gapResult.dimensions.filter((row) => row.status === "ok").map((row) => {
    const details = h("details", { class: "explain" }, [h("summary", {}, [`${t(DIM_KEYS[row.id])} · ${t("how")}`])]);
    for (const step of row.steps) {
      details.append(h("p", {}, [`${step.key}: ${money(step.cents)}`]));
    }
    return details;
  });

  const excluded = h("div", {}, [
    h("h3", {}, [t("excluded")]),
    h("p", { class: "note" }, [`${t("lapsed")}: ${gapResult.excluded.lapsedIds.join(", ") || "—"}`]),
    h("p", { class: "note" }, [`${t("unverified")}: ${gapResult.excluded.unverifiedIds.join(", ") || "—"}`]),
    h("p", { class: "note" }, [`${t("nonHkd")}: ${gapResult.excluded.nonHkdIds.join(", ") || "—"}`]),
  ]);

  body.append(
    h("p", { class: "note" }, [`${t("snapshot")} ${generatedAt} · tax ${tax.assessmentYear} · gap ${gapResult.benchmarkVersion}`]),
    h("div", { class: "metric-grid" }, [taxCard]),
    h("div", { class: "radar-wrap" }, [radar(gapResult.dimensions), table]),
    ...explains,
    excluded
  );
}

function render() {
  $("client-error").textContent = "";
  const input = readClient();
  renderPolicies();
  if (!input.ok) {
    $("client-error").textContent = t("insufficient");
    $("results-body").replaceChildren(h("p", { class: "field-error" }, [t("insufficient")]));
    return;
  }
  const tax = calculateTaxEstimate({
    policies,
    tvcPaidCents: input.tvcPaidCents,
    netChargeableIncomeCents: input.netChargeableIncomeCents,
    config: TAX_YEAR_2025_26,
  });
  const gapResult = calculateProtectionGap({
    client: input.client,
    policies,
    benchmarks: DEFAULT_GAP_BENCHMARKS,
    today: new Date(),
  });
  renderResults({ tax, gapResult, generatedAt: new Date().toISOString() });
}

function loadSample() {
  const sample = {
    income: "600000",
    liabilities: "2000000",
    dependants: "500000",
    liquid: "300000",
    age: "35",
    treatment: "200000",
    "medical-pref": "500000",
    "accident-target": "1000000",
    nci: "200000",
    tvc: "40000",
  };
  for (const [id, value] of Object.entries(sample)) $(id).value = value;
  policies.splice(0, policies.length, {
    id: "sample-life",
    productName: "Sample whole life",
    insurerCode: "SAMPLE",
    category: "LIFE",
    currency: "HKD",
    premiumPaidCents: 2_400_000,
    sumAssuredCents: 200_000_000,
    medicalAnnualLimitCents: 0,
    isVhisCertified: false,
    isQdap: false,
    insuredPersonKey: "本人",
    inForce: true,
    inceptionDate: "2020-01-01",
    coverage: { kind: "whole" },
  }, {
    id: "sample-vhis",
    productName: "Sample VHIS",
    insurerCode: "SAMPLE",
    category: "MEDICAL",
    currency: "HKD",
    premiumPaidCents: 900_000,
    sumAssuredCents: 0,
    medicalAnnualLimitCents: 40_000_000,
    isVhisCertified: true,
    isQdap: false,
    insuredPersonKey: "本人",
    inForce: true,
    coverage: { kind: "whole" },
  }, {
    id: "sample-qdap",
    productName: "Sample QDAP",
    insurerCode: "SAMPLE",
    category: "SAVINGS_ANNUITY",
    currency: "HKD",
    premiumPaidCents: 5_000_000,
    sumAssuredCents: 0,
    medicalAnnualLimitCents: 0,
    isVhisCertified: false,
    isQdap: true,
    insuredPersonKey: "本人",
    inForce: true,
    inceptionDate: "2022-01-01",
    coverage: { kind: "whole" },
  });
  $("consent").checked = true;
  render();
}

function clearPage() {
  policies.splice(0, policies.length);
  document.querySelectorAll("#client-facts input").forEach((input) => {
    input.value = "";
  });
  $("consent").checked = false;
  $("policy-form").reset();
  $("in-force").checked = true;
  render();
}

function boot() {
  const storedTheme = localStorage.getItem("portfolio-theme");
  const storedMotion = localStorage.getItem("portfolio-motion");
  if (storedTheme === "dark" || (!storedTheme && matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.body.dataset.theme = "dark";
  }
  if (storedMotion === "reduce" || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.body.dataset.motion = "reduce";
  }
  $("lang-toggle").addEventListener("click", () => {
    lang = lang === "en" ? "zh-HK" : "en";
    localStorage.setItem("portfolio-lang", lang);
    applyChrome();
    render();
  });
  $("theme-toggle").addEventListener("click", () => {
    document.body.dataset.theme = document.body.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("portfolio-theme", document.body.dataset.theme);
    applyChrome();
  });
  $("motion-toggle").addEventListener("click", () => {
    document.body.dataset.motion = document.body.dataset.motion === "reduce" ? "full" : "reduce";
    localStorage.setItem("portfolio-motion", document.body.dataset.motion);
    applyChrome();
  });
  $("policy-form").addEventListener("submit", readPolicy);
  $("sample-btn").addEventListener("click", loadSample);
  $("clear-btn").addEventListener("click", clearPage);
  $("print-btn").addEventListener("click", () => window.print());
  $("consent").addEventListener("change", render);
  document.querySelectorAll("#client-facts input").forEach((input) => {
    input.addEventListener("input", render);
  });
  applyChrome();
  render();
}

boot();
