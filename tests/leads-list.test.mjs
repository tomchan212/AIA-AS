import test from "node:test";
import assert from "node:assert/strict";
import { createLeadList, isHongKongMobile, parseStatusCommand, toMarkdownTable, updateLeadStatus } from "../leads/list.js";

test("generated numbers are 8-digit Hong Kong mobiles and start Pending", () => {
  let n = 0;
  const random = () => {
    n += 1;
    return (n % 97) / 97;
  };
  const rows = createLeadList(8, random);
  assert.equal(rows.length, 8);
  for (const row of rows) {
    assert.equal(isHongKongMobile(row["no."]), true);
    assert.equal(/^2|^3/.test(row["no."].replace(/\s/g, "")), false);
    assert.equal(row["status(accept/not)"], "Pending");
    assert.match(row.Name, /^[\u4e00-\u9fff]{2,3}$/);
  }
  assert.match(toMarkdownTable(rows), /\| Name \| no\. \| status\(accept\/not\) \| remarks \|/);
});

test("status update rewrites the matching row and rejects landlines", () => {
  const rows = [{ Name: "張偉成", "no.": "9123 4567", "status(accept/not)": "Pending", remarks: "" }];
  const updated = updateLeadStatus(rows, "張偉成", "accept");
  assert.equal(updated.ok, true);
  assert.equal(updated.rows[0]["status(accept/not)"], "accept");
  assert.equal(isHongKongMobile("2123 4567"), false);
  assert.equal(isHongKongMobile("3123 4567"), false);
  const command = parseStatusCommand("將張偉成的 status 改為 not");
  assert.deepEqual(command, { target: "張偉成", status: "not" });
});
