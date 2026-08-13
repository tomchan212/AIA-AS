import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  doc,
  orderBy,
  limit,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";
import { SERVICES as DEFAULT_SERVICES, toYMD, timesOverlap } from "./shared.js";

const COLLECTION = "appointments";
const USERS_COLLECTION = "users";
const SYSTEM_CONFIG_DOC = "system/config";
const AUDIT_COLLECTION = "audit_logs";
const BLOCKED_COLLECTION = "blocked_contacts";
const DEFAULT_RESERVE_STATUS = "First meet";
const CANCELLED_STATUS = "Cancelled";
const TIMEZONE = "Asia/Hong_Kong";
const DISTRICT_SET = new Set([
  "中西區",
  "灣仔區",
  "東區",
  "南區",
  "油尖旺區",
  "深水埗區",
  "九龍城區",
  "黃大仙區",
  "觀塘區",
  "葵青區",
  "荃灣區",
  "屯門區",
  "元朗區",
  "北區",
  "大埔區",
  "沙田區",
  "西貢區",
  "離島區",
]);

const BOOTSTRAP_SUPER_ADMINS = ["admin@aia.local"];

let db_ = null;
let auth_ = null;
let app_ = null;
let superAdminCache_ = null;
let userProfileCache_ = null;

const tenantContext_ = {
  publicOwnerId: null,
  viewAsOwnerId: null,
  superAdminViewAll: false,
};

export function getDb() {
  return db_;
}

export function getAuthInstance() {
  return auth_;
}

function isConfigReady_() {
  const cfg = firebaseConfig || {};
  return Boolean(cfg.apiKey && cfg.projectId && !String(cfg.apiKey).includes("YOUR_"));
}

export async function initFirebase() {
  if (!isConfigReady_()) {
    throw new Error("請先在 firebase-config.js 填入 Firebase 專案設定。");
  }
  app_ = getApps().length ? getApp() : initializeApp(firebaseConfig);
  db_ = getFirestore(app_);
  auth_ = getAuth(app_);
}

export function onAuthChange(cb) {
  if (!auth_) return () => {};
  return onAuthStateChanged(auth_, cb);
}

function mapAuthError_(code) {
  const map = {
    "auth/email-already-in-use": "此 Email 已被使用，請直接登入。",
    "auth/invalid-email": "Email 格式不正確。",
    "auth/weak-password": "密碼至少 6 位。",
    "auth/user-not-found": "找不到此帳戶，請先建立管理員。",
    "auth/wrong-password": "密碼錯誤。",
    "auth/invalid-credential": "Email 或密碼錯誤。",
    "auth/operation-not-allowed": "Email 登入尚未啟用，請稍後再試或聯絡技術支援。",
    "auth/configuration-not-found": "後台登入尚未設定完成，請聯絡管理員。",
    "auth/too-many-requests": "嘗試次數過多，請稍後再試。",
    "auth/network-request-failed": "網絡連線失敗，請檢查網絡後再試。",
  };
  return map[code] || "登入失敗，請稍後再試。";
}

export async function adminLogin(email, password) {
  if (!auth_) return { ok: false, message: "Auth 未初始化" };
  try {
    const cred = await signInWithEmailAndPassword(auth_, email, password);
    return { ok: true, user: cred.user };
  } catch (err) {
    const code = err.code || "";
    let message = mapAuthError_(code);
    if (String(err.message || "").includes("CONFIGURATION_NOT_FOUND")) {
      message = mapAuthError_("auth/configuration-not-found");
    }
    return { ok: false, message, code };
  }
}

export async function adminRegister(email, password) {
  if (!auth_) return { ok: false, message: "Auth 未初始化" };
  try {
    const cred = await createUserWithEmailAndPassword(auth_, email, password);
    return { ok: true, user: cred.user };
  } catch (err) {
    const code = err.code || "";
    let message = mapAuthError_(code);
    if (String(err.message || "").includes("CONFIGURATION_NOT_FOUND")) {
      message = mapAuthError_("auth/configuration-not-found");
    }
    return { ok: false, message, code };
  }
}

export async function adminLogout() {
  if (!auth_) return;
  await signOut(auth_);
  superAdminCache_ = null;
  userProfileCache_ = null;
  tenantContext_.viewAsOwnerId = null;
  tenantContext_.superAdminViewAll = false;
}

export function getCurrentUserEmail() {
  return auth_?.currentUser?.email || "";
}

export function getCurrentUserId() {
  return auth_?.currentUser?.uid || "";
}

export function setPublicOwnerId(ownerId) {
  tenantContext_.publicOwnerId = ownerId || null;
}

export function setViewAsOwnerId(ownerId) {
  tenantContext_.viewAsOwnerId = ownerId || null;
  if (ownerId) tenantContext_.superAdminViewAll = false;
}

export function setSuperAdminViewAll(on) {
  tenantContext_.superAdminViewAll = !!on;
  if (on) tenantContext_.viewAsOwnerId = null;
}

export function getViewAsOwnerId() {
  return tenantContext_.viewAsOwnerId;
}

export function isSuperAdminViewAll() {
  return tenantContext_.superAdminViewAll;
}

function settingsPath_(ownerId) {
  return ["settings", ownerId];
}

function slugFromEmail_(email, uid) {
  const base = String(email || "")
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return base || `agent-${uid.slice(0, 8)}`;
}

async function ensureUniqueSlug_(baseSlug) {
  let slug = baseSlug;
  let n = 1;
  while (true) {
    const q = query(collection(db_, USERS_COLLECTION), where("slug", "==", slug), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return slug;
    slug = `${baseSlug}-${n++}`;
  }
}

export async function getSystemConfig() {
  if (!db_) return { superAdminEmails: [...BOOTSTRAP_SUPER_ADMINS] };
  try {
    const ref = doc(db_, ...SYSTEM_CONFIG_DOC.split("/"));
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const cfg = { superAdminEmails: BOOTSTRAP_SUPER_ADMINS.map((e) => e.toLowerCase()) };
      if (auth_?.currentUser && (await isSuperAdmin())) {
        await setDoc(ref, cfg);
      }
      return cfg;
    }
    const data = snap.data();
    const emails = [
      ...BOOTSTRAP_SUPER_ADMINS.map((e) => e.toLowerCase()),
      ...(data.superAdminEmails || []).map((e) => String(e).toLowerCase()),
    ];
    return { superAdminEmails: [...new Set(emails)] };
  } catch (_) {
    return { superAdminEmails: BOOTSTRAP_SUPER_ADMINS.map((e) => e.toLowerCase()) };
  }
}

export async function isSuperAdmin() {
  if (superAdminCache_ !== null) return superAdminCache_;
  const email = getCurrentUserEmail().toLowerCase();
  if (!email) {
    superAdminCache_ = false;
    return false;
  }
  const cfg = await getSystemConfig();
  superAdminCache_ = cfg.superAdminEmails.includes(email);
  return superAdminCache_;
}

export function getEffectiveOwnerId() {
  if (tenantContext_.publicOwnerId) return tenantContext_.publicOwnerId;
  if (tenantContext_.viewAsOwnerId) return tenantContext_.viewAsOwnerId;
  if (tenantContext_.superAdminViewAll) return null;
  return getCurrentUserId();
}

export async function ensureUserProfile(user) {
  if (!db_ || !user?.uid) return { ok: false, message: "缺少 user" };

  try {
    const uid = user.uid;
    const userRef = doc(db_, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);
    let slug = userSnap.exists() ? userSnap.data().slug : null;

    if (!userSnap.exists()) {
      slug = await ensureUniqueSlug_(slugFromEmail_(user.email, uid));
      await setDoc(userRef, {
        email: user.email || "",
        slug,
        displayName: user.displayName || user.email?.split("@")[0] || "Agent",
        createdAt: new Date().toISOString(),
      });
    }

    const settingsRef = doc(db_, ...settingsPath_(uid));
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      const defaults = defaultSettings();
      defaults.agent.email = user.email || "";
      defaults.agent.name = user.displayName || defaults.agent.name;
      await setDoc(settingsRef, defaults);
    }

    userProfileCache_ = { uid, slug, email: user.email || "" };
    return { ok: true, uid, slug, email: user.email || "" };
  } catch (err) {
    return { ok: false, message: String(err?.message || err) };
  }
}

export async function getUserProfile(uid) {
  if (!db_ || !uid) return null;
  const snap = await getDoc(doc(db_, USERS_COLLECTION, uid));
  return snap.exists() ? { uid, ...snap.data() } : null;
}

export async function getAllAgents() {
  if (!db_) return [];
  const snap = await getDocs(collection(db_, USERS_COLLECTION));
  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() }))
    .sort((a, b) => (a.email || "").localeCompare(b.email || ""));
}

export async function resolveOwnerFromUrl({ agent, uid }) {
  if (!db_) return { ok: false, message: "Firebase 未初始化" };

  if (uid) {
    const profile = await getUserProfile(String(uid).trim());
    if (profile) {
      setPublicOwnerId(profile.uid);
      return { ok: true, ownerId: profile.uid, profile };
    }
    return { ok: false, message: "找不到此 agent（uid）。" };
  }

  if (agent) {
    const slug = String(agent).trim().toLowerCase();
    const q = query(collection(db_, USERS_COLLECTION), where("slug", "==", slug), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return { ok: false, message: "找不到此 agent 預約連結。" };
    const d = snap.docs[0];
    const profile = { uid: d.id, ...d.data() };
    setPublicOwnerId(profile.uid);
    return { ok: true, ownerId: profile.uid, profile };
  }

  // Convenience: if only one agent exists, use that page settings.
  try {
    const all = await getDocs(collection(db_, USERS_COLLECTION));
    if (all.size === 1) {
      const d = all.docs[0];
      const profile = { uid: d.id, ...d.data() };
      setPublicOwnerId(profile.uid);
      return { ok: true, ownerId: profile.uid, profile };
    }
    if (all.size > 1) {
      const preferred = all.docs.find((d) =>
        BOOTSTRAP_SUPER_ADMINS.includes(String(d.data()?.email || "").toLowerCase())
      );
      if (preferred) {
        const profile = { uid: preferred.id, ...preferred.data() };
        setPublicOwnerId(profile.uid);
        return { ok: true, ownerId: profile.uid, profile };
      }
    }
  } catch {
    /* ignore and fall through */
  }

  return { ok: false, message: "請使用你的專屬預約連結（含 ?agent=你的slug）。" };
}

export function getBookingPageUrl(slug) {
  const origin = window.location.origin;
  if (!slug) return `${origin}/`;
  return `${origin}/?agent=${encodeURIComponent(slug)}`;
}

function monthRange_(year, month) {
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { monthStart, monthEnd };
}

function generateCodeRaw_() {
  // 26 letters + 10 digits = 36 chars → 36^6 = 2,176,782,336 combinations
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint32Array(6);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 0xffffffff);
  }
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[bytes[i] % chars.length];
  return out;
}

async function generateUniqueCode_() {
  if (!db_) return generateCodeRaw_();
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCodeRaw_();
    const snap = await getDocs(
      query(collection(db_, COLLECTION), where("code", "==", code), limit(1))
    );
    if (snap.empty) return code;
  }
  throw new Error("無法產生唯一預約代碼，請再試一次。");
}

function slotKey_(ownerId, date, start, end) {
  return `${ownerId}|${date}|${start}|${end}`;
}

export function mapAppointment(id, data) {
  return {
    id,
    ownerId: data.ownerId || "",
    code: data.code || "",
    date: data.date || "",
    start: data.start || "",
    end: data.end || "",
    contact: data.contact || "",
    name: data.name || "",
    district: data.district || "",
    status: data.status || "",
    service: data.service || "",
    serviceTitle: data.serviceTitle || "",
    notes: data.notes || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    source: data.source || "online",
    purpose: data.purpose || "",
    cancelled: !!data.cancelled,
    cancelReason: data.cancelReason || "",
    createdAt: data.createdAt || "",
    updatedAt: data.updatedAt || "",
    createdBy: data.createdBy || "",
  };
}

function isActiveAppointment_(data) {
  if (data.cancelled) return false;
  const s = String(data.status || "").trim();
  return s.length > 0 && s !== CANCELLED_STATUS;
}

export function defaultSettings() {
  return {
    schedule: {
      openTime: "09:00",
      closeTime: "18:00",
      interval: 15,
      lunchStart: "12:00",
      lunchEnd: "13:00",
      holidays: [],
      blockedDates: [],
      dailyLimit: 20,
      bufferMinutes: 0,
    },
    agent: {
      name: "AIA Agent",
      title: "保險與儲蓄顧問",
      bio: "1對1 專屬財務規劃",
      emoji: "👤",
      whatsapp: "",
      email: "",
      pageTitle: "預約諮詢",
      pageSubtitle: "AIA · 保險與儲蓄",
      bannerTag: "限時免費諮詢",
      bannerTitle: "1對1 專屬財務規劃",
      bannerDesc: "選擇服務 → 選目的 → 選時段，時長先對得準。",
      servicesHeading: "熱門諮詢服務",
      traceTitle: "已有預約代碼？",
      tracePlaceholder: "TN2VK8",
      successHeaderTitle: "預約完成",
      successHeaderSubtitle: "感謝你的預約",
      successTitle: "預約成功！",
      successDesc: "請保存你的預約代碼",
    },
    services: DEFAULT_SERVICES.map((s) => ({ ...s, enabled: true })),
    notifications: {
      emailEnabled: true,
      notifyTo: "",
      reminder24h: true,
      reminder1h: true,
      smsEnabled: false,
    },
    branding: { primaryColor: "#db0007", yellowColor: "#ffbc0d" },
    integrations: {
      googleCalEnabled: true,
      zoomEnabled: false,
      webhookUrl: "",
    },
  };
}

export async function getSettings(ownerId) {
  if (!db_) return { ok: false, message: "Firebase 未初始化" };
  const oid = ownerId || getEffectiveOwnerId();
  if (!oid) return { ok: false, message: "缺少 ownerId", settings: defaultSettings() };

  try {
    const snap = await getDoc(doc(db_, ...settingsPath_(oid)));
    if (!snap.exists()) {
      const defaults = defaultSettings();
      if (canWriteSettings_(oid)) {
        await setDoc(doc(db_, ...settingsPath_(oid)), defaults);
      }
      return { ok: true, settings: defaults, ownerId: oid };
    }
    const data = snap.data();
    const defaults = defaultSettings();
    const agent = { ...defaults.agent, ...data.agent };
    // migrate legacy placeholder shown on older saved pages
    if (!agent.tracePlaceholder || agent.tracePlaceholder === "AP-..." || agent.tracePlaceholder === "例如 AP-..." || agent.tracePlaceholder.startsWith("例如 ")) {
      agent.tracePlaceholder = "TN2VK8";
    }
    return {
      ok: true,
      ownerId: oid,
      settings: {
        schedule: { ...defaults.schedule, ...data.schedule },
        agent,
        services: data.services?.length ? normalizeServices_(data.services) : defaults.services,
        notifications: { ...defaults.notifications, ...data.notifications },
        branding: { ...defaults.branding, ...data.branding },
        integrations: { ...defaults.integrations, ...data.integrations },
      },
    };
  } catch (err) {
    return { ok: false, message: String(err?.message || err), settings: defaultSettings() };
  }
}

function canWriteSettings_(ownerId) {
  const uid = getCurrentUserId();
  return uid && (uid === ownerId || superAdminCache_);
}

function slugifyServiceId_(text) {
  const base = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "service";
}

function normalizeServices_(services) {
  const source = Array.isArray(services) ? services : [];
  const used = new Set();
  return source.map((s, idx) => {
    const current = String(s?.id || "").trim();
    let id = current;
    if (!id) {
      id = `${slugifyServiceId_(s?.title)}-${Date.now().toString(36)}-${idx + 1}`;
    }
    while (used.has(id)) id = `${id}-${Math.floor(Math.random() * 9 + 1)}`;
    used.add(id);
    return { ...s, id };
  });
}

export async function saveSettings(settings, ownerId) {
  if (!db_) return { ok: false, message: "Firebase 未初始化" };
  const oid = ownerId || getEffectiveOwnerId();
  if (!oid) return { ok: false, message: "缺少 ownerId" };
  try {
    const patch = { ...settings };
    if (Array.isArray(settings?.services)) {
      patch.services = normalizeServices_(settings.services);
    }
    await setDoc(doc(db_, ...settingsPath_(oid)), patch, { merge: true });
    return { ok: true };
  } catch (err) {
    return { ok: false, message: String(err?.message || err) };
  }
}

export async function addAuditLog({ action, details, appointmentId, userEmail, ownerId }) {
  if (!db_) return;
  const oid = ownerId || getEffectiveOwnerId() || getCurrentUserId();
  if (!oid) return;
  try {
    await addDoc(collection(db_, AUDIT_COLLECTION), {
      action,
      details: details || "",
      appointmentId: appointmentId || "",
      userEmail: userEmail || getCurrentUserEmail(),
      ownerId: oid,
      createdAt: new Date().toISOString(),
    });
  } catch (_) {}
}

export async function getAuditLogs(max = 100, ownerId) {
  if (!db_) return { ok: false, logs: [] };
  const oid = ownerId !== undefined ? ownerId : getEffectiveOwnerId();
  try {
    let q;
    if (oid) {
      q = query(
        collection(db_, AUDIT_COLLECTION),
        where("ownerId", "==", oid),
        orderBy("createdAt", "desc"),
        limit(max)
      );
    } else {
      q = query(collection(db_, AUDIT_COLLECTION), orderBy("createdAt", "desc"), limit(max));
    }
    const snap = await getDocs(q);
    const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { ok: true, logs };
  } catch (err) {
    return { ok: false, logs: [], message: String(err?.message || err) };
  }
}

export async function getBlockedContacts(ownerId) {
  if (!db_) return { ok: false, blocked: [] };
  const oid = ownerId !== undefined ? ownerId : getEffectiveOwnerId();
  try {
    let snap;
    if (oid) {
      snap = await getDocs(query(collection(db_, BLOCKED_COLLECTION), where("ownerId", "==", oid)));
    } else {
      snap = await getDocs(collection(db_, BLOCKED_COLLECTION));
    }
    return { ok: true, blocked: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
  } catch (err) {
    return { ok: false, blocked: [], message: String(err?.message || err) };
  }
}

export async function blockContact(contact, reason, ownerId) {
  if (!db_) return { ok: false };
  const oid = ownerId || getEffectiveOwnerId() || getCurrentUserId();
  if (!oid) return { ok: false, message: "缺少 ownerId" };
  const ref = await addDoc(collection(db_, BLOCKED_COLLECTION), {
    contact: String(contact).trim(),
    reason: reason || "",
    ownerId: oid,
    createdAt: new Date().toISOString(),
  });
  return { ok: true, id: ref.id };
}

export async function unblockContact(id) {
  if (!db_) return { ok: false };
  await updateDoc(doc(db_, BLOCKED_COLLECTION, id), { removed: true });
  return { ok: true };
}

async function checkSlotConflict_(ownerId, dateStr, startStr, endStr, excludeId) {
  const conflictQuery = query(
    collection(db_, COLLECTION),
    where("ownerId", "==", ownerId),
    where("date", "==", dateStr)
  );
  const conflictSnap = await getDocs(conflictQuery);
  for (const d of conflictSnap.docs) {
    if (excludeId && d.id === excludeId) continue;
    const data = d.data();
    if (!isActiveAppointment_(data)) continue;
    if (timesOverlap(startStr, endStr, data.start, data.end)) return true;
  }
  return false;
}

export async function getMonthAppointments(year, month, ownerId) {
  if (!db_) return { ok: false, message: "Firebase 尚未初始化。" };
  const oid = ownerId !== undefined ? ownerId : getEffectiveOwnerId();
  if (!oid) return { ok: false, message: "缺少 ownerId" };

  const { monthStart, monthEnd } = monthRange_(year, month);
  const q = query(
    collection(db_, COLLECTION),
    where("ownerId", "==", oid),
    where("date", ">=", monthStart),
    where("date", "<=", monthEnd)
  );
  const snap = await getDocs(q);
  const appointments = snap.docs.map((d) => mapAppointment(d.id, d.data()));
  appointments.sort((a, b) => {
    const c = (a.date || "").localeCompare(b.date || "");
    return c !== 0 ? c : (a.start || "").localeCompare(b.start || "");
  });
  return { ok: true, appointments };
}

export async function getAllAppointments(ownerId) {
  if (!db_) return { ok: false, appointments: [] };
  const oid = ownerId !== undefined ? ownerId : getEffectiveOwnerId();

  try {
    let snap;
    if (oid) {
      snap = await getDocs(query(collection(db_, COLLECTION), where("ownerId", "==", oid)));
    } else {
      snap = await getDocs(collection(db_, COLLECTION));
    }
    const appointments = snap.docs.map((d) => mapAppointment(d.id, d.data()));
    appointments.sort((a, b) => `${b.date} ${b.start}`.localeCompare(`${a.date} ${a.start}`));
    return { ok: true, appointments };
  } catch (err) {
    return { ok: false, appointments: [], message: String(err?.message || err) };
  }
}

export async function getAppointmentByCode(code, ownerId) {
  if (!db_) return { ok: false, message: "Firebase 尚未初始化。" };
  const normalized = String(code || "").trim().toUpperCase();
  if (!normalized) return { ok: false, message: "缺少代碼" };
  try {
    const snap = await getDocs(
      query(collection(db_, COLLECTION), where("code", "==", normalized), limit(1))
    );
    if (snap.empty) return { ok: false, message: "找不到此預約代碼。" };
    const appt = mapAppointment(snap.docs[0].id, snap.docs[0].data());
    if (ownerId && appt.ownerId && appt.ownerId !== ownerId) {
      return { ok: false, message: "找不到此預約代碼。" };
    }
    return { ok: true, appointment: appt };
  } catch (err) {
    return { ok: false, message: String(err?.message || err) };
  }
}

/**
 * Live appointments listener.
 * callback({ appointments, changes, fromCache })
 * changes: [{ type: 'added'|'modified'|'removed', appointment }]
 */
export function subscribeAppointments(callback, ownerId) {
  if (!db_) return () => {};
  const oid = ownerId !== undefined ? ownerId : getEffectiveOwnerId();
  const qRef = oid
    ? query(collection(db_, COLLECTION), where("ownerId", "==", oid))
    : collection(db_, COLLECTION);

  return onSnapshot(
    qRef,
    (snap) => {
      const appointments = snap.docs.map((d) => mapAppointment(d.id, d.data()));
      appointments.sort((a, b) => `${b.date} ${b.start}`.localeCompare(`${a.date} ${a.start}`));
      const changes = snap.docChanges().map((change) => ({
        type: change.type,
        appointment: mapAppointment(change.doc.id, change.doc.data()),
      }));
      callback({
        ok: true,
        appointments,
        changes,
        fromCache: snap.metadata.fromCache,
      });
    },
    (err) => {
      callback({
        ok: false,
        appointments: [],
        changes: [],
        message: String(err?.message || err),
      });
    }
  );
}

export async function reserveAppointment(payload) {
  const {
    date,
    start,
    end,
    contact,
    name,
    district = "",
    service,
    serviceTitle,
    source = "online",
    purpose = "",
    notes = "",
    tags = [],
    createdBy = "",
    ownerId,
  } = payload;

  const oid = ownerId || getEffectiveOwnerId();
  if (!oid) return { ok: false, message: "缺少 ownerId，請使用正確的預約連結。" };

  const dateStr = String(date || "").trim();
  const startStr = String(start || "").trim();
  const endStr = String(end || "").trim();
  const contactStr = String(contact || "").trim();
  const nameStr = String(name || "").trim();
  const districtStr = String(district || "").trim();

  if (!dateStr || !startStr || !endStr || !contactStr || !nameStr || !districtStr) {
    return { ok: false, message: "缺少必要欄位。" };
  }
  if (!DISTRICT_SET.has(districtStr)) {
    return { ok: false, message: "地區只可選擇指定 district。" };
  }

  try {
    if (await checkSlotConflict_(oid, dateStr, startStr, endStr)) {
      return { ok: false, message: "此時段已被預約。" };
    }

    const blocked = await getBlockedContacts(oid);
    if (blocked.blocked.some((b) => !b.removed && b.contact === contactStr)) {
      return { ok: false, message: "此聯絡方式已被限制預約。" };
    }

    const code = await generateUniqueCode_();
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db_, COLLECTION), {
      code,
      ownerId: oid,
      date: dateStr,
      start: startStr,
      end: endStr,
      contact: contactStr,
      name: nameStr,
      district: districtStr,
      service: String(service || "").trim(),
      serviceTitle: String(serviceTitle || "").trim(),
      status: DEFAULT_RESERVE_STATUS,
      slotKey: slotKey_(oid, dateStr, startStr, endStr),
      source,
      purpose: String(purpose || "").trim(),
      notes: String(notes || "").trim(),
      tags: Array.isArray(tags) ? tags : [],
      cancelled: false,
      createdAt: now,
      updatedAt: now,
      createdBy,
    });

    return { ok: true, id: docRef.id, code };
  } catch (err) {
    return { ok: false, message: String(err?.message || err) };
  }
}

export async function updateAppointment(id, fields) {
  if (!db_) return { ok: false, message: "Firebase 未初始化" };
  const docId = String(id || "").trim();
  if (!docId) return { ok: false, message: "缺少 id" };

  try {
    const existing = await getDoc(doc(db_, COLLECTION, docId));
    if (!existing.exists()) return { ok: false, message: "找不到預約" };
    const ownerId = existing.data().ownerId;

    const updates = { ...fields, updatedAt: new Date().toISOString() };
    if (fields.date && fields.start && fields.end) {
      updates.slotKey = slotKey_(ownerId, fields.date, fields.start, fields.end);
      if (await checkSlotConflict_(ownerId, fields.date, fields.start, fields.end, docId)) {
        return { ok: false, message: "新時段已被佔用" };
      }
    }
    await updateDoc(doc(db_, COLLECTION, docId), updates);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: String(err?.message || err) };
  }
}

export async function updateAppointmentStatus(id, status) {
  return updateAppointment(id, { status: String(status).trim() });
}

export async function cancelAppointment(id, reason) {
  return updateAppointment(id, {
    cancelled: true,
    status: CANCELLED_STATUS,
    cancelReason: String(reason || "").trim(),
  });
}

export async function duplicateAppointment(id) {
  const snap = await getDoc(doc(db_, COLLECTION, id));
  if (!snap.exists()) return { ok: false, message: "找不到預約" };
  const d = snap.data();
  return reserveAppointment({
    ownerId: d.ownerId,
    date: d.date,
    start: d.start,
    end: d.end,
    contact: d.contact,
    name: d.name,
    district: d.district,
    service: d.service,
    serviceTitle: d.serviceTitle,
    source: "duplicate",
    notes: `複製自 ${d.code}`,
    tags: d.tags || [],
    createdBy: getCurrentUserEmail(),
  });
}

export function aggregateClients(appointments) {
  const map = new Map();
  for (const a of appointments) {
    const key = String(a.contact || "").trim().toLowerCase();
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, {
        contact: a.contact,
        name: a.name,
        appointments: [],
        sources: new Set(),
        tags: new Set(),
      });
    }
    const c = map.get(key);
    c.appointments.push(a);
    if (a.source) c.sources.add(a.source);
    (a.tags || []).forEach((t) => c.tags.add(t));
    if (a.name) c.name = a.name;
  }
  return [...map.values()].map((c) => ({
    ...c,
    sources: [...c.sources],
    tags: [...c.tags],
    count: c.appointments.length,
    lastDate: c.appointments.sort((x, y) => `${y.date}`.localeCompare(`${x.date}`))[0]?.date,
  }));
}

export function exportAppointmentsCsv(appointments) {
  const headers = ["code", "date", "start", "end", "name", "contact", "district", "serviceTitle", "status", "source", "ownerId", "notes", "tags"];
  const rows = appointments.map((a) =>
    headers.map((h) => {
      const v = h === "tags" ? (a.tags || []).join(";") : a[h] || "";
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

export function computeDashboardStats(appointments) {
  const today = toYMD(new Date());
  const active = appointments.filter((a) => !a.cancelled && a.status !== CANCELLED_STATUS);
  const byStatus = {};
  const byService = {};
  const byHour = {};
  active.forEach((a) => {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    const svc = a.serviceTitle || "其他";
    byService[svc] = (byService[svc] || 0) + 1;
    const h = (a.start || "").slice(0, 2);
    if (h) byHour[h] = (byHour[h] || 0) + 1;
  });
  return {
    total: active.length,
    today: active.filter((a) => a.date === today).length,
    cancelled: appointments.filter((a) => a.cancelled).length,
    signed: byStatus["Signed"] || 0,
    byStatus,
    byService,
    byHour,
    conversion: active.length ? Math.round(((byStatus["Signed"] || 0) / active.length) * 100) : 0,
  };
}

export function getCachedUserProfile() {
  return userProfileCache_;
}
