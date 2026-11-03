import { useState } from "react";
import { Sparkles, Shuffle, X } from "lucide-react";
import { MOODS, moodItems } from "@/lib/moods";
import { money, type Item, type Lang } from "@/lib/pos";

const L = {
  btn: { fr: "Selon votre humeur", en: "Go with your mood", ar: "على حسب مزاجك" },
  surprise: { fr: "Surprenez-moi !", en: "Surprise me!", ar: "فاجئني!" },
  add: { fr: "Ajouter", en: "Add", ar: "أضف" },
};

export function MoodPicker({ items, lang, currency, onPick }: { items: Item[]; lang: Lang; currency: string; onPick: (items: Item[]) => void }) {
  const [open, setOpen] = useState(false);
  const choices = MOODS.map((m) => ({ m, list: moodItems(m, items) })).filter((x) => x.list.length);
  const pick = (list: Item[]) => { onPick(list); setOpen(false); };
  return (
    <>
      <button onClick={() => setOpen(true)} className="flex h-12 shrink-0 items-center gap-2 rounded-xl bg-primary px-3 font-bold text-primary-foreground">
        <Sparkles size={18} /><span className="hidden sm:inline">{L.btn[lang]}</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-3" onClick={() => setOpen(false)}>
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="text-primary" />
              <h2 className="flex-1 text-xl font-extrabold">{L.btn[lang]}</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-lg bg-muted"><X size={18} /></button>
            </div>
            <button disabled={!choices.length} onClick={() => { const c = choices[Math.floor(Math.random() * choices.length)]; if (c) pick(c.list); }} className="mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-bold text-accent-foreground disabled:opacity-40">
              <Shuffle size={18} />{L.surprise[lang]}
            </button>
            <div className="space-y-2">
              {choices.map(({ m, list }) => (
                <button key={m.id} onClick={() => pick(list)} className="w-full rounded-xl border border-border bg-background p-3 text-start hover:border-primary">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-extrabold">{m.name[lang]}</span>
                    <span className="shrink-0 font-bold text-primary">{money(list.reduce((s, i) => s + i.price, 0), currency)}</span>
                  </div>
                  <p className="text-sm italic text-muted-foreground">{m.desc[lang]}</p>
                  <p className="mt-1 text-sm font-semibold">{list.map((i) => i.name[lang]).join(" · ")}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
