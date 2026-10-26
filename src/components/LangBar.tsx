import { useEffect } from "react";
import { setPos, usePos, type Lang } from "@/lib/pos";

export function useDir() {
  const { lang } = usePos();
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
}

export function LangBar() {
  const { lang } = usePos();
  const opts: [Lang, string][] = [["en", "EN"], ["fr", "FR"], ["ar", "ع"]];
  return (
    <div className="flex shrink-0 rounded-xl bg-muted p-1">
      {opts.map(([l, label]) => (
        <button
          key={l}
          onClick={() => setPos((s) => ({ ...s, lang: l }))}
          className={`h-10 min-w-11 rounded-lg px-3 text-sm font-bold ${lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
