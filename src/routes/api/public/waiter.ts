import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Local Wi-Fi relay between the register PC and waiter phones.
// Lives in the memory of the server running on the register PC; nothing leaves the shop network.
const Name = z.object({ en: z.string().max(80), fr: z.string().max(80), ar: z.string().max(80) });
const Line = z.object({ id: z.string().max(64), name: Name, price: z.number().min(0).max(100000), qty: z.number().int().min(1).max(999) });
const MenuItem = z.object({ id: z.string().max(64), name: Name, price: z.number().min(0), category: z.string().max(64), image: z.string().max(3_000_000), outOfStock: z.boolean() });
const Menu = z.object({
  items: z.array(MenuItem).max(500),
  categories: z.array(z.object({ id: z.string().max(64), name: Name })).max(100),
  currency: z.string().max(8),
});

export type WaiterOrder = { id: string; at: number; type: "dineIn" | "takeaway"; table?: string | undefined; note?: string | undefined; lines: z.infer<typeof Line>[]; total: number };
type Relay = { key?: string; pin?: string; menu?: z.infer<typeof Menu>; menuAt: number; orders: WaiterOrder[] };
const g = globalThis as unknown as { __mazajRelay?: Relay };
const relay = (): Relay => (g.__mazajRelay ??= { menuAt: 0, orders: [] });

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("sync"), key: z.string().min(16).max(64), pin: z.string().regex(/^\d{4}$/), menu: Menu.optional() }),
  z.object({ action: z.literal("pull"), key: z.string().min(16).max(64) }),
  z.object({ action: z.literal("done"), key: z.string().min(16).max(64), id: z.string().max(64) }),
  z.object({ action: z.literal("menu"), pin: z.string().max(8) }),
  z.object({
    action: z.literal("order"),
    pin: z.string().max(8),
    type: z.enum(["dineIn", "takeaway"]),
    table: z.string().trim().max(20).optional(),
    note: z.string().max(200).optional(),
    lines: z.array(Line).min(1).max(100),
  }),
]);

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/public/waiter")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "bad_request" }, 400);
        const b = parsed.data;
        const r = relay();
        if (b.action === "sync" || b.action === "pull" || b.action === "done") {
          if (r.key && r.key !== b.key) return json({ error: "other_register" }, 403);
          r.key = b.key;
          if (b.action === "sync") {
            r.pin = b.pin;
            if (b.menu) { r.menu = b.menu; r.menuAt = Date.now(); }
            return json({ ok: true });
          }
          if (b.action === "done") r.orders = r.orders.filter((o) => o.id !== b.id);
          return json({ orders: r.orders });
        }
        if (!r.pin) return json({ error: "register_offline" }, 503);
        if (b.pin !== r.pin) return json({ error: "wrong_pin" }, 401);
        if (b.action === "menu") return json({ menu: r.menu ?? null, menuAt: r.menuAt });
        if (b.type === "dineIn" && !b.table) return json({ error: "table_required" }, 400);
        const order: WaiterOrder = {
          id: crypto.randomUUID(),
          at: Date.now(),
          type: b.type,
          table: b.type === "dineIn" ? b.table : undefined,
          note: b.note?.trim() || undefined,
          lines: b.lines,
          total: Math.round(b.lines.reduce((s, l) => s + l.price * l.qty, 0) * 100) / 100,
        };
        r.orders = [...r.orders, order].slice(-200);
        return json({ order });
      },
    },
  },
});
