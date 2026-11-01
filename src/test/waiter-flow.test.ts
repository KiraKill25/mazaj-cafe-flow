import { describe, expect, it } from "vitest";
import { FORTUNES, THANKS, pickFortune } from "@/lib/fortunes";
import { diffOrders, type WaiterOrder } from "@/lib/waiterLink";
import { Route } from "@/routes/api/public/waiter";

const name = { en: "Espresso", fr: "Espresso", ar: "إسبريسو" };
type H = { POST: (a: { request: Request }) => Promise<Response> };
const post = async (body: unknown) => {
  const h = (Route.options as unknown as { server: { handlers: H } }).server.handlers;
  const r = await h.POST({ request: new Request("http://x/api/public/waiter", { method: "POST", body: JSON.stringify(body) }) });
  return r.json();
};
const key = "k".repeat(20);

describe("waiter edits and cancellation", () => {
  it("waiter can modify an order but a cancel only takes effect when the register approves", async () => {
    await post({ action: "sync", key, pin: "1234" });
    const { order } = await post({ action: "order", pin: "1234", type: "dineIn", table: "3", lines: [{ id: "e", name, price: 200, qty: 1 }] });
    const upd = await post({ action: "update", pin: "1234", id: order.id, table: "3", lines: [{ id: "e", name, price: 200, qty: 2 }] });
    expect(upd.order.total).toBe(400);
    await post({ action: "cancelReq", pin: "1234", id: order.id, reason: "left" });
    let list = (await post({ action: "list", pin: "1234" })).orders as WaiterOrder[];
    expect(list.find((o) => o.id === order.id)?.cancelRequest?.reason).toBe("left");
    await post({ action: "decide", key, id: order.id, approve: false });
    list = (await post({ action: "list", pin: "1234" })).orders;
    expect(list.find((o) => o.id === order.id)?.cancelRequest).toBeUndefined();
    await post({ action: "cancelReq", pin: "1234", id: order.id });
    await post({ action: "decide", key, id: order.id, approve: true });
    list = (await post({ action: "list", pin: "1234" })).orders;
    expect(list.find((o) => o.id === order.id)).toBeUndefined();
  });

  it("waiter with a wrong PIN cannot touch orders", async () => {
    expect((await post({ action: "list", pin: "0000" })).error).toBe("wrong_pin");
  });

  it("logs creation, modification and cancel requests", () => {
    const o: WaiterOrder = { id: "a", at: 1, type: "dineIn", table: "2", lines: [{ id: "e", name, price: 200, qty: 1 }], total: 200 };
    const prev = new Map([["a", o]]);
    const kinds = diffOrders(prev, [{ ...o, modifiedAt: 5, cancelRequest: { at: 6 } }]).map((e) => e.kind);
    expect(kinds).toEqual(["modified", "cancelRequested"]);
    expect(diffOrders(new Map(), [o])[0]!.kind).toBe("created");
  });
});

describe("receipt fortunes", () => {
  it("every language has fortunes and a thank-you note, and reprints get the same fortune", () => {
    for (const l of ["en", "fr", "ar"] as const) {
      expect(FORTUNES[l].length).toBeGreaterThanOrEqual(6);
      expect(THANKS[l].length).toBeGreaterThan(0);
      expect(pickFortune(l, 1234)).toBe(pickFortune(l, 1234));
    }
  });
});
