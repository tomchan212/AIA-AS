import { QUEST_CONFIG } from "./config/quest.js";
import { DEFAULT_GAP_BENCHMARKS } from "./config/gap-benchmarks.js";
import {
  STAGE_ORDER,
  computeStageFeedback,
  deriveQuestStatuses,
  deriveRewardLevel,
  noneConfirmed,
  provided,
  unknown,
  visibleSteps,
} from "./domain/quest.js";

const STAGE_COPY = {
  MEDICAL_SHIELD: ["stageMedical", "introMedical", "rewardMedical"],
  CI_BARRIER: ["stageCi", "introCi", "rewardCi"],
  LIFE_FORTRESS: ["stageLife", "introLife", "rewardLife"],
  SAVINGS_TREASURY: ["stageSavings", "introSavings", "rewardSavings"],
};

const FIELD_COPY = {
  planType: "planVhis",
  wardClass: "wardGeneral",
  annualLimitCents: "medicalLimit",
  sumAssuredCents: "sumAssured",
  liabilitiesCents: "liabilities",
  mpfCents: "mpf",
  cashCents: "liquid",
};

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

function sliderConfig(stageId, field) {
  if (field === "sumAssuredCents" && stageId === "CI_BARRIER") return QUEST_CONFIG.sliders.ciSumAssuredCents;
  if (field === "sumAssuredCents") return QUEST_CONFIG.sliders.lifeSumAssuredCents;
  return QUEST_CONFIG.sliders[field];
}

export function createQuestController({ root, fortress, progress, getDraft, updateDraft, isConsented, t, formatMoney }) {
  let feedbackTimer = 0;

  function draft() {
    return getDraft();
  }

  function answers(stageId) {
    return draft().stages[stageId].answers;
  }

  function setAnswer(stageId, field, answer, options) {
    updateDraft((next) => {
      next.stages[stageId].answers[field] = answer;
      next.stages[stageId].updatedAt = new Date().toISOString();
    }, options);
  }

  function go(stageId, stepIndex) {
    const nextHash = `#/quest/${stageId}/${stepIndex}`;
    if (location.hash !== nextHash) history.pushState(null, "", nextHash);
    updateDraft((next) => {
      next.mode = "quick";
      next.stages[stageId].stepIndex = stepIndex;
    });
  }

  function currentLocation() {
    const match = /^#\/quest\/([A-Z_]+)\/(\d+)$/.exec(location.hash);
    const statuses = deriveQuestStatuses(draft().stages, { strictOrder: QUEST_CONFIG.strictOrder, mode: draft().mode });
    if (draft().mode === "pro") return { mode: "pro", statuses };
    const stageId = match && STAGE_ORDER.includes(match[1]) ? match[1] : STAGE_ORDER[0];
    const steps = visibleSteps(stageId, answers(stageId));
    let stepIndex = match && match[1] === stageId ? Number(match[2]) : draft().stages[stageId].stepIndex || 0;
    if (statuses[stageId] === "locked") {
      const open = STAGE_ORDER.find((id) => statuses[id] !== "locked") || STAGE_ORDER[0];
      return { mode: "quick", stageId: open, stepIndex: 0, steps: visibleSteps(open, answers(open)), statuses };
    }
    if (stepIndex >= steps.length) stepIndex = steps.length - 1;
    return { mode: "quick", stageId, stepIndex, steps, statuses };
  }

  function renderFeedback(stageId, host) {
    const profile = projectedProfile();
    const feedback = computeStageFeedback(stageId, answers(stageId), DEFAULT_GAP_BENCHMARKS, profile, QUEST_CONFIG);
    host.replaceChildren();
    const label = h("p", { class: "quest-feedback-text" });
    if (feedback.band === "insufficient_data") {
      label.textContent = feedback.existingCents != null || feedback.recordedCents != null ? t("feedbackRecorded") : t("feedbackNeutral");
    } else {
      const percent = Math.round((feedback.coverageRatio || 0) * 100);
      const band = feedback.band === "low" ? t("bandLow") : feedback.band === "moderate" ? t("bandModerate") : t("bandStrong");
      label.textContent = `${band} · ${percent}%${feedback.coverageRatio > 1 ? ` (${t("overflow")})` : ""}${feedback.approximate ? ` · ${t("approximate")}` : ""}`;
    }
    const bar = h("div", { class: "quest-meter", "aria-hidden": "true" }, [
      h("span", { class: feedback.band === "insufficient_data" ? "quest-meter-fill is-neutral" : "quest-meter-fill" }),
    ]);
    const fill = bar.querySelector("span");
    const width = feedback.band === "insufficient_data" ? 0 : Math.min(feedback.coverageRatio || 0, 1) * 100;
    requestAnimationFrame(() => {
      fill.style.transform = `scaleX(${width / 100})`;
    });
    host.append(bar, label);
  }

  function projectedProfile() {
    const life = answers("LIFE_FORTRESS");
    const savings = answers("SAVINGS_TREASURY");
    const pro = draft().pro || {};
    const cash = savings.cashCents?.kind === "provided" ? savings.cashCents.value : savings.cashCents?.kind === "none_confirmed" ? 0 : null;
    const mpf = savings.mpfCents?.kind === "provided" ? savings.mpfCents.value : savings.mpfCents?.kind === "none_confirmed" ? 0 : null;
    return {
      annualIncomeCents: pro.annualIncomeCents ?? null,
      treatmentBufferCents: pro.treatmentBufferCents ?? null,
      dependantsFundCents: pro.dependantsFundCents ?? null,
      liquidAssetsCents: cash == null || mpf == null ? null : cash + mpf,
      outstandingLiabilitiesCents: life.liabilitiesCents?.kind === "provided" ? life.liabilitiesCents.value : null,
    };
  }

  function renderFortress(statuses) {
    fortress.replaceChildren(h("h2", {}, [t("fortress")]));
    const row = h("div", { class: "fortress-row" });
    STAGE_ORDER.forEach((stageId) => {
      const level = deriveRewardLevel(stageId, answers(stageId));
      const status = statuses[stageId];
      const dimmed = status === "locked" || level == null;
      row.append(h("article", { class: dimmed ? "fortress-card is-locked" : "fortress-card" }, [
        h("strong", {}, [t(STAGE_COPY[stageId][2])]),
        h("span", {}, [level == null ? (status === "locked" ? t("locked") : t("feedbackNeutral")) : `${t("rewardLevel")} ${level}`]),
      ]));
    });
    fortress.append(row);
  }

  function moneyField(stageId, field) {
    const config = sliderConfig(stageId, field);
    const current = answers(stageId)[field];
    const value = current?.kind === "provided" ? current.value : config.min;
    const group = h("div", { class: "quest-field" });
    const slider = h("input", {
      type: "range",
      min: String(config.min),
      max: String(config.max),
      step: String(config.step),
      value: String(value),
      "aria-valuetext": formatMoney(value),
    });
    const exact = h("input", {
      type: "text",
      inputmode: "decimal",
      "aria-label": t("typeExact"),
      placeholder: t("typeExact"),
    });
    const readout = h("p", { class: "quest-readout" }, [formatMoney(value)]);
    slider.addEventListener("input", () => {
      const cents = Number(slider.value);
      slider.setAttribute("aria-valuetext", formatMoney(cents));
      readout.textContent = formatMoney(cents);
      setAnswer(stageId, field, provided(cents, "approximate"), { render: false });
      scheduleFeedback(stageId);
    });
    exact.addEventListener("change", () => {
      const parsed = Number(String(exact.value).replace(/,/g, ""));
      if (!Number.isFinite(parsed) || parsed < 0) return;
      const cents = Math.round(parsed * 100);
      setAnswer(stageId, field, provided(cents, "exact", "PRO_FORM"), { render: false });
      slider.value = String(Math.min(config.max, Math.max(config.min, cents)));
      readout.textContent = formatMoney(cents);
      scheduleFeedback(stageId);
    });
    group.append(h("span", {}, [t(field === "mpfCents" ? "tvc" : FIELD_COPY[field] || field)]), slider, readout, exact);
    return group;
  }

  let feedbackHost = null;
  function scheduleFeedback(stageId) {
    if (!feedbackHost) return;
    cancelAnimationFrame(feedbackTimer);
    feedbackTimer = requestAnimationFrame(() => renderFeedback(stageId, feedbackHost));
  }

  function choiceCards(stageId, field, options) {
    const current = answers(stageId)[field];
    const group = h("div", { class: "quest-cards", role: "radiogroup" });
    for (const option of options) {
      const selected = current?.kind === "provided" && current.value === option.value;
      const card = h("button", { type: "button", class: selected ? "quest-card is-selected" : "quest-card", role: "radio", "aria-checked": selected ? "true" : "false" }, [
        h("strong", {}, [t(option.label)]),
      ]);
      card.addEventListener("click", () => setAnswer(stageId, field, provided(option.value, "approximate")));
      group.append(card);
    }
    return group;
  }

  function actionRow(stageId, fields) {
    const row = h("div", { class: "quest-actions" });
    const skip = h("button", { type: "button", class: "portfolio-tool" }, [t("skip")]);
    const none = h("button", { type: "button", class: "portfolio-tool" }, [t("none")]);
    const next = h("button", { type: "button", class: "portfolio-primary" }, [t("next")]);
    skip.addEventListener("click", () => {
      for (const field of fields) setAnswer(stageId, field, unknown());
      advance(stageId);
    });
    none.addEventListener("click", () => {
      for (const field of fields) setAnswer(stageId, field, noneConfirmed());
      advance(stageId);
    });
    next.addEventListener("click", () => advance(stageId));
    row.append(skip, none, next);
    return row;
  }

  function advance(stageId) {
    const steps = visibleSteps(stageId, answers(stageId));
    const index = currentLocation().stepIndex;
    if (index < steps.length - 1) {
      go(stageId, index + 1);
      return;
    }
    const order = STAGE_ORDER.indexOf(stageId);
    const statuses = deriveQuestStatuses(draft().stages, { strictOrder: true, mode: "quick" });
    const nextStage = STAGE_ORDER.slice(order + 1).find((id) => statuses[id] !== "locked");
    if (nextStage) go(nextStage, 0);
  }

  function renderQuick(location) {
    const { stageId, stepIndex, steps } = location;
    const step = steps[stepIndex];
    const stageNumber = STAGE_ORDER.indexOf(stageId) + 1;
    progress.textContent = t("progress").replace("{n}", String(stageNumber));
    root.replaceChildren(h("p", { class: "note" }, [t("ocrNote")]));
    const card = h("section", { class: "glass-card quest-screen" });
    card.append(h("h2", {}, [t(STAGE_COPY[stageId][0])]));
    if (step.kind === "intro") {
      card.append(h("p", {}, [t(STAGE_COPY[stageId][1])]), h("button", { type: "button", class: "portfolio-primary", id: "quest-start" }, [t("startStage")]));
      root.append(card);
      card.querySelector("#quest-start").addEventListener("click", () => go(stageId, stepIndex + 1));
      return;
    }
    if (step.kind === "complete") {
      const level = deriveRewardLevel(stageId, answers(stageId));
      card.append(h("p", {}, [`${t(STAGE_COPY[stageId][2])} · ${level == null ? t("feedbackNeutral") : `${t("rewardLevel")} ${level}`}`]));
      card.append(h("button", { type: "button", class: "portfolio-primary", id: "quest-done" }, [t("next")]));
      root.append(card);
      card.querySelector("#quest-done").addEventListener("click", () => advance(stageId));
      return;
    }
    feedbackHost = h("div", { class: "quest-feedback", "aria-live": "polite" });
    for (const field of step.fields) {
      if (field === "planType") {
        card.append(choiceCards(stageId, field, [
          { value: "VHIS", label: "planVhis" },
          { value: "OTHER", label: "planOther" },
        ]));
      } else if (field === "wardClass") {
        card.append(choiceCards(stageId, field, [
          { value: "GENERAL", label: "wardGeneral" },
          { value: "SEMI", label: "wardSemi" },
          { value: "PRIVATE", label: "wardPrivate" },
        ]));
      } else {
        card.append(moneyField(stageId, field));
      }
    }
    card.append(feedbackHost, actionRow(stageId, step.fields));
    root.append(card);
    renderFeedback(stageId, feedbackHost);
  }

  function proMoney(labelKey, currentCents, onValue) {
    const input = h("input", { type: "text", inputmode: "decimal", "aria-label": t(labelKey) });
    if (currentCents != null) input.value = String(currentCents / 100);
    input.addEventListener("change", () => {
      const parsed = Number(String(input.value).replace(/,/g, ""));
      if (!Number.isFinite(parsed) || parsed < 0) return;
      onValue(Math.round(parsed * 100));
    });
    return h("label", { class: "quest-field" }, [h("span", {}, [t(labelKey)]), input]);
  }

  function renderPro(statuses) {
    progress.textContent = t("modePro");
    root.replaceChildren(
      h("p", { class: "note" }, [t("proNote")]),
      h("section", { class: "glass-card" }, [
        h("h2", {}, [t("stageMedical")]),
        choiceCards("MEDICAL_SHIELD", "planType", [
          { value: "VHIS", label: "planVhis" },
          { value: "OTHER", label: "planOther" },
        ]),
        choiceCards("MEDICAL_SHIELD", "wardClass", [
          { value: "GENERAL", label: "wardGeneral" },
          { value: "SEMI", label: "wardSemi" },
          { value: "PRIVATE", label: "wardPrivate" },
        ]),
        moneyField("MEDICAL_SHIELD", "annualLimitCents"),
        proMoney("premiumPaid", draft().pro.vhisPremiumCents, (cents) => updateDraft((next) => { next.pro.vhisPremiumCents = cents; })),
      ]),
      h("section", { class: "glass-card" }, [h("h2", {}, [t("stageCi")]), moneyField("CI_BARRIER", "sumAssuredCents"), proMoney("treatment", draft().pro.treatmentBufferCents, (cents) => updateDraft((next) => { next.pro.treatmentBufferCents = cents; }))]),
      h("section", { class: "glass-card" }, [h("h2", {}, [t("stageLife")]), moneyField("LIFE_FORTRESS", "sumAssuredCents"), moneyField("LIFE_FORTRESS", "liabilitiesCents"), proMoney("income", draft().pro.annualIncomeCents, (cents) => updateDraft((next) => { next.pro.annualIncomeCents = cents; })), proMoney("dependants", draft().pro.dependantsFundCents, (cents) => updateDraft((next) => { next.pro.dependantsFundCents = cents; }))]),
      h("section", { class: "glass-card" }, [h("h2", {}, [t("stageSavings")]), moneyField("SAVINGS_TREASURY", "mpfCents"), moneyField("SAVINGS_TREASURY", "cashCents"), proMoney("tvc", draft().pro.tvcPaidCents, (cents) => updateDraft((next) => { next.pro.tvcPaidCents = cents; })), proMoney("nci", draft().pro.netChargeableIncomeCents, (cents) => updateDraft((next) => { next.pro.netChargeableIncomeCents = cents; })), proMoney("premiumPaid", draft().pro.qdapPremiumCents, (cents) => updateDraft((next) => { next.pro.qdapPremiumCents = cents; next.pro.qdap = true; }))]),
    );
  }

  function render() {
    if (!isConsented()) {
      progress.textContent = "";
      fortress.replaceChildren();
      root.replaceChildren(h("p", { class: "empty-state" }, [t("needConsent")]));
      return;
    }
    const location = currentLocation();
    renderFortress(location.statuses);
    if (location.mode === "pro") renderPro(location.statuses);
    else renderQuick(location);
  }

  window.addEventListener("popstate", render);
  return { render, go };
}
