import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, BarChart3, Check, Package, Pencil, Trash2, X } from "lucide-react";
import { CX, fmtDate, money, periodStart, setPos, summarize, summarizeExpenses, usePos, type Lang } from "@/lib/pos";
import { LangBar, useDir } from "@/components/LangBar";
import { PinGate } from "@/components/PinGate";

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — MAZAJ Coffee Shop" },
      { name: "description", content: "Record purchases, salaries, rent and other charges, and compare them with sales." },
      { property: "og:title", content: "Expenses — MAZAJ Coffee Shop" },
      { property: "og:description", content: "Track coffee shop charges by category and period." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: () => { useDir(); return <PinGate>{() => <Expenses />}</PinGate>; },
});

const L = {
  en: { title: "Expenses", add: "Add expense", label: "Description", amount: "Amount", date: "Date", note: "Note (optional)", cats: "Expense categories", addCat: "Add category", total: "Total expenses", revenue: "Sales", net: "Net result", none: "No expenses in this period", today: "Today", week: "This week", month: "This month", all: "All", del: "Delete", other: "Other", name: "Name" },
  fr: { title: "Charges", add: "Ajouter une charge", label: "Description", amount: "Montant", date: "Date", note: "Note (facultatif)", cats: "Catégories de charges", addCat: "Ajouter une catégorie", total: "Total des charges", revenue: "Ventes", net: "Résultat net", none: "Aucune charge sur cette période", today: "Aujourd'hui", week: "Cette semaine", month: "Ce mois", all: "Tout", del: "Supprimer", other: "Autre", name: "Nom" },
  ar: { title: "المصاريف", add: "إضافة مصروف", label: "الوصف", amount: "المبلغ", date: "التاريخ", note: "ملاحظة (اختياري)", cats: "فئات المصاريف", addCat: "إضافة فئة", total: "مجموع المصاريف", revenue: "المبيعات", net: "صافي النتيجة", none: "لا توجد مصاريف في هذه الفترة", today: "اليوم", week: "هذا الأسبوع", month: "هذا الشهر", all: "الكل", del: "حذف", other: "أخرى", name: "الاسم" },
};

type Period = "day" | "week" | "month" | "all";
type Names = Record<Lang, string>;
const blank: Names = { fr: "", en: "", ar: "" };
const fill = (n: Names): Names => ({ fr: n.fr.trim(), en: n.en.trim() || n.fr.trim(), ar: n.ar.trim() || n.fr.trim() });
const input = "h-12 w-full rounded-xl border border-input bg-background px-3 font-semibold";
const today = () => new Date().toISOString().slice(0, 10);

function Expenses() {
  const pos = usePos();
  const t = L[pos.lang];
  const cats = pos.expenseCategories ?? [];
  const [period, setPeriod] = useState<Period>("month");
  const [draft, setDraft] = useState({ label: "", amount: "", category: cats[0]?.id ?? "", date: today(), note: "", fromDrawer: false });
  const [newCat, setNewCat] = useState<Names>(blank);
  const [editCat, setEditCat] = useState<{ id: string; name: Names } | null>(null);

  const from = period === "all" ? 0 : periodStart(period);
  const r = summarizeExpenses(pos.expenses ?? [], from);
  const revenue = summarize(pos.sales ?? [], from).revenue;
  const catName = (id: string) => cats.find((c) => c.id === id)?.name[pos.lang] ?? t.other;

  const add = () => {
    const amount = parseFloat(draft.amount.replace(",", "."));
    if (!draft.label.trim() || !(amount > 0)) return;
    const d = new Date(draft.date + "T12:00:00");
    const at = draft.date === today() ? Date.now() : d.getTime();
    setPos((s) => ({ ...s, expenses: [...(s.expenses ?? []), { id: crypto.randomUUID(), at, category: draft.category, label: draft.label.trim(), amount, note: draft.note.trim() || undefined, fromDrawer: draft.fromDrawer || undefined }] }));
    setDraft({ ...draft, label: "", amount: "", note: "", fromDrawer: false });
  };
  const addCat = () => {
    if (!newCat.fr.trim()) return;
    setPos((s) => ({ ...s, expenseCategories: [...(s.expenseCategories ?? []), { id: crypto.randomUUID(), name: fill(newCat) }] }));
    setNewCat(blank);
  };
  const saveCat = () => {
    if (!editCat || !editCat.name.fr.trim()) return;
    setPos((s) => ({ ...s, expenseCategories: s.expenseCategories.map((c) => (c.id === editCat.id ? { ...c, name: fill(editCat.name) } : c)) }));
    setEditCat(null);
  };

  const stat = (label: string, value: string, cls = "") => (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-sm font-bold text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-2xl font-black ${cls}`}>{value}</div>
    </div>
  );
  const net = revenue - r.total;

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card px-4 py-3 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/manage" aria-label="Back" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted"><ArrowLeft className="rtl:rotate-180" /></Link>
          <h1 className="truncate font-display text-xl font-extrabold">{t.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <LangBar />
          <Link to="/reports" aria-label="Reports" className="grid h-12 w-12 place-items-center rounded-xl bg-muted"><BarChart3 /></Link>
          <Link to="/inventory" aria-label="Inventory" className="grid h-12 w-12 place-items-center rounded-xl bg-muted"><Package /></Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 p-4 lg:grid-cols-[1fr_340px]">
        <section className="space-y-6">
          <div className="flex gap-2 rounded-2xl bg-muted p-1 sm:w-fit">
            {(["day", "week", "month", "all"] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`h-12 flex-1 rounded-xl px-4 font-bold sm:flex-none ${period === p ? "bg-foreground text-background" : "text-muted-foreground"}`}>{{ day: t.today, week: t.week, month: t.month, all: t.all }[p]}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {stat(t.revenue, money(revenue, pos.currency))}
            {stat(t.total, money(r.total, pos.currency), "text-destructive")}
            {stat(t.net, money(net, pos.currency), net >= 0 ? "text-success" : "text-destructive")}
          </div>
          {r.byCat.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
              {r.byCat.map(([id, amt]) => (
                <div key={id}>
                  <div className="flex justify-between text-sm font-bold"><span>{catName(id)}</span><span>{money(amt, pos.currency)}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${(amt / r.total) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          )}
          {r.expenses.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">{t.none}</p>
          ) : (
            <div className="space-y-2">
              {[...r.expenses].sort((a, b) => b.at - a.at).map((e) => (
                <div key={e.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{e.label}</div>
                    <div className="text-sm text-muted-foreground">{catName(e.category)} · {fmtDate(e.at, pos.lang)}{e.fromDrawer ? " · 💵" : ""}{e.note ? ` · ${e.note}` : ""}</div>
                  </div>
                  <div className="font-display text-lg font-black">{money(e.amount, pos.currency)}</div>
                  <button onClick={() => confirm(`${t.del}?`) && setPos((s) => ({ ...s, expenses: s.expenses.filter((x) => x.id !== e.id) }))} aria-label={t.del} className="grid h-12 w-12 place-items-center rounded-xl bg-muted text-destructive"><Trash2 /></button>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <h2 className="font-display text-lg font-extrabold">{t.add}</h2>
            <input placeholder={t.label} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className={input} />
            <input placeholder={`${t.amount} (${pos.currency})`} inputMode="decimal" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} className={input} />
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className={input}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name[pos.lang]}</option>)}
            </select>
            <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className={input} />
            <input placeholder={t.note} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} className={input} />
            <label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={draft.fromDrawer} onChange={(e) => setDraft({ ...draft, fromDrawer: e.target.checked })} className="h-6 w-6 accent-[var(--primary)]" />{CX[pos.lang].fromDrawer}</label>
            <button onClick={add} className="h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground">{t.add}</button>
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <h2 className="font-display text-lg font-extrabold">{t.cats}</h2>
            {cats.map((c) => editCat?.id === c.id ? (
              <div key={c.id} className="space-y-2">
                {(["fr", "en", "ar"] as const).map((l) => <input key={l} dir={l === "ar" ? "rtl" : undefined} placeholder={`${t.name} (${l.toUpperCase()})`} value={editCat.name[l]} onChange={(e) => setEditCat({ ...editCat, name: { ...editCat.name, [l]: e.target.value } })} className={input} />)}
                <div className="flex gap-2">
                  <button onClick={saveCat} aria-label="Save" className="grid h-12 flex-1 place-items-center rounded-xl bg-success text-success-foreground"><Check /></button>
                  <button onClick={() => setEditCat(null)} aria-label="Cancel" className="grid h-12 flex-1 place-items-center rounded-xl bg-muted"><X /></button>
                </div>
              </div>
            ) : (
              <div key={c.id} className="flex items-center gap-2">
                <span className="flex-1 font-semibold">{c.name[pos.lang]}</span>
                <button onClick={() => setEditCat({ id: c.id, name: c.name })} aria-label="Edit" className="grid h-10 w-10 place-items-center rounded-lg bg-muted"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => confirm(`${t.del}?`) && setPos((s) => ({ ...s, expenseCategories: s.expenseCategories.filter((x) => x.id !== c.id) }))} aria-label={t.del} className="grid h-10 w-10 place-items-center rounded-lg bg-muted text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {(["fr", "en", "ar"] as const).map((l) => <input key={l} dir={l === "ar" ? "rtl" : undefined} placeholder={`${t.name} (${l.toUpperCase()})`} value={newCat[l]} onChange={(e) => setNewCat({ ...newCat, [l]: e.target.value })} className={input} />)}
            <button onClick={addCat} className="h-12 w-full rounded-xl bg-foreground font-bold text-background">{t.addCat}</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
