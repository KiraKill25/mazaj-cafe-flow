import type { Item, Lang } from "./pos";

export type Mood = {
  id: string;
  name: Record<Lang, string>;
  desc: Record<Lang, string>;
  /** Menu photo keys (item.image = "seed:<key>"), so combos survive renames/price edits. */
  keys: string[];
};

export const MOODS: Mood[] = [
  {
    id: "matin",
    name: { fr: "Mazaj Matin Équilibré", en: "Balanced Mazaj Morning", ar: "صباح مزاج المتوازن" },
    desc: { fr: "Feuilleté beurré, mousse de lait, agrumes vifs et fruits légers.", en: "Buttery pastry, milky foam, bright citrus and light fruit.", ar: "مورق بالزبدة، رغوة حليب، برتقال منعش وفواكه خفيفة." },
    keys: ["croissant_sale", "cappuccino", "jus_d_orange", "crepe_fruits"],
  },
  {
    id: "energie",
    name: { fr: "Énergie & Fraîcheur", en: "Energy & Freshness", ar: "طاقة وانتعاش" },
    desc: { fr: "Œufs moelleux, espresso tonique, citron vif et fruits rouges.", en: "Soft eggs, punchy espresso, zesty lemon and red berries.", ar: "بيض طري، إسبريسو منشط، ليمون منعش وفواكه حمراء." },
    keys: ["omelegg", "espresso", "citronnade", "cheesecake_fruits_rouges"],
  },
  {
    id: "ottoman",
    name: { fr: "L'Inspiration Ottomane", en: "Ottoman Inspiration", ar: "إلهام عثماني" },
    desc: { fr: "Soupe chaude, bagel croquant, thé turc et pistache caramel.", en: "Warm soup, crunchy bagel, Turkish tea and caramel pistachio.", ar: "شوربة دافئة، بيغل مقرمش، شاي تركي وفستق بالكراميل." },
    keys: ["soupe_turque", "bagels", "the_turque", "brownies_caramel_pistache"],
  },
  {
    id: "douceur",
    name: { fr: "Douceur & Réconfort", en: "Sweet Comfort", ar: "حلاوة ودفء" },
    desc: { fr: "Fromage fondant, Spanish laté rond et gaufre dorée.", en: "Melting cheese, smooth Spanish latte and golden waffle.", ar: "جبن ذائب، سبانش لاتيه ناعم ووافل ذهبي." },
    keys: ["croque_monsieur", "spanish_late", "gaufres"],
  },
  {
    id: "legere",
    name: { fr: "Pause Légère & Express", en: "Light Express Break", ar: "استراحة خفيفة وسريعة" },
    desc: { fr: "Quiche croustillante, mojito menthe et tiramisu aérien.", en: "Crisp quiche, minty mojito and airy tiramisu.", ar: "كيش مقرمش، موهيتو بالنعناع وتيراميسو خفيف." },
    keys: ["tarte_quiche", "mojito_classique", "tiramisu"],
  },
];

/** Resolve a mood's items from the current menu (skips missing or out-of-stock items). */
export function moodItems(mood: Mood, items: Item[]): Item[] {
  return mood.keys
    .map((k) => items.find((i) => !i.outOfStock && (i.image === `seed:${k}` || i.image === `/menu/${k}.jpg` || i.image.endsWith(`/menu/${k}.jpg`))))
    .filter((i): i is Item => !!i);
}
