import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, Download, Upload } from "lucide-react";
import { CX, TX, fmtDateTime, replacePos, setPos, toCsv, usePos, type PosState } from "@/lib/pos";
import { LangBar, useDir } from "@/components/LangBar";
import { PinGate } from "@/components/PinGate";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Security — MAZAJ Coffee Shop" },
      { name: "description", content: "MAZAJ settings: currency, manager PIN, order counter and full data backup to your PC." },
      { property: "og:title", content: "Settings & Security — MAZAJ Coffee Shop" },
      { property: "og:description", content: "Backups, restore and register settings in one PIN-protected place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: () => { useDir(); return <PinGate>{(lock) => <Settings lock={lock} />}</PinGate>; },
});

export const SETTINGS_LABEL = { en: "Settings & security", fr: "Paramètres & sécurité", ar: "الإعدادات والأمان" };

type Picker = (o: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<{ createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }> }>;

/** Opens the PC "Save as" dialog when supported; falls back to a normal download. Returns false if cancelled. */
const saveFile = async (name: string, text: string, type: string): Promise<boolean> => {
  const blob = new Blob([text], { type });
  const picker = (window as unknown as { showSaveFilePicker?: Picker }).showSaveFilePicker;
  if (picker) {
    try {
      const ext = name.slice(name.lastIndexOf("."));
      const h = await picker({ suggestedName: name, types: [{ description: "MAZAJ", accept: { [type]: [ext] } }] });
      const w = await h.createWritable();
      await w.write(blob);
      await w.close();
      return true;
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return false;
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
};
const stamp = () => new Date().toISOString().slice(0, 10);
const input = "h-12 w-full rounded-xl border border-input bg-background px-3 font-semibold";
const btn = "flex h-12 w-full items-center justify-center gap-2 rounded-xl font-bold";

function Settings({ lock }: { lock: () => void }) {
  const pos = usePos();
  const t = TX[pos.lang];
  const c = CX[pos.lang];
  const fileRef = useRef<HTMLInputElement>(null);
  const [newPin, setNewPin] = useState("");

  const exportAll = async () => {
    const ok = await saveFile(`MAZAJ-backup-${stamp()}.json`, JSON.stringify({ app: "mazaj-pos", version: 1, savedAt: Date.now(), data: pos }), "application/json");
    if (ok) setPos((s) => ({ ...s, lastBackup: Date.now() }));
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
  const csvSales = () => saveFile(`MAZAJ-ventes-${stamp()}.csv`, toCsv([
    ["N°", "Date", "Type", "Paiement", "Total", "Annulée", "Articles"],
    ...pos.sales.map((s) => [s.num, fmtDateTime(s.at, pos.lang), t[s.type], t[s.method], s.total.toFixed(2), s.cancelled ? "X" : "", s.lines.map((l) => `${l.qty}x ${l.name.fr}`).join(", ")]),
  ]), "text/csv");
  const csvExp = () => saveFile(`MAZAJ-charges-${stamp()}.csv`, toCsv([
    ["Date", "Catégorie", "Description", "Montant", "Caisse", "Note"],
    ...pos.expenses.map((e) => [fmtDateTime(e.at, pos.lang), pos.expenseCategories.find((x) => x.id === e.category)?.name[pos.lang] ?? "", e.label, e.amount.toFixed(2), e.fromDrawer ? "X" : "", e.note ?? ""]),
  ]), "text/csv");
  const csvMenu = () => saveFile(`MAZAJ-menu-${stamp()}.csv`, toCsv([
    ["FR", "EN", "AR", "Catégorie", "Prix", "Épuisé"],
    ...pos.items.map((i) => [i.name.fr, i.name.en, i.name.ar, pos.categories.find((x) => x.id === i.category)?.name.fr ?? "", i.price.toFixed(2), i.outOfStock ? "X" : ""]),
  ]), "text/csv");

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/manage" aria-label={t.back} className="grid h-12 w-12 place-items-center rounded-xl bg-muted"><ArrowLeft className="rtl:rotate-180" /></Link>
          <h1 className="font-display text-xl font-black">{SETTINGS_LABEL[pos.lang]}</h1>
        </div>
        <LangBar />
      </header>
      <div className="mx-auto grid max-w-4xl gap-4 p-4 md:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <h2 className="font-display text-lg font-extrabold">{c.backup}</h2>
          <p className="text-sm text-muted-foreground">{c.lastBackup}: {pos.lastBackup ? fmtDateTime(pos.lastBackup, pos.lang) : c.never}</p>
          <button onClick={() => void exportAll()} className={`${btn} bg-primary text-primary-foreground`}><Download />{c.exportAll}</button>
          <button onClick={() => fileRef.current?.click()} className={`${btn} bg-foreground text-background`}><Upload />{c.restore}</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void restore(f); e.target.value = ""; }} />
          <hr className="border-border" />
          <button onClick={() => void csvSales()} className={`${btn} bg-muted`}>{c.csvSales}</button>
          <button onClick={() => void csvExp()} className={`${btn} bg-muted`}>{c.csvExp}</button>
          <button onClick={() => void csvMenu()} className={`${btn} bg-muted`}>{c.csvMenu}</button>
        </section>
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4 md:self-start">
          <h2 className="font-display text-lg font-extrabold">{t.settings}</h2>
          <label className="block text-sm font-bold text-muted-foreground">{t.currency}</label>
          <input value={pos.currency} onChange={(e) => setPos((s) => ({ ...s, currency: e.target.value.slice(0, 5) }))} className={input} />
          <label className="block text-sm font-bold text-muted-foreground">{t.newPin}</label>
          <div className="flex gap-2">
            <input inputMode="numeric" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))} className={input} />
            <button onClick={() => { if (newPin.length >= 4) { setPos((s) => ({ ...s, pin: newPin })); setNewPin(""); } }} className="h-12 shrink-0 rounded-xl bg-accent px-4 font-bold text-accent-foreground">{t.save}</button>
          </div>
          <button onClick={() => confirm(`${t.resetCounter}?`) && setPos((s) => ({ ...s, nextOrder: 1, orderDay: "" }))} className="h-12 w-full rounded-xl bg-muted font-bold">{t.resetCounter} (#001)</button>
          <button onClick={lock} className="h-12 w-full rounded-xl bg-muted font-bold">{t.lock}</button>
        </section>
      </div>
    </div>
  );
}
