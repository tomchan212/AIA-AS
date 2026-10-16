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
      const index = book.talked.indexOf(row);
      const stamp = hongKongStamp(row.at);
      return `
    <article class="talked-card">
      <p class="stamp">${stamp.date} ${stamp.time}</p>
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
        .map((item) => `<p class="dead-number">${escapeHtml(item.no)}<span>${hongKongStamp(item.at).date} ${hongKongStamp(item.at).time}</span></p>`)
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
