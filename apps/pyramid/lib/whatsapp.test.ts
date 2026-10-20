import { describe, expect, it } from "vitest";
import { advisorWhatsAppUrl } from "./whatsapp";

describe("advisorWhatsAppUrl", () => {
  it("opens the Hong Kong adviser number with the summary", () => {
    const url = advisorWhatsAppUrl("你好\n分數 33");
    expect(url.startsWith("https://wa.me/85294729476?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toBe("你好\n分數 33");
  });
});