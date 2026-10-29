import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const EVT = "mazaj-theme-change";

export function applyStoredTheme() {
  document.documentElement.classList.toggle("dark", localStorage.getItem("mazaj-theme") === "dark");
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const sync = () => setDark(document.documentElement.classList.contains("dark"));
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    localStorage.setItem("mazaj-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
    window.dispatchEvent(new Event(EVT));
  };
  return (
    <button type="button" onClick={toggle} aria-label="Dark / light mode" title="Dark / light mode" className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground ${className}`}>
      {dark ? <Sun /> : <Moon />}
    </button>
  );
}
