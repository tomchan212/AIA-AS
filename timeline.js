import {
  safeStatus,
  escapeHtml,
  timeToMinutes,
  parseYMDParts,
  timesOverlap,
  bookingRangeFromStart,
} from "./shared.js";

export const TIMELINE_SLOT_HEIGHT = 48;

/** Consecutive slots overlapping [rangeStart, rangeEnd). Stops at lunch gaps. */
export function countSpanSlots(slots, startIndex, rangeStart, rangeEnd) {
  let span = 1;
  while (startIndex + span < slots.length) {
    const prev = slots[startIndex + span - 1];
    const next = slots[startIndex + span];
    if (next.start !== prev.end) break;
    if (!timesOverlap(next.start, next.end, rangeStart, rangeEnd)) break;
    span += 1;
  }
  return span;
}

function findApptForSlot_(slot, dateStr, byKey, dayAppts) {
  const key = `${dateStr} ${slot.start} ${slot.end}`;
  let appt = byKey.get(key);
  if (appt && safeStatus(appt.status)) return appt;
  return (
    dayAppts.find(
      (a) => timeToMinutes(a.start) < timeToMinutes(slot.end) && timeToMinutes(a.end) > timeToMinutes(slot.start)
    ) || null
  );
}

/** 渲染 Google Calendar 式時間軸 */
export function renderTimeline({
  container,
  slots,
  dateStr,
  byKey,
  byDate,
  mode = "user",
  onAvailableClick,
  onBusyClick,
  selectedSlot,
  durationMinutes,
}) {
  container.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "timeline-scroll";

  const grid = document.createElement("div");
  grid.className = "timeline-grid";

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const nowMinutes =
    dateStr === todayStr ? now.getHours() * 60 + now.getMinutes() : null;

  const dayAppts = (byDate?.get(dateStr) || []).filter((a) => safeStatus(a.status));

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const appt = findApptForSlot_(slot, dateStr, byKey, dayAppts);
    const taken = !!(appt && safeStatus(appt.status));
    const isPast =
      dateStr < todayStr ||
      (dateStr === todayStr && nowMinutes !== null && timeToMinutes(slot.end) <= nowMinutes);

    const selectedHere =
      selectedSlot && timesOverlap(slot.start, slot.end, selectedSlot.start, selectedSlot.end);
    const prev = i > 0 ? slots[i - 1] : null;
    const selectedStartsHere =
      selectedHere &&
      (!prev || !timesOverlap(prev.start, prev.end, selectedSlot.start, selectedSlot.end));

    let spanSlots = 1;
    let rangeStart = slot.start;
    let rangeEnd = slot.end;
    if (taken) {
      rangeStart = appt.start || slot.start;
      rangeEnd = appt.end || slot.end;
      spanSlots = countSpanSlots(slots, i, rangeStart, rangeEnd);
    } else if (selectedStartsHere) {
      rangeStart = selectedSlot.start;
      rangeEnd = selectedSlot.end;
      spanSlots = countSpanSlots(slots, i, rangeStart, rangeEnd);
    }

    const rowHeight = spanSlots * TIMELINE_SLOT_HEIGHT;
    const row = document.createElement("div");
    row.className = "timeline-row";
    row.style.height = `${rowHeight}px`;
    row.style.minHeight = `${rowHeight}px`;
    if (spanSlots > 1) row.classList.add("timeline-row--span");

    const timeEl = document.createElement("div");
    timeEl.className = "timeline-time";
    if (spanSlots > 1) {
      timeEl.classList.add("timeline-time--range");
      timeEl.innerHTML = `${escapeHtml(rangeStart)}<span>${escapeHtml(rangeEnd)}</span>`;
    } else {
      timeEl.textContent = slot.start;
    }

    const block = document.createElement("button");
    block.type = "button";
    block.className = "timeline-block";
    block.setAttribute("data-start", rangeStart);
    block.setAttribute("data-end", rangeEnd);

    if (taken) {
      block.classList.add("timeline-block--busy");
      if (mode === "admin") {
        const statusText = escapeHtml(appt.status || "已預約");
        const svcText = escapeHtml(appt.serviceTitle || appt.service || "預約");
        const districtText = escapeHtml(appt.district || "未填地區");
        block.innerHTML = `
          <span class="tl-block-label tl-block-label--status">${statusText}</span>
          <span class="tl-block-title">${escapeHtml(appt.name || "已預約")}</span>
          <span class="tl-block-meta">${escapeHtml(rangeStart)}–${escapeHtml(rangeEnd)} · ${svcText} · 📍 ${districtText}</span>`;
        block.addEventListener("click", () => onBusyClick?.(appt, slot));
      } else {
        block.disabled = true;
        block.classList.add("timeline-block--busy-public");
        block.innerHTML = `
          <span class="tl-block-label">已預約</span>
          <span class="tl-block-sub">${escapeHtml(rangeStart)} – ${escapeHtml(rangeEnd)}</span>`;
      }
    } else if (mode === "admin") {
      block.classList.add("timeline-block--empty");
      if (selectedHere) block.classList.add("timeline-block--selected");
      block.setAttribute("aria-label", `新增預約 ${slot.start} 至 ${slot.end}`);
      block.addEventListener("click", () => onAvailableClick?.(slot));
    } else if (isPast) {
      block.classList.add("timeline-block--past");
      block.disabled = true;
      block.innerHTML = `<span class="tl-block-label">已過期</span>`;
    } else {
      const busyRanges = dayAppts.map((a) => ({ start: a.start, end: a.end }));
      const preview = durationMinutes
        ? bookingRangeFromStart(slots, slot.start, durationMinutes, busyRanges)
        : { start: slot.start, end: slot.end };
      if (!preview) {
        block.classList.add("timeline-block--past");
        block.disabled = true;
        block.innerHTML = `<span class="tl-block-label">時段不足</span>`;
      } else {
        block.classList.add("timeline-block--available");
        if (selectedStartsHere) block.classList.add("timeline-block--selected");
        const endLabel = selectedStartsHere ? rangeEnd : preview.end;
        block.setAttribute("data-end", endLabel);
        block.innerHTML = `
        <span class="tl-block-label">可預約</span>
        <span class="tl-block-sub">${slot.start} – ${endLabel}</span>
        <span class="tl-block-deal">${durationMinutes ? `${durationMinutes} 分鐘` : "Available"}</span>`;
        block.addEventListener("click", () => onAvailableClick?.(slot));
      }
    }

    row.appendChild(timeEl);
    row.appendChild(block);
    grid.appendChild(row);
    i += spanSlots - 1;
  }

  wrap.appendChild(grid);
  container.appendChild(wrap);
}

export function formatDateChip(dateStr, weekdays) {
  const p = parseYMDParts(dateStr);
  if (!p) {
    return { weekday: "", day: "", month: "", label: dateStr || "" };
  }
  const dt = new Date(p.y, p.mo - 1, p.d, 12, 0, 0);
  const weekday = Number.isNaN(dt.getTime()) ? "" : `週${weekdays[dt.getDay()]}`;
  return {
    weekday,
    day: p.d,
    month: `${p.mo}月`,
    label: `${p.mo}月${p.d}日 ${weekday}`.trim(),
  };
}
