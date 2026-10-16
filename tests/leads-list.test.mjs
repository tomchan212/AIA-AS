import test from "node:test";
import assert from "node:assert/strict";
import {
  addToQueue,
  classifyNumber,
  emptyBook,
  generateCallList,
  knownNumbers,
  toMarkdownTable,
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

test("no-answer and busy can be redialled, while unregistered numbers stay out", () => {
  let book = addToQueue(emptyBook(), ["9123 4567", "6123 4567"]);
  book = classifyNumber(book, "9123 4567", "no_answer").book;
  book = classifyNumber(book, "6123 4567", "unregistered").book;
  assert.equal(book.queue.length, 0);
  assert.equal(book.retry[0].reason, "no_answer");
  assert.equal(book.unregistered[0].no, "6123 4567");
  const again = generateCallList({
    heads: ["9", "6"],
    count: 5,
    known: knownNumbers(book),
    random: () => 0,
  });
  const generated = (again.numbers || []).map((number) => number.replace(/\s/g, ""));
  assert.equal(generated.includes("91234567"), false);
  assert.equal(generated.includes("61234567"), false);
  book = classifyNumber(book, "9123 4567", "talked").book;
  assert.equal(book.retry.length, 0);
  assert.equal(book.talked[0].Name, "");
  assert.equal(book.talked[0].remarks, "");
  assert.equal(book.talked[0]["status(accept/not)"], "Pending");
  const updated = updateLeadStatus(book.talked, "91234567", "accept");
  assert.equal(updated.rows[0]["status(accept/not)"], "accept");
  assert.match(toMarkdownTable(updated.rows), /\| Name \| no\. \| status\(accept\/not\) \| remarks \|/);
});
