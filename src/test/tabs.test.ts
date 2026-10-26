import { describe, expect, it } from "vitest";
import { linesTotal, matchItem, mergeLines } from "@/lib/pos";

const n = (en: string, fr: string, ar: string) => ({ en, fr, ar });
const line = (id: string, qty: number, price = 2) => ({ id, name: n(id, id, id), price, qty });

describe("table tabs", () => {
  it("adds new items to an existing table bill", () => {
    const merged = mergeLines([line("a", 1)], [line("a", 2), line("b", 1, 3)]);
    expect(merged.find((l) => l.id === "a")?.qty).toBe(3);
    expect(linesTotal(merged)).toBe(9);
  });
});

describe("menu search", () => {
  it("matches French, English or Arabic names, ignoring accents", () => {
    const item = { name: n("Coffee", "Café crème", "قهوة") };
    expect(matchItem(item, "cafe")).toBe(true);
    expect(matchItem(item, "coff")).toBe(true);
    expect(matchItem(item, "قهو")).toBe(true);
    expect(matchItem(item, "tea")).toBe(false);
  });
});
