import { CalendarDays } from "lucide-react";
import { dayRange, periodStart, type Lang } from "@/lib/pos";

export type Period = "day" | "week" | "month" | "year" | "all" | "custom";
export type PeriodValue = { period: Period; from: string; to: string };

const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export const initialPeriod = (period: Period): PeriodValue => ({ period, from: todayStr(), to: todayStr() });

/** Converts a picker value to a [start, end) timestamp range. */
export function periodRange(v: PeriodValue): [number, number] {
  if (v.period === "all") return [0, Infinity];
  if (v.period === "custom") return dayRange(v.from, v.to);
  return [periodStart(v.period), Infinity];
}

const L = {
  en: { day: "Today", week: "This week", month: "This month", year: "This year", all: "All", custom: "Dates", from: "From", to: "To" },
  fr: { day: "Aujourd'hui", week: "Cette semaine", month: "Ce mois", year: "Cette année", all: "Tout", custom: "Dates", from: "Du", to: "Au" },
  ar: { day: "اليوم", week: "هذا الأسبوع", month: "هذا الشهر", year: "هذه السنة", all: "الكل", custom: "تواريخ", from: "من", to: "إلى" },
};

export function PeriodPicker({ value, onChange, lang, options = ["day", "week", "month", "year", "custom"] }: { value: PeriodValue; onChange: (v: PeriodValue) => void; lang: Lang; options?: Period[] }) {
  const t = L[lang];
  const input = "h-11 rounded-xl border border-input bg-background px-2 font-semibold";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 rounded-2xl bg-muted p-1 sm:w-fit">
        {options.map((p) => (
          <button key={p} onClick={() => onChange({ ...value, period: p })} className={`flex h-11 flex-1 items-center justify-center gap-1 rounded-xl px-3 font-bold sm:flex-none ${value.period === p ? "bg-foreground text-background" : "text-muted-foreground"}`}>
            {p === "custom" && <CalendarDays size={16} />}{t[p]}
          </button>
        ))}
      </div>
      {value.period === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 font-bold">{t.from}<input type="date" value={value.from} max={value.to || undefined} onChange={(e) => onChange({ ...value, from: e.target.value, to: value.to < e.target.value ? e.target.value : value.to })} className={input} /></label>
          <label className="flex items-center gap-2 font-bold">{t.to}<input type="date" value={value.to} min={value.from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value })} className={input} /></label>
        </div>
      )}
    </div>
  );
}
