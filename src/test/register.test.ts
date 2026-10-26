import { describe, expect, it } from "vitest";
import { currentOrderNum, dayKey, sessionTotals, summarize, type Sale } from "@/lib/pos";

const sale = (at: number, total: number, method: "cash" | "card", cancelled = false): Sale =>
  ({ num: 1, at, type: "dineIn", method, total, lines: [{ id: "a", name: { en: "A", fr: "A", ar: "A" }, price: total, qty: 1 }], cancelled: cancelled ? { at } : undefined });

describe("daily order numbers", () => {
  it("restarts at 1 on a new day", () => {
    const today = new Date(2026, 9, 22, 9).getTime();
    expect(currentOrderNum({ nextOrder: 7, orderDay: dayKey(today) }, today)).toBe(7);
    expect(currentOrderNum({ nextOrder: 7, orderDay: "2026-10-21" }, today)).toBe(1);
  });
});

describe("cancelled orders", () => {
  it("are excluded from revenue but kept in history", () => {
    const r = summarize([sale(10, 5, "cash"), sale(20, 8, "card", true)], 0);
    expect(r.revenue).toBe(5);
    expect(r.count).toBe(1);
    expect(r.all.length).toBe(2);
  });
});

describe("cash drawer", () => {
  it("expected = float + cash sales - cash paid from drawer", () => {
    const s = { id: "s", openedAt: 0, float: 100, closedAt: 1000, counted: 140 };
    const r = sessionTotals({
      sales: [sale(10, 50, "cash"), sale(20, 30, "card"), sale(30, 20, "cash", true)],
      expenses: [{ id: "e", at: 40, category: "x", label: "lait", amount: 15, fromDrawer: true }, { id: "f", at: 50, category: "x", label: "loyer", amount: 500 }],
    }, s);
    expect(r.expected).toBe(135);
    expect(r.diff).toBe(5);
    expect(r.revenue).toBe(80);
  });
});
