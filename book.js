import {
  initFirebase,
  getAllAppointments,
  getMonthAppointments,
  reserveAppointment,
  getAppointmentByCode,
  getSettings,
  resolveOwnerFromUrl,
} from "./firebase-api.js";
import {
  SERVICES as DEFAULT_SERVICES,
  DISTRICT_OPTIONS,
  PURPOSE_OPTIONS,
  buildSlotsFromSchedule,
  isDateBlocked,
  toYMD,
  localDateTime,
  escapeHtml,
  indexAppointments,
  buildGoogleCalendarUrl,
  buildWhatsAppUrl,
  bookingRangeFromStart,
  timeToMinutes,
  safeStatus,
} from "./shared.js";
import { renderTimeline, formatDateChip } from "./timeline.js";

let firebaseInitError = null;
let SLOT_DEFS = buildSlotsFromSchedule({});
let SERVICES = DEFAULT_SERVICES;
let appSettings = null;
let ownerProfile = null;
let ownerError = null;
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const urlParams = new URLSearchParams(window.location.search);
const isPreviewEmbed = urlParams.get("preview") === "1";

function withTimeout_(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function loadAppSettings(ownerId) {
  const res = await getSettings(ownerId);
  if (res.ok && res.settings) {
    appSettings = res.settings;
    SERVICES = (res.settings.services || DEFAULT_SERVICES).filter((s) => s.enabled !== false);
    SLOT_DEFS = buildSlotsFromSchedule(res.settings.schedule);
    applyBranding();
  }
}

function revealApp_() {
  document.documentElement.classList.remove("boot-pending");
  document.getElementById("boot-overlay")?.remove();
  if (isPreviewEmbed) {
    document.documentElement.classList.add("is-preview-embed");
    document.body.classList.add("is-preview-embed");
  }
  document.activeElement instanceof HTMLElement && document.activeElement.blur();
}

function darkenHex(hex, amount = 0.18) {
  const raw = String(hex || "").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return hex;
  const nums = [0, 2, 4].map((i) => parseInt(raw.slice(i, i + 2), 16));
  const darkened = nums.map((n) => Math.max(0, Math.round(n * (1 - amount))));
  return `#${darkened.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function applyThemeColors(primary, yellow) {
  const root = document.documentElement;
  if (primary) {
    root.style.setProperty("--color-primary", primary);
    root.style.setProperty("--color-primary-dark", darkenHex(primary));
    root.style.setProperty("--mcd-red", primary);
    root.style.setProperty("--mcd-red-dark", darkenHex(primary));
    const theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.setAttribute("content", yellow || primary);
  }
  if (yellow) {
    root.style.setProperty("--color-accent", yellow);
    root.style.setProperty("--color-accent-soft", `${yellow}33`);
    root.style.setProperty("--mcd-yellow", yellow);
    root.style.setProperty("--mcd-yellow-light", `${yellow}33`);
  }
}

function applyBranding() {
  if (!appSettings?.agent) return;
  const a = appSettings.agent;
  document.title = a.pageTitle ? `${a.pageTitle} · AIA Agent` : document.title;
  if (topTitle) topTitle.textContent = a.pageTitle || topTitle.textContent;
  if (topSub) topSub.textContent = a.pageSubtitle || topSub.textContent;
  if (servicesHeading) servicesHeading.textContent = a.servicesHeading || servicesHeading.textContent;
  if (traceTitle) traceTitle.textContent = a.traceTitle || traceTitle.textContent;
  if (codeInput) {
    codeInput.placeholder = "TN2VK8";
    codeInput.maxLength = 6;
  }
  if (successTitle) successTitle.textContent = a.successTitle || successTitle.textContent;
  if (successDesc) successDesc.textContent = a.successDesc || successDesc.textContent;
  const tag = document.getElementById("banner-tag");
  const h2 = document.getElementById("banner-title");
  const p = document.getElementById("banner-desc");
  if (tag) tag.textContent = a.bannerTag || tag.textContent;
  if (h2) h2.textContent = a.bannerTitle || h2.textContent;
  if (p) p.textContent = a.bannerDesc || p.textContent;
  applyThemeColors(appSettings.branding?.primaryColor, appSettings.branding?.yellowColor);
}

function postEditorMessage_(payload) {
  if (!isPreviewEmbed || window.parent === window) return;
  window.parent.postMessage({ source: "aia-page-editor", ...payload }, "*");
}

function bindEditable_(el, key, { multiline = false } = {}) {
  if (!el) return;
  el.dataset.editKey = key;
  el.contentEditable = "true";
  el.spellcheck = false;
  el.setAttribute("role", "textbox");
  if (!multiline) {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") e.preventDefault();
    });
  }
  const emit = () => {
    const value = (el.textContent || "").replace(/\u00a0/g, " ").trim();
    postEditorMessage_({ type: "field-change", key, value });
  };
  el.addEventListener("input", emit);
  el.addEventListener("blur", emit);
  el.addEventListener("focus", () => postEditorMessage_({ type: "field-focus", key }));
}

function enablePageEditor_() {
  const a = appSettings?.agent || {};

  const hint = document.createElement("div");
  hint.className = "page-editor-hint";
  hint.textContent = "點黃色虛線文字即可直接改；改完記得按右側「儲存用戶頁面」。";
  stepHome?.prepend(hint);

  const agentCard = document.createElement("div");
  agentCard.className = "agent-mini-card page-editor-agent";
  agentCard.innerHTML = `
    <div class="agent-avatar" data-edit-key="emoji">${escapeHtml(a.emoji || "👤")}</div>
    <div class="agent-mini-info">
      <strong data-edit-key="name">${escapeHtml(a.name || "AIA Agent")}</strong>
      <span data-edit-key="title">${escapeHtml(a.title || "保險與儲蓄顧問")}</span>
      <span data-edit-key="bio">${escapeHtml(a.bio || "1對1 專屬財務規劃")}</span>
    </div>`;
  stepHome?.insertBefore(agentCard, document.querySelector(".hero-banner"));

  const successCard = document.createElement("div");
  successCard.className = "success-card ui-card page-editor-success";
  successCard.innerHTML = `
    <div class="success-icon">✅</div>
    <h2 class="success-title" data-edit-key="successTitle">${escapeHtml(a.successTitle || "預約成功！")}</h2>
    <p class="success-desc" data-edit-key="successDesc">${escapeHtml(a.successDesc || "請保存你的預約代碼")}</p>
    <div class="success-code">TN2VK8</div>`;
  stepHome?.appendChild(successCard);

  bindEditable_(topTitle, "pageTitle");
  bindEditable_(topSub, "pageSubtitle");
  bindEditable_(document.getElementById("banner-tag"), "bannerTag");
  bindEditable_(document.getElementById("banner-title"), "bannerTitle");
  bindEditable_(agentCard.querySelector('[data-edit-key="emoji"]'), "emoji");
  bindEditable_(agentCard.querySelector('[data-edit-key="name"]'), "name");
  bindEditable_(agentCard.querySelector('[data-edit-key="title"]'), "title");
  bindEditable_(agentCard.querySelector('[data-edit-key="bio"]'), "bio", { multiline: true });

  // Keep real booking interactions off while editing.
  serviceList?.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      postEditorMessage_({ type: "hint", message: "服務項目請去「服務」分頁編輯。" });
    },
    true
  );

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.source !== "aia-page-editor-host") return;
    if (data.type === "set-field" && data.key) {
      const el = document.querySelector(`[data-edit-key="${data.key}"]`);
      if (el && document.activeElement !== el) el.textContent = data.value || "";
      if (data.key === "pageTitle" && topTitle && document.activeElement !== topTitle) {
        topTitle.textContent = data.value || "";
      }
    }
  });

  postEditorMessage_({ type: "ready" });
}

function pageCopy(key, fallback) {
  return appSettings?.agent?.[key] || fallback;
}

function loadingHtml(message, percent = 55, subtext = "請稍候") {
  return `
    <div class="loading loading-card" style="--loading-progress:${percent}%">
      <div class="loading-row">
        <div class="loading-spinner" aria-hidden="true"></div>
        <div class="loading-copy">
          <strong>${escapeHtml(message)}</strong>
          <span>${escapeHtml(subtext)}</span>
        </div>
        <div class="loading-percent">${percent}%</div>
      </div>
      <div class="loading-progress"><span class="loading-progress-bar"></span></div>
    </div>`;
}

const backBtn = document.getElementById("back-btn");
const topTitle = document.getElementById("top-title");
const topSub = document.getElementById("top-sub");
const stepDots = document.querySelectorAll(".step-dot");
const stepHome = document.getElementById("step-home");
const stepPurpose = document.getElementById("step-purpose");
const stepTime = document.getElementById("step-time");
const stepConfirm = document.getElementById("step-confirm");
const stepSuccess = document.getElementById("step-success");
const appBody = document.querySelector(".app-body");
const bottomBar = document.getElementById("bottom-bar");
const bottomCta = document.getElementById("bottom-cta");
const serviceList = document.getElementById("service-list");
const agentMiniCard = document.getElementById("agent-mini-card");
const dateScroll = document.getElementById("date-scroll");
const timelineContainer = document.getElementById("timeline-container");
const stickySummary = document.getElementById("sticky-summary");
const stickySummaryText = document.getElementById("sticky-summary-text");
const stickySummaryBtn = document.getElementById("sticky-summary-btn");
const sheetOverlay = document.getElementById("sheet-overlay");
const sheetSummary = document.getElementById("sheet-summary");
const sheetConfirmBtn = document.getElementById("sheet-confirm-btn");
const sheetCloseBtn = document.getElementById("sheet-close-btn");
const confirmSummary = document.getElementById("confirm-summary");
const reserveForm = document.getElementById("reserve-form");
const nameInput = document.getElementById("name");
const contactInput = document.getElementById("contact");
const districtInput = document.getElementById("district");
const purposeList = document.getElementById("purpose-list");
const codeInput = document.getElementById("code-input");
const codeInputProxy = document.getElementById("code-input-proxy");
const codeCheckBtn = document.getElementById("code-check-btn");
const codeTraceMsg = document.getElementById("code-trace-msg");
const successCode = document.getElementById("success-code");
const successDetails = document.getElementById("success-details");
const successUpcoming = document.getElementById("success-upcoming");
const servicesHeading = document.getElementById("services-heading");
const traceTitle = document.getElementById("trace-title");
const successTitle = document.querySelector(".success-title");
const successDesc = document.querySelector(".success-desc");
const btnCalendar = document.getElementById("btn-calendar");
const btnWhatsapp = document.getElementById("btn-whatsapp");
const btnNewBooking = document.getElementById("btn-new-booking");

let currentStep = 1;
let selectedService = null;
let selectedPurpose = null;
let selectedDateStr = null;
let selectedSlot = null;
let year = new Date().getFullYear();
let month = new Date().getMonth() + 1;
let byKey = new Map();
let byDate = new Map();
let successViewMode = "new";

init();

async function init() {
  revealApp_();
  try {
    try {
      await Promise.race([
        initFirebase(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Firebase 連線逾時")), 8000)),
      ]);
    } catch (err) {
      firebaseInitError = String(err?.message || err);
    }
    if (!firebaseInitError) {
      const ownerRes = await withTimeout_(
        resolveOwnerFromUrl({
          agent: urlParams.get("agent"),
          uid: urlParams.get("uid"),
        }),
        8000,
        { ok: false, message: "載入顧問資料逾時，請重新整理。" }
      );
      if (!ownerRes.ok) {
        ownerError = ownerRes.message;
      } else {
        ownerProfile = ownerRes.profile;
        await loadAppSettings(ownerProfile.uid);
      }
    }

    if (ownerError) {
      serviceList.innerHTML = `<div class="alert-warn">${escapeHtml(ownerError)}<br><small>請向你的 agent 索取專屬預約連結。</small></div>`;
      bottomCta.disabled = true;
    } else {
      renderServices();
    }

    if (!isPreviewEmbed) {
      backBtn.addEventListener("click", goBack);
      bottomCta.addEventListener("click", onBottomCta);
      reserveForm.addEventListener("submit", (e) => e.preventDefault());
      codeInputProxy?.addEventListener("click", openCodeInput_);
      codeCheckBtn.addEventListener("click", () => {
        if (codeInput?.classList.contains("hidden")) openCodeInput_();
        else onCodeTrace();
      });
      codeInput?.addEventListener("input", () => {
        const cleaned = (codeInput.value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
        if (codeInput.value !== cleaned) codeInput.value = cleaned;
      });
      codeInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onCodeTrace();
        }
      });
      btnNewBooking.addEventListener("click", resetAll);
      stickySummaryBtn.addEventListener("click", () => selectedSlot && openSlotSheet());
      sheetConfirmBtn.addEventListener("click", () => {
        closeSheet();
        showStep(4);
      });
      sheetCloseBtn.addEventListener("click", closeSheet);
      sheetOverlay.addEventListener("click", (e) => {
        if (e.target === sheetOverlay) closeSheet();
      });
    }

    showStep(1);
    if (districtInput && !districtInput.options?.length) {
      districtInput.innerHTML = `<option value="">請選擇地區</option>${DISTRICT_OPTIONS.map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join("")}`;
    }
    if (isPreviewEmbed) enablePageEditor_();
  } finally {
    revealApp_();
  }
}

function renderServices() {
  serviceList.innerHTML = SERVICES.map(
    (s) => `
    <button type="button" class="service-card" data-service-id="${s.id}">
      <div class="service-card-top">
        <span class="service-emoji">${s.emoji}</span>
        <div class="service-card-body">
          <p class="service-card-title">${escapeHtml(s.title)}</p>
          <p class="service-card-desc">${escapeHtml(s.desc)}</p>
          <div class="service-meta">
            <span class="badge badge-${s.badgeType}">${escapeHtml(s.badge)}</span>
            <span class="badge badge-meta">${escapeHtml(s.duration)}</span>
            <span class="badge badge-meta">${escapeHtml(s.format)}</span>
          </div>
        </div>
      </div>
    </button>`
  ).join("");

  serviceList.querySelectorAll("[data-service-id]").forEach((btn) => {
    btn.addEventListener("click", () => selectService(btn.getAttribute("data-service-id")));
  });
}

function selectService(id) {
  selectedService = SERVICES.find((s) => s.id === id) || null;
  serviceList.querySelectorAll(".service-card").forEach((el) => {
    el.classList.toggle("selected", el.getAttribute("data-service-id") === id);
  });
  bottomCta.disabled = !selectedService;
  bottomCta.textContent = selectedService ? "選擇目的 →" : "請選擇服務";
}

function renderPurposes() {
  if (!purposeList) return;
  purposeList.innerHTML = PURPOSE_OPTIONS.map((p) => {
    const selected = selectedPurpose?.id === p.id;
    const chips = p.durations
      .map((min) => {
        const on = selected && selectedPurpose?.durationMinutes === min;
        return `<button type="button" class="duration-chip ${on ? "selected" : ""}" data-purpose-id="${p.id}" data-min="${min}">${min} 分鐘</button>`;
      })
      .join("");
    return `
      <div class="purpose-card ${selected ? "selected" : ""}" data-purpose-id="${p.id}">
        <button type="button" class="purpose-card-main" data-purpose-id="${p.id}">
          <strong>${escapeHtml(p.title)}</strong>
          <span>${escapeHtml(p.hint)}</span>
        </button>
        <div class="duration-chips">${chips}</div>
      </div>`;
  }).join("");

  purposeList.querySelectorAll(".purpose-card-main").forEach((btn) => {
    btn.addEventListener("click", () => selectPurpose(btn.getAttribute("data-purpose-id")));
  });
  purposeList.querySelectorAll(".duration-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectPurpose(btn.getAttribute("data-purpose-id"), Number(btn.getAttribute("data-min")));
    });
  });
}

function selectPurpose(id, durationMinutes) {
  const option = PURPOSE_OPTIONS.find((p) => p.id === id) || null;
  if (!option) return;
  const nextDur =
    Number(durationMinutes) ||
    (selectedPurpose?.id === id ? selectedPurpose.durationMinutes : option.durations[0]);
  selectedPurpose = {
    id: option.id,
    value: option.value,
    title: option.title,
    durationMinutes: option.durations.includes(nextDur) ? nextDur : option.durations[0],
  };
  selectedSlot = null;
  renderPurposes();
  if (currentStep === 2) {
    bottomCta.disabled = false;
    bottomCta.textContent = `選擇 ${selectedPurpose.durationMinutes} 分鐘時段 →`;
  }
}

function openCodeInput_() {
  if (!codeInput) return;
  codeInputProxy?.classList.add("hidden");
  codeInput.classList.remove("hidden");
  codeInput.tabIndex = 0;
  requestAnimationFrame(() => codeInput.focus());
}

function setConfirmFieldsEnabled_(on) {
  [nameInput, contactInput, districtInput].forEach((el) => {
    if (!el) return;
    el.disabled = !on;
    el.tabIndex = on ? 0 : -1;
  });
}

function showStep(step) {
  currentStep = step;
  closeSheet();
  stepHome.classList.toggle("hidden", step !== 1);
  stepPurpose?.classList.toggle("hidden", step !== 2);
  stepTime.classList.toggle("hidden", step !== 3);
  stepConfirm.classList.toggle("hidden", step !== 4);
  stepSuccess.classList.toggle("hidden", step !== 5);
  stepDots.forEach((d) => d.classList.toggle("active", Number(d.dataset.step) === Math.min(step, 4)));

  backBtn.classList.toggle("hidden", step === 1 || step === 5);
  bottomBar.classList.toggle("hidden", step === 3 || step === 5);
  stickySummary.classList.toggle("hidden", step !== 3);
  appBody.classList.toggle("app-body--has-sticky", step === 3);
  setConfirmFieldsEnabled_(step === 4);

  if (step === 1) {
    topTitle.textContent = pageCopy("pageTitle", "預約諮詢");
    topSub.textContent = pageCopy("pageSubtitle", "AIA · 保險與儲蓄");
    bottomCta.textContent = selectedService ? "選擇目的 →" : "請選擇服務";
    bottomCta.disabled = !selectedService;
  } else if (step === 2) {
    topTitle.textContent = "選擇目的";
    topSub.textContent = selectedService?.title || "";
    renderPurposes();
    bottomCta.textContent = selectedPurpose
      ? `選擇 ${selectedPurpose.durationMinutes} 分鐘時段 →`
      : "請選擇目的同需時";
    bottomCta.disabled = !selectedPurpose;
  } else if (step === 3) {
    topTitle.textContent = "選擇時段";
    topSub.textContent = selectedPurpose
      ? `${selectedPurpose.title} · ${selectedPurpose.durationMinutes} 分鐘`
      : selectedService?.title || "";
    renderAgentMini();
    loadMonthAndRenderTime();
  } else if (step === 4) {
    topTitle.textContent = "確認預約";
    topSub.textContent = "最後一步";
    bottomBar.classList.remove("hidden");
    bottomCta.textContent = "搶先佔用時段";
    bottomCta.disabled = false;
    renderConfirmSummary();
  } else if (step === 5) {
    bottomBar.classList.add("hidden");
    stickySummary.classList.add("hidden");
    if (successViewMode === "trace") {
      topTitle.textContent = "預約詳情";
      topSub.textContent = "代碼查詢結果";
    } else {
      topTitle.textContent = pageCopy("successHeaderTitle", "預約完成");
      topSub.textContent = pageCopy("successHeaderSubtitle", "感謝你的預約");
    }
  }
}

function renderSuccessDetails_(appointment) {
  if (!successDetails) return;
  const chip = formatDateChip(appointment.date, WEEKDAYS);
  successDetails.innerHTML = `
    📋 ${escapeHtml(appointment.serviceTitle || appointment.service || "—")}<br>
    📅 ${escapeHtml(chip.label)} · ${escapeHtml(appointment.start || "")} – ${escapeHtml(appointment.end || "")}<br>
    👤 ${escapeHtml(appointment.name || "—")}<br>
    📞 ${escapeHtml(appointment.contact || "—")}<br>
    📍 ${escapeHtml(appointment.district || "—")}`;
}

function isUpcoming_(appt, now = new Date()) {
  const d = String(appt?.date || "");
  const t = String(appt?.start || "");
  if (!d || !t) return false;
  const dt = localDateTime(d, t);
  if (!dt) return false;
  return dt.getTime() >= now.getTime() && !appt.cancelled && appt.status !== "Cancelled";
}

async function renderUpcomingByContact_(contact, highlightCode = "") {
  if (!successUpcoming) return;
  const contactKey = String(contact || "").trim();
  if (!contactKey) {
    successUpcoming.innerHTML = "";
    return;
  }
  successUpcoming.innerHTML = '<p class="success-upcoming-empty">載入嚟緊預約…</p>';
  const res = await getAllAppointments(ownerProfile?.uid);
  if (!res.ok) {
    successUpcoming.innerHTML = '<p class="success-upcoming-empty">暫時未能載入嚟緊預約</p>';
    return;
  }
  const upcoming = (res.appointments || [])
    .filter((a) => String(a.contact || "").trim() === contactKey)
    .filter((a) => isUpcoming_(a))
    .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`))
    .slice(0, 5);

  if (!upcoming.length) {
    successUpcoming.innerHTML = '<p class="success-upcoming-empty">你暫時冇其他嚟緊預約。</p>';
    return;
  }

  successUpcoming.innerHTML = `
    <div class="success-upcoming-title">嚟緊預約</div>
    <ul class="success-upcoming-list">
      ${upcoming
        .map((a) => {
          const chip = formatDateChip(a.date, WEEKDAYS);
          const mark = a.code === highlightCode ? "（今次）" : "";
          return `<li>${escapeHtml(chip.label)} ${escapeHtml(a.start || "")} · ${escapeHtml(a.serviceTitle || a.service || "預約")} · ${escapeHtml(a.code || "")}${mark}</li>`;
        })
        .join("")}
    </ul>`;
}

function renderAgentMini() {
  const agent = appSettings?.agent;
  agentMiniCard.innerHTML = `
    <div class="agent-avatar">${escapeHtml(agent?.emoji || selectedService?.emoji || "👤")}</div>
    <div class="agent-mini-info">
      <strong>${escapeHtml(agent?.name || selectedService?.title || "Agent")}</strong>
      <span>${escapeHtml(
        selectedPurpose
          ? `${selectedPurpose.title} · ${selectedPurpose.durationMinutes} 分鐘`
          : agent?.title || selectedService?.duration || ""
      )}</span>
    </div>`;
}

function goBack() {
  if (currentStep === 4) showStep(3);
  else if (currentStep === 3) showStep(2);
  else if (currentStep === 2) showStep(1);
}

function onBottomCta() {
  if (currentStep === 1 && selectedService) showStep(2);
  else if (currentStep === 2 && selectedPurpose) showStep(3);
  else if (currentStep === 4) submitBooking();
}

async function loadMonthAndRenderTime() {
  selectedSlot = null;
  updateStickySummary();

  if (firebaseInitError) {
    timelineContainer.innerHTML = `<div class="alert-warn">${escapeHtml(firebaseInitError)}</div>`;
    return;
  }

  timelineContainer.innerHTML = loadingHtml("載入時間表…", 55, "讀取可預約時段");

  try {
    const res = await getMonthAppointments(year, month);
    if (!res.ok) throw new Error(res.message);
    ({ byKey, byDate } = indexAppointments(res.appointments || []));
  } catch (err) {
    byKey = new Map();
    byDate = new Map();
  }

  renderDateScroll();
  if (!selectedDateStr) {
    const first = getAvailableDates()[0];
    if (first) selectDate(first);
  } else {
    selectDate(selectedDateStr);
  }
}

function getAvailableDates() {
  const dates = [];
  const today = toYMD(new Date());
  const lastDay = new Date(year, month, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = toYMD(new Date(year, month - 1, d));
    if (dateStr >= today && !isDateBlocked(dateStr, appSettings?.schedule)) dates.push(dateStr);
  }
  return dates;
}

function renderDateScroll() {
  const dates = getAvailableDates();
  dateScroll.innerHTML = dates
    .map((dateStr) => {
      const chip = formatDateChip(dateStr, WEEKDAYS);
      const isSelected = dateStr === selectedDateStr;
      const count = (byDate.get(dateStr) || []).length;
      return `
      <button type="button" class="date-chip ${isSelected ? "selected" : ""}" data-date="${dateStr}">
        <span class="date-chip-weekday">${chip.weekday}</span>
        <span class="date-chip-day">${chip.day}</span>
        <span class="date-chip-month">${chip.month}${count ? ` · ${count}筆` : ""}</span>
      </button>`;
    })
    .join("");

  dateScroll.querySelectorAll("[data-date]").forEach((btn) => {
    btn.addEventListener("click", () => selectDate(btn.getAttribute("data-date")));
  });

  const selectedEl = dateScroll.querySelector(`[data-date="${selectedDateStr}"]`);
  selectedEl?.scrollIntoView({ inline: "center", behavior: "smooth" });
}

function selectDate(dateStr) {
  selectedDateStr = dateStr;
  selectedSlot = null;
  updateStickySummary();
  renderDateScroll();
  renderTimelineView();
}

function bookingDurationMinutes_() {
  return selectedPurpose?.durationMinutes || 45;
}

function busyRangesForDate_(dateStr) {
  return (byDate.get(dateStr) || [])
    .filter((a) => safeStatus(a.status))
    .map((a) => ({ start: a.start, end: a.end }));
}

function renderTimelineView() {
  if (!selectedDateStr) return;

  renderTimeline({
    container: timelineContainer,
    slots: SLOT_DEFS,
    dateStr: selectedDateStr,
    byKey,
    byDate,
    mode: "user",
    selectedSlot,
    durationMinutes: bookingDurationMinutes_(),
    onAvailableClick: (slot) => {
      const range = bookingRangeFromStart(
        SLOT_DEFS,
        slot.start,
        bookingDurationMinutes_(),
        busyRangesForDate_(selectedDateStr)
      );
      if (!range) {
        alert("此時段不夠完整時長，請選其他空檔。");
        return;
      }
      selectedSlot = range;
      updateStickySummary();
      renderTimelineView();
      openSlotSheet();
    },
  });
}

function updateStickySummary() {
  if (!selectedSlot || !selectedDateStr || !selectedService) {
    stickySummaryText.textContent = "請選擇可預約時段";
    stickySummaryBtn.disabled = true;
    return;
  }
  const chip = formatDateChip(selectedDateStr, WEEKDAYS);
  stickySummaryText.innerHTML = `
    <strong>${chip.label} ${selectedSlot.start} – ${selectedSlot.end}</strong>
    ${escapeHtml(selectedService.title)} · ${selectedPurpose?.durationMinutes || ""} 分鐘`;
  stickySummaryBtn.disabled = false;
}

function openSlotSheet() {
  if (!selectedSlot || !selectedService) return;
  const chip = formatDateChip(selectedDateStr, WEEKDAYS);
  sheetSummary.innerHTML = `
    已選：<strong>${chip.label}</strong><br>
    ⏰ <strong>${selectedSlot.start} – ${selectedSlot.end}</strong>（${selectedPurpose?.durationMinutes || ""} 分鐘）<br>
    📋 項目：<strong>${escapeHtml(selectedService.title)}</strong><br>
    🎯 目的：<strong>${escapeHtml(selectedPurpose?.title || "")}</strong>`;
  sheetOverlay.classList.remove("hidden");
  sheetOverlay.setAttribute("aria-hidden", "false");
}

function closeSheet() {
  sheetOverlay.classList.add("hidden");
  sheetOverlay.setAttribute("aria-hidden", "true");
}

function renderConfirmSummary() {
  const chip = formatDateChip(selectedDateStr, WEEKDAYS);
  const district = districtInput?.value?.trim() || "—";
  confirmSummary.innerHTML = `
    <strong>${escapeHtml(selectedService.title)}</strong>
    📅 ${chip.label} · ${selectedSlot.start} – ${selectedSlot.end}<br>
    🎯 ${escapeHtml(selectedPurpose?.title || "—")} · ${selectedPurpose?.durationMinutes || ""} 分鐘<br>
    📍 ${escapeHtml(district)}<br>
    ${escapeHtml(selectedService.format || "")}`;
}

async function submitBooking() {
  if (firebaseInitError) {
    alert(firebaseInitError);
    return;
  }
  const name = nameInput.value.trim();
  const contact = contactInput.value.trim();
  const district = districtInput?.value?.trim() || "";
  const purpose = selectedPurpose?.value || "";
  if (!name || !contact || !district || !purpose) {
    alert("請填寫姓名、聯絡方式同地區");
    return;
  }

  bottomCta.disabled = true;
  bottomCta.textContent = "提交中…";

  const res = await reserveAppointment({
    date: selectedDateStr,
    start: selectedSlot.start,
    end: selectedSlot.end,
    contact,
    name,
    district,
    purpose,
    service: selectedService.id,
    serviceTitle: selectedService.title,
    ownerId: ownerProfile?.uid,
  });

  bottomCta.disabled = false;
  bottomCta.textContent = "搶先佔用時段";

  if (!res.ok) {
    alert(res.message || "預約失敗");
    return;
  }

  try {
    localStorage.setItem("myAIAAppointmentCode", res.code);
  } catch (_) {}

  successCode.textContent = res.code;
  successViewMode = "new";
  renderSuccessDetails_({
    date: selectedDateStr,
    start: selectedSlot.start,
    end: selectedSlot.end,
    name,
    contact,
    district,
    service: selectedService.id,
    serviceTitle: selectedService.title,
  });
  btnCalendar.href = buildGoogleCalendarUrl({
    title: selectedService.title,
    date: selectedDateStr,
    start: selectedSlot.start,
    end: selectedSlot.end,
    code: res.code,
  });
  btnWhatsapp.href = buildWhatsAppUrl({
    name,
    date: selectedDateStr,
    start: selectedSlot.start,
    code: res.code,
    serviceTitle: selectedService.title,
    agentWhatsApp: appSettings?.agent?.whatsapp || "",
  });
  await renderUpcomingByContact_(contact, res.code);

  showStep(5);
}

async function onCodeTrace() {
  const code = (codeInput.value || "").trim().toUpperCase();
  codeInput.value = code;
  if (!code) {
    codeTraceMsg.classList.remove("hidden");
    codeTraceMsg.textContent = "請輸入代碼";
    return;
  }
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    codeTraceMsg.classList.remove("hidden");
    codeTraceMsg.textContent = "預約代碼應為 6 位大階英數，例如 TN2VK8";
    return;
  }
  try {
    localStorage.setItem("myAIAAppointmentCode", code);
  } catch (_) {}
  codeCheckBtn.disabled = true;
  codeCheckBtn.textContent = "查詢中…";
  const found = await getAppointmentByCode(code, ownerProfile?.uid);
  codeCheckBtn.disabled = false;
  codeCheckBtn.textContent = "追蹤";
  if (!found.ok || !found.appointment) {
    codeTraceMsg.classList.remove("hidden");
    codeTraceMsg.textContent = found.message || "找不到預約資料";
    return;
  }

  const appt = found.appointment;
  successViewMode = "trace";
  successCode.textContent = appt.code || code;
  renderSuccessDetails_(appt);
  btnCalendar.href = buildGoogleCalendarUrl({
    title: appt.serviceTitle || "預約",
    date: appt.date,
    start: appt.start,
    end: appt.end,
    code: appt.code || code,
  });
  btnWhatsapp.href = buildWhatsAppUrl({
    name: appt.name,
    date: appt.date,
    start: appt.start,
    code: appt.code || code,
    serviceTitle: appt.serviceTitle || appt.service,
    agentWhatsApp: appSettings?.agent?.whatsapp || "",
  });
  await renderUpcomingByContact_(appt.contact, appt.code || code);
  codeTraceMsg.classList.add("hidden");
  showStep(5);
}

function resetAll() {
  selectedService = null;
  selectedPurpose = null;
  selectedDateStr = null;
  selectedSlot = null;
  successViewMode = "new";
  if (successUpcoming) successUpcoming.innerHTML = "";
  reserveForm.reset();
  serviceList.querySelectorAll(".service-card").forEach((el) => el.classList.remove("selected"));
  showStep(1);
}
