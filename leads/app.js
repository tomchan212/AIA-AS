import { blankLead, parseStatusCommand, toMarkdownTable, updateLeadStatus } from "./list.js";

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
  markdownHost.textContent = rows.length ? toMarkdownTable(rows) : "打完電話後，新增該號碼，再自行填姓名同 remarks。";
  if (!rows.length) {
    tableHost.innerHTML = "<p>未有記錄。</p>";
    return;
  }
  const body = rows.map((row, index) => `
    <tr>
      <td><input data-field="Name" data-index="${index}" value="${escapeHtml(row.Name)}" placeholder="打完先填姓名" aria-label="Name"></td>
      <td>${escapeHtml(row["no."])}</td>
      <td>
        <select data-index="${index}" aria-label="status(accept/not)">
          ${["Pending", "accept", "not"].map((status) => `<option ${row["status(accept/not)"] === status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
      </td>
      <td><input data-field="remarks" data-index="${index}" value="${escapeHtml(row.remarks)}" placeholder="打完先填 remarks" aria-label="remarks"></td>
    </tr>`).join("");
  tableHost.innerHTML = `
    <table>
      <thead><tr><th>Name</th><th>no.</th><th>status(accept/not)</th><th>remarks</th></tr></thead>
      <tbody>${body}</tbody>
    </table>`;
  tableHost.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", () => {
      const index = Number(select.dataset.index);
      const result = updateLeadStatus(rows, rows[index]["no."], select.value);
      if (!result.ok) return;
      rows = result.rows;
      render();
    });
  });
  tableHost.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      const index = Number(input.dataset.index);
      rows[index][input.dataset.field] = input.value.trim();
      render();
    });
  });
}

document.getElementById("add-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const result = blankLead(document.getElementById("lead-number").value);
  if (!result.ok) {
    message.textContent = result.message;
    return;
  }
  if (rows.some((row) => row["no."] === result.row["no."])) {
    message.textContent = "這個號碼已經在名單裡。";
    return;
  }
  rows = [...rows, result.row];
  document.getElementById("lead-number").value = "";
  message.textContent = "已新增。姓名同 remarks 留空，打完電話再填。";
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
