import { describe, expect, it } from "vitest";
import { applyClock, dayRange, workedMs } from "@/lib/pos";

describe("waiter attendance", () => {
  it("clock in then out records one shift with its duration", () => {
    let l = applyClock([], { id: "a", name: "Amina", kind: "in", at: 1000 });
    l = applyClock(l, { id: "a", name: "Amina", kind: "in", at: 1000 });
    l = applyClock(l, { id: "b", name: "Amina", kind: "out", at: 1000 + 7 * 3600000 });
    expect(l).toHaveLength(1);
    expect(workedMs(l)).toBe(7 * 3600000);
  });
  it("date range includes the whole last day", () => {
    const [a, b] = dayRange("2026-11-01", "2026-11-03");
    expect(b - a).toBe(3 * 86400000);
  });
});
