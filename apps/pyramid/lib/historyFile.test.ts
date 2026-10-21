import { describe, expect, it } from "vitest";
import { decryptHistory, encryptHistory } from "@/lib/historyFile";

describe("score history file", () => {
  it("round-trips dated scores and rejects the wrong passphrase", async () => {
    const history = [{ at: "2026-10-21", score: 33 }];
    const file = await encryptHistory("local-only", history);
    expect(JSON.stringify(file)).not.toContain("33");
    await expect(decryptHistory("local-only", file)).resolves.toEqual(history);
    await expect(decryptHistory("other", file)).rejects.toThrow();
    await expect(decryptHistory("local-only", { kind: "nope" })).rejects.toThrow();
  });
});
