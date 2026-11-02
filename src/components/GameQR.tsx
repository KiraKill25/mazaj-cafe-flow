import { QRCodeSVG } from "qrcode.react";

/** Public address of the Mazaj Mind Reader game. */
export const MAZAJ_GAME_URL = "https://thinking-orb-mind-reader.lovable.app";
/** Minutes of play each QR grants. */
export const GAME_MINUTES = 60;

type Lang = "ar" | "fr" | "en";

export function gameLink(table: string, items: string[], lang: Lang) {
  const p = new URLSearchParams({
    table,
    items: items.join(","),
    lang,
    ts: String(Math.floor(Date.now() / 1000)),
    ttl: String(GAME_MINUTES),
  });
  return `${MAZAJ_GAME_URL}/?${p.toString()}`;
}

const TXT = {
  ar: "خلّي الزبون يسكاني الكود باش يلعب مع مزاج (60 دقيقة)",
  fr: "Faites scanner ce code au client pour jouer avec Mazaj (60 min)",
  en: "Let the guest scan this to play with Mazaj (60 min)",
};

export function GameQR({ table, items, lang }: { table: string; items: string[]; lang: Lang }) {
  const url = gameLink(table, items, lang);
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-muted/50 p-4">
      <div className="rounded-xl bg-white p-3">
        <QRCodeSVG value={url} size={180} level="M" />
      </div>
      <p className="text-sm font-bold">{TXT[lang]}</p>
      <a href={url} target="_blank" rel="noreferrer" dir="ltr" className="font-mono text-xs font-bold underline">{MAZAJ_GAME_URL.replace("https://", "")}</a>
    </div>
  );
}
