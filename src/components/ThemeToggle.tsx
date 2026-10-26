import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function applyStoredTheme() {
  document.documentElement.classList.toggle("dark", localStorage.getItem("mazaj-theme") === "dark");
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("mazaj-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };
  return (
    <button onClick={toggle} aria-label="Dark / light mode" title="Dark / light mode" className="grid h-12 w-12 place-items-center rounded-xl bg-muted text-muted-foreground">
      {dark ? <Sun /> : <Moon />}
    </button>
  );
}
