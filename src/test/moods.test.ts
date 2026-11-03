import { describe, it, expect } from "vitest";
import { MOODS, moodItems } from "@/lib/moods";
import { MENU_ITEMS } from "@/lib/menu";

describe("mood combos", () => {
  it("every combo item exists in the menu", () => {
    for (const m of MOODS) expect(moodItems(m, MENU_ITEMS).length).toBe(m.keys.length);
  });
  it("Mazaj Matin totals 1650 DA", () => {
    expect(moodItems(MOODS[0]!, MENU_ITEMS).reduce((s, i) => s + i.price, 0)).toBe(1650);
  });
});
