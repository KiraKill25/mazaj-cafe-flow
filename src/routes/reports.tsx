import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Package , Wallet } from "lucide-react";
import { type Lang, type Sale, TX, CX, fmtDateTime, setPos, fmtOrder, money, periodStart, summarize, usePos } from "@/lib/pos";
import { LangBar, useDir } from "@/components/LangBar";
import { PinGate } from "@/components/PinGate";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Sales Reports — MAZAJ Coffee Shop" },

      { name: "description", content: "Daily, weekly and monthly sales reports with full order history." },
      { property: "og:title", content: "Sales Reports — MAZAJ Coffee Shop" },
      { property: "og:description", content: "Daily, weekly and monthly sales reports and order history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: () => { useDir(); return <PinGate>{() => <Reports />}</PinGate>; },
});

type Period = "day" | "week" | "month";

function Reports() {
  const pos = usePos();
  const t = TX[pos.lang];
  const [period, setPeriod] = useState<Period>("day");
  const r = summarize(pos.sales ?? [], periodStart(period));
  const c = CX[pos.lang];
  const cancel = (s: Sale) => {
    const reason = window.prompt(c.reason);
    if (reason === null) return;
    setPos((st) => ({ ...st, sales: st.sales.map((x) => (x.at === s.at && x.num === s.num ? { ...x, cancelled: { at: Date.now(), reason: reason.trim() || undefined } } : x)) }));
  };
  const labels: Record<Period, string> = { day: t.today, week: t.week, month: t.month };

  const stat = (label: string, value: string) => (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-sm font-bold text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-black">{value}</div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card px-4 py-3 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/manage" aria-label={t.back} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted"><ArrowLeft className="rtl:rotate-180" /></Link>
          <h1 className="truncate font-display text-xl font-extrabold">{t.reports}</h1>
        </div>
        <div className="flex items-center gap-2">
          <LangBar />
          <Link to="/inventory" aria-label={t.inventory} className="grid h-12 w-12 place-items-center rounded-xl bg-muted"><Package /></Link>
          <Link to="/expenses" aria-label="Expenses" title="Expenses" className="grid h-12 w-12 place-items-center rounded-xl bg-muted text-muted-foreground"><Wallet /></Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 p-4">
        <div className="flex gap-2 rounded-2xl bg-muted p-1 sm:w-fit">
          {(["day", "week", "month"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={`h-12 flex-1 rounded-xl px-5 font-bold sm:flex-none ${period === p ? "bg-foreground text-background" : "text-muted-foreground"}`}>{labels[p]}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {stat(t.revenue, money(r.revenue, pos.currency))}
          {stat(t.orders, String(r.count))}
          {stat(t.avgTicket, money(r.avg, pos.currency))}
          {stat(t.cash, money(r.cash, pos.currency))}
          {stat(t.card, money(r.card, pos.currency))}
        </div>

        {r.all.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">{t.noSales}</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <BestSellers sales={r.sales} lang={pos.lang} currency={pos.currency} title={t.topItems} labels={{ all: t.all, dine: t.dineIn, take: t.takeaway }} />
            <section className="space-y-2 rounded-2xl border border-border bg-card p-4">
              <h2 className="font-display text-lg font-extrabold">{t.history}</h2>
              {[...r.all].reverse().map((s) => (
                <details key={s.at} className={`rounded-xl bg-muted px-3 py-2 ${s.cancelled ? "opacity-60" : ""}`}>
                  <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-extrabold">{fmtOrder(s.num)}</span>
                    <span className="text-sm text-muted-foreground">{fmtDateTime(s.at, pos.lang)}</span>
                    <span className="text-sm font-semibold">{t[s.type]} · {t[s.method]}</span>
                    {s.cancelled && <span className="rounded-md bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">{c.cancelled}</span>}
                    <span className={`ms-auto font-bold ${s.cancelled ? "line-through" : ""}`}>{money(s.total, pos.currency)}</span>
                  </summary>
                  <div className="mt-2 space-y-1 text-sm">
                    {s.lines.map((l) => <div key={l.id} className="flex justify-between"><span>{l.qty} × {l.name[pos.lang]}</span><span>{money(l.qty * l.price, pos.currency)}</span></div>)}
                    {s.cancelled ? <p className="pt-1 text-destructive">{c.cancelled} · {fmtDateTime(s.cancelled.at, pos.lang)}{s.cancelled.reason ? ` · ${s.cancelled.reason}` : ""}</p>
                      : <button onClick={() => cancel(s)} className="mt-2 h-10 rounded-lg bg-destructive/10 px-4 font-bold text-destructive">{c.cancelOrder}</button>}
                  </div>
                </details>
              ))}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function BestSellers({ sales, lang, currency, title, labels }: { sales: Sale[]; lang: Lang; currency: string; title: string; labels: { all: string; dine: string; take: string } }) {
  const [f, setF] = useState<"all" | "dineIn" | "takeaway">("all");
  const [by, setBy] = useState<"qty" | "amount">("qty");
  const map = new Map<string, { name: Record<Lang, string>; qty: number; amount: number }>();
  for (const s of sales) {
    if (f !== "all" && s.type !== f) continue;
    for (const l of s.lines) {
      const e = map.get(l.id) ?? { name: l.name, qty: 0, amount: 0 };
      e.qty += l.qty; e.amount += l.qty * l.price; map.set(l.id, e);
    }
  }
  const rows = [...map.values()].sort((a, b) => b[by] - a[by]);
  const max = rows[0]?.[by] || 1;
  const medal = ["🥇", "🥈", "🥉"];
  const pill = (on: boolean) => `h-10 flex-1 rounded-lg px-3 text-sm font-bold ${on ? "bg-foreground text-background" : "text-muted-foreground"}`;
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <h2 className="font-display text-lg font-extrabold">{title}</h2>
      <div className="flex gap-1 rounded-xl bg-muted p-1">
        {(["all", "dineIn", "takeaway"] as const).map((k) => (
          <button key={k} onClick={() => setF(k)} className={pill(f === k)}>{k === "all" ? labels.all : k === "dineIn" ? labels.dine : labels.take}</button>
        ))}
      </div>
      <div className="flex gap-1 rounded-xl bg-muted p-1">
        <button onClick={() => setBy("qty")} className={pill(by === "qty")}>#</button>
        <button onClick={() => setBy("amount")} className={pill(by === "amount")}>{currency}</button>
      </div>
      {rows.slice(0, 10).map((x, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between gap-2">
            <span className="truncate font-semibold">{medal[i] ?? `${i + 1}.`} {x.name[lang]}</span>
            <span className="shrink-0 text-sm font-bold">{x.qty} · {money(x.amount, currency)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(x[by] / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </section>
  );
}
