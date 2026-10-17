import {
  calledNumbers,
  classifyNumber,
  emptyBook,
  generateCallList,
  hongKongStamp,
  markdownPages,
  matchesLeadQuery,
  pageOf,
  RETRY_MARKDOWN_COLUMNS,
  retryReasonLabel,
  parseStatusCommand,
  replaceQueue,
  saveRecord,
  deleteRecord,
  updateLeadStatus,
} from "./list.js";

const STORAGE_KEY = "aia-cold-call-book";
const message = document.getElementById("command-msg");
let book = loadBook();
let recordPage = 1;
let retryPage = 1;
let deadPage = 1;
let searchQuery = "";

function loadBook() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "");
    if (saved && Array.isArray(saved.talked)) return { ...emptyBook(), ...saved, queue: [] };
  } catch {
    /* keep a fresh book */
  }
  return emptyBook();
}

function saveBook() {
  const saved = { ...book, queue: [] };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function selectedHeads() {
  return [...document.querySelectorAll(".prefix-btn[aria-pressed='true']")].map((button) => button.dataset.head);
}

function rowActions(number) {
  const safe = escapeHtml(number);
  return `
    <div class="row-actions">
      <button type="button" class="text-btn" data-edit="${safe}">修改</button>
      <button type="button" class="text-btn is-delete" data-delete="${safe}">刪除</button>
    </div>`;
}

function outcomeButtons(number) {
  return `
    <div class="outcome-row">
      <button type="button" class="outcome-btn is-miss" data-outcome="no_answer" data-number="${escapeHtml(number)}">打左唔通</button>
      <button type="button" class="outcome-btn is-busy" data-outcome="busy" data-number="${escapeHtml(number)}">通左但忙緊</button>
      <button type="button" class="outcome-btn is-dead" data-outcome="unregistered" data-number="${escapeHtml(number)}">無用戶登記</button>
      <button type="button" class="outcome-btn is-talked" data-outcome="talked" data-number="${escapeHtml(number)}">已傾過</button>
    </div>`;
}

function pagerHtml(id, page, pageCount) {
  return `
    <div class="page-row">
      <button type="button" id="${id}-prev" ${page <= 1 ? "disabled" : ""}>上一頁</button>
      <span>第 ${page} 頁，共 ${pageCount} 頁</span>
      <button type="button" id="${id}-next" ${page >= pageCount ? "disabled" : ""}>下一頁</button>
    </div>`;
}

function leadMatches(parts) {
  return matchesLeadQuery(parts, searchQuery);
}

function renderQueue() {
  const host = document.getElementById("queue-list");
  const queue = book.queue.filter((item) => leadMatches([item.no]));
  host.innerHTML = queue.length
    ? queue.map((item) => {
        const dial = String(item.no).replace(/\s+/g, "");
        return `
    <article class="number-card">
      <a class="dial-link" href="tel:+852${dial}">${escapeHtml(item.no)}</a>
      <button type="button" class="text-btn is-delete" data-delete="${escapeHtml(item.no)}">刪除</button>
      ${outcomeButtons(item.no)}
    </article>`;
      }).join("")
    : `<p class="leads-hint">${searchQuery && book.queue.length ? "搵唔到符合的待電。" : "未有待電號碼。再生成會換一批，未打的不會儲存。"}</p>`;
}

function renderRecordPages(host, markdownHost, pages, page, setPage, pagerId, emptyText, rowHtml) {
  if (page > pages.length) page = pages.length;
  if (page < 1) page = 1;
  setPage(page);
  const current = pages[page - 1];
  markdownHost.textContent = current.markdown;
  const pager = pagerHtml(pagerId, current.page, current.pageCount);
  host.innerHTML = current.rows.length ? pager + current.rows.map(rowHtml).join("") : `<p class="leads-hint">${emptyText}</p>${pager}`;
  host.querySelector(`#${pagerId}-prev`)?.addEventListener("click", () => {
    setPage(current.page - 1);
    render();
  });
  host.querySelector(`#${pagerId}-next`)?.addEventListener("click", () => {
    setPage(current.page + 1);
    render();
  });
}

function renderRetry() {
  renderRecordPages(
    document.getElementById("retry-list"),
    document.getElementById("retry-markdown"),
    markdownPages(book.retry.filter((item) => leadMatches([item.no, item.remarks, retryReasonLabel(item.reason)])), undefined, RETRY_MARKDOWN_COLUMNS),
    retryPage,
    (page) => {
      retryPage = page;
    },
    "retry",
    searchQuery && book.retry.length ? "搵唔到符合的再打記錄。" : "未有需要再打的號碼。",
    (row) => {
      const stamp = hongKongStamp(row.at);
      const dial = String(row.no).replace(/\s+/g, "");
      const note = row.remarks || "未填 remarks";
      return `
    <article class="record-row">
      <div>
        <a class="dial-link dial-link--small" href="tel:+852${escapeHtml(dial)}">${escapeHtml(row.no)}</a>
        <p class="record-line">${escapeHtml(retryReasonLabel(row.reason))}</p>
        <p class="stamp">${stamp.date} ${stamp.time} · ${escapeHtml(note)}</p>
      </div>
      <div class="row-actions">${rowActions(row.no)}</div>
    </article>`;
    }
  );
}

function renderTalked() {
  renderRecordPages(
    document.getElementById("talked-table"),
    document.getElementById("lead-markdown"),
    markdownPages(book.talked.filter((item) => leadMatches([item["no."], item.Name, item.remarks]))),
    recordPage,
    (page) => {
      recordPage = page;
    },
    "record",
    searchQuery && book.talked.length ? "搵唔到符合的通話記錄。" : "撳「已傾過」之後先會出現，姓名同 remarks 留空等你填。",
    (row) => {
      const stamp = hongKongStamp(row.at);
      const dial = String(row["no."]).replace(/\s+/g, "");
      const name = row.Name || "未填姓名";
      const note = row.remarks || "未填 remarks";
      return `
    <article class="record-row">
      <div>
        <a class="dial-link dial-link--small" href="tel:+852${escapeHtml(dial)}">${escapeHtml(row["no."])}</a>
        <p class="record-line">${escapeHtml(name)} · ${escapeHtml(row["status(accept/not)"])}</p>
        <p class="stamp">${stamp.date} ${stamp.time} · ${escapeHtml(note)}</p>
      </div>
      <div class="row-actions">${rowActions(row["no."])}</div>
    </article>`;
    }
  );
}

function render() {
  const queue = book.queue.filter((item) => leadMatches([item.no]));
  const retry = book.retry.filter((item) => leadMatches([item.no, item.remarks, retryReasonLabel(item.reason)]));
  const talked = book.talked.filter((item) => leadMatches([item["no."], item.Name, item.remarks]));
  const deadItems = book.unregistered.filter((item) => leadMatches([item.no, item.remarks]));
  document.getElementById("queue-count").textContent = String(queue.length);
  document.getElementById("retry-count").textContent = String(retry.length);
  document.getElementById("talked-count").textContent = String(talked.length);
  document.getElementById("dead-count").textContent = String(deadItems.length);
  const status = document.getElementById("search-status");
  const clear = document.getElementById("search-clear");
  if (searchQuery) {
    const found = queue.length + retry.length + talked.length + deadItems.length;
    status.hidden = false;
    status.textContent = found ? `搵到 ${found} 項。` : "搵唔到符合的電話或 remarks。";
    clear.hidden = false;
  } else {
    status.hidden = true;
    status.textContent = "";
    clear.hidden = true;
  }
  renderQueue();
  renderRetry();
  renderTalked();
  const dead = document.getElementById("unregistered-list");
  const deadPageData = pageOf(deadItems, deadPage);
  deadPage = deadPageData.page;
  const deadCards = deadPageData.items.length
    ? deadPageData.items
        .map((item) => `<article class="record-row"><div><a class="dial-link" href="tel:+852${escapeHtml(String(item.no).replace(/\s+/g, ""))}">${escapeHtml(item.no)}</a><p class="stamp">${hongKongStamp(item.at).date} ${hongKongStamp(item.at).time}${item.remarks ? ` · ${escapeHtml(item.remarks)}` : ""}</p></div>${rowActions(item.no)}</article>`)
        .join("")
    : `<p class="leads-hint">${searchQuery && book.unregistered.length ? "搵唔到符合的無效號碼。" : "未有無用戶登記的號碼。"}</p>`;
  dead.innerHTML = pagerHtml("dead", deadPageData.page, deadPageData.pageCount) + deadCards;
  dead.querySelector("#dead-prev")?.addEventListener("click", () => {
    deadPage -= 1;
    render();
  });
  dead.querySelector("#dead-next")?.addEventListener("click", () => {
    deadPage += 1;
    render();
  });
  document.querySelectorAll("[data-outcome]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.outcome === "talked") {
        openEditor({ number: button.dataset.number, outcome: "talked", isNew: true });
        return;
      }
      const result = classifyNumber(book, button.dataset.number, button.dataset.outcome);
      if (!result.ok) {
        message.textContent = result.message;
        return;
      }
      book = result.book;
      saveBook();
      message.textContent = "已分類。";
      render();
    });
  });
  document.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openEditor(existingRecord(button.dataset.edit)));
  });
  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => openDeleteConfirm(button.dataset.delete));
  });
}

function openDeleteConfirm(number) {
  document.getElementById("delete-number").textContent = number;
  document.getElementById("delete-number").dataset.number = number;
  document.getElementById("delete-sheet").hidden = false;
  document.getElementById("delete-confirm").focus();
}

function closeDeleteConfirm() {
  document.getElementById("delete-sheet").hidden = true;
}

document.getElementById("delete-cancel").addEventListener("click", closeDeleteConfirm);
document.getElementById("delete-sheet").addEventListener("click", (event) => {
  if (event.target.id === "delete-sheet") closeDeleteConfirm();
});
document.getElementById("delete-confirm").addEventListener("click", () => {
  const result = deleteRecord(book, document.getElementById("delete-number").dataset.number);
  if (!result.ok) {
    message.textContent = result.message;
    closeDeleteConfirm();
    return;
  }
  book = result.book;
  saveBook();
  closeDeleteConfirm();
  message.textContent = "已刪除。";
  render();
});

function digits(value) {
  return String(value || "").replace(/\s+/g, "");
}

function existingRecord(number) {
  const needle = digits(number);
  const retry = book.retry.find((item) => digits(item.no) === needle);
  if (retry) return { number: retry.no, outcome: retry.reason, remarks: retry.remarks || "", at: retry.at };
  const dead = book.unregistered.find((item) => digits(item.no) === needle);
  if (dead) return { number: dead.no, outcome: "unregistered", remarks: dead.remarks || "", at: dead.at };
  const talked = book.talked.find((item) => digits(item["no."]) === needle);
  if (talked) {
    return {
      number: talked["no."],
      outcome: "talked",
      name: talked.Name,
      status: talked["status(accept/not)"],
      remarks: talked.remarks,
      at: talked.at,
    };
  }
  return { number, outcome: "talked", isNew: true };
}

function syncTalkedFields() {
  document.getElementById("edit-talked-fields").hidden = document.getElementById("edit-outcome").value !== "talked";
}

function openEditor(record) {
  document.getElementById("edit-number").textContent = record.number;
  document.getElementById("edit-number").dataset.number = record.number;
  document.getElementById("edit-number").dataset.at = record.isNew ? "" : record.at || "";
  document.getElementById("edit-outcome").value = record.outcome || "talked";
  document.getElementById("edit-name").value = record.name || "";
  document.getElementById("edit-status").value = record.status || "Pending";
  document.getElementById("edit-remarks").value = record.remarks || "";
  document.getElementById("edit-title").textContent = record.isNew ? "記錄這通電話" : "修改記錄";
  syncTalkedFields();
  document.getElementById("edit-sheet").hidden = false;
  document.getElementById("edit-name").focus();
}

function closeEditor() {
  document.getElementById("edit-sheet").hidden = true;
}

document.getElementById("edit-outcome").addEventListener("change", syncTalkedFields);
document.getElementById("edit-cancel").addEventListener("click", closeEditor);
document.getElementById("edit-sheet").addEventListener("click", (event) => {
  if (event.target.id === "edit-sheet") closeEditor();
});
document.getElementById("edit-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const number = document.getElementById("edit-number").dataset.number;
  const at = document.getElementById("edit-number").dataset.at;
  const result = saveRecord(book, {
    number,
    outcome: document.getElementById("edit-outcome").value,
    name: document.getElementById("edit-name").value.trim(),
    status: document.getElementById("edit-status").value,
    remarks: document.getElementById("edit-remarks").value.trim(),
    at: at || undefined,
  });
  if (!result.ok) {
    message.textContent = result.message;
    return;
  }
  book = result.book;
  saveBook();
  closeEditor();
  message.textContent = "已儲存。";
  render();
});

document.getElementById("lead-search").addEventListener("input", (event) => {
  searchQuery = event.target.value;
  retryPage = 1;
  recordPage = 1;
  deadPage = 1;
  render();
});
document.getElementById("search-form").addEventListener("submit", (event) => {
  event.preventDefault();
});
document.getElementById("search-clear").addEventListener("click", () => {
  searchQuery = "";
  document.getElementById("lead-search").value = "";
  retryPage = 1;
  recordPage = 1;
  deadPage = 1;
  render();
  document.getElementById("lead-search").focus();
});

document.getElementById("prefix-row").addEventListener("click", (event) => {
  const button = event.target.closest(".prefix-btn");
  if (!button) return;
  const pressed = button.getAttribute("aria-pressed") === "true";
  button.setAttribute("aria-pressed", pressed ? "false" : "true");
});

document.getElementById("generate-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const created = generateCallList({
    heads: selectedHeads(),
    prefix: document.getElementById("prefix-input").value,
    count: document.getElementById("lead-count").value,
    known: calledNumbers(book),
  });
  if (!created.ok) {
    message.textContent = created.message;
    return;
  }
  book = replaceQueue(book, created.numbers);
  saveBook();
  message.textContent = `已換上 ${created.numbers.length} 個新號碼。未打過的不會儲存。`;
  render();
});

document.getElementById("command-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const command = parseStatusCommand(document.getElementById("command-input").value);
  if (!command) {
    message.textContent = "請用：將張偉成的 status 改為 accept";
    return;
  }
  const result = updateLeadStatus(book.talked, command.target, command.status);
  message.textContent = result.ok ? "已更新完整表格。" : result.message;
  if (result.ok) {
    book.talked = result.rows;
    saveBook();
  }
  render();
});

render();
