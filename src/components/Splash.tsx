import { useEffect, useState } from "react";
import logoAsset from "@/assets/mazaj-logo.jpg.asset.json";
import { usePos } from "@/lib/pos";

// Shown once each time the app is opened (not on every page change).
let shown = false;
const WELCOME = { en: "Welcome to MAZAJ", fr: "Bienvenue chez MAZAJ", ar: "أهلاً بكم في مزاج" };
const OPEN = { en: "Open register", fr: "Ouvrir la caisse", ar: "فتح الصندوق" };

export function Splash() {
  const pos = usePos();
  const [state, setState] = useState<"hidden" | "in" | "out">("hidden");
  const [play, setPlay] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (shown) return;
    shown = true;
    setState("in");
  }, []);
  useEffect(() => {
    if (state !== "in") return;
    setReady(false);
    const id = setTimeout(() => setReady(true), 2200);
    return () => clearTimeout(id);
  }, [play, state]);
  if (state === "hidden") return null;
  const enter = () => {
    setState("out");
    setTimeout(() => setState("hidden"), 450);
  };
  return (
    <div className={`fixed inset-0 z-[100] grid place-items-center bg-background transition-opacity duration-500 ${state === "out" ? "opacity-0" : "opacity-100"}`}>
      <div key={play} className="text-center">
        <button type="button" onClick={() => setPlay((p) => p + 1)} aria-label="Replay" className="relative mx-auto block w-48">
          <div className="splash-steam absolute -top-8 left-1/2 h-10 w-2 -translate-x-1/2 rounded-full bg-primary/30" />
          <img src={logoAsset.url} alt="MAZAJ Coffee Shop" className="splash-logo h-48 w-48 rounded-[2rem] object-cover shadow-2xl" />
        </button>
        <h1 className="splash-text mt-8 font-display text-3xl font-black">{WELCOME[pos.lang]}</h1>
        <p className="splash-text mt-2 font-bold tracking-[0.3em] text-muted-foreground" style={{ animationDelay: "0.9s" }}>COFFEE SHOP</p>
        <button
          type="button"
          onClick={enter}
          className={`mt-8 h-12 rounded-xl bg-primary px-6 font-extrabold text-primary-foreground shadow-lg transition-all duration-500 ${ready ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}
        >
          {OPEN[pos.lang]}
        </button>
      </div>
    </div>
  );
}
