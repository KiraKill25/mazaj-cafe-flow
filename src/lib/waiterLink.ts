import { useEffect, useRef, useState } from "react";
import { resolveImage, setPos, type PosState } from "@/lib/pos";
import type { WaiterOrder } from "@/routes/api/public/waiter";

export type { WaiterOrder };
export const RELAY_URL = "/api/public/waiter";

export async function relay<T = Record<string, unknown>>(body: unknown): Promise<T & { error?: string }> {
  const r = await fetch(RELAY_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json().catch(() => ({ error: "network" }));
}

export const newPin = () => String(Math.floor(1000 + Math.random() * 9000));

function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const gn = ctx.createGain();
      o.frequency.value = f;
      gn.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.18);
      gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.35);
      o.connect(gn).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.18);
      o.stop(ctx.currentTime + i * 0.18 + 0.4);
    });
  } catch { /* no audio */ }
}

/** Register side: publishes the menu + PIN on the local relay and polls waiter orders. */
export function useWaiterLink(pos: PosState) {
  const [orders, setOrders] = useState<WaiterOrder[]>([]);
  const [online, setOnline] = useState(false);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!pos.linkKey || !pos.waiterPin) setPos((s) => ({ ...s, linkKey: s.linkKey || crypto.randomUUID(), waiterPin: s.waiterPin || newPin() }));
  }, [pos.linkKey, pos.waiterPin]);

  useEffect(() => {
    if (!pos.linkKey || !pos.waiterPin) return;
    const menu = {
      currency: pos.currency,
      categories: pos.categories,
      items: pos.items.map((i) => ({ ...i, image: resolveImage(i.image) })),
    };
    const send = () => relay({ action: "sync", key: pos.linkKey, pin: pos.waiterPin, menu }).then((r) => setOnline(!r.error)).catch(() => setOnline(false));
    send();
    const id = setInterval(send, 30000);
    return () => clearInterval(id);
  }, [pos.linkKey, pos.waiterPin, pos.items, pos.categories, pos.currency]);

  useEffect(() => {
    if (!pos.linkKey) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await relay<{ orders: WaiterOrder[] }>({ action: "pull", key: pos.linkKey });
        if (stop || !r.orders) return;
        const ids = new Set(r.orders.map((o) => o.id));
        if (seen.current && r.orders.some((o) => !seen.current!.has(o.id))) chime();
        seen.current = ids;
        setOrders(r.orders);
      } catch { /* offline */ }
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => { stop = true; clearInterval(id); };
  }, [pos.linkKey]);

  const done = async (id: string) => {
    setOrders((o) => o.filter((x) => x.id !== id));
    await relay({ action: "done", key: pos.linkKey, id }).catch(() => undefined);
  };
  return { orders, online, done };
}
