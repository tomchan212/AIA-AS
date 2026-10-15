import { createLeadList, parseStatusCommand, toMarkdownTable, updateLeadStatus } from "./list.js";

const tableHost = document.getElementById("lead-table");
const markdownHost = document.getElementById("lead-markdown");
const message = document.getElementById("command-msg");
let rows = [];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function render() {
  markdownHost.textContent = rows.length ? toMarkdownTable(rows) : "尚未生成名單。";
  if (!rows.length) {
    tableHost.innerHTML = "<p>尚未生成名單。</p>";
    return;
  }
  const body = rows.map((row, index) => `
    <tr>
      <td>${escapeHtml(row.Name)}</td>
      <td>${escapeHtml(row["no."])}</td>
      <td>
        <select data-index="${index}" aria-label="${escapeHtml(row.Name)} status">
          ${["Pending", "accept", "not"].map((status) => `<option ${row["status(accept/not)"] === status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
      </td>
      <td><input data-remarks="${index}" value="${escapeHtml(row.remarks)}" aria-label="${escapeHtml(row.Name)} remarks"></td>
    </tr>`).join("");
  tableHost.innerHTML = `
    <table>
      <thead><tr><th>Name</th><th>no.</th><th>status(accept/not)</th><th>remarks</th></tr></thead>
      <tbody>${body}</tbody>
    </table>`;
  tableHost.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", () => {
      const result = updateLeadStatus(rows, rows[Number(select.dataset.index)].Name, select.value);
      if (!result.ok) return;
      rows = result.rows;
      render();
    });
  });
  tableHost.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      rows[Number(input.dataset.remarks)].remarks = input.value;
      render();
    });
  });
}

document.getElementById("generate-btn").addEventListener("click", () => {
  rows = createLeadList(document.getElementById("lead-count").value);
  message.textContent = "已生成虛擬名單。";
  render();
});

document.getElementById("command-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const command = parseStatusCommand(document.getElementById("command-input").value);
  if (!command) {
    message.textContent = "請用：將張偉成的 status 改為 accept";
    return;
  }
  const result = updateLeadStatus(rows, command.target, command.status);
  message.textContent = result.ok ? "已更新完整表格。" : result.message;
  if (result.ok) rows = result.rows;
  render();
});

render();
