import {
  calledNumbers,
  classifyNumber,
  emptyBook,
  generateCallList,
  hongKongStamp,
  markdownPages,
  pageOf,
  parseStatusCommand,
  replaceQueue,
  saveRecord,
  updateLeadStatus,
} from "./list.js";

const STORAGE_KEY = "aia-cold-call-book";
const message = document.getElementById("command-msg");
let book = loadBook();
let recordPage = 1;
let retryPage = 1;
let deadPage = 1;

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

function reasonLabel(reason) {
  return reason === "busy" ? "通左但忙緊" : "打左唔通";
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

function renderNumberList(host, items, emptyText, withReason, pager) {
  const visible = pager ? pageOf(items, pager.page).items : items;
  const paged = pager ? pageOf(items, pager.page) : null;
  if (pager) pager.setPage(paged.page);
  const cards = visible.length
    ? visible.map((item) => {
        const dial = String(item.no).replace(/\s+/g, "");
        const stamp = item.at ? `${hongKongStamp(item.at).date} ${hongKongStamp(item.at).time}` : "";
        return `
    <article class="number-card">
      <a class="dial-link" href="tel:+852${dial}">${escapeHtml(item.no)}</a>
      ${withReason ? `<span class="reason-pill">${reasonLabel(item.reason)}${stamp ? ` · ${stamp}` : ""}</span>` : ""}
      <button type="button" class="edit-btn" data-edit="${escapeHtml(item.no)}">修改</button>
      ${outcomeButtons(item.no)}
    </article>`;
      }).join("")
    : `<p class="leads-hint">${emptyText}</p>`;
  host.innerHTML = (paged ? pagerHtml(pager.id, paged.page, paged.pageCount) : "") + cards;
  if (!paged) return;
  host.querySelector(`#${pager.id}-prev`)?.addEventListener("click", () => {
    pager.setPage(paged.page - 1);
    render();
  });
  host.querySelector(`#${pager.id}-next`)?.addEventListener("click", () => {
    pager.setPage(paged.page + 1);
    render();
  });
}

function renderTalked() {
  const host = document.getElementById("talked-table");
  const markdown = document.getElementById("lead-markdown");
  const pages = markdownPages(book.talked);
  if (recordPage > pages.length) recordPage = pages.length;
  if (recordPage < 1) recordPage = 1;
  const current = pages[recordPage - 1];
  markdown.textContent = current.markdown;
  const pager = pagerHtml("record", current.page, current.pageCount);
  if (!book.talked.length) {
    host.innerHTML = `<p class="leads-hint">撳「已傾過」之後先會出現，姓名同 remarks 留空等你填。</p>${pager}`;
  } else {
    const body = current.rows.map((row) => {
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
      <button type="button" class="edit-btn" data-edit="${escapeHtml(row["no."])}">修改</button>
    </article>`;
    }).join("");
    host.innerHTML = pager + body;
  }
  host.querySelector("#record-prev")?.addEventListener("click", () => {
    recordPage -= 1;
    render();
  });
  host.querySelector("#record-next")?.addEventListener("click", () => {
    recordPage += 1;
    render();
  });
}

function render() {
  document.getElementById("queue-count").textContent = String(book.queue.length);
  document.getElementById("retry-count").textContent = String(book.retry.length);
  document.getElementById("talked-count").textContent = String(book.talked.length);
  document.getElementById("dead-count").textContent = String(book.unregistered.length);
  renderNumberList(
    document.getElementById("queue-list"),
    book.queue,
    "未有待電號碼。再生成會換一批，未打的不會儲存。",
    false
  );
  renderNumberList(
    document.getElementById("retry-list"),
    book.retry,
    "未有需要再打的號碼。",
    true,
    {
      id: "retry",
      page: retryPage,
      setPage: (page) => {
        retryPage = page;
      },
    }
  );
  renderTalked();
  const dead = document.getElementById("unregistered-list");
  const deadPageData = pageOf(book.unregistered, deadPage);
  deadPage = deadPageData.page;
  const deadCards = deadPageData.items.length
    ? deadPageData.items
        .map((item) => `<p class="dead-number"><span>${escapeHtml(item.no)}</span><span>${hongKongStamp(item.at).date} ${hongKongStamp(item.at).time}</span><button type="button" class="edit-btn" data-edit="${escapeHtml(item.no)}">修改</button></p>`)
        .join("")
    : `<p class="leads-hint">未有無用戶登記的號碼。</p>`;
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
}

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
