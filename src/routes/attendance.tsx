import { ThemeToggle } from "@/components/ThemeToggle";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Trash2, UserPlus } from "lucide-react";
import { applyClock, fmtDateTime, fmtDuration, setPos, toCsv, usePos, workedMs } from "@/lib/pos";
import { LangBar, useDir } from "@/components/LangBar";
import { PinGate } from "@/components/PinGate";
import { PeriodPicker, initialPeriod, periodRange } from "@/components/PeriodPicker";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "Staff attendance — MAZAJ Coffee Shop" },
      { name: "description", content: "Waiter clock-in and clock-out records with hours worked per period." },
      { property: "og:title", content: "Staff attendance — MAZAJ Coffee Shop" },
      { property: "og:description", content: "Waiter clock-in/out history and hours worked." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  component: () => { useDir(); return <PinGate>{() => <Attendance />}</PinGate>; },
});

const L = {
  en: { title: "Attendance", team: "Waiters", add: "Add", name: "First name", onDuty: "On duty now", none: "Nobody on duty", since: "since", history: "History", total: "Hours worked", in: "In", out: "Out", open: "in progress", csv: "Export CSV", del: "Remove this waiter?", empty: "No records in this period", clockIn: "Clock in", clockOut: "Clock out", confirmOut: "Record the exit for" },
  fr: { title: "Pointage", team: "Serveurs", add: "Ajouter", name: "Prénom", onDuty: "En service maintenant", none: "Personne en service", since: "depuis", history: "Historique", total: "Heures travaillées", in: "Entrée", out: "Sortie", open: "en cours", csv: "Exporter CSV", del: "Retirer ce serveur ?", empty: "Aucun pointage sur cette période", clockIn: "Pointer l'entrée", clockOut: "Pointer la sortie", confirmOut: "Enregistrer la sortie de" },
  ar: { title: "الحضور", team: "النُدُل", add: "إضافة", name: "الاسم", onDuty: "في الخدمة الآن", none: "لا أحد في الخدمة", since: "منذ", history: "السجل", total: "ساعات العمل", in: "دخول", out: "خروج", open: "جارٍ", csv: "تصدير CSV", del: "حذف هذا النادل؟", empty: "لا توجد سجلات في هذه الفترة", clockIn: "تسجيل الدخول", clockOut: "تسجيل الخروج", confirmOut: "تسجيل خروج" },
};

function Attendance() {
  const pos = usePos();
  const t = L[pos.lang];
  const [name, setName] = useState("");
  const [pv, setPv] = useState(() => initialPeriod("week"));
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id); }, []);
  const staff = pos.staff ?? [];
  const all = pos.attendance ?? [];
  const [from, to] = periodRange(pv);
  const shifts = all.filter((s) => s.in < to && (s.out ?? now) >= from);
  const onDuty = all.filter((s) => !s.out);
  const names = [...new Set([...staff, ...shifts.map((s) => s.name)])];

  const add = () => {
    const n = name.trim();
    if (!n || staff.includes(n)) return;
    setPos((s) => ({ ...s, staff: [...(s.staff ?? []), n] }));
    setName("");
  };
  const punch = (n: string, kind: "in" | "out") => {
    if (kind === "out" && !confirm(`${t.confirmOut} ${n} ?`)) return;
    setPos((s) => ({ ...s, attendance: applyClock(s.attendance, { id: crypto.randomUUID(), name: n, kind, at: Date.now() }) }));
  };
  const csv = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([toCsv([["Serveur", "Entrée", "Sortie", "Durée"], ...shifts.map((s) => [s.name, fmtDateTime(s.in, pos.lang), s.out ? fmtDateTime(s.out, pos.lang) : "", fmtDuration(workedMs([s], 0, Infinity, now))])])], { type: "text/csv" }));
    a.download = `MAZAJ-pointage-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };
  const card = "rounded-2xl border border-border bg-card p-4";

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/manage" aria-label="Back" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted"><ArrowLeft className="rtl:rotate-180" /></Link><ThemeToggle />
          <h1 className="truncate font-display text-xl font-extrabold">{t.title}</h1>
        </div>
        <LangBar />
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 p-4 lg:grid-cols-[320px_1fr]">
        <section className="space-y-4">
          <div className={`${card} space-y-3`}>
            <h2 className="font-display text-lg font-extrabold">{t.team}</h2>
            <div className="flex gap-2">
              <input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder={t.name} className="h-12 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 font-semibold" />
              <button onClick={add} className="flex h-12 items-center gap-1 rounded-xl bg-primary px-3 font-bold text-primary-foreground"><UserPlus size={18} />{t.add}</button>
            </div>
            {staff.map((n) => (
              <div key={n} className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 font-bold">
                <span>{n}</span>
                <span className="flex items-center gap-1">
                {onDuty.some((x) => x.name === n)
                  ? <button onClick={() => punch(n, "out")} className="h-9 rounded-lg bg-destructive px-2 text-xs font-bold text-destructive-foreground">{t.clockOut}</button>
                  : <button onClick={() => punch(n, "in")} className="h-9 rounded-lg bg-success px-2 text-xs font-bold text-success-foreground">{t.clockIn}</button>}
                <button onClick={() => confirm(t.del) && setPos((s) => ({ ...s, staff: (s.staff ?? []).filter((x) => x !== n) }))} aria-label="Remove" className="grid h-9 w-9 place-items-center rounded-lg text-destructive"><Trash2 size={16} /></button>
                </span>
              </div>
            ))}
          </div>
          <div className={`${card} space-y-2`}>
            <h2 className="font-display text-lg font-extrabold">{t.onDuty}</h2>
            {!onDuty.length && <p className="text-muted-foreground">{t.none}</p>}
            {onDuty.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-success/15 px-3 py-2">
                <span className="font-bold">{s.name}</span>
                <span className="text-sm">{t.since} {fmtDateTime(s.in, pos.lang)} · <b>{fmtDuration(now - s.in)}</b></span>
                <button onClick={() => punch(s.name, "out")} className="h-9 rounded-lg bg-destructive px-2 text-xs font-bold text-destructive-foreground">{t.clockOut}</button>
              </div>
            ))}
          </div>
        </section>
        <section className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <PeriodPicker value={pv} onChange={setPv} lang={pos.lang} options={["day", "week", "month", "year", "custom"]} />
            <button onClick={csv} className="flex h-11 items-center gap-2 rounded-xl bg-muted px-4 font-bold"><Download size={18} />{t.csv}</button>
          </div>
          <div className={`${card} space-y-2`}>
            <h2 className="font-display text-lg font-extrabold">{t.total}</h2>
            {names.map((n) => {
              const ms = workedMs(shifts.filter((s) => s.name === n), from, to, now);
              return <div key={n} className="flex justify-between rounded-xl bg-muted px-3 py-2 font-bold"><span>{n}</span><span>{fmtDuration(ms)}</span></div>;
            })}
          </div>
          <div className={`${card} space-y-2`}>
            <h2 className="font-display text-lg font-extrabold">{t.history}</h2>
            {!shifts.length && <p className="text-muted-foreground">{t.empty}</p>}
            {[...shifts].reverse().map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-muted px-3 py-2 text-sm">
                <span className="font-extrabold">{s.name}</span>
                <span>{t.in}: {fmtDateTime(s.in, pos.lang)}</span>
                <span>{t.out}: {s.out ? fmtDateTime(s.out, pos.lang) : t.open}</span>
                <span className="ms-auto font-bold">{fmtDuration(workedMs([s], 0, Infinity, now))}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
