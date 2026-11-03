import { describe, expect, it } from "vitest";
import { periodStart, summarize, type Sale } from "@/lib/pos";

const mk = (at: Date, total: number, method: "cash" | "card" = "cash"): Sale => ({ num: 1, at: at.getTime(), type: "dineIn", method, total, lines: [{ id: "a", name: { en: "A", fr: "A", ar: "A" }, price: total, qty: 1 }] });

describe("sales reports", () => {
  const now = new Date(2026, 9, 14, 15); // Wednesday 14 Oct 2026
  it("week starts on Monday", () => {
    expect(periodStart("week", now)).toBe(new Date(2026, 9, 12).getTime());
  });
  it("month starts on the 1st", () => {
    expect(periodStart("month", now)).toBe(new Date(2026, 9, 1).getTime());
  });
  it("daily report only counts today's sales", () => {
    const sales = [mk(new Date(2026, 9, 13, 20), 10), mk(new Date(2026, 9, 14, 9), 6, "card"), mk(new Date(2026, 9, 14, 12), 4)];
    const r = summarize(sales, periodStart("day", now));
    expect(r.count).toBe(2);
    expect(r.revenue).toBe(10);
    expect(r.cash).toBe(4);
    expect(r.card).toBe(6);
  });
});

import { summarizeExpenses } from "@/lib/pos";
describe("summarizeExpenses", () => {
  it("totals expenses in period and groups by category", () => {
    const r = summarizeExpenses([
      { id: "a", at: 100, category: "rent", label: "x", amount: 500 },
      { id: "b", at: 200, category: "salaries", label: "y", amount: 800 },
      { id: "c", at: 300, category: "rent", label: "z", amount: 50 },
      { id: "d", at: 10, category: "rent", label: "old", amount: 999 },
    ], 50);
    expect(r.total).toBe(1350);
    expect(r.byCat).toEqual([["salaries", 800], ["rent", 550]]);
  });
});

import { sessionTotals, parseAmount } from "@/lib/pos";
describe("register closing", () => {
  it("year starts on 1 January", () => {
    expect(periodStart("year", new Date(2026, 9, 14))).toBe(new Date(2026, 0, 1).getTime());
  });
  it("expected cash = float + cash sales − drawer payouts, cancelled orders ignored", () => {
    const line = [{ id: "a", name: { en: "A", fr: "A", ar: "A" }, price: 1, qty: 1 }];
    const r = sessionTotals({
      sales: [
        { num: 1, at: 110, type: "dineIn", method: "cash", total: 350, lines: line },
        { num: 2, at: 120, type: "dineIn", method: "card", total: 2500, lines: line },
        { num: 3, at: 130, type: "takeaway", method: "cash", total: 500, lines: line, cancelled: { at: 140 } },
      ],
      expenses: [
        { id: "e1", at: 150, category: "purchases", label: "Lait", amount: 200, fromDrawer: true },
        { id: "e2", at: 160, category: "rent", label: "Loyer", amount: 1000 },
      ],
    }, { id: "s", openedAt: 100, float: 10000, closedAt: 200, counted: 10100 });
    expect(r.expected).toBe(10150);
    expect(r.diff).toBe(-50);
    expect(r.revenue).toBe(2850);
    expect(r.cancelledCount).toBe(1);
    expect(r.expensesTotal).toBe(1200);
    expect(r.net).toBe(1650);
  });
  it("amounts typed with comma or spaces parse exactly", () => {
    expect(parseAmount("1 500,50")).toBe(1500.5);
    expect(parseAmount("0.1") + parseAmount("0.2")).toBeCloseTo(0.3);
  });
});
