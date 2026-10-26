import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { TX, usePos } from "@/lib/pos";

// Stays unlocked while moving between manager pages, until "Lock" is pressed or the page reloads.
let unlockedFlag = false;
export function lockManager() {
  unlockedFlag = false;
}

export function PinGate({ children }: { children: (lock: () => void) => ReactNode }) {
  const pos = usePos();
  const t = TX[pos.lang];
  const [unlocked, setUnlocked] = useState(unlockedFlag);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const lock = () => { lockManager(); setUnlocked(false); setPin(""); };

  if (unlocked) return <>{children(lock)}</>;
  const tryUnlock = () => (pin === pos.pin ? ((unlockedFlag = true), setUnlocked(true)) : setErr(true));
  return (
    <div className="grid min-h-dvh place-items-center bg-background p-4">
      <div className="w-full max-w-xs space-y-4 rounded-3xl bg-card p-6 text-center shadow-lg">
        <Lock className="mx-auto text-primary" size={36} />
        <h1 className="font-display text-xl font-extrabold">{t.enterPin}</h1>
        <input type="password" inputMode="numeric" value={pin} onKeyDown={(e) => e.key === "Enter" && tryUnlock()} onChange={(e) => { setPin(e.target.value); setErr(false); }} className="h-14 w-full rounded-xl border border-input bg-background text-center text-3xl tracking-[0.5em]" />
        <div className="grid grid-cols-3 gap-2">
          {["1","2","3","4","5","6","7","8","9","C","0","⌫"].map((k) => (
            <button key={k} onClick={() => { setErr(false); setPin((p) => k === "C" ? "" : k === "⌫" ? p.slice(0, -1) : p + k); }} className="h-14 rounded-xl bg-muted text-xl font-bold">{k}</button>
          ))}
        </div>
        {err && <p className="font-bold text-destructive">{t.wrongPin}</p>}
        <button onClick={tryUnlock} className="h-14 w-full rounded-xl bg-primary font-extrabold text-primary-foreground">{t.unlock}</button>
        <Link to="/" className="block text-sm font-bold text-muted-foreground">{t.back}</Link>
      </div>
    </div>
  );
}
