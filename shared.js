export const DAY_OPEN_TIME = "09:00";
export const DAY_CLOSE_TIME = "18:00";
export const SLOT_INTERVAL_MINUTES = 15;

export const STATUS_OPTIONS = [
  "First meet",
  "Second meet",
  "meet++",
  "Signed",
  "Follow up",
];

export const DISTRICT_OPTIONS = [
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
];

export const SERVICES = [
  {
    id: "policy-check",
    title: "免費保單健康檢查",
    desc: "15 分鐘快速檢視保障缺口",
    badge: "最熱門",
    badgeType: "hot",
    duration: "15 分鐘",
    format: "Zoom / 線下",
    audience: "已有保單人士",
    emoji: "📋",
  },
  {
    id: "retirement-gap",
    title: "退休缺口快速評估",
    desc: "量化退休所需資金與缺口",
    badge: "只需 15 分鐘",
    badgeType: "time",
    duration: "15 分鐘",
    format: "Zoom / 咖啡店",
    audience: "30–55 歲在職人士",
    emoji: "📊",
  },
  {
    id: "retirement-plan",
    title: "1對1 退休財務規劃",
    desc: "專屬 Agent 深度諮詢",
    badge: "限時免費",
    badgeType: "deal",
    duration: "15 分鐘",
    format: "Zoom / 線下",
    audience: "計劃退休人士",
    emoji: "🎯",
  },
  {
    id: "savings",
    title: "儲蓄與理財諮詢",
    desc: "度身訂造儲蓄方案",
    badge: "新品項",
    badgeType: "new",
    duration: "15 分鐘",
    format: "Zoom / 線下",
    audience: "想開始儲蓄的你",
    emoji: "💰",
  },
];

export function getServiceById(id) {
  return SERVICES.find((s) => s.id === id) || null;
}

/** 見面目的決定預約時長；時段要等揀咗目的先選。 */
export const PURPOSE_OPTIONS = [
  {
    id: "fact-finding",
    value: "首次見面 / Fact-Finding",
    title: "首次見面 / Fact-Finding",
    hint: "了解現況同保障缺口",
    durations: [45, 60],
  },
  {
    id: "presentation",
    value: "簡報方案 / 建議書 presentation",
    title: "簡報方案 / 建議書",
    hint: "講解方案同建議書",
    durations: [60, 90],
  },
  {
    id: "closing",
    value: "簽單 / 落單（Closing）",
    title: "簽單 / 落單（Closing）",
    hint: "確認內容同完成簽署",
    durations: [30, 45],
  },
  {
    id: "annual-review",
    value: "保單售後 / 年檢（Annual Review）",
    title: "保單售後 / 年檢",
    hint: "年度檢視同調整保障",
    durations: [30, 45, 60],
  },
];

export function getPurposeById(id) {
  return PURPOSE_OPTIONS.find((p) => p.id === id) || null;
}

export function buildSlots(openTime, closeTime, intervalMinutes) {
  const startMin = timeToMinutes(openTime);
  const endMin = timeToMinutes(closeTime);
  const slots = [];
  for (let cur = startMin; cur + intervalMinutes <= endMin; cur += intervalMinutes) {
    slots.push({ start: minutesToTime(cur), end: minutesToTime(cur + intervalMinutes) });
  }
  return slots;
}

/** 依排程設定產生時段（排除午餐） */
export function buildSlotsFromSchedule(schedule) {
  const s = schedule || {};
  const slots = buildSlots(
    s.openTime || DAY_OPEN_TIME,
    s.closeTime || DAY_CLOSE_TIME,
    s.interval || SLOT_INTERVAL_MINUTES
  );
  if (!s.lunchStart || !s.lunchEnd) return slots;
  const lunchStart = timeToMinutes(s.lunchStart);
  const lunchEnd = timeToMinutes(s.lunchEnd);
  return slots.filter((slot) => {
    const start = timeToMinutes(slot.start);
    return !(start >= lunchStart && start < lunchEnd);
  });
}

export function isDateBlocked(dateStr, schedule) {
  const s = schedule || {};
  const blocked = [...(s.blockedDates || []), ...(s.holidays || [])];
  return blocked.includes(dateStr);
}

export function timeToMinutes(hhmm) {
  const [hh, mm] = String(hhmm).split(":").map((x) => Number(x));
  return hh * 60 + mm;
}

export function minutesToTime(mins) {
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** True if [startA, endA) overlaps [startB, endB). Equal endpoints do not overlap. */
export function timesOverlap(startA, endA, startB, endB) {
  return timeToMinutes(startA) < timeToMinutes(endB) && timeToMinutes(endA) > timeToMinutes(startB);
}

export function parseDurationMinutes(text, fallback = SLOT_INTERVAL_MINUTES) {
  const n = Number(String(text || "").match(/(\d+)/)?.[1]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function addMinutesToTime(hhmm, minutes) {
  return minutesToTime(timeToMinutes(hhmm) + Number(minutes || 0));
}

/**
 * Booking range from a clicked slot start covering durationMinutes.
 * Returns null if it would cross a gap (e.g. lunch) or overlap busyRanges.
 */
export function bookingRangeFromStart(slots, start, durationMinutes, busyRanges = []) {
  const dur = Math.max(SLOT_INTERVAL_MINUTES, Number(durationMinutes) || SLOT_INTERVAL_MINUTES);
  const rangeStart = timeToMinutes(start);
  const rangeEnd = rangeStart + dur;
  const end = minutesToTime(rangeEnd);
  const needed = (slots || []).filter((s) => timesOverlap(s.start, s.end, start, end));
  if (!needed.length || needed[0].start !== start) return null;
  if (timeToMinutes(needed[needed.length - 1].end) < rangeEnd) return null;
  for (let i = 1; i < needed.length; i++) {
    if (needed[i].start !== needed[i - 1].end) return null;
  }
  for (const busy of busyRanges) {
    if (!busy) continue;
    if (timesOverlap(start, end, busy.start, busy.end)) return null;
  }
  return { start, end };
}

export function toYMD(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Split YYYY-MM-DD without timezone conversion. */
export function parseYMDParts(dateStr) {
  const m = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
}

/** Local Date from YYYY-MM-DD and optional HH:mm. Never parse ISO (avoids UTC +1 day). */
export function localDateTime(dateStr, timeStr = "12:00") {
  const p = parseYMDParts(dateStr);
  if (!p) return null;
  const [hh, mm] = String(timeStr || "12:00").split(":");
  const dt = new Date(p.y, p.mo - 1, p.d, Number(hh) || 0, Number(mm) || 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function safeStatus(status) {
  if (status === null || status === undefined) return false;
  return String(status).trim().length > 0;
}

export function indexAppointments(appointments) {
  const byKey = new Map();
  const byDate = new Map();
  for (const appt of appointments) {
    const key = `${appt.date} ${appt.start} ${appt.end}`;
    byKey.set(key, appt);
    if (!byDate.has(appt.date)) byDate.set(appt.date, []);
    byDate.get(appt.date).push(appt);
  }
  return { byKey, byDate };
}

export function buildGoogleCalendarUrl({ title, date, start, end, code }) {
  const startIso = `${date.replace(/-/g, "")}T${start.replace(":", "")}00`;
  const endIso = `${date.replace(/-/g, "")}T${end.replace(":", "")}00`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startIso}/${endIso}`,
    ctz: "Asia/Hong_Kong",
    details: `預約代碼：${code}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildWhatsAppUrl({ name, date, start, code, serviceTitle, agentWhatsApp = "" }) {
  const text = `你好，我已預約「${serviceTitle}」。\n姓名：${name}\n日期：${date} ${start}\n代碼：${code}`;
  const raw = String(agentWhatsApp || "").trim();
  const phone = raw.replace(/[^\d]/g, "");
  const target = phone ? `/${phone}` : "";
  return `https://wa.me${target}?text=${encodeURIComponent(text)}`;
}
