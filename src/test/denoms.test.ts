import { describe, expect, it } from "vitest";
import { denomTotal } from "@/lib/pos";

describe("cash counter", () => {
  it("adds Algerian notes and coins exactly", () => {
    expect(denomTotal({ "2000": 12, "1000": 8, "500": 15, "100": 20 })).toBe(41500);
  });
  it("ignores negative or fractional counts", () => {
    expect(denomTotal({ "1000": -3, "500": 2.7 })).toBe(1000);
  });
});
