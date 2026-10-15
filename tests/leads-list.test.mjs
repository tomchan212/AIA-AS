import test from "node:test";
import assert from "node:assert/strict";
import { blankLead, isHongKongMobile, parseStatusCommand, toMarkdownTable, updateLeadStatus } from "../leads/list.js";

test("a new call row keeps the dialled number and leaves name and remarks blank", () => {
  const created = blankLead("91234567");
  assert.equal(created.ok, true);
  assert.equal(created.row.Name, "");
  assert.equal(created.row["no."], "9123 4567");
  assert.equal(created.row["status(accept/not)"], "Pending");
  assert.equal(created.row.remarks, "");
  assert.equal(blankLead("21234567").ok, false);
  assert.equal(isHongKongMobile("3123 4567"), false);
  assert.match(toMarkdownTable([created.row]), /\| Name \| no\. \| status\(accept\/not\) \| remarks \|/);
});

test("status update rewrites the matching row", () => {
  const rows = [{ Name: "張偉成", "no.": "9123 4567", "status(accept/not)": "Pending", remarks: "聽日再打" }];
  const updated = updateLeadStatus(rows, "張偉成", "accept");
  assert.equal(updated.ok, true);
  assert.equal(updated.rows[0]["status(accept/not)"], "accept");
  const command = parseStatusCommand("將張偉成的 status 改為 not");
  assert.deepEqual(command, { target: "張偉成", status: "not" });
});
