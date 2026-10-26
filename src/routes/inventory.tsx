import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, BarChart3, Check, Pencil, Trash2, X , Wallet } from "lucide-react";
import { TX, resolveImage, setPos, usePos, type Item, type Lang } from "@/lib/pos";
import { LangBar, useDir } from "@/components/LangBar";
import { PinGate } from "@/components/PinGate";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — MAZAJ Coffee Shop" },

      { name: "description", content: "Manage menu categories, add dishes with photos, update prices and mark items out of stock." },
      { property: "og:title", content: "Inventory — Fast Food POS" },
      { property: "og:description", content: "Manage categories, dishes, prices and stock." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: () => { useDir(); return <PinGate>{(lock) => <Inventory lock={lock} />}</PinGate>; },
});

function compress(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, 480 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = img.width * s;
      c.height = img.height * s;
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

const input = "h-12 w-full rounded-xl border border-input bg-background px-3 font-semibold";
type Names = Record<Lang, string>;
const blank: Names = { fr: "", en: "", ar: "" };
const fill = (n: Names): Names => ({ fr: n.fr.trim(), en: n.en.trim() || n.fr.trim(), ar: n.ar.trim() || n.fr.trim() });

function NameFields({ value, onChange, label }: { value: Names; onChange: (n: Names) => void; label: string }) {
  return (
    <>
      <input placeholder={`${label} (FR)`} value={value.fr} onChange={(e) => onChange({ ...value, fr: e.target.value })} className={input} />
      <input placeholder={`${label} (EN)`} value={value.en} onChange={(e) => onChange({ ...value, en: e.target.value })} className={input} />
      <input placeholder={`${label} (AR)`} dir="rtl" value={value.ar} onChange={(e) => onChange({ ...value, ar: e.target.value })} className={input} />
    </>
  );
}

function Inventory({ lock }: { lock: () => void }) {
  const pos = usePos();
  const t = TX[pos.lang];
  const [draft, setDraft] = useState({ name: blank, price: "", category: pos.categories[0]?.id ?? "", image: "" });
  const [newCat, setNewCat] = useState<Names>(blank);
  const [editCat, setEditCat] = useState<{ id: string; name: Names } | null>(null);
  const [newPin, setNewPin] = useState("");

  const update = (id: string, patch: Partial<Item>) =>
    setPos((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));

  const addItem = () => {
    const price = parseFloat(draft.price.replace(",", "."));
    if (!draft.name.fr.trim() || !(price >= 0)) return;
    setPos((s) => ({ ...s, items: [...s.items, { id: crypto.randomUUID(), name: fill(draft.name), price, category: draft.category, image: draft.image, outOfStock: false }] }));
    setDraft({ ...draft, name: blank, price: "", image: "" });
  };
  const addCat = () => {
    if (!newCat.fr.trim()) return;
    setPos((s) => ({ ...s, categories: [...s.categories, { id: crypto.randomUUID(), name: fill(newCat) }] }));
    setNewCat(blank);
  };
  const saveCat = () => {
    if (!editCat || !editCat.name.fr.trim()) return;
    setPos((s) => ({ ...s, categories: s.categories.map((c) => (c.id === editCat.id ? { ...c, name: fill(editCat.name) } : c)) }));
    setEditCat(null);
  };
  const delCat = (id: string) => {
    const n = pos.items.filter((i) => i.category === id).length;
    if (!confirm(`${t.delete}?${n ? ` (${n} → ${t.uncategorized})` : ""}`)) return;
    setPos((s) => ({ ...s, categories: s.categories.filter((c) => c.id !== id) }));
  };

  const groups = [
    ...pos.categories.map((c) => ({ id: c.id, label: c.name[pos.lang] })),
    { id: "__none", label: t.uncategorized },
  ].map((g) => ({ ...g, items: pos.items.filter((i) => (g.id === "__none" ? !pos.categories.some((c) => c.id === i.category) : i.category === g.id)) }))
    .filter((g) => g.items.length || g.id !== "__none");

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card px-4 py-3 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/manage" aria-label={t.back} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted"><ArrowLeft className="rtl:rotate-180" /></Link>
          <h1 className="truncate font-display text-xl font-extrabold">{t.inventory}</h1>
        </div>
        <div className="flex items-center gap-2">
          <LangBar />
          <Link to="/reports" aria-label={t.reports} className="grid h-12 w-12 place-items-center rounded-xl bg-muted"><BarChart3 /></Link>
          <Link to="/expenses" aria-label="Expenses" title="Expenses" className="grid h-12 w-12 place-items-center rounded-xl bg-muted text-muted-foreground"><Wallet /></Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 p-4 lg:grid-cols-[1fr_340px]">
        <section className="space-y-6">
          {groups.map((g) => (
            <div key={g.id} className="space-y-2">
              <h2 className="font-display text-lg font-extrabold">{g.label} <span className="text-sm text-muted-foreground">({g.items.length})</span></h2>
              {g.items.map((i) => (
                <div key={i.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3">
                  <label className="h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-muted">
                    {i.image && <img src={resolveImage(i.image)} alt="" className="h-full w-full object-cover" />}
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) update(i.id, { image: await compress(f) }); }} />
                  </label>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="truncate font-bold">{i.name[pos.lang]}</div>
                    <select value={i.category} onChange={(e) => update(i.id, { category: e.target.value })} className="h-9 max-w-full rounded-lg border border-input bg-background px-2 text-sm font-semibold">
                      {!pos.categories.some((c) => c.id === i.category) && <option value={i.category}>{t.uncategorized}</option>}
                      {pos.categories.map((c) => <option key={c.id} value={c.id}>{c.name[pos.lang]}</option>)}
                    </select>
                  </div>
                  <input type="number" step="0.1" defaultValue={i.price} onBlur={(e) => { const v = parseFloat(e.target.value); if (v >= 0) update(i.id, { price: v }); }} className="h-12 w-24 rounded-xl border border-input bg-background px-2 text-center font-bold" />
                  <button onClick={() => update(i.id, { outOfStock: !i.outOfStock })} className={`h-12 rounded-xl px-3 text-sm font-bold ${i.outOfStock ? "bg-destructive text-destructive-foreground" : "bg-success/15 text-success"}`}>{i.outOfStock ? t.outOfStock : t.inStock}</button>
                  <button onClick={() => confirm(`${t.delete}?`) && setPos((s) => ({ ...s, items: s.items.filter((x) => x.id !== i.id) }))} aria-label={t.delete} className="grid h-12 w-12 place-items-center rounded-xl bg-muted text-destructive"><Trash2 /></button>
                </div>
              ))}
            </div>
          ))}
        </section>

        <aside className="space-y-6">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <h2 className="font-display text-lg font-extrabold">{t.addItem}</h2>
            <NameFields value={draft.name} onChange={(name) => setDraft({ ...draft, name })} label={t.name} />
            <input placeholder={t.price} inputMode="decimal" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} className={input} />
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className={input}>
              {pos.categories.map((c) => <option key={c.id} value={c.id}>{c.name[pos.lang]}</option>)}
            </select>
            <label className="flex h-12 cursor-pointer items-center gap-3 rounded-xl bg-muted px-3 font-semibold">
              {draft.image ? <img src={draft.image} alt="" className="h-9 w-9 rounded-lg object-cover" /> : "📷"} {t.photo}
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setDraft({ ...draft, image: await compress(f) }); }} />
            </label>
            <button onClick={addItem} className="h-12 w-full rounded-xl bg-primary font-extrabold text-primary-foreground">{t.save}</button>
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <h2 className="font-display text-lg font-extrabold">{t.categories}</h2>
            {pos.categories.map((c) => editCat?.id === c.id ? (
              <div key={c.id} className="space-y-2 rounded-xl bg-muted p-2">
                <NameFields value={editCat.name} onChange={(name) => setEditCat({ ...editCat, name })} label={t.name} />
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setEditCat(null)} aria-label={t.cancel} className="grid h-11 place-items-center rounded-xl bg-card"><X /></button>
                  <button onClick={saveCat} aria-label={t.save} className="grid h-11 place-items-center rounded-xl bg-primary text-primary-foreground"><Check /></button>
                </div>
              </div>
            ) : (
              <div key={c.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate font-bold">{c.name[pos.lang]}</span>
                <button onClick={() => setEditCat({ id: c.id, name: c.name })} aria-label={t.edit} className="grid h-11 w-11 place-items-center rounded-xl bg-muted"><Pencil size={18} /></button>
                <button onClick={() => delCat(c.id)} aria-label={t.delete} className="grid h-11 w-11 place-items-center rounded-xl bg-muted text-destructive"><Trash2 size={18} /></button>
              </div>
            ))}
            <div className="space-y-2 border-t border-border pt-3">
              <NameFields value={newCat} onChange={setNewCat} label={t.name} />
              <button onClick={addCat} className="h-12 w-full rounded-xl bg-accent font-bold text-accent-foreground">{t.addCategory}</button>
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}
