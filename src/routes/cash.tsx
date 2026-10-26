import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Download, Upload } from "lucide-react";
import { CX, TX, fmtDateTime, money, openSession, replacePos, sessionTotals, setPos, toCsv, usePos, type PosState, type Session } from "@/lib/pos";
import { LangBar, useDir } from "@/components/LangBar";
import { PinGate } from "@/components/PinGate";

export const Route = createFileRoute("/cash")({
  head: () => ({
    meta: [
      { title: "Register — MAZAJ Coffee Shop" },
      { name: "description", content: "Open and close the register each day and check the cash drawer." },
      { property: "og:title", content: "Register — MAZAJ Coffee Shop" },
      { property: "og:description", content: "Daily register opening and closing report." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: () => { useDir(); return <PinGate>{() => <Cash />}</PinGate>; },
});

const download = (name: string, text: string, type: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
const stamp = () => new Date().toISOString().slice(0, 10);

function Cash() {
  const pos = usePos();
  const t = TX[pos.lang];
  const c = CX[pos.lang];
  const sess = openSession(pos);
  const [counted, setCounted] = useState("");
  const [printed, setPrinted] = useState<Session | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cur = pos.currency;

  useEffect(() => {
    if (!printed) return;
    const id = setTimeout(() => window.print(), 150);
    return () => clearTimeout(id);
  }, [printed]);

  const close = () => {
    if (!sess) return;
    const n = parseFloat(counted.replace(",", "."));
    if (!(n >= 0)) return;
    const closed = { ...sess, closedAt: Date.now(), counted: n };
    setPos((s) => ({ ...s, sessions: s.sessions.map((x) => (x.id === sess.id ? closed : x)) }));
    setCounted("");
    setPrinted(closed);
  };

  const exportAll = () => {
    download(`MAZAJ-backup-${stamp()}.json`, JSON.stringify({ app: "mazaj-pos", version: 1, savedAt: Date.now(), data: pos }), "application/json");
    setPos((s) => ({ ...s, lastBackup: Date.now() }));
  };
  const restore = async (f: File) => {
    try {
      const j = JSON.parse(await f.text());
      const d = j?.data as Partial<PosState> | undefined;
      if (j?.app !== "mazaj-pos" || !d || !Array.isArray(d.items)) throw new Error();
      if (!confirm(c.restoreConfirm)) return;
      replacePos(d);
      alert(c.restoreOk);
    } catch {
      alert(c.restoreBad);
    }
  };
  const csvSales = () => download(`MAZAJ-ventes-${stamp()}.csv`, toCsv([
    ["N°", "Date", "Type", "Paiement", "Total", "Annulée", "Articles"],
    ...pos.sales.map((s) => [s.num, fmtDateTime(s.at, pos.lang), t[s.type], t[s.method], s.total.toFixed(2), s.cancelled ? "X" : "", s.lines.map((l) => `${l.qty}x ${l.name.fr}`).join(", ")]),
  ]), "text/csv");
  const csvExp = () => download(`MAZAJ-charges-${stamp()}.csv`, toCsv([
    ["Date", "Catégorie", "Description", "Montant", "Caisse", "Note"],
    ...pos.expenses.map((e) => [fmtDateTime(e.at, pos.lang), pos.expenseCategories.find((x) => x.id === e.category)?.name[pos.lang] ?? "", e.label, e.amount.toFixed(2), e.fromDrawer ? "X" : "", e.note ?? ""]),
  ]), "text/csv");
  const csvMenu = () => download(`MAZAJ-menu-${stamp()}.csv`, toCsv([
    ["FR", "EN", "AR", "Catégorie", "Prix", "Épuisé"],
    ...pos.items.map((i) => [i.name.fr, i.name.en, i.name.ar, pos.categories.find((x) => x.id === i.category)?.name.fr ?? "", i.price.toFixed(2), i.outOfStock ? "X" : ""]),
  ]), "text/csv");

  const row = (label: string, v: string, cls = "") => <div className={`flex justify-between gap-3 py-1 ${cls}`}><span>{label}</span><span className="font-bold">{v}</span></div>;
  const diffCls = (d: number | null) => (d == null ? "" : Math.abs(d) < 0.005 ? "text-success" : d > 0 ? "text-primary" : "text-destructive");
  const signed = (d: number) => `${d > 0 ? "+" : ""}${money(d, cur)}`;
  const btn = "flex h-12 w-full items-center justify-center gap-2 rounded-xl font-bold";

  const tot = sess ? sessionTotals(pos, sess) : null;
  const n = parseFloat(counted.replace(",", "."));
  const liveDiff = tot && n >= 0 ? n - tot.expected : null;
  const past = [...(pos.sessions ?? [])].filter((s) => s.closedAt).reverse();

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/manage" aria-label={t.back} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted"><ArrowLeft className="rtl:rotate-180" /></Link>
          <h1 className="truncate font-display text-xl font-extrabold">{c.cashDesk}</h1>
        </div>
        <LangBar />
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 p-4 lg:grid-cols-[1fr_340px]">
        <section className="space-y-6">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            {sess && tot ? (
              <>
                <h2 className="font-display text-lg font-extrabold">{c.opened} {fmtDateTime(sess.openedAt, pos.lang)}</h2>
                <div className="divide-y divide-border">
                  {row(c.float, money(sess.float, cur))}
                  {row(`+ ${c.cashSales}`, money(tot.cash, cur))}
                  {row(`− ${c.cashOut}`, money(tot.cashOut, cur))}
                  {row(`= ${c.expected}`, money(tot.expected, cur), "text-lg")}
                  {row(c.cardSales, money(tot.card, cur), "text-muted-foreground")}
                  {row(`${c.gained} (${tot.orders} ${t.orders})`, money(tot.revenue, cur))}
                </div>
                <label className="block text-sm font-bold text-muted-foreground">{c.counted} ({cur})</label>
                <input inputMode="decimal" value={counted} onChange={(e) => setCounted(e.target.value)} className="h-14 w-full rounded-xl border border-input bg-background px-4 text-2xl font-bold" />
                {liveDiff != null && row(c.diff, signed(liveDiff), `text-lg ${diffCls(liveDiff)}`)}
                <button onClick={close} disabled={!(n >= 0)} className="h-14 w-full rounded-xl bg-primary text-lg font-extrabold text-primary-foreground disabled:opacity-40">{c.closeReg}</button>
              </>
            ) : (
              <p className="py-4 text-center font-bold text-muted-foreground">{c.noOpen} — <Link to="/" className="text-primary underline">{c.open}</Link></p>
            )}
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-lg font-extrabold">{c.sessions}</h2>
            {past.map((s) => {
              const r = sessionTotals(pos, s);
              return (
                <details key={s.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-x-3">
                    <span className="font-extrabold">{fmtDateTime(s.openedAt, pos.lang)}</span>
                    <span className="text-sm text-muted-foreground">{c.gained}: {money(r.revenue, cur)}</span>
                    {r.diff != null && <span className={`ms-auto font-bold ${diffCls(r.diff)}`}>{signed(r.diff)}</span>}
                  </summary>
                  <div className="mt-2 divide-y divide-border text-sm">
                    {row(c.float, money(s.float, cur))}
                    {row(c.cashSales, money(r.cash, cur))}
                    {row(c.cashOut, money(r.cashOut, cur))}
                    {row(c.expected, money(r.expected, cur))}
                    {row(c.counted, money(s.counted ?? 0, cur))}
                    {row(c.cardSales, money(r.card, cur))}
                    {row(fmtDateTime(s.closedAt!, pos.lang), "")}
                  </div>
                  <button onClick={() => setPrinted({ ...s })} className="mt-2 h-10 rounded-lg bg-muted px-4 font-bold">🖨</button>
                </details>
              );
            })}
          </div>
        </section>

      </div>

      {printed && (() => {
        const r = sessionTotals(pos, printed);
        const z = CX[pos.lang];
        return (
          <div id="print-area" dir={pos.lang === "ar" ? "rtl" : "ltr"}>
            <div className="receipt">
              <h2>MAZAJ COFFEE SHOP</h2>
              <p className="big c">{z.zReport}</p>
              <p className="c">{fmtDateTime(printed.openedAt, pos.lang)} → {fmtDateTime(printed.closedAt ?? Date.now(), pos.lang)}</p>
              <hr />
              <div className="row"><span>{z.float}</span><span>{money(printed.float, cur)}</span></div>
              <div className="row"><span>+ {z.cashSales}</span><span>{money(r.cash, cur)}</span></div>
              <div className="row"><span>− {z.cashOut}</span><span>{money(r.cashOut, cur)}</span></div>
              <div className="row big"><span>{z.expected}</span><span>{money(r.expected, cur)}</span></div>
              <div className="row"><span>{z.counted}</span><span>{money(printed.counted ?? 0, cur)}</span></div>
              <div className="row big"><span>{z.diff}</span><span>{signed(r.diff ?? 0)}</span></div>
              <hr />
              <div className="row"><span>{z.cardSales}</span><span>{money(r.card, cur)}</span></div>
              <div className="row big"><span>{z.gained}</span><span>{money(r.revenue, cur)}</span></div>
              <div className="row"><span>{t.orders}</span><span>{r.orders}</span></div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
