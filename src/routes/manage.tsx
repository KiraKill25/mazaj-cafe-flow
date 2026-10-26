import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Package, Vault, Wallet, ArrowLeft, Lock, Settings } from "lucide-react";
import { SETTINGS_LABEL } from "./settings";
import { PinGate } from "@/components/PinGate";
import { LangBar, useDir } from "@/components/LangBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CX, TX, usePos } from "@/lib/pos";
import logoAsset from "@/assets/mazaj-logo.jpg.asset.json";

export const Route = createFileRoute("/manage")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Management — MAZAJ Coffee Shop" },
      { name: "description", content: "MAZAJ manager hub: cash drawer, sales reports, inventory and expenses." },
      { property: "og:title", content: "Management — MAZAJ Coffee Shop" },
      { property: "og:description", content: "One PIN-protected place for all MAZAJ management tools." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Hub,
});

const HUB = {
  en: { title: "Management", pick: "Choose a section", exp: "Expenses & charges" },
  fr: { title: "Gestion", pick: "Choisissez une section", exp: "Charges & dépenses" },
  ar: { title: "الإدارة", pick: "اختر قسماً", exp: "المصاريف والأعباء" },
};

function Hub() {
  const pos = usePos();
  useDir();
  const t = TX[pos.lang];
  const c = CX[pos.lang];
  const h = HUB[pos.lang];
  const cards = [
    { to: "/cash" as const, icon: Vault, label: c.cashDesk },
    { to: "/reports" as const, icon: BarChart3, label: t.reports },
    { to: "/inventory" as const, icon: Package, label: t.inventory },
    { to: "/expenses" as const, icon: Wallet, label: h.exp },
    { to: "/settings" as const, icon: Settings, label: SETTINGS_LABEL[pos.lang] },
  ];
  return (
    <PinGate>
      {(lock) => (
        <div className="min-h-dvh bg-background p-4 text-foreground">
          <header className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link to="/" aria-label={t.back} className="grid h-12 w-12 place-items-center rounded-xl bg-muted"><ArrowLeft className="rtl:rotate-180" /></Link>
              <img src={logoAsset.url} alt="MAZAJ Coffee Shop" className="h-11 w-11 rounded-xl object-cover" />
              <h1 className="font-display text-2xl font-black">{h.title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <LangBar />
              <ThemeToggle />
              <button onClick={lock} aria-label="Lock" className="grid h-12 w-12 place-items-center rounded-xl bg-muted"><Lock /></button>
            </div>
          </header>
          <p className="mx-auto mt-6 max-w-4xl font-bold text-muted-foreground">{h.pick}</p>
          <div className="mx-auto mt-3 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
            {cards.map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to} className="flex items-center gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm transition active:scale-95">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary"><Icon size={32} /></span>
                <span className="font-display text-xl font-extrabold">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </PinGate>
  );
}
