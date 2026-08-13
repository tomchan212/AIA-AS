import {
  initFirebase,
  onAuthChange,
  adminLogout,
  getCurrentUserEmail,
  getAuthInstance,
  getSettings,
  saveSettings,
  getAllAppointments,
  subscribeAppointments,
  getMonthAppointments,
  reserveAppointment,
  updateAppointment,
  updateAppointmentStatus,
  cancelAppointment,
  duplicateAppointment,
  addAuditLog,
  getBlockedContacts,
  blockContact,
  aggregateClients,
  exportAppointmentsCsv,
  computeDashboardStats,
  mapAppointment,
  ensureUserProfile,
  isSuperAdmin,
  setSuperAdminViewAll,
  setViewAsOwnerId,
  getAllAgents,
  getBookingPageUrl,
  getEffectiveOwnerId,
  isSuperAdminViewAll,
  defaultSettings,
} from "./firebase-api.js";
import {
  STATUS_OPTIONS,
  DISTRICT_OPTIONS,
  buildSlots,
  toYMD,
  localDateTime,
  escapeHtml,
  safeStatus,
  timeToMinutes,
  minutesToTime,
  timesOverlap,
  indexAppointments,
  buildGoogleCalendarUrl,
  buildWhatsAppUrl,
} from "./shared.js";
import { renderTimeline, formatDateChip, countSpanSlots } from "./timeline.js";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const UI_SUPER_ADMIN_EMAILS = new Set(["admin@aia.local"]);

const NAV_ITEMS = [
  { id: "dashboard", label: "總覽", short: "總覽", icon: "⌂", title: "Dashboard" },
  { id: "appointments", label: "預約", short: "預約", icon: "📅", title: "預約管理" },
  { id: "clients", label: "客戶", short: "客戶", icon: "👤", title: "客戶管理" },
  { id: "editor", label: "頁面＋服務", short: "頁面", icon: "✎", title: "頁面與服務編輯" },
  { id: "notifications", label: "通知", short: "通知", icon: "🔔", title: "通知設定" },
  { id: "export", label: "匯出", short: "匯出", icon: "⇪", title: "匯出與整合" },
];

const adminShell = document.getElementById("admin-shell");
const adminSidebar = document.querySelector(".admin-sidebar");
const adminNav = document.getElementById("admin-nav");
const viewRoot = document.getElementById("view-root");
const viewTitle = document.getElementById("view-title");
const adminUserEmail = document.getElementById("admin-user-email");
const logoutBtn = document.getElementById("logout-btn");
const adminMenuToggle = document.getElementById("admin-menu-toggle");
const sheetOverlay = document.getElementById("sheet-overlay");
const sheetPanel = document.getElementById("sheet-panel");

let firebaseReady = false;
let firebaseError = null;
let settings = null;
let allAppointments = [];
let monthAppointments = [];
let byKey = new Map();
let byDate = new Map();
let blockedContacts = [];
let currentView = "dashboard";
let apptYear = new Date().getFullYear();
let apptMonth = new Date().getMonth() + 1;
let selectedDateStr = toYMD(new Date());
let statusFilter = "";
let apptViewMode = "day";
let weekDragSuppressClick_ = false;
let weekDndBound_ = false;
let clientSearch = "";
let slotDefs = [];
let superAdmin = false;
let allAgents = [];
let myProfile = null;
let booted = false;
let appointmentsUnsub = null;
let knownApptIds = new Set();
let liveReady = false;
let notifyPermissionAsked = false;
let pageEditorMessageHandler = null;

try {
  await initFirebase();
  firebaseReady = true;
} catch (err) {
  firebaseError = String(err?.message || err);
}

function hideBootScreen() {
  window.__adminBooted = true;
  document.getElementById("admin-boot")?.remove();
}

function withTimeout(promise, fallback, label, ms = 4000) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => {
      console.warn(`${label} loading timed out`);
      resolve(fallback);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function loadingHtml(message, percent = 75, subtext = "請稍候") {
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

async function startAdminForUser(user) {
  if (!user) {
    const auth = getAuthInstance();
    if (auth) {
      await auth.authStateReady();
      if (auth.currentUser) return;
    }
    window.location.replace("admin-login.html?v=89");
    return;
  }

  if (booted) return;
  booted = true;

  try {
    // Paint shell immediately so login never feels stuck on a long boot screen.
    adminShell?.classList.remove("hidden");
    adminUserEmail.textContent = user.email || "—";
    renderNav();
    if (viewRoot) viewRoot.innerHTML = loadingHtml("載入中…", 55, "讀取帳戶與預約");
    hideBootScreen();

    const loginEmail = String(user.email || "").toLowerCase();
    const maybeSuper = UI_SUPER_ADMIN_EMAILS.has(loginEmail);

    // Regular agents skip the Super Admin config round-trip entirely.
    const profilePromise = withTimeout(
      ensureUserProfile(user),
      {
        ok: true,
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "",
        slug: "",
      },
      "帳戶資料",
      4000
    );
    const superPromise = maybeSuper
      ? withTimeout(isSuperAdmin(), false, "管理員權限", 3000)
      : Promise.resolve(false);

    const [profileRes, backendSuperAdmin] = await Promise.all([profilePromise, superPromise]);
    if (!profileRes?.ok) {
      throw new Error(profileRes?.message || "無法建立帳戶資料");
    }
    myProfile = profileRes;
    superAdmin = !!(maybeSuper && backendSuperAdmin);

    if (superAdmin) {
      setSuperAdminViewAll(true);
      allAgents = await withTimeout(getAllAgents(), [], "Agent 列表", 3500);
    } else {
      setSuperAdminViewAll(false);
      setViewAsOwnerId(user.uid);
    }

    adminUserEmail.textContent = getCurrentUserEmail() || user.email || "—";
    renderSuperAdminBar();
    updateBookingLink();
    if (viewRoot) viewRoot.innerHTML = loadingHtml("載入中…", 85, "整理預約資料");
    await boot();
  } catch (err) {
    console.error("Admin boot failed:", err);
    adminShell?.classList.remove("hidden");
    if (viewRoot) {
      viewRoot.innerHTML = warnHtml(`載入失敗：${escapeHtml(String(err?.message || err))}`);
    }
    hideBootScreen();
  }
}

onAuthChange(startAdminForUser);

getAuthInstance()
  ?.authStateReady()
  .then(() => {
    if (!booted) startAdminForUser(getAuthInstance()?.currentUser || null);
  });

if (firebaseError) {
  hideBootScreen();
  const boot = document.getElementById("admin-boot");
  if (boot) {
    boot.innerHTML = warnHtml(firebaseError);
  }
}

logoutBtn?.addEventListener("click", async () => {
  await adminLogout();
  window.location.replace("admin-login.html?v=89");
});

adminMenuToggle?.addEventListener("click", () => {
  const open = !adminShell?.classList.contains("nav-open");
  adminShell?.classList.toggle("nav-open", open);
  adminMenuToggle.setAttribute("aria-expanded", open ? "true" : "false");
});

document.addEventListener("click", (e) => {
  if (!adminShell?.classList.contains("nav-open")) return;
  const target = e.target;
  if (!(target instanceof Node)) return;
  if (adminSidebar?.contains(target)) return;
  adminShell.classList.remove("nav-open");
  adminMenuToggle?.setAttribute("aria-expanded", "false");
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!adminShell?.classList.contains("nav-open")) return;
  adminShell.classList.remove("nav-open");
  adminMenuToggle?.setAttribute("aria-expanded", "false");
});

sheetOverlay?.addEventListener("click", (e) => {
  if (e.target === sheetOverlay) closeSheet();
});

async function boot() {
  renderNav();
  await loadData();
  showViewSafe("dashboard");
  startLiveAppointments();
  maybeAskNotifyPermission();
}

function maybeAskNotifyPermission() {
  if (notifyPermissionAsked) return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "default") return;
  notifyPermissionAsked = true;
  // Ask after short delay so boot UI settles first.
  setTimeout(() => {
    Notification.requestPermission().catch(() => {});
  }, 1500);
}

function startLiveAppointments() {
  if (!firebaseReady) return;
  if (appointmentsUnsub) {
    appointmentsUnsub();
    appointmentsUnsub = null;
  }
  liveReady = false;
  knownApptIds = new Set();

  const ownerId = getEffectiveOwnerId();
  appointmentsUnsub = subscribeAppointments(({ ok, appointments, changes, message }) => {
    if (!ok) {
      console.warn("Live appointments failed:", message);
      return;
    }

    allAppointments = appointments || [];

    if (!liveReady) {
      knownApptIds = new Set(allAppointments.map((a) => a.id));
      liveReady = true;
      refreshLiveViews();
      return;
    }

    const added = (changes || []).filter((c) => c.type === "added" && !knownApptIds.has(c.appointment.id));
    for (const change of added) {
      knownApptIds.add(change.appointment.id);
      notifyNewAppointment(change.appointment);
    }
    for (const change of changes || []) {
      if (change.type === "removed") knownApptIds.delete(change.appointment.id);
      else knownApptIds.add(change.appointment.id);
    }

    refreshLiveViews();
  }, ownerId || undefined);
}

function refreshLiveViews() {
  if (currentView === "dashboard") {
    renderDashboard();
  } else if (currentView === "appointments") {
    const prefix = `${apptYear}-${String(apptMonth).padStart(2, "0")}`;
    monthAppointments = allAppointments.filter((a) => String(a.date || "").startsWith(prefix));
    applyApptFilter();
  } else if (currentView === "clients") {
    renderClients();
  } else if (currentView === "export") {
    renderExport();
  }
}

function notifyNewAppointment(appt) {
  if (!appt || appt.cancelled || appt.status === "Cancelled") return;
  const title = "新預約到了";
  const body = `${appt.name || "客戶"} · ${appt.date || ""} ${appt.start || ""} · ${appt.serviceTitle || appt.service || ""}`;
  showToast(title, body, () => showView("appointments"));

  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const n = new Notification(title, {
        body,
        tag: `appt-${appt.id}`,
        renotify: true,
      });
      n.onclick = () => {
        window.focus();
        showView("appointments");
        n.close();
      };
    } catch (err) {
      console.warn("Browser notification failed:", err);
    }
  }
}

function showToast(title, body, onClick) {
  const host = document.getElementById("admin-toast-host");
  if (!host) return;

  host.classList.add("is-open");
  host.innerHTML = "";

  const card = document.createElement("div");
  card.className = "admin-toast-card";
  card.setAttribute("role", "dialog");
  card.innerHTML = `
    <div class="admin-toast-card-badge">新通知</div>
    <h3 class="admin-toast-card-title">${escapeHtml(title)}</h3>
    <p class="admin-toast-card-body">${escapeHtml(body)}</p>
    <div class="admin-toast-card-actions">
      <button type="button" class="btn-cta btn-cta-primary" data-toast-open>查看預約</button>
      <button type="button" class="btn-cta btn-cta-outline" data-toast-close>關閉</button>
    </div>`;

  const close = () => {
    card.classList.add("admin-toast-card--out");
    host.classList.remove("is-open");
    setTimeout(() => {
      card.remove();
      if (!host.children.length) host.innerHTML = "";
    }, 220);
  };

  card.querySelector("[data-toast-open]")?.addEventListener("click", () => {
    onClick?.();
    close();
  });
  card.querySelector("[data-toast-close]")?.addEventListener("click", close);
  host.addEventListener(
    "click",
    (e) => {
      if (e.target === host) close();
    },
    { once: true }
  );

  host.appendChild(card);
  setTimeout(close, 8000);
}

function showViewSafe(id) {
  try {
    showView(id);
  } catch (err) {
    console.error("showView failed:", err);
    if (viewRoot) viewRoot.innerHTML = warnHtml(`畫面載入失敗：${escapeHtml(String(err?.message || err))}`);
  }
}

function renderSuperAdminBar() {
  const bar = document.getElementById("super-admin-bar");
  if (!bar) return;

  if (!superAdmin) {
    bar.classList.add("hidden");
    bar.innerHTML = "";
    return;
  }

  bar.classList.remove("hidden");
  const current = isSuperAdminViewAll() ? "__all__" : getEffectiveOwnerId();
  const options = [
    `<option value="__all__"${current === "__all__" || !current ? " selected" : ""}>全部 Agent</option>`,
    ...allAgents.map(
      (a) =>
        `<option value="${escapeHtml(a.uid)}"${a.uid === current ? " selected" : ""}>${escapeHtml(a.email || a.slug || a.uid)}</option>`
    ),
  ].join("");

  bar.innerHTML = `
    <label class="super-admin-label">
      <span>Super Admin</span>
      <select id="agent-switcher" class="super-admin-select">${options}</select>
    </label>`;

  document.getElementById("agent-switcher")?.addEventListener("change", async (e) => {
    const v = e.target.value;
    if (v === "__all__") {
      setSuperAdminViewAll(true);
    } else {
      setViewAsOwnerId(v);
    }
    updateBookingLink();
    await loadData();
    startLiveAppointments();
    showView(currentView);
  });
}

function updateBookingLink() {
  const link = document.getElementById("admin-booking-link");
  if (!link) return;

  if (superAdmin && isSuperAdminViewAll()) {
    link.href = "/";
    link.textContent = "↗ 預約頁（需 agent 連結）";
    return;
  }

  const agent =
    superAdmin && getEffectiveOwnerId()
      ? allAgents.find((a) => a.uid === getEffectiveOwnerId())
      : myProfile;

  if (agent?.slug) {
    link.href = getBookingPageUrl(agent.slug);
    link.textContent = "↗ 我的預約頁";
  } else {
    link.href = "/";
    link.textContent = "↗ 預約頁";
  }
}

let sheetBlockClicksUntil_ = 0;

function openSheet(html) {
  if (Date.now() < sheetBlockClicksUntil_) return;
  document.body.classList.add("sheet-open");
  sheetPanel.innerHTML = `
    <div class="sheet-handle"></div>
    ${html}`;
  sheetOverlay.classList.remove("hidden");
  sheetPanel.style.transform = "";
  sheetOverlay.style.background = "";
  sheetPanel.classList.remove("is-dragging", "is-closing");
  sheetPanel.querySelector("[data-sheet-close]")?.addEventListener("click", closeSheet);
  bindSheetSwipe_(sheetPanel);
}

function bindSheetSwipe_(panel) {
  const handle = panel.querySelector(".sheet-handle");
  let startY = 0;
  let dragging = false;
  let dy = 0;
  let startScroll = 0;
  let fromHandle = false;

  const point = (e) => {
    const t = e.touches?.[0] || e.changedTouches?.[0];
    return { x: t ? t.clientX : e.clientX, y: t ? t.clientY : e.clientY };
  };

  const onStart = (e) => {
    const p = point(e);
    startY = p.y;
    startScroll = panel.scrollTop;
    dragging = false;
    dy = 0;
    fromHandle = !!(handle && (e.target === handle || handle.contains(e.target)));
  };

  const onMove = (e) => {
    const p = point(e);
    const deltaY = p.y - startY;
    if (!dragging) {
      if (deltaY < 14) return;
      if (!fromHandle && startScroll > 2) return;
      dragging = true;
      panel.classList.add("is-dragging");
    }
    if (deltaY <= 0) {
      dy = 0;
      panel.style.transform = "";
      return;
    }
    dy = deltaY;
    if (e.cancelable) e.preventDefault();
    panel.style.transform = `translateY(${dy}px)`;
    const fade = Math.max(0.12, 0.45 * (1 - Math.min(1, dy / 320)));
    sheetOverlay.style.background = `rgba(0, 0, 0, ${fade})`;
  };

  const finishClose = () => {
    sheetBlockClicksUntil_ = Date.now() + 450;
    panel.classList.add("is-closing");
    panel.style.transform = "translateY(110%)";
    window.setTimeout(() => closeSheet(), 180);
  };

  const onEnd = (e) => {
    panel.classList.remove("is-dragging");
    if (dragging && dy > 88) {
      e.preventDefault?.();
      e.stopPropagation?.();
      finishClose();
    } else {
      panel.style.transform = "";
      sheetOverlay.style.background = "";
    }
    dragging = false;
    dy = 0;
  };

  panel.addEventListener("touchstart", onStart, { passive: true });
  panel.addEventListener("touchmove", onMove, { passive: false });
  panel.addEventListener("touchend", onEnd);
  panel.addEventListener("touchcancel", onEnd);
}

function closeSheet() {
  sheetBlockClicksUntil_ = Date.now() + 450;
  document.body.classList.remove("sheet-open");
  sheetOverlay.classList.add("hidden");
  sheetOverlay.style.background = "";
  sheetPanel.classList.remove("is-dragging", "is-closing");
  sheetPanel.style.transform = "";
  sheetPanel.innerHTML = "";
}

function showView(id) {
  if (id === "services" || id === "branding") id = "editor";
  currentView = id;
  adminShell?.classList.toggle("has-date-dock", id === "appointments");
  const navItem = NAV_ITEMS.find((n) => n.id === id) || NAV_ITEMS[0];
  viewTitle.textContent = navItem.title;
  renderNav();
  const renderers = {
    dashboard: renderDashboard,
    appointments: renderAppointments,
    clients: renderClients,
    editor: renderEditor,
    notifications: renderNotifications,
    export: renderExport,
  };
  (renderers[id] || renderDashboard)();
}

async function loadData() {
  if (!firebaseReady) {
    if (viewRoot) viewRoot.innerHTML = warnHtml(firebaseError || "Firebase 未初始化");
    return;
  }

  const ownerId = getEffectiveOwnerId();
  const settingsPromise =
    ownerId || !superAdmin
      ? getSettings(ownerId || myProfile?.uid)
      : Promise.resolve({ ok: true, settings: defaultSettings() });

  const [settingsRes, apptsRes, blockedRes] = await Promise.all([
    withTimeout(
      settingsPromise,
      { ok: false, settings: defaultSettings(), message: "設定載入逾時" },
      "設定",
      4000
    ),
    withTimeout(
      getAllAppointments(),
      { ok: false, appointments: [], message: "預約載入逾時" },
      "預約",
      4000
    ),
    withTimeout(
      getBlockedContacts(),
      { ok: false, blocked: [], message: "封鎖名單載入逾時" },
      "封鎖名單",
      3000
    ),
  ]);

  if (settingsRes.ok) {
    settings = settingsRes.settings;
    // Keep admin timeline fixed to 15-minute slots so booked slot keys always match.
    slotDefs = buildSlots("09:00", "18:00", 15);
  } else {
    settings = defaultSettings();
    slotDefs = buildSlots("09:00", "18:00", 15);
  }

  if (apptsRes.ok) {
    allAppointments = apptsRes.appointments || [];
  } else {
    allAppointments = [];
  }

  if (blockedRes.ok) {
    blockedContacts = (blockedRes.blocked || []).filter((b) => !b.removed);
  } else {
    blockedContacts = [];
  }

  if (currentView === "appointments") {
    await loadMonthAppointments();
  }
}

function renderNav() {
  adminNav.innerHTML = NAV_ITEMS.map(
    (item) => `
    <button type="button" class="admin-nav-item${currentView === item.id ? " active" : ""}"
      data-view="${item.id}">
      <span class="admin-nav-icon" aria-hidden="true">${item.icon}</span>
      <span class="admin-nav-text">${escapeHtml(item.label)}</span>
      <span class="admin-nav-short">${escapeHtml(item.short)}</span>
    </button>`
  ).join("");

  adminNav.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      showView(btn.getAttribute("data-view"));
      adminShell?.classList.remove("nav-open");
      adminMenuToggle?.setAttribute("aria-expanded", "false");
    });
  });
}

function warnHtml(msg) {
  return `<div class="alert-warn">${escapeHtml(msg)}</div>`;
}

function activeOwnerId_() {
  return getEffectiveOwnerId() || myProfile?.uid || "";
}

/* ── Dashboard ── */

function renderDashboard() {
  if (firebaseError) {
    viewRoot.innerHTML = warnHtml(firebaseError);
    return;
  }

  if (superAdmin && isSuperAdminViewAll()) {
    viewRoot.innerHTML = `
      <div class="alert-warn" style="margin-bottom:1rem">
        你正以 <strong>Super Admin</strong> 檢視全部 ${allAgents.length} 個 agent 的資料。
        要編輯設定，請喺右上角 dropdown 揀單一 agent。
      </div>` + buildDashboardHtml();
    wireDashboardCards_();
    return;
  }

  viewRoot.innerHTML = buildDashboardHtml();
  wireDashboardCards_();
}

function buildDashboardHtml() {
  const stats = computeDashboardStats(allAppointments);
  const maxStatus = Math.max(1, ...Object.values(stats.byStatus));
  const maxService = Math.max(1, ...Object.values(stats.byService));
  const hours = Object.keys(stats.byHour).sort();
  const maxHour = Math.max(1, ...Object.values(stats.byHour));
  const now = Date.now();
  const scoped = allAppointments.filter((a) => !a.cancelled && a.status !== "Cancelled");
  const upcoming = scoped
    .filter((a) => !a.cancelled && a.status !== "Cancelled")
    .filter((a) => {
      const dt = localDateTime(a.date, a.start || "00:00");
      return dt && dt.getTime() >= now;
    })
    .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`))
    .slice(0, 8);
  const latest = scoped
    .slice(0, 5);

  return `
    <div class="live-banner">
      <span class="live-dot" aria-hidden="true"></span>
      <strong>即時更新中</strong>
      <span>有新預約會即時出現喺總覽，並彈出通知</span>
    </div>
    <div class="stat-row" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card"><span class="stat-val">${stats.total}</span><span class="stat-lbl">總預約</span></div>
      <div class="stat-card"><span class="stat-val">${stats.today}</span><span class="stat-lbl">今日</span></div>
      <div class="stat-card"><span class="stat-val">${stats.signed}</span><span class="stat-lbl">已簽約</span></div>
      <div class="stat-card"><span class="stat-val">${stats.conversion}%</span><span class="stat-lbl">轉換率</span></div>
    </div>

    <div class="admin-cal-wrap">
      <h3 style="margin:0 0 0.75rem;font-size:1rem">嚟緊預約</h3>
      <div class="dashboard-appt-scroll">
        ${
          upcoming.length
            ? upcoming
                .map(
                  (a) => `
          <article class="dashboard-appt-card" data-dashboard-appt-id="${escapeHtml(a.id || "")}">
            <div class="dashboard-appt-head">
              <strong>${escapeHtml(formatRecordDate_(a.date, a.start))}</strong>
              <span class="dashboard-appt-pill">${escapeHtml(a.code || "")}</span>
            </div>
            <div class="dashboard-appt-main">${escapeHtml(a.name || "—")} · ${escapeHtml(a.serviceTitle || a.service || "")}</div>
            <div class="dashboard-appt-meta">📍 ${escapeHtml(a.district || "—")} · ${escapeHtml(a.status || "—")}</div>
          </article>`
                )
                .join("")
            : '<p class="empty-msg">暫時無嚟緊預約</p>'
        }
      </div>
    </div>

    <div class="admin-cal-wrap">
      <h3 style="margin:0 0 0.75rem;font-size:1rem">最新預約</h3>
      <div class="dashboard-appt-scroll">
        ${
          latest.length
            ? latest
                .map(
                  (a) => `
          <article class="dashboard-appt-card" data-dashboard-appt-id="${escapeHtml(a.id || "")}">
            <div class="dashboard-appt-head">
              <strong>${escapeHtml(formatRecordDate_(a.date, a.start))}</strong>
              <span class="dashboard-appt-pill">${escapeHtml(a.status || "—")}</span>
            </div>
            <div class="dashboard-appt-main">${escapeHtml(a.name || "—")} · ${escapeHtml(a.serviceTitle || a.service || "")}</div>
            <div class="dashboard-appt-meta">📍 ${escapeHtml(a.district || "—")} · 🔖 ${escapeHtml(a.code || "—")}</div>
          </article>`
                )
                .join("")
            : '<p class="empty-msg">尚無預約</p>'
        }
      </div>
    </div>

    <div class="admin-cal-wrap">
      <h3 style="margin:0 0 0.75rem;font-size:1rem">狀態分佈</h3>
      <ul class="admin-breakdown-list">
        ${Object.entries(stats.byStatus)
          .map(
            ([status, count]) => `
          <li class="admin-breakdown-item">
            <span>${escapeHtml(status)}</span>
            <span class="admin-bar-wrap"><span class="admin-bar" style="width:${Math.round((count / maxStatus) * 100)}%"></span></span>
            <strong>${count}</strong>
          </li>`
          )
          .join("") || '<li class="empty-msg">尚無資料</li>'}
      </ul>
    </div>

    <div class="admin-cal-wrap">
      <h3 style="margin:0 0 0.75rem;font-size:1rem">服務分佈</h3>
      <ul class="admin-breakdown-list">
        ${Object.entries(stats.byService)
          .map(
            ([svc, count]) => `
          <li class="admin-breakdown-item">
            <span>${escapeHtml(svc)}</span>
            <span class="admin-bar-wrap"><span class="admin-bar admin-bar--yellow" style="width:${Math.round((count / maxService) * 100)}%"></span></span>
            <strong>${count}</strong>
          </li>`
          )
          .join("") || '<li class="empty-msg">尚無資料</li>'}
      </ul>
    </div>

    <div class="admin-cal-wrap">
      <h3 style="margin:0 0 0.75rem;font-size:1rem">時段熱圖</h3>
      <div class="admin-heatmap">
        ${
          hours.length
            ? hours
                .map((h) => {
                  const count = stats.byHour[h];
                  const pct = Math.round((count / maxHour) * 100);
                  return `
              <div class="admin-heatmap-col" title="${h}:00 · ${count} 筆">
                <div class="admin-heatmap-bar" style="height:${Math.max(8, pct)}%"></div>
                <span>${h}</span>
              </div>`;
                })
                .join("")
            : '<p class="empty-msg">尚無時段資料</p>'
        }
      </div>
    </div>`;
}

function formatRecordDate_(dateStr, start) {
  if (!dateStr) return start || "—";
  const day = formatDateChip(dateStr, WEEKDAYS).weekday || "";
  return `${dateStr} (${day}) ${start || ""}`.trim();
}

function wireDashboardCards_() {
  document.querySelectorAll("[data-dashboard-appt-id]").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-dashboard-appt-id");
      const appt = allAppointments.find((a) => a.id === id);
      if (appt) openApptEditSheet(appt);
    });
  });
}

/* ── Appointments ── */

async function loadMonthAppointments() {
  if (!firebaseReady) return;
  const ownerId = activeOwnerId_();
  if (!ownerId) {
    monthAppointments = [];
    applyApptFilter();
    return;
  }
  const res = await getMonthAppointments(apptYear, apptMonth, ownerId);
  monthAppointments = res.ok ? res.appointments || [] : [];
  applyApptFilter();
}

function applyApptFilter() {
  let filtered = monthAppointments;
  if (statusFilter) {
    filtered = monthAppointments.filter((a) => a.status === statusFilter);
  }
  ({ byKey, byDate } = indexAppointments(filtered));
}

async function renderAppointments() {
  if (firebaseError) {
    viewRoot.innerHTML = warnHtml(firebaseError);
    return;
  }
  if (!activeOwnerId_()) {
    viewRoot.innerHTML = warnHtml("缺少 ownerId，請先選擇一位 agent。");
    return;
  }

  await loadMonthAppointments();

  viewRoot.innerHTML = `
    <div class="admin-cal-wrap">
      <div class="month-nav-row">
        <button type="button" class="month-nav-btn" id="appt-prev">‹</button>
        <span class="month-label" id="appt-month-label">${apptYear} 年 ${apptMonth} 月</span>
        <button type="button" class="month-nav-btn" id="appt-next">›</button>
      </div>

      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.75rem;align-items:center">
        <select id="appt-status-filter" class="appt-status-select" style="flex:1;min-width:140px">
          <option value="">全部狀態</option>
          ${STATUS_OPTIONS.map((s) => `<option value="${s}"${statusFilter === s ? " selected" : ""}>${s}</option>`).join("")}
        </select>
        <div class="appt-view-toggle" role="tablist" aria-label="時間表檢視">
          <button type="button" class="appt-view-btn ${apptViewMode === "day" ? "active" : ""}" data-appt-view="day">Day</button>
          <button type="button" class="appt-view-btn ${apptViewMode === "week" ? "active" : ""}" data-appt-view="week">Week</button>
        </div>
        <button type="button" class="btn-save" id="appt-add-btn">代客新增預約</button>
      </div>

      <div class="admin-day-head ${apptViewMode === "week" ? "" : "hidden"}" style="margin-top:0.35rem" id="appt-week-head">
        <h3 id="appt-week-title">Week View（週一至週六）</h3>
        <p class="week-dnd-hint">電腦版可拖曳預約卡到其他日子／時間</p>
      </div>
      <div class="week-view-wrap ${apptViewMode === "week" ? "" : "hidden"}" id="appt-week-view"></div>

      <div class="admin-day-head ${apptViewMode === "day" ? "" : "hidden"}" id="appt-day-head">
        <h3 id="appt-day-title">時間表</h3>
        <span id="appt-day-count" class="cal-day-count">0 筆</span>
      </div>
      <div class="timeline-container ${apptViewMode === "day" ? "" : "hidden"}" id="appt-timeline"></div>
      <div class="date-scroll date-scroll-dock" id="appt-date-scroll"></div>
    </div>`;

  document.getElementById("appt-prev").addEventListener("click", async () => {
    apptMonth -= 1;
    if (apptMonth < 1) {
      apptMonth = 12;
      apptYear -= 1;
    }
    await loadMonthAppointments();
    renderAppointments();
  });

  document.getElementById("appt-next").addEventListener("click", async () => {
    apptMonth += 1;
    if (apptMonth > 12) {
      apptMonth = 1;
      apptYear += 1;
    }
    await loadMonthAppointments();
    renderAppointments();
  });

  document.getElementById("appt-status-filter").addEventListener("change", (e) => {
    statusFilter = e.target.value;
    applyApptFilter();
    renderApptDateScroll();
    const dates = getApptMonthDates();
    const preferred = pickPreferredApptDate_(dates);
    if (preferred) selectApptDate(preferred);
  });

  document.querySelectorAll("[data-appt-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      apptViewMode = btn.getAttribute("data-appt-view") === "week" ? "week" : "day";
      renderAppointments();
    });
  });

  document.getElementById("appt-add-btn").addEventListener("click", () => openNewApptSheet());

  renderApptDateScroll();
  const dates = getApptMonthDates();
  if (!dates.includes(selectedDateStr) || !(byDate.get(selectedDateStr) || []).length) {
    selectedDateStr = pickPreferredApptDate_(dates);
  }
  if (selectedDateStr) selectApptDate(selectedDateStr);
}

function getApptMonthDates() {
  const lastDay = new Date(apptYear, apptMonth, 0).getDate();
  const dates = [];
  for (let d = 1; d <= lastDay; d++) {
    dates.push(toYMD(new Date(apptYear, apptMonth - 1, d)));
  }
  return dates;
}

function pickPreferredApptDate_(dates) {
  if (!dates?.length) return null;
  const today = toYMD(new Date());
  const firstWithAppt = dates.find((d) => d >= today && (byDate.get(d) || []).length > 0);
  if (firstWithAppt) return firstWithAppt;
  const firstFuture = dates.find((d) => d >= today);
  return firstFuture || dates[0];
}

function renderApptDateScroll() {
  const scroll = document.getElementById("appt-date-scroll");
  if (!scroll) return;
  const dates = getApptMonthDates();

  scroll.innerHTML = dates
    .map((dateStr) => {
      const chip = formatDateChip(dateStr, WEEKDAYS);
      const isSelected = dateStr === selectedDateStr;
      const count = (byDate.get(dateStr) || []).length;
      return `
      <button type="button" class="date-chip ${isSelected ? "selected" : ""}"
        data-date="${dateStr}">
        <span class="date-chip-weekday">${chip.weekday}</span>
        <span class="date-chip-day">${chip.day}</span>
        <span class="date-chip-month">${chip.month}${count ? ` · ${count}` : ""}</span>
      </button>`;
    })
    .join("");

  scroll.querySelectorAll("[data-date]").forEach((btn) => {
    btn.addEventListener("click", () => selectApptDate(btn.getAttribute("data-date")));
  });

  scroll.querySelector(`[data-date="${selectedDateStr}"]`)?.scrollIntoView({
    inline: "center",
    behavior: "smooth",
  });
}

function selectApptDate(dateStr) {
  selectedDateStr = dateStr;
  const appts = byDate.get(dateStr) || [];
  const chip = formatDateChip(dateStr, WEEKDAYS);

  document.getElementById("appt-day-title").textContent = `${chip.label} 時間表`;
  document.getElementById("appt-day-count").textContent = `${appts.length} 筆`;

  renderApptDateScroll();
  renderWeekView(dateStr);
  renderTimeline({
    container: document.getElementById("appt-timeline"),
    slots: slotDefs,
    dateStr,
    byKey,
    byDate,
    mode: "admin",
    onBusyClick: (appt) => openApptEditSheet(appt),
    onAvailableClick: (slot) => openNewApptSheet(dateStr, slot),
  });
}

function weekDatesMonToSat_(anchorDateStr) {
  const anchor = localDateTime(anchorDateStr, "12:00");
  if (!anchor) return [];
  const day = anchor.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() + mondayOffset);
  const dates = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 12, 0, 0);
    dates.push(toYMD(d));
  }
  return dates;
}

function findApptForSlot_(dateStr, slot) {
  const key = `${dateStr} ${slot.start} ${slot.end}`;
  let appt = byKey.get(key);
  if (appt && safeStatus(appt.status)) return appt;
  const slotStart = timeToMinutes(slot.start);
  const slotEnd = timeToMinutes(slot.end);
  appt = (byDate.get(dateStr) || []).find(
    (a) => safeStatus(a.status) && timeToMinutes(a.start) < slotEnd && timeToMinutes(a.end) > slotStart
  );
  return appt || null;
}

function renderWeekTableBody_(weekDates) {
  const skipUntil = weekDates.map(() => -1);
  return slotDefs
    .map((slot, i) => {
      const cells = weekDates
        .map((d, di) => {
          if (i < skipUntil[di]) return "";
          const appt = findApptForSlot_(d, slot);
          if (appt) {
            const span = countSpanSlots(slotDefs, i, appt.start || slot.start, appt.end || slot.end);
            skipUntil[di] = i + span;
            const dur = Math.max(
              15,
              timeToMinutes(appt.end || slot.end) - timeToMinutes(appt.start || slot.start)
            );
            return `<td class="week-day-col" rowspan="${span}">
              <button type="button" class="week-cell week-cell--busy ${span > 1 ? "week-cell--span" : ""}"
                draggable="false"
                data-week-appt-id="${escapeHtml(appt.id || "")}"
                data-week-date="${d}"
                data-week-start="${escapeHtml(appt.start || slot.start)}"
                data-week-end="${escapeHtml(appt.end || slot.end)}"
                data-week-duration="${dur}"
                title="${escapeHtml(appt.name || "已預約")} ${escapeHtml(appt.start || "")}–${escapeHtml(appt.end || "")}">
                <span class="week-cell-time">${escapeHtml(appt.start || slot.start)}–${escapeHtml(appt.end || slot.end)}</span>
                <span class="week-cell-name">${escapeHtml(appt.name || "已預約")}</span>
                <span class="week-cell-status">${escapeHtml(appt.status || "已預約")}</span>
              </button>
            </td>`;
          }
          return `<td class="week-day-col">
            <button type="button" class="week-cell week-cell--free"
              data-week-date="${d}" data-week-start="${slot.start}" data-week-end="${slot.end}"
              aria-label="可新增預約 ${d} ${slot.start} 至 ${slot.end}"></button>
          </td>`;
        })
        .join("");
      return `<tr data-slot-start="${slot.start}" data-slot-end="${slot.end}"><th class="week-time-col">${slot.start}</th>${cells}</tr>`;
    })
    .join("");
}

function renderWeekView(anchorDateStr) {
  const container = document.getElementById("appt-week-view");
  if (!container) return;
  const weekDates = weekDatesMonToSat_(anchorDateStr || toYMD(new Date()));
  const firstChip = formatDateChip(weekDates[0], WEEKDAYS);
  const lastChip = formatDateChip(weekDates[weekDates.length - 1], WEEKDAYS);
  const weekTitle = document.getElementById("appt-week-title");
  if (weekTitle) {
    weekTitle.textContent = `Week View（${firstChip.month}${firstChip.day}日 – ${lastChip.month}${lastChip.day}日）`;
  }
  const mobileDays = weekDates
    .map((d) => {
      const chip = formatDateChip(d, WEEKDAYS);
      const wd = chip.weekday;
      const label = `${chip.month}${chip.day}日`;
      const appts = (byDate.get(d) || [])
        .slice()
        .sort((a, b) => `${a.start || ""}`.localeCompare(`${b.start || ""}`));
      return `
        <section class="week-mobile-day">
          <header>
            <strong>${wd} ${label}</strong>
            <span>${appts.length} 筆</span>
          </header>
          <div class="week-mobile-list">
            ${
              appts.length
                ? appts
                    .map(
                      (a) => `
                <button type="button" class="week-mobile-item" data-week-appt-id="${escapeHtml(a.id || "")}">
                  <span>${escapeHtml(a.start || "")}–${escapeHtml(a.end || "")}</span>
                  <strong>${escapeHtml(a.name || "已預約")}</strong>
                </button>`
                    )
                    .join("")
                : `<button type="button" class="week-mobile-item week-mobile-item--free"
                    data-week-date="${d}" data-week-start="${slotDefs[0]?.start || "09:00"}"
                    data-week-end="${slotDefs[0]?.end || "09:15"}" aria-label="可新增預約 ${d}"></button>`
            }
          </div>
        </section>`;
    })
    .join("");

  container.innerHTML = `
    <div class="week-view-scroll">
      <table class="week-view-table">
        <colgroup>
          <col class="week-time-col">
          ${weekDates.map(() => `<col class="week-day-col">`).join("")}
        </colgroup>
        <thead>
          <tr>
            <th class="week-time-col">時間</th>
            ${weekDates
              .map((d) => {
                const chip = formatDateChip(d, WEEKDAYS);
                return `<th class="week-day-col" data-week-date="${d}"><span>${chip.weekday}</span><small>${chip.month}${chip.day}日</small></th>`;
              })
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${renderWeekTableBody_(weekDates)}
        </tbody>
      </table>
    </div>
    <div class="week-mobile-wrap">${mobileDays}</div>`;

  container.querySelectorAll(".week-view-table [data-week-appt-id]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (weekDragSuppressClick_) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      const id = btn.getAttribute("data-week-appt-id");
      const appt = monthAppointments.find((a) => a.id === id) || allAppointments.find((a) => a.id === id);
      if (appt) openApptEditSheet(appt);
    });
  });
  container.querySelectorAll(".week-mobile-wrap [data-week-appt-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-week-appt-id");
      const appt = monthAppointments.find((a) => a.id === id) || allAppointments.find((a) => a.id === id);
      if (appt) openApptEditSheet(appt);
    });
  });
  container.querySelectorAll(".week-view-table [data-week-date]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (weekDragSuppressClick_) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (btn.classList.contains("week-cell--busy")) return;
      openNewApptSheet(btn.getAttribute("data-week-date"), {
        start: btn.getAttribute("data-week-start"),
        end: btn.getAttribute("data-week-end"),
      });
    });
  });
  container.querySelectorAll(".week-mobile-wrap [data-week-date]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openNewApptSheet(btn.getAttribute("data-week-date"), {
        start: btn.getAttribute("data-week-start"),
        end: btn.getAttribute("data-week-end"),
      });
    });
  });
  bindWeekDragDrop_(container);
}

function weekMoveRange_(start, durationMin) {
  const dur = Math.max(15, Number(durationMin) || 15);
  const startMin = timeToMinutes(start);
  const endMin = startMin + dur;
  const end = minutesToTime(endMin);
  const needed = (slotDefs || []).filter((s) => timesOverlap(s.start, s.end, start, end));
  if (!needed.length || needed[0].start !== start) return null;
  if (timeToMinutes(needed[needed.length - 1].end) < endMin) return null;
  for (let i = 1; i < needed.length; i++) {
    if (needed[i].start !== needed[i - 1].end) return null;
  }
  return { start, end };
}

function weekDropConflicts_(date, start, end, excludeId) {
  return (byDate.get(date) || []).some(
    (a) =>
      a.id !== excludeId &&
      safeStatus(a.status) &&
      timesOverlap(start, end, a.start, a.end)
  );
}

function weekHitFromPoint_(x, y) {
  const table = document.querySelector(".week-view-table");
  if (!table) return null;
  const tbody = table.querySelector("tbody");
  const heads = [...table.querySelectorAll("thead th.week-day-col")];
  if (!tbody || !heads.length || !slotDefs.length) return null;
  const tb = tbody.getBoundingClientRect();
  if (y < tb.top || y > tb.bottom) return null;
  const col = heads.findIndex((h) => {
    const r = h.getBoundingClientRect();
    return x >= r.left && x < r.right;
  });
  if (col < 0) return null;
  const date = heads[col].getAttribute("data-week-date");
  const rowH = tb.height / slotDefs.length;
  const index = Math.min(slotDefs.length - 1, Math.max(0, Math.floor((y - tb.top) / rowH)));
  const slot = slotDefs[index];
  if (!date || !slot) return null;
  return { date, slot, index, col };
}

function ensureWeekGhost_() {
  let el = document.getElementById("week-dnd-ghost");
  if (!el) {
    el = document.createElement("div");
    el.id = "week-dnd-ghost";
    el.className = "week-dnd-ghost hidden";
    document.body.appendChild(el);
  }
  return el;
}

function ensureWeekPreview_(scroll) {
  let el = scroll.querySelector(".week-drop-preview");
  if (!el) {
    el = document.createElement("div");
    el.className = "week-drop-preview hidden";
    scroll.appendChild(el);
  }
  return el;
}

function placeWeekDropPreview_(scroll, hit, durationMin, excludeId) {
  const preview = ensureWeekPreview_(scroll);
  const range = weekMoveRange_(hit.slot.start, durationMin);
  if (!range) {
    preview.classList.add("hidden");
    return { range: null, conflict: true };
  }
  const conflict = weekDropConflicts_(hit.date, range.start, range.end, excludeId);
  const table = scroll.querySelector(".week-view-table");
  const heads = [...table.querySelectorAll("thead th.week-day-col")];
  const rows = [...table.querySelectorAll("tbody tr")];
  const startI = slotDefs.findIndex((s) => s.start === range.start);
  let lastI = startI;
  for (let i = startI; i < slotDefs.length; i++) {
    if (timesOverlap(slotDefs[i].start, slotDefs[i].end, range.start, range.end)) lastI = i;
    else break;
  }
  if (startI < 0 || !rows[startI] || !rows[lastI] || colOut_(heads, hit.col)) {
    preview.classList.add("hidden");
    return { range, conflict };
  }
  const sr = scroll.getBoundingClientRect();
  const colRect = heads[hit.col].getBoundingClientRect();
  const startRect = rows[startI].getBoundingClientRect();
  const lastRect = rows[lastI].getBoundingClientRect();
  preview.style.left = `${colRect.left - sr.left + scroll.scrollLeft}px`;
  preview.style.top = `${startRect.top - sr.top + scroll.scrollTop}px`;
  preview.style.width = `${colRect.width}px`;
  preview.style.height = `${Math.max(40, lastRect.bottom - startRect.top)}px`;
  preview.textContent = conflict ? "此時段已被佔用" : `${range.start} – ${range.end}`;
  preview.classList.toggle("week-drop-preview--invalid", conflict);
  preview.classList.remove("hidden");
  return { range, conflict };
}

function colOut_(heads, col) {
  return col == null || col < 0 || col >= heads.length;
}

function bindWeekDragDrop_(container) {
  if (weekDndBound_) return;
  weekDndBound_ = true;
  let drag = null;

  const onMove = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.active) {
      if (Math.hypot(dx, dy) < 6) return;
      drag.active = true;
      drag.btn.classList.add("week-cell--dragging");
      document.body.classList.add("week-dnd-active");
      const ghost = ensureWeekGhost_();
      ghost.innerHTML = `<strong>${escapeHtml(drag.appt.name || "預約")}</strong><span>${escapeHtml(drag.appt.start)} – ${escapeHtml(drag.appt.end)}</span>`;
      ghost.classList.remove("hidden");
      try {
        drag.btn.setPointerCapture(e.pointerId);
      } catch (_) {}
    }
    const ghost = ensureWeekGhost_();
    ghost.style.left = `${e.clientX + 12}px`;
    ghost.style.top = `${e.clientY + 12}px`;
    const scroll = container.querySelector(".week-view-scroll");
    const hit = weekHitFromPoint_(e.clientX, e.clientY);
    if (!scroll || !hit) {
      scroll?.querySelector(".week-drop-preview")?.classList.add("hidden");
      drag.hit = null;
      return;
    }
    drag.hit = placeWeekDropPreview_(scroll, hit, drag.durationMin, drag.appt.id);
    drag.hit.date = hit.date;
  };

  const endDrag = async (e) => {
    if (!drag) return;
    const wasActive = drag.active;
    const payload = drag;
    drag = null;
    document.body.classList.remove("week-dnd-active");
    ensureWeekGhost_().classList.add("hidden");
    container.querySelector(".week-drop-preview")?.classList.add("hidden");
    payload.btn?.classList.remove("week-cell--dragging");
    if (!wasActive) return;
    weekDragSuppressClick_ = true;
    setTimeout(() => {
      weekDragSuppressClick_ = false;
    }, 250);
    const hit = payload.hit;
    if (!hit?.range || hit.conflict) {
      if (hit?.conflict) alert("新時段已被佔用或超出可預約時間。");
      return;
    }
    const { date, range } = hit;
    if (date === payload.appt.date && range.start === payload.appt.start && range.end === payload.appt.end) {
      return;
    }
    const res = await updateAppointment(payload.appt.id, {
      date,
      start: range.start,
      end: range.end,
    });
    if (!res.ok) {
      alert(res.message || "移動失敗");
      return;
    }
    await addAuditLog({
      action: "move_appointment",
      details: `拖曳 ${payload.appt.code || ""} 至 ${date} ${range.start}–${range.end}`,
      appointmentId: payload.appt.id,
    });
    await loadData();
    renderAppointments();
  };

  container.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const btn = e.target.closest?.(".week-view-table .week-cell--busy");
    if (!btn) return;
    const id = btn.getAttribute("data-week-appt-id");
    const appt = monthAppointments.find((a) => a.id === id) || allAppointments.find((a) => a.id === id);
    if (!appt) return;
    const durationMin =
      Number(btn.getAttribute("data-week-duration")) ||
      Math.max(15, timeToMinutes(appt.end) - timeToMinutes(appt.start));
    drag = {
      pointerId: e.pointerId,
      appt,
      btn,
      durationMin,
      startX: e.clientX,
      startY: e.clientY,
      active: false,
      hit: null,
    };
  });
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);
}

function statusColor_(status) {
  const map = {
    "First meet": "#d93025",
    "Second meet": "#1a73e8",
    "meet++": "#8e24aa",
    Signed: "#0b8043",
    "Follow up": "#f9ab00",
    Cancelled: "#5f6368",
  };
  return map[status] || "#d93025";
}

function openApptEditSheet(appt, mode = "view") {
  const chip = formatDateChip(appt.date, WEEKDAYS);
  const waUrl = buildWhatsAppUrl(appt);
  const calUrl = buildGoogleCalendarUrl({
    title: appt.serviceTitle || "預約",
    date: appt.date,
    start: appt.start,
    end: appt.end,
    code: appt.code,
  });
  const color = statusColor_(appt.status);
  const notesText = String(appt.notes || "").trim();
  const tagsText = (appt.tags || []).join("、");

  if (mode !== "edit") {
    openSheet(`
      <div class="gcal-event">
        <div class="gcal-event-toolbar">
          <button type="button" class="gcal-icon-btn" data-sheet-close aria-label="關閉">✕</button>
        </div>
        <div class="gcal-event-bar" style="background:${color}"></div>
        <h2 class="gcal-event-title">${escapeHtml(appt.name || "預約")}</h2>
        <div class="gcal-event-chip" style="color:${color};border-color:${color}55;background:${color}14">${escapeHtml(appt.status || "已預約")}</div>
        <div class="gcal-event-list">
          <div class="gcal-event-row">
            <span class="gcal-event-icon">🕒</span>
            <div>
              <strong>${chip.label}</strong>
              <span>${escapeHtml(appt.start || "")} – ${escapeHtml(appt.end || "")}</span>
            </div>
          </div>
          <div class="gcal-event-row">
            <span class="gcal-event-icon">📍</span>
            <div>
              <strong>${escapeHtml(appt.district || "未填地區")}</strong>
              <span>${escapeHtml(appt.serviceTitle || appt.service || "預約")}</span>
            </div>
          </div>
          <div class="gcal-event-row">
            <span class="gcal-event-icon">📞</span>
            <div>
              <strong>${escapeHtml(appt.contact || "—")}</strong>
              <span>聯絡方式</span>
            </div>
          </div>
          <div class="gcal-event-row">
            <span class="gcal-event-icon">🔖</span>
            <div>
              <strong>${escapeHtml(appt.code || "—")}</strong>
              <span>預約代碼</span>
            </div>
          </div>
          ${
            notesText
              ? `<div class="gcal-event-row">
            <span class="gcal-event-icon">📝</span>
            <div>
              <strong>備註</strong>
              <span>${escapeHtml(notesText)}</span>
            </div>
          </div>`
              : ""
          }
          ${
            tagsText
              ? `<div class="gcal-event-row">
            <span class="gcal-event-icon">🏷</span>
            <div>
              <strong>標籤</strong>
              <span>${escapeHtml(tagsText)}</span>
            </div>
          </div>`
              : ""
          }
        </div>
        <div class="gcal-event-dock">
          <button type="button" class="gcal-dock-btn" id="gcal-edit-btn">
            <span aria-hidden="true">✎</span>編輯
          </button>
          <a class="gcal-dock-btn" href="${escapeHtml(waUrl)}" target="_blank" rel="noopener">
            <span aria-hidden="true">💬</span>WhatsApp
          </a>
          <a class="gcal-dock-btn" href="${escapeHtml(calUrl)}" target="_blank" rel="noopener">
            <span aria-hidden="true">📅</span>日曆
          </a>
          <button type="button" class="gcal-dock-btn" id="gcal-dup-btn">
            <span aria-hidden="true">⧉</span>複製
          </button>
        </div>
        <button type="button" class="gcal-delete-btn" id="gcal-cancel-btn">取消呢個預約</button>
      </div>`);

    document.getElementById("gcal-edit-btn")?.addEventListener("click", () => openApptEditSheet(appt, "edit"));
    document.getElementById("gcal-dup-btn")?.addEventListener("click", async () => {
      const res = await duplicateAppointment(appt.id);
      if (!res.ok) {
        alert(res.message || "複製失敗");
        return;
      }
      await addAuditLog({
        action: "duplicate_appointment",
        details: `複製 ${appt.code} → ${res.code}`,
        appointmentId: appt.id,
      });
      closeSheet();
      await loadData();
      renderAppointments();
    });
    document.getElementById("gcal-cancel-btn")?.addEventListener("click", async () => {
      const reason = prompt("請填寫取消原因") || "";
      if (!reason.trim()) return;
      const res = await cancelAppointment(appt.id, reason.trim());
      if (!res.ok) {
        alert(res.message || "取消失敗");
        return;
      }
      await addAuditLog({
        action: "cancel_appointment",
        details: `${appt.code}: ${reason}`,
        appointmentId: appt.id,
      });
      closeSheet();
      await loadData();
      renderAppointments();
    });
    return;
  }

  openSheet(`
    <div class="gcal-edit">
      <div class="gcal-event-toolbar">
        <button type="button" class="gcal-icon-btn" id="edit-back-btn" aria-label="返回">✕</button>
      </div>
      <input class="gcal-edit-title" type="text" id="edit-name" placeholder="加入標題" value="${escapeHtml(appt.name || "")}">
      <div class="gcal-edit-list">
        <label class="gcal-edit-row">
          <span class="gcal-event-icon">⬤</span>
          <div>
            <span class="gcal-edit-label">日曆 / 狀態</span>
            <select id="edit-status">
              ${STATUS_OPTIONS.map((s) => `<option value="${s}"${appt.status === s ? " selected" : ""}>${s}</option>`).join("")}
            </select>
          </div>
        </label>
        <div class="gcal-edit-row">
          <span class="gcal-event-icon">🕒</span>
          <div class="gcal-edit-when">
            <span class="gcal-edit-label">日期同時間</span>
            <input type="date" id="edit-date" value="${escapeHtml(appt.date || "")}">
            <div class="gcal-edit-times">
              <input type="time" id="edit-start" value="${escapeHtml(appt.start || "")}">
              <span class="gcal-edit-dash">–</span>
              <input type="time" id="edit-end" value="${escapeHtml(appt.end || "")}">
            </div>
          </div>
        </div>
        <label class="gcal-edit-row">
          <span class="gcal-event-icon">📍</span>
          <div>
            <span class="gcal-edit-label">地點</span>
            <select id="edit-district">
              ${DISTRICT_OPTIONS.map((d) => `<option value="${escapeHtml(d)}"${appt.district === d ? " selected" : ""}>${escapeHtml(d)}</option>`).join("")}
            </select>
          </div>
        </label>
        <label class="gcal-edit-row">
          <span class="gcal-event-icon">📞</span>
          <div>
            <span class="gcal-edit-label">聯絡方式</span>
            <input type="text" id="edit-contact" value="${escapeHtml(appt.contact || "")}" placeholder="電話 / WhatsApp / Email">
          </div>
        </label>
        <label class="gcal-edit-row">
          <span class="gcal-event-icon">📝</span>
          <div>
            <span class="gcal-edit-label">說明</span>
            <textarea id="edit-notes" rows="3" placeholder="加入說明">${escapeHtml(appt.notes || "")}</textarea>
          </div>
        </label>
        <label class="gcal-edit-row">
          <span class="gcal-event-icon">🏷</span>
          <div>
            <span class="gcal-edit-label">標籤</span>
            <input type="text" id="edit-tags" value="${escapeHtml((appt.tags || []).join(", "))}" placeholder="以逗號分隔">
          </div>
        </label>
      </div>
      <button type="button" class="gcal-save-btn gcal-save-btn--block" id="edit-save-btn">儲存</button>
    </div>`);

  document.getElementById("edit-back-btn")?.addEventListener("click", () => openApptEditSheet(appt, "view"));
  document.getElementById("edit-save-btn").addEventListener("click", async () => {
    const tags = document
      .getElementById("edit-tags")
      .value.split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const next = {
      ...appt,
      name: document.getElementById("edit-name").value.trim(),
      contact: document.getElementById("edit-contact")?.value.trim() ?? appt.contact,
      status: document.getElementById("edit-status").value,
      district: document.getElementById("edit-district").value,
      notes: document.getElementById("edit-notes").value.trim(),
      tags,
      date: document.getElementById("edit-date").value,
      start: document.getElementById("edit-start").value,
      end: document.getElementById("edit-end").value,
    };
    const res = await updateAppointment(appt.id, {
      name: next.name,
      contact: next.contact,
      status: next.status,
      district: next.district,
      notes: next.notes,
      tags,
      date: next.date,
      start: next.start,
      end: next.end,
    });
    if (!res.ok) {
      alert(res.message || "更新失敗");
      return;
    }
    await addAuditLog({
      action: "update_appointment",
      details: `更新 ${appt.code}`,
      appointmentId: appt.id,
    });
    await loadData();
    renderAppointments();
    openApptEditSheet(next, "view");
  });
}

function openNewApptSheet(prefDate, prefSlot) {
  const services = settings?.services || [];
  const dateVal = prefDate || selectedDateStr || toYMD(new Date());
  const startVal = prefSlot?.start || "";
  const endVal = prefSlot?.end || "";

  openSheet(`
    <h2 class="sheet-title">代客新增預約</h2>
    <div class="form-card sheet-form-card">
      <div class="form-field">
        <label>姓名 *</label>
        <input type="text" id="new-name" required>
      </div>
      <div class="form-field">
        <label>聯絡方式 *</label>
        <input type="text" id="new-contact" placeholder="電話 / WhatsApp / Email" required>
      </div>
      <div class="form-field">
        <label>地區（District） *</label>
        <select id="new-district">
          <option value="">請選擇地區</option>
          ${DISTRICT_OPTIONS.map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join("")}
        </select>
      </div>
      <div class="form-field">
        <label>服務 *</label>
        <select id="new-service">
          ${services
            .filter((s) => s.enabled !== false)
            .map((s) => `<option value="${escapeHtml(s.id)}" data-title="${escapeHtml(s.title)}">${escapeHtml(s.title)}</option>`)
            .join("")}
        </select>
      </div>
      <div class="form-field">
        <label>日期 *</label>
        <input type="date" id="new-date" value="${escapeHtml(dateVal)}">
      </div>
      <div class="sheet-time-grid">
        <div class="form-field">
          <label>開始 *</label>
          <input type="time" id="new-start" value="${escapeHtml(startVal)}">
        </div>
        <div class="form-field">
          <label>結束 *</label>
          <input type="time" id="new-end" value="${escapeHtml(endVal)}">
        </div>
      </div>
      <div class="form-field">
        <label>備註</label>
        <textarea id="new-notes" rows="2"></textarea>
      </div>
    </div>
    <div class="sheet-actions">
      <button type="button" class="btn-cta btn-cta-primary" id="new-save-btn">建立預約</button>
      <button type="button" class="btn-cta btn-cta-outline" data-sheet-close>取消</button>
    </div>`);

  document.getElementById("new-save-btn").addEventListener("click", async () => {
    const sel = document.getElementById("new-service");
    const opt = sel.options[sel.selectedIndex];
    const district = document.getElementById("new-district").value.trim();
    if (!district) {
      alert("請選擇地區");
      return;
    }
    const res = await reserveAppointment({
      ownerId: activeOwnerId_(),
      name: document.getElementById("new-name").value.trim(),
      contact: document.getElementById("new-contact").value.trim(),
      district,
      service: sel.value,
      serviceTitle: opt?.dataset?.title || opt?.textContent || "",
      date: document.getElementById("new-date").value,
      start: document.getElementById("new-start").value,
      end: document.getElementById("new-end").value,
      notes: document.getElementById("new-notes").value.trim(),
      source: "admin",
      createdBy: getCurrentUserEmail(),
    });
    if (!res.ok) {
      alert(res.message || "建立失敗");
      return;
    }
    await addAuditLog({
      action: "create_appointment",
      details: `代客新增 ${res.code}`,
      appointmentId: res.id,
    });
    closeSheet();
    await loadData();
    renderAppointments();
  });
}

/* ── Clients ── */

function renderClients() {
  const clients = aggregateClients(allAppointments);
  const blockedSet = new Set(blockedContacts.map((b) => String(b.contact || "").trim().toLowerCase()));
  const q = clientSearch.trim().toLowerCase();
  const filtered = q
    ? clients.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(q) ||
          (c.contact || "").toLowerCase().includes(q)
      )
    : clients;

  viewRoot.innerHTML = `
    <div class="form-field">
      <input type="search" id="client-search" placeholder="搜尋姓名或聯絡方式…" value="${escapeHtml(clientSearch)}">
    </div>
    <div class="appt-list" id="client-list">
      ${
        filtered.length
          ? filtered
              .map((c) => {
                const isBlocked = blockedSet.has(String(c.contact || "").trim().toLowerCase());
                return `
          <button type="button" class="appt-card admin-client-card" data-contact="${escapeHtml(c.contact)}" style="width:100%;text-align:left;cursor:pointer;border-left-color:${isBlocked ? "#999" : "var(--mcd-red)"}">
            <div class="appt-card-head">
              <span class="appt-name">${escapeHtml(c.name || "—")}</span>
              <span class="cal-day-count">${c.count} 筆</span>
            </div>
            <div class="appt-meta">📞 ${escapeHtml(c.contact || "")}${isBlocked ? " · 已封鎖" : ""}</div>
            <div class="appt-meta">來源：${escapeHtml((c.sources || []).join(", ") || "—")}</div>
            <div class="appt-meta">標籤：${escapeHtml((c.tags || []).join(", ") || "—")}</div>
          </button>`;
              })
              .join("")
          : '<p class="empty-msg">找不到客戶</p>'
      }
    </div>`;

  document.getElementById("client-search").addEventListener("input", (e) => {
    clientSearch = e.target.value;
    renderClients();
  });

  document.querySelectorAll(".admin-client-card").forEach((btn) => {
    btn.addEventListener("click", () => openClientSheet(btn.getAttribute("data-contact")));
  });
}

function openClientSheet(contact) {
  const clients = aggregateClients(allAppointments);
  const client = clients.find((c) => c.contact === contact);
  if (!client) return;

  const isBlocked = blockedContacts.some(
    (b) => String(b.contact || "").trim().toLowerCase() === String(contact || "").trim().toLowerCase()
  );

  openSheet(`
    <h2 class="sheet-title">${escapeHtml(client.name || "客戶")}</h2>
    <div class="sheet-summary">
      📞 ${escapeHtml(client.contact || "")}<br>
      共 ${client.count} 筆預約 · 最近：${escapeHtml(client.lastDate || "—")}
    </div>
    <div class="appt-list" style="max-height:40vh;overflow-y:auto;margin-bottom:1rem">
      ${client.appointments
        .sort((a, b) => `${b.date} ${b.start}`.localeCompare(`${a.date} ${a.start}`))
        .map(
          (a) => `
        <div class="appt-card">
          <div class="appt-card-head">
            <span class="appt-time">${escapeHtml(a.date)} ${escapeHtml(a.start)}</span>
            <span class="badge badge-meta">${escapeHtml(a.status || "")}</span>
          </div>
          <div class="appt-service">${escapeHtml(a.serviceTitle || "—")}</div>
          <div class="appt-code">${escapeHtml(a.code || "")}</div>
        </div>`
        )
        .join("")}
    </div>
    <div class="sheet-actions">
      ${
        isBlocked
          ? '<p class="alert-warn">此聯絡方式已封鎖</p>'
          : `<button type="button" class="btn-cta btn-cta-outline" id="block-contact-btn" style="color:var(--mcd-red)">封鎖聯絡方式</button>`
      }
      <button type="button" class="btn-cta btn-cta-outline" data-sheet-close>關閉</button>
    </div>`);

  document.getElementById("block-contact-btn")?.addEventListener("click", async () => {
    const reason = prompt("封鎖原因（選填）") || "";
    const res = await blockContact(client.contact, reason);
    if (!res.ok) {
      alert("封鎖失敗");
      return;
    }
    await addAuditLog({ action: "block_contact", details: client.contact });
    blockedContacts.push({ contact: client.contact, reason });
    closeSheet();
    renderClients();
  });
}

/* ── Schedule ── */

function renderSchedule() {
  const sch = settings?.schedule || {};
  const blockedDates = (sch.blockedDates || []).join("\n");
  const holidays = (sch.holidays || []).join("\n");

  viewRoot.innerHTML = `
    <div class="form-card">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
        <div class="form-field">
          <label>開始時間</label>
          <input type="time" id="sch-open" value="${escapeHtml(sch.openTime || "09:00")}">
        </div>
        <div class="form-field">
          <label>結束時間</label>
          <input type="time" id="sch-close" value="${escapeHtml(sch.closeTime || "18:00")}">
        </div>
        <div class="form-field">
          <label>時段間隔（分鐘）</label>
          <input type="number" id="sch-interval" min="5" step="5" value="${sch.interval || 15}">
        </div>
        <div class="form-field">
          <label>每日上限</label>
          <input type="number" id="sch-daily" min="1" value="${sch.dailyLimit || 20}">
        </div>
        <div class="form-field">
          <label>午餐開始</label>
          <input type="time" id="sch-lunch-start" value="${escapeHtml(sch.lunchStart || "12:00")}">
        </div>
        <div class="form-field">
          <label>午餐結束</label>
          <input type="time" id="sch-lunch-end" value="${escapeHtml(sch.lunchEnd || "13:00")}">
        </div>
        <div class="form-field">
          <label>緩衝時間（分鐘）</label>
          <input type="number" id="sch-buffer" min="0" value="${sch.bufferMinutes || 0}">
        </div>
      </div>
      <div class="form-field">
        <label>封鎖日期（每行 YYYY-MM-DD）</label>
        <textarea id="sch-blocked" rows="4" style="width:100%;padding:0.75rem;border:2px solid var(--mcd-border);border-radius:var(--radius-md);font-family:monospace;font-size:0.85rem">${escapeHtml(blockedDates)}</textarea>
      </div>
      <div class="form-field">
        <label>公眾假期（每行一個日期 YYYY-MM-DD）</label>
        <textarea id="sch-holidays" rows="4" style="width:100%;padding:0.75rem;border:2px solid var(--mcd-border);border-radius:var(--radius-md);font-family:monospace;font-size:0.85rem">${escapeHtml(holidays)}</textarea>
      </div>
      <button type="button" class="btn-cta btn-cta-primary" id="sch-save">儲存排程設定</button>
    </div>`;

  document.getElementById("sch-save").addEventListener("click", async () => {
    const parseLines = (el) =>
      el.value
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

    settings.schedule = {
      ...settings.schedule,
      openTime: document.getElementById("sch-open").value,
      closeTime: document.getElementById("sch-close").value,
      interval: Number(document.getElementById("sch-interval").value) || 15,
      lunchStart: document.getElementById("sch-lunch-start").value,
      lunchEnd: document.getElementById("sch-lunch-end").value,
      dailyLimit: Number(document.getElementById("sch-daily").value) || 20,
      bufferMinutes: Number(document.getElementById("sch-buffer").value) || 0,
      blockedDates: parseLines(document.getElementById("sch-blocked")),
      holidays: parseLines(document.getElementById("sch-holidays")),
    };

    const res = await saveSettings(settings);
    if (!res.ok) {
      alert(res.message || "儲存失敗");
      return;
    }
    await addAuditLog({ action: "save_schedule", details: "更新排程設定" });
    slotDefs = buildSlots(settings.schedule.openTime, settings.schedule.closeTime, settings.schedule.interval);
    alert("排程設定已儲存");
  });
}

/* ── Services ── */

function buildServicesEditorHtml_(services) {
  return `
    <div class="appt-list" id="svc-list">
      ${services
        .map(
          (s, i) => `
        <div class="form-card admin-svc-card" data-idx="${i}">
          <label style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;cursor:pointer">
            <input type="checkbox" class="svc-enabled" ${s.enabled !== false ? "checked" : ""}>
            <strong>啟用</strong>
          </label>
          <div class="form-field">
            <label>標題</label>
            <input type="text" class="svc-title" value="${escapeHtml(s.title || "")}">
          </div>
          <div class="form-field">
            <label>描述</label>
            <input type="text" class="svc-desc" value="${escapeHtml(s.desc || "")}">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
            <div class="form-field">
              <label>時長</label>
              <input type="text" class="svc-duration" value="${escapeHtml(s.duration || "")}">
            </div>
            <div class="form-field">
              <label>Emoji</label>
              <input type="text" class="svc-emoji" value="${escapeHtml(s.emoji || "")}">
            </div>
          </div>
        </div>`
        )
        .join("")}
    </div>
    <div style="display:flex;gap:0.5rem;margin-top:0.75rem;flex-wrap:wrap">
      <button type="button" class="btn-cta btn-cta-secondary" id="svc-add">新增服務</button>
      <button type="button" class="btn-cta btn-cta-primary" id="svc-save">儲存全部</button>
    </div>`;
}

function wireServicesEditor_(services, rerender) {
  document.getElementById("svc-add").addEventListener("click", () => {
    settings.services = settings.services || [];
    settings.services.push({
      title: "新服務",
      desc: "",
      duration: "15 分鐘",
      format: "Zoom / 線下",
      audience: "",
      emoji: "📋",
      badge: "",
      badgeType: "meta",
      enabled: true,
    });
    rerender();
  });

  document.getElementById("svc-save").addEventListener("click", async () => {
    const cards = document.querySelectorAll(".admin-svc-card");
    settings.services = [...cards].map((card) => {
      const old = services[Number(card.dataset.idx)] || {};
      return {
        ...old,
        enabled: card.querySelector(".svc-enabled").checked,
        title: card.querySelector(".svc-title").value.trim(),
        desc: card.querySelector(".svc-desc").value.trim(),
        duration: card.querySelector(".svc-duration").value.trim(),
        emoji: card.querySelector(".svc-emoji").value.trim(),
      };
    });

    const res = await saveSettings(settings);
    if (!res.ok) {
      alert(res.message || "儲存失敗");
      return;
    }
    await addAuditLog({ action: "save_services", details: `${settings.services.length} 項服務` });
    const latest = await getSettings();
    if (latest?.ok && latest.settings) settings = latest.settings;
    alert("服務項目已儲存");
    rerender();
  });
}

function renderServices() {
  const services = settings?.services || [];
  viewRoot.innerHTML = buildServicesEditorHtml_(services);
  wireServicesEditor_(services, renderServices);
}

function renderEditor() {
  renderBranding();
  const services = settings?.services || [];
  viewRoot.insertAdjacentHTML(
    "beforeend",
    `
      <div class="form-card" style="margin-top:1rem">
        <div class="admin-form-section-title" style="margin-top:0">服務項目</div>
        <p style="margin:0 0 0.65rem;color:var(--color-text-muted);font-size:0.85rem">
          同一版面可直接編輯服務內容，儲存後會即時同步到預約頁。
        </p>
        ${buildServicesEditorHtml_(services)}
      </div>`
  );
  wireServicesEditor_(services, renderEditor);
}

/* ── Notifications ── */

function renderNotifications() {
  const n = settings?.notifications || {};

  viewRoot.innerHTML = `
    <div class="form-card">
      <div class="alert-warn" style="margin-bottom:1rem">
        電郵提醒需部署 Cloud Functions（Firebase Blaze 計劃）。
      </div>
      <label class="admin-toggle-row">
        <input type="checkbox" id="nt-email" ${n.emailEnabled ? "checked" : ""}>
        <span>啟用電郵通知</span>
      </label>
      <div class="form-field">
        <label>通知收件 Email</label>
        <input type="email" id="nt-to" value="${escapeHtml(n.notifyTo || "")}" placeholder="agent@example.com">
      </div>
      <label class="admin-toggle-row">
        <input type="checkbox" id="nt-24h" ${n.reminder24h ? "checked" : ""}>
        <span>24 小時前提醒</span>
      </label>
      <label class="admin-toggle-row">
        <input type="checkbox" id="nt-1h" ${n.reminder1h ? "checked" : ""}>
        <span>1 小時前提醒</span>
      </label>
      <label class="admin-toggle-row">
        <input type="checkbox" id="nt-sms" ${n.smsEnabled ? "checked" : ""}>
        <span>啟用 SMS（需額外整合）</span>
      </label>
      <button type="button" class="btn-cta btn-cta-primary" id="nt-save" style="margin-top:1rem">儲存通知設定</button>
    </div>`;

  document.getElementById("nt-save").addEventListener("click", async () => {
    settings.notifications = {
      emailEnabled: document.getElementById("nt-email").checked,
      notifyTo: document.getElementById("nt-to").value.trim(),
      reminder24h: document.getElementById("nt-24h").checked,
      reminder1h: document.getElementById("nt-1h").checked,
      smsEnabled: document.getElementById("nt-sms").checked,
    };
    const res = await saveSettings(settings);
    if (!res.ok) {
      alert(res.message || "儲存失敗");
      return;
    }
    await addAuditLog({ action: "save_notifications", details: "更新通知設定" });
    alert("通知設定已儲存");
  });
}

/* ── Branding ── */

function renderBranding() {
  const agent = settings?.agent || {};
  const agentProfile =
    superAdmin && getEffectiveOwnerId()
      ? allAgents.find((a) => a.uid === getEffectiveOwnerId())
      : myProfile;
  const liveUrl = agentProfile?.slug ? getBookingPageUrl(agentProfile.slug) : getBookingPageUrl("");
  const previewUrl = liveUrl.includes("?")
    ? `${liveUrl}&preview=1`
    : `${liveUrl}?preview=1`;

  const fieldMap = {
    name: "br-name",
    title: "br-title",
    bio: "br-bio",
    emoji: "br-emoji",
    pageTitle: "br-page-title",
    pageSubtitle: "br-page-subtitle",
    bannerTag: "br-banner-tag",
    bannerTitle: "br-banner-title",
  };

  viewRoot.innerHTML = `
    <div class="form-card" style="margin-bottom:1rem">
      <div class="admin-form-section-title" style="margin-top:0">實際預約頁連結</div>
      <p style="margin:0 0 0.65rem;color:var(--color-text-muted);font-size:0.85rem">
        左邊預覽可直接點文字編輯；右側可改聯絡資料。改完記得儲存。
      </p>
      <div class="form-field">
        <input type="text" id="br-live-url" readonly value="${escapeHtml(liveUrl)}">
      </div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
        <a class="btn-cta btn-cta-secondary" href="${escapeHtml(liveUrl)}" target="_blank" rel="noopener" style="width:auto;padding:0.7rem 1rem">開啟實際頁面</a>
        <button type="button" class="btn-cta btn-cta-outline" id="br-copy-url" style="width:auto;padding:0.7rem 1rem">複製連結</button>
        <button type="button" class="btn-cta btn-cta-outline" id="br-refresh-preview" style="width:auto;padding:0.7rem 1rem">重新整理預覽</button>
      </div>
    </div>
    <div class="page-editor-layout">
      <div class="booking-preview-phone" id="booking-preview-phone">
        <iframe
          id="br-live-preview"
          class="booking-preview-frame"
          title="實際預約頁預覽"
          src="${escapeHtml(previewUrl)}"
        ></iframe>
      </div>

    <div class="form-card">
      <div class="form-field">
        <label>顧問姓名</label>
        <input type="text" id="br-name" value="${escapeHtml(agent.name || "")}">
      </div>
      <div class="form-field">
        <label>職稱</label>
        <input type="text" id="br-title" value="${escapeHtml(agent.title || "")}">
      </div>
      <div class="form-field">
        <label>簡介</label>
        <input type="text" id="br-bio" value="${escapeHtml(agent.bio || "")}">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
        <div class="form-field">
          <label>Emoji</label>
          <input type="text" id="br-emoji" value="${escapeHtml(agent.emoji || "")}">
        </div>
        <div class="form-field">
          <label>WhatsApp</label>
          <input type="text" id="br-wa" value="${escapeHtml(agent.whatsapp || "")}">
        </div>
      </div>
      <div class="form-field">
        <label>Email</label>
        <input type="email" id="br-email" value="${escapeHtml(agent.email || "")}">
      </div>
      <div class="admin-form-section-title">預約頁面文字</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
        <div class="form-field">
          <label>頁面標題</label>
          <input type="text" id="br-page-title" value="${escapeHtml(agent.pageTitle || "預約諮詢")}">
        </div>
        <div class="form-field">
          <label>頁面副標</label>
          <input type="text" id="br-page-subtitle" value="${escapeHtml(agent.pageSubtitle || "AIA · 保險與儲蓄")}">
        </div>
      </div>
      <div class="form-field">
        <label>Banner 標籤</label>
        <input type="text" id="br-banner-tag" value="${escapeHtml(agent.bannerTag || "")}">
      </div>
      <div class="form-field">
        <label>Banner 標題</label>
        <input type="text" id="br-banner-title" value="${escapeHtml(agent.bannerTitle || "")}">
      </div>
      <button type="button" class="btn-cta btn-cta-primary" id="br-save">儲存用戶頁面</button>
    </div>
    </div>`;

  const frame = document.getElementById("br-live-preview");

  const postToPreview = (payload) => {
    frame?.contentWindow?.postMessage({ source: "aia-page-editor-host", ...payload }, "*");
  };

  const refreshPreview = () => {
    if (!frame) return;
    frame.src = `${previewUrl}${previewUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
  };

  if (pageEditorMessageHandler) {
    window.removeEventListener("message", pageEditorMessageHandler);
    pageEditorMessageHandler = null;
  }

  const onPreviewMessage = (event) => {
    if (event.source !== frame?.contentWindow) return;
    const data = event.data;
    if (!data || data.source !== "aia-page-editor") return;

    if (data.type === "ready") {
      Object.entries(fieldMap).forEach(([key, inputId]) => {
        const input = document.getElementById(inputId);
        if (input) postToPreview({ type: "set-field", key, value: input.value });
      });
      return;
    }

    if (data.type === "field-change" && fieldMap[data.key]) {
      const input = document.getElementById(fieldMap[data.key]);
      if (input && document.activeElement !== input) input.value = data.value || "";
      return;
    }

    if (data.type === "field-focus" && fieldMap[data.key]) {
      const input = document.getElementById(fieldMap[data.key]);
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
      input?.classList.add("page-editor-field-flash");
      setTimeout(() => input?.classList.remove("page-editor-field-flash"), 900);
      return;
    }

    if (data.type === "hint" && data.message) {
      alert(data.message);
    }
  };

  pageEditorMessageHandler = onPreviewMessage;
  window.addEventListener("message", onPreviewMessage);

  Object.entries(fieldMap).forEach(([key, inputId]) => {
    document.getElementById(inputId)?.addEventListener("input", (e) => {
      postToPreview({ type: "set-field", key, value: e.target.value });
    });
  });

  document.getElementById("br-copy-url")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(liveUrl);
      alert("已複製實際預約頁連結");
    } catch {
      document.getElementById("br-live-url")?.select();
      alert("請手動複製連結");
    }
  });

  document.getElementById("br-refresh-preview")?.addEventListener("click", refreshPreview);

  document.getElementById("br-save").addEventListener("click", async () => {
    settings.agent = {
      ...settings.agent,
      name: document.getElementById("br-name").value.trim(),
      title: document.getElementById("br-title").value.trim(),
      bio: document.getElementById("br-bio").value.trim(),
      emoji: document.getElementById("br-emoji").value.trim(),
      whatsapp: document.getElementById("br-wa").value.trim(),
      email: document.getElementById("br-email").value.trim(),
      pageTitle: document.getElementById("br-page-title").value.trim(),
      pageSubtitle: document.getElementById("br-page-subtitle").value.trim(),
      bannerTag: document.getElementById("br-banner-tag").value.trim(),
      bannerTitle: document.getElementById("br-banner-title").value.trim(),
      tracePlaceholder: "TN2VK8",
    };
    const res = await saveSettings(settings);
    if (!res.ok) {
      alert(res.message || "儲存失敗");
      return;
    }
    await addAuditLog({ action: "save_user_page", details: "更新用戶預約頁面" });
    refreshPreview();
    alert("用戶頁面已儲存。");
  });
}

/* ── Export ── */

function renderExport() {
  const integ = settings?.integrations || {};
  const agent =
    superAdmin && getEffectiveOwnerId()
      ? allAgents.find((a) => a.uid === getEffectiveOwnerId())
      : myProfile;
  const bookingUrl = agent?.slug ? getBookingPageUrl(agent.slug) : "";

  viewRoot.innerHTML = `
    <div class="form-card">
      <p style="margin:0 0 1rem;color:var(--mcd-text-muted);font-size:0.9rem">
        共 ${allAppointments.length} 筆預約可匯出
      </p>
      <button type="button" class="btn-cta btn-cta-primary" id="export-csv">下載 CSV</button>
    </div>

    ${
      bookingUrl
        ? `<div class="form-card" style="margin-top:1rem">
      <h3 style="margin:0 0 0.5rem;font-size:1rem">你的專屬預約連結</h3>
      <p style="margin:0 0 0.75rem;font-size:0.85rem;color:var(--mcd-text-muted)">分享俾客戶用，每人只會見到你嘅預約同設定。</p>
      <input type="text" readonly value="${escapeHtml(bookingUrl)}" id="booking-url" style="width:100%;padding:0.65rem;border:2px solid var(--mcd-border);border-radius:8px;font-size:0.85rem">
      <button type="button" class="btn-cta btn-cta-secondary" id="copy-booking-url" style="margin-top:0.75rem">複製連結</button>
    </div>`
        : ""
    }

    <div class="form-card" style="margin-top:1rem">
      <h3 style="margin:0 0 1rem;font-size:1rem">整合設定</h3>
      <div class="form-field">
        <label>Webhook URL</label>
        <input type="url" id="int-webhook" value="${escapeHtml(integ.webhookUrl || "")}" placeholder="https://...">
      </div>
      <label class="admin-toggle-row">
        <input type="checkbox" id="int-gcal" ${integ.googleCalEnabled ? "checked" : ""}>
        <span>啟用 Google 日曆連結</span>
      </label>
      <label class="admin-toggle-row">
        <input type="checkbox" id="int-zoom" ${integ.zoomEnabled ? "checked" : ""}>
        <span>啟用 Zoom 整合</span>
      </label>
      <button type="button" class="btn-cta btn-cta-primary" id="int-save" style="margin-top:1rem">儲存整合設定</button>
    </div>`;

  document.getElementById("export-csv").addEventListener("click", () => {
    const csv = exportAppointmentsCsv(allAppointments);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appointments-${toYMD(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addAuditLog({ action: "export_csv", details: `${allAppointments.length} 筆` });
  });

  document.getElementById("copy-booking-url")?.addEventListener("click", async () => {
    const input = document.getElementById("booking-url");
    if (!input) return;
    try {
      await navigator.clipboard.writeText(input.value);
    } catch {
      input.select();
      document.execCommand("copy");
    }
    alert("已複製預約連結");
  });

  document.getElementById("int-save").addEventListener("click", async () => {
    settings.integrations = {
      webhookUrl: document.getElementById("int-webhook").value.trim(),
      googleCalEnabled: document.getElementById("int-gcal").checked,
      zoomEnabled: document.getElementById("int-zoom").checked,
    };
    const res = await saveSettings(settings);
    if (!res.ok) {
      alert(res.message || "儲存失敗");
      return;
    }
    await addAuditLog({ action: "save_integrations", details: "更新整合設定" });
    alert("整合設定已儲存");
  });
}
