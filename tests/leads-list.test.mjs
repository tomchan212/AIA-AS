import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyNumber,
  emptyBook,
  generateCallList,
  filterRetry,
  markdownPages,
  matchesLeadQuery,
  pageOf,
  RETRY_MARKDOWN_COLUMNS,
  replaceQueue,
  saveRecord,
  deleteRecord,
  updateLeadStatus,
} from "../leads/list.js";

test("generated numbers use the selected prefix and skip numbers already kept", () => {
  const known = new Set(["91230000"]);
  let n = 0;
  const random = () => {
    n += 1;
    return (n % 10) / 10;
  };
  const created = generateCallList({ heads: ["9"], prefix: "91", count: 3, known, random });
  assert.equal(created.ok, true);
  assert.equal(created.numbers.length, 3);
  for (const number of created.numbers) {
    const digits = number.replace(/\s/g, "");
    assert.match(digits, /^91\d{6}$/);
    assert.equal(known.has(digits), false);
  }
  assert.equal(generateCallList({ heads: ["2"], count: 1 }).ok, false);
});

test("a new generation replaces uncalled numbers and markdown is paged by Hong Kong time", () => {
  let book = replaceQueue(emptyBook(), ["9123 4567"]);
  book = replaceQueue(book, ["6123 4567"]);
  assert.deepEqual(book.queue.map((item) => item.no), ["6123 4567"]);
  book = classifyNumber(book, "6123 4567", "unregistered", "2026-10-16T01:41:00.000Z").book;
  book = classifyNumber(book, "9123 4567", "talked", "2026-10-16T01:41:00.000Z").book;
  book = replaceQueue(book, ["6123 4567", "5123 4567"]);
  assert.equal(book.queue.some((item) => item.no.includes("6123")), false);
  const pages = markdownPages([
    ...book.talked,
    { Name: "二", "no.": "5123 0002", "status(accept/not)": "Pending", remarks: "", at: "2026-10-16T02:05:00.000Z" },
  ], 1);
  assert.equal(pages.length, 2);
  assert.match(pages[0].markdown, /第 1 頁，共 2 頁/);
  assert.match(pages[0].markdown, /### 2026-10-16/);
  assert.match(pages[0].markdown, /#### 10:05/);
  assert.match(pages[1].markdown, /#### 09:41/);
  const retryPages = markdownPages([
    { no: "9123 4567", reason: "no_answer", remarks: "冇人聽", at: "2026-10-16T01:41:00.000Z" },
    { no: "6123 4567", reason: "busy", remarks: "", at: "2026-10-16T02:05:00.000Z" },
  ], 1, RETRY_MARKDOWN_COLUMNS);
  assert.match(retryPages[0].markdown, /第 1 頁，共 2 頁/);
  assert.match(retryPages[0].markdown, /### 2026-10-16/);
  assert.match(retryPages[0].markdown, /#### 10:05/);
  assert.match(retryPages[0].markdown, /\| no\. \| 結果 \| remarks \|/);
  assert.match(retryPages[0].markdown, /6123 4567 \| 通左但忙緊 \|/);
  assert.match(retryPages[1].markdown, /#### 09:41/);
  assert.match(retryPages[1].markdown, /9123 4567 \| 打左唔通 \| 冇人聽/);
  const paged = pageOf(
    Array.from({ length: 9 }, (_, index) => ({ no: String(index), at: `2026-10-16T0${index}:00:00.000Z` })),
    2
  );
  assert.equal(paged.pageCount, 2);
  assert.equal(paged.items.length, 1);
  const updated = updateLeadStatus(book.talked, "91234567", "accept");
  assert.equal(updated.rows[0]["status(accept/not)"], "accept");
  const edited = saveRecord(book, {
    number: "9123 4567",
    outcome: "talked",
    name: "陳大文",
    status: "not",
    remarks: "聽日再聯絡",
    at: book.talked[0].at,
  });
  assert.equal(edited.book.talked[0].Name, "陳大文");
  assert.equal(edited.book.retry.length, 0);
  const removed = deleteRecord(edited.book, "9123 4567");
  assert.equal(removed.ok, true);
  assert.equal(removed.book.talked.length, 0);
  assert.equal(matchesLeadQuery(["9123 4567", "聽日再聯絡"], "912345"), true);
  assert.equal(matchesLeadQuery(["9123 4567", "聽日再聯絡"], "再聯絡"), true);
  assert.equal(matchesLeadQuery(["5123 8899", ""], "再聯絡"), false);
  assert.equal(matchesLeadQuery(["陳大文", "9123 4567"], ""), true);
  const retryRows = [
    { no: "9123 4567", reason: "no_answer", remarks: "冇人聽" },
    { no: "5123 8899", reason: "busy", remarks: "聽日再打" },
  ];
  assert.deepEqual(filterRetry(retryRows, { reason: "busy" }).map((item) => item.no), ["5123 8899"]);
  assert.deepEqual(filterRetry(retryRows, { reason: "no_answer", query: "8899" }), []);
});
