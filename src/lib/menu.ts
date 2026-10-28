import type { Category, Item, Lang } from "./pos";

// Photos are bundled in public/menu so the app works fully offline (desktop / Inno Setup build).
const assets = import.meta.glob("../assets/menu/*.asset.json", { eager: true, import: "default" });

/** Menu photo URL by key (file name without extension), e.g. "espresso". */
export const MENU_IMAGES: Record<string, string> = Object.fromEntries(
  Object.keys(assets).map((p) => {
    const k = p.split("/").pop()!.replace(".jpg.asset.json", "");
    return [k, `/menu/${k}.jpg`];
  }),
);

const N = (fr: string, en: string, ar: string): Record<Lang, string> => ({ fr, en, ar });

export const MENU_CATEGORIES: Category[] = [
  { id: "hot", name: N("Boissons chaudes", "Hot Drinks", "مشروبات ساخنة") },
  { id: "cold", name: N("Boissons froides", "Cold Drinks", "مشروبات باردة") },
  { id: "sweet", name: N("Nos sucrés", "Sweets & Desserts", "حلوياتنا") },
  { id: "savory", name: N("Nos salés", "Savory", "مملحاتنا") },
  { id: "soup", name: N("Soupe à boire", "Soups", "شوربات") },
  { id: "brunch", name: N("Brunch", "Brunch", "برانش") },
];

type Row = [string, string, string, number, string, string]; // fr, en, ar, price, category, image
const rows: Row[] = [
  ["Espresso", "Espresso", "إسبريسو", 200, "hot", "espresso"],
  ["Spanish laté", "Spanish latte", "سبانش لاتيه", 350, "hot", "spanish_late"],
  ["Macchiato", "Macchiato", "ماكياتو", 350, "hot", "macchiato"],
  ["Cappuccino", "Cappuccino", "كابوتشينو", 250, "hot", "cappuccino"],
  ["Chocolat chaud", "Hot chocolate", "شوكولاتة ساخنة", 300, "hot", "chocolat_chaud"],
  ["Capsule", "Capsule coffee", "كبسولة", 200, "hot", "cafe_capsule"],
  ["Thé maison", "House tea", "شاي الدار", 150, "hot", "the_maison"],
  ["Thé turc", "Turkish tea", "شاي تركي", 150, "hot", "the_turque"],
  ["Tisane infusion", "Herbal infusion", "تيزانة", 150, "hot", "tisane_infusion"],
  ["Milkshake (fruits / chocolat / speculoos)", "Milkshake (fruit / chocolate / speculoos)", "ميلك شيك", 500, "cold", "milkshake"],
  ["Frappuccino (choco / caramel)", "Frappuccino (choco / caramel)", "فرابتشينو", 450, "cold", "frappuccino"],
  ["Mojito classic", "Classic mojito", "موهيتو كلاسيك", 350, "cold", "mojito_classique"],
  ["Mojito hawaï", "Hawaii mojito", "موهيتو هاواي", 450, "cold", "mojito_hawai"],
  ["Jus d'orange frais", "Fresh orange juice", "عصير برتقال طبيعي", 300, "cold", "jus_d_orange"],
  ["Jus fraise (surgelé)", "Strawberry juice", "عصير فراولة", 400, "cold", "jus_fraise"],
  ["Jus noisette", "Hazelnut juice", "عصير بندق", 500, "cold", "jus_noisette"],
  ["Citronnade", "Lemonade", "عصير ليمون", 350, "cold", "citronnade"],
  ["Gaufres", "Waffles", "وافل", 500, "sweet", "gaufres"],
  ["Crêpes chocolat", "Chocolate crêpes", "كريب شوكولاتة", 350, "sweet", "crepe_chocolat"],
  ["Crêpes fruits", "Fruit crêpes", "كريب بالفواكه", 450, "sweet", "crepe_fruits"],
  ["Tiramisu", "Tiramisu", "تيراميسو", 300, "sweet", "tiramisu"],
  ["Cheesecake oreo", "Oreo cheesecake", "تشيزكيك أوريو", 450, "sweet", "cheesecake_oreo"],
  ["Yumburger", "Yumburger", "يام برغر", 650, "sweet", "yumburger"],
  ["Morceaux gourmands", "Gourmet bites", "قطع حلويات", 350, "sweet", "morceaux_gourmands"],
  ["Mousse chocolat / liégeois", "Chocolate mousse / liégeois", "موس شوكولاتة", 450, "sweet", "mousse_chocolat"],
  ["Crème brûlée", "Crème brûlée", "كريم بروليه", 500, "sweet", "creme_brule"],
  ["Les tartelettes", "Tartlets", "تارتوليت", 250, "sweet", "tartelettes"],
  ["Brownies chocolat", "Chocolate brownies", "براونيز شوكولاتة", 250, "sweet", "brownies_chocolat"],
  ["Brownies caramel / pistache", "Caramel / pistachio brownies", "براونيز كراميل / فستق", 300, "sweet", "brownies_caramel_pistache"],
  ["Cheesecake fruits rouges", "Red berry cheesecake", "تشيزكيك فواكه حمراء", 500, "sweet", "cheesecake_fruits_rouges"],
  ["Cheesecake speculoos", "Speculoos cheesecake", "تشيزكيك لوتس", 500, "sweet", "cheesecake_speculoos"],
  ["Cheesecake pistache", "Pistachio cheesecake", "تشيزكيك فستق", 550, "sweet", "cheesecake_pistache"],
  ["Croque-monsieur", "Croque-monsieur", "كروك مسيو", 500, "savory", "croque_monsieur"],
  ["Bagels", "Bagels", "بيغل", 600, "savory", "bagels"],
  ["Omelegg", "Omelegg", "اومليڨ", 400, "savory", "omelegg"],
  ["Croissant salé", "Savory croissant", "كرواسون مالح", 650, "savory", "croissant_sale"],
  ["Tarte quiche", "Quiche", "كيش", 400, "savory", "tarte_quiche"],
  ["Soupe turque", "Turkish soup", "شوربة تركية", 250, "soup", "soupe_turque"],
  ["Soupe française", "French soup", "شوربة فرنسية", 350, "soup", "soupe_francaise"],
  ["Brunch classique", "Classic brunch", "برانش كلاسيك", 600, "brunch", "brunch_classique"],
  ["Brunch traditionnel", "Traditional brunch", "برانش تقليدي", 750, "brunch", "brunch_traditionnel"],
  ["Brunch turc (2 pers)", "Turkish brunch (2 pers)", "برانش تركي (شخصين)", 2500, "brunch", "brunch_turque"],
  ["Brunch turc (4 pers)", "Turkish brunch (4 pers)", "برانش تركي (4 أشخاص)", 4500, "brunch", "brunch_turque"],
  ["Brunch Mazaj (2 pers)", "Mazaj brunch (2 pers)", "برانش مزاج (شخصين)", 3000, "brunch", "brunch_mazaj"],
  ["Brunch Mazaj (4 pers)", "Mazaj brunch (4 pers)", "برانش مزاج (4 أشخاص)", 5500, "brunch", "brunch_mazaj"],
];

export const MENU_ITEMS: Item[] = rows.map(([fr, en, ar, price, category, img], i) => ({
  id: `m${i + 1}`,
  name: N(fr, en, ar),
  price,
  category,
  image: `seed:${img}`,
  outOfStock: false,
}));
