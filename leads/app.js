import {
  addToQueue,
  classifyNumber,
  emptyBook,
  generateCallList,
  knownNumbers,
  parseStatusCommand,
  toMarkdownTable,
  updateLeadStatus,
} from "./list.js";

const STORAGE_KEY = "aia-cold-call-book";
const message = document.getElementById("command-msg");
let book = loadBook();

function loadBook() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "");
    if (saved && Array.isArray(saved.queue) && Array.isArray(saved.talked)) return { ...emptyBook(), ...saved };
  } catch {
    /* keep a fresh book */
  }
  return emptyBook();
}

function saveBook() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(book));
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

function renderNumberList(host, items, emptyText, withReason) {
  if (!items.length) {
    host.innerHTML = `<p class="leads-hint">${emptyText}</p>`;
    return;
  }
  host.innerHTML = items.map((item) => {
    const dial = String(item.no).replace(/\s+/g, "");
    return `
    <article class="number-card">
      <a class="dial-link" href="tel:+852${dial}">${escapeHtml(item.no)}</a>
      ${withReason ? `<span class="reason-pill">${reasonLabel(item.reason)}</span>` : ""}
      ${outcomeButtons(item.no)}
    </article>`;
  }).join("");
}

function renderTalked() {
  const host = document.getElementById("talked-table");
  const markdown = document.getElementById("lead-markdown");
  markdown.textContent = book.talked.length ? toMarkdownTable(book.talked) : "未有傾過的記錄。";
  if (!book.talked.length) {
    host.innerHTML = `<p class="leads-hint">撳「已傾過」之後先會出現，姓名同 remarks 留空等你填。</p>`;
    return;
  }
  const body = book.talked.map((row, index) => `
    <article class="talked-card">
      <a class="dial-link" href="tel:+852${escapeHtml(String(row["no."]).replace(/\s+/g, ""))}">${escapeHtml(row["no."])}</a>
      <label>Name
        <input data-field="Name" data-index="${index}" value="${escapeHtml(row.Name)}" placeholder="打完先填姓名" autocomplete="name">
      </label>
      <label>status(accept/not)
        <select data-index="${index}">
          ${["Pending", "accept", "not"].map((status) => `<option ${row["status(accept/not)"] === status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
      </label>
      <label>remarks
        <input data-field="remarks" data-index="${index}" value="${escapeHtml(row.remarks)}" placeholder="打完先填 remarks">
      </label>
    </article>`).join("");
  host.innerHTML = body;
  host.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", () => {
      const index = Number(select.dataset.index);
      const result = updateLeadStatus(book.talked, book.talked[index]["no."], select.value);
      if (!result.ok) return;
      book.talked = result.rows;
      saveBook();
      render();
    });
  });
  host.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      const index = Number(input.dataset.index);
      book.talked[index][input.dataset.field] = input.value.trim();
      saveBook();
      render();
    });
  });
}

function render() {
  document.getElementById("queue-count").textContent = String(book.queue.length);
  document.getElementById("retry-count").textContent = String(book.retry.length);
  document.getElementById("talked-count").textContent = String(book.talked.length);
  document.getElementById("dead-count").textContent = String(book.unregistered.length);
  renderNumberList(document.getElementById("queue-list"), book.queue, "未有待電號碼。", false);
  renderNumberList(document.getElementById("retry-list"), book.retry, "未有需要再打的號碼。", true);
  renderTalked();
  const dead = document.getElementById("unregistered-list");
  dead.innerHTML = book.unregistered.length
    ? book.unregistered.map((item) => `<p class="dead-number">${escapeHtml(item.no)}</p>`).join("")
    : `<p class="leads-hint">未有無用戶登記的號碼。</p>`;
  document.querySelectorAll("[data-outcome]").forEach((button) => {
    button.addEventListener("click", () => {
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
}

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
    known: knownNumbers(book),
  });
  if (!created.ok) {
    message.textContent = created.message;
    return;
  }
  book = addToQueue(book, created.numbers);
  saveBook();
  message.textContent = `已加入 ${created.numbers.length} 個未打過的號碼。`;
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
