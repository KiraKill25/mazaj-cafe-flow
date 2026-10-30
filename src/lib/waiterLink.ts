import { useEffect, useRef, useState } from "react";
import { appendLog, resolveImage, setPos, type PosState, type WaiterLogEntry } from "@/lib/pos";
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
  const seen = useRef<Map<string, WaiterOrder> | null>(null);

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
        const prev = seen.current;
        if (prev) {
          const entries = diffOrders(prev, r.orders);
          if (entries.some((e) => e.kind !== "modified")) chime();
          if (entries.length) setPos((s) => ({ ...s, waiterLog: appendLog(s.waiterLog, ...entries) }));
        } else {
          // first poll this session: log orders the register has never seen
          setPos((s) => {
            const known = new Set((s.waiterLog ?? []).map((e) => e.orderId));
            const fresh = r.orders.filter((o) => !known.has(o.id));
            return fresh.length ? { ...s, waiterLog: appendLog(s.waiterLog, ...diffOrders(new Map(), fresh)) } : s;
          });
        }
        seen.current = new Map(r.orders.map((o) => [o.id, o]));
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
  const log = (o: WaiterOrder, kind: WaiterLogEntry["kind"], detail?: string) =>
    setPos((s) => ({ ...s, waiterLog: appendLog(s.waiterLog, { at: Date.now(), kind, orderId: o.id, table: o.table, total: o.total, detail }) }));
  /** Register approves or rejects a waiter's cancellation request. */
  const decide = async (o: WaiterOrder, approve: boolean) => {
    setOrders((list) => (approve ? list.filter((x) => x.id !== o.id) : list.map((x) => (x.id === o.id ? { ...x, cancelRequest: undefined } : x))));
    if (seen.current) { if (approve) seen.current.delete(o.id); else seen.current.set(o.id, { ...o, cancelRequest: undefined }); }
    log(o, approve ? "cancelApproved" : "cancelRejected", o.cancelRequest?.reason);
    await relay({ action: "decide", key: pos.linkKey, id: o.id, approve }).catch(() => undefined);
  };
  const remove = async (o: WaiterOrder) => { log(o, "removed"); await done(o.id); };
  return { orders, online, done, decide, remove };
}

const summary = (o: WaiterOrder) => o.lines.map((l) => `${l.qty}× ${l.name.fr}`).join(", ");

/** Compares two polls of waiter orders and returns the log entries for what changed. */
export function diffOrders(prev: Map<string, WaiterOrder>, next: WaiterOrder[]): WaiterLogEntry[] {
  const out: WaiterLogEntry[] = [];
  for (const o of next) {
    const p = prev.get(o.id);
    const base = { orderId: o.id, table: o.table, total: o.total };
    if (!p) {
      out.push({ ...base, at: o.at, kind: "created", detail: summary(o) });
      if (o.modifiedAt) out.push({ ...base, at: o.modifiedAt, kind: "modified", detail: summary(o) });
      if (o.cancelRequest) out.push({ ...base, at: o.cancelRequest.at, kind: "cancelRequested", detail: o.cancelRequest.reason });
      continue;
    }
    if (o.modifiedAt && o.modifiedAt !== p.modifiedAt) out.push({ ...base, at: o.modifiedAt, kind: "modified", detail: summary(o) });
    if (o.cancelRequest && o.cancelRequest.at !== p.cancelRequest?.at) out.push({ ...base, at: o.cancelRequest.at, kind: "cancelRequested", detail: o.cancelRequest.reason });
  }
  return out;
}
