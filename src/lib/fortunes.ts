import type { Lang } from "@/lib/pos";

/** Short poetic fortunes printed on customer receipts, one set per language. */
export const FORTUNES: Record<Lang, string[]> = {
  en: [
    "May your coffee be rich and your mood even sweeter.",
    "Happiness begins with one warm sip.",
    "Slow down — the best moments steep gently.",
    "A good cup soothes the soul and wakes the heart.",
    "Here, time pauses to make room for warmth.",
    "May your Mazaj always be bright.",
    "Sweet days are brewed one cup at a time.",
    "Let the steam carry your worries away.",
  ],
  fr: [
    "Que votre café soit doux et votre humeur plus douce encore.",
    "Le bonheur commence par une gorgée chaleureuse.",
    "Prenez le temps de savourer l'instant.",
    "Un bon café apaise l'âme et éveille le cœur.",
    "Ici, le temps s'arrête pour laisser place à la douceur.",
    "Que votre Mazaj soit toujours au beau fixe.",
    "Les beaux jours se préparent une tasse à la fois.",
    "Laissez la vapeur emporter vos soucis.",
  ],
  ar: [
    "فنجان قهوة يعدّل المزاج ويجمّل اللحظة.",
    "السعادة تبدأ برشفة دافئة.",
    "تمهّل… أجمل اللحظات تُحضَّر على مهل.",
    "قهوة طيبة تؤنس الروح وتوقظ القلب.",
    "هنا يتوقف الوقت ليفسح المجال للدفء.",
    "دمتم دائماً في أحلى مزاج.",
    "الأيام الحلوة تُصنع فنجاناً بعد فنجان.",
    "دع البخار يحمل همومك بعيداً.",
  ],
};

export const THANKS: Record<Lang, string> = {
  en: "Thank you for visiting Mazaj · See you again soon!",
  fr: "Merci de votre visite · Au plaisir de vous revoir !",
  ar: "شكراً لزيارتكم · دمتم في أحلى مزاج!",
};

/** Picks a fortune deterministically from a seed (e.g. order time) so reprints show the same one. */
export function pickFortune(lang: Lang, seed: number) {
  const list = FORTUNES[lang];
  return list[Math.abs(Math.floor(seed)) % list.length]!;
}
