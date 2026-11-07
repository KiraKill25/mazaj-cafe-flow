import { useSyncExternalStore } from "react";
import { MENU_IMAGES, MENU_ITEMS, MENU_CATEGORIES } from "./menu";

export type Lang = "en" | "fr" | "ar";
export type Category = { id: string; name: Record<Lang, string> };
export type SaleLine = { id: string; name: Record<Lang, string>; price: number; qty: number };
export type Sale = { num: number; at: number; type: "dineIn" | "takeaway"; method: "cash" | "card"; total: number; lines: SaleLine[]; table?: string | undefined; cancelled?: { at: number; reason?: string | undefined } | undefined };

export type Expense = { id: string; at: number; category: string; label: string; amount: number; note?: string | undefined; fromDrawer?: boolean | undefined };

export type Session = { id: string; openedAt: number; float: number; closedAt?: number | undefined; counted?: number | undefined; denoms?: Record<string, number> | undefined };

/** An open dine-in table bill kept until final checkout. */
export type Tab = { id: string; table: string; openedAt: number; lines: SaleLine[] };

export type Item = {
  id: string;
  name: Record<Lang, string>;
  price: number;
  category: string;
  image: string; // "seed:<key>" or data URL
  outOfStock: boolean;
};

export type PosState = {
  items: Item[];
  categories: Category[];
  sales: Sale[];
  expenses: Expense[];
  expenseCategories: Category[];
  nextOrder: number;
  orderDay: string;
  sessions: Session[];
  lastBackup: number;
  pin: string;
  currency: string;
  lang: Lang;
  waiterPin: string; // 4-digit PIN waiters type to send orders to this register
  linkKey: string; // secret id of this register on the local Wi-Fi relay
  tabs: Tab[];
  waiterLog?: WaiterLogEntry[]; // audit trail of waiter orders (created, modified, cancel requested/approved/rejected)
  staff?: string[]; // waiter names declared by the manager (used for clock-in/out)
  attendance?: Shift[]; // waiter clock-in/out records
};

export type Shift = { id: string; name: string; in: number; out?: number | undefined };
export type ClockEvent = { id: string; name: string; kind: "in" | "out"; at: number };
/** Applies a waiter clock event to the attendance list (idempotent by event id). */
export function applyClock(list: Shift[] | undefined, e: ClockEvent): Shift[] {
  const l = list ?? [];
  if (e.kind === "in") {
    if (l.some((s) => s.id === e.id || (s.name === e.name && !s.out))) return l;
    return [...l, { id: e.id, name: e.name, in: e.at }];
  }
  const open = [...l].reverse().find((s) => s.name === e.name && !s.out);
  return open ? l.map((s) => (s === open ? { ...s, out: Math.max(e.at, s.in) } : s)) : l;
}
/** Milliseconds worked by shifts overlapping [from, to); open shifts count until now. */
export function workedMs(shifts: Shift[], from = 0, to = Infinity, now = Date.now()) {
  return shifts.reduce((a, s) => a + Math.max(0, Math.min(s.out ?? now, to) - Math.max(s.in, from)), 0);
}
export const fmtDuration = (ms: number) => { const m = Math.round(ms / 60000); return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}min`; };
/** Range [start, end) of local days from "YYYY-MM-DD" strings (inclusive end day). */
export function dayRange(from: string, to: string): [number, number] {
  const a = new Date(from + "T00:00:00").getTime();
  const b = new Date((to || from) + "T00:00:00");
  b.setDate(b.getDate() + 1);
  return a <= b.getTime() ? [a, b.getTime()] : [b.getTime() - 86400000, a + 86400000];
}

export type WaiterLogKind = "created" | "modified" | "cancelRequested" | "cancelApproved" | "cancelRejected" | "removed";
export type WaiterLogEntry = { at: number; kind: WaiterLogKind; orderId: string; table?: string | undefined; total: number; detail?: string | undefined };
/** Appends entries to the waiter log, keeping the newest 500. */
export const appendLog = (log: WaiterLogEntry[] | undefined, ...entries: WaiterLogEntry[]) => [...(log ?? []), ...entries].slice(-500);

const SEED_IMAGES: Record<string, string> = MENU_IMAGES;
export const resolveImage = (img: string) =>
  img.startsWith("seed:") ? SEED_IMAGES[img.slice(5)] ?? "" : img;

const seed = (): PosState => ({
  items: MENU_ITEMS.map((i) => ({ ...i, name: { ...i.name } })),
  categories: MENU_CATEGORIES.map((c) => ({ ...c, name: { ...c.name } })),
  sales: [],
  expenses: [],
  expenseCategories: [
    { id: "purchases", name: { en: "Purchases & supplies", fr: "Achats & fournitures", ar: "مشتريات ولوازم" } },
    { id: "salaries", name: { en: "Salaries", fr: "Salaires", ar: "رواتب" } },
    { id: "rent", name: { en: "Rent", fr: "Loyer", ar: "إيجار" } },
    { id: "utilities", name: { en: "Utilities (water, power, gas)", fr: "Charges (eau, électricité, gaz)", ar: "فواتير (ماء، كهرباء، غاز)" } },
    { id: "other", name: { en: "Other", fr: "Autres", ar: "أخرى" } },
  ],
  nextOrder: 1,
  orderDay: "",
  sessions: [],
  lastBackup: 0,
  pin: "1234",
  currency: "DA",
  lang: "fr",
  waiterPin: "",
  linkKey: "",
  tabs: [],
});

const KEY = "pos-state-v2"; // v2: real Mazaj menu (v1 held test data)
let state: PosState | null = null;
const listeners = new Set<() => void>();

function load(): PosState {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? { ...seed(), ...JSON.parse(raw) } : seed();
  } catch {
    state = seed();
  }
  return state!;
}

/** Factory reset: back to a brand-new install (keeps only the display language). */
export function resetToFactory() {
  const lang = load().lang;
  state = { ...seed(), lang };
  try {
    // Drop every app key (old versions, caches) except display preferences.
    const keep = new Set(["mazaj-theme", "mazaj-waiter-host"]);
    Object.keys(localStorage).forEach((k) => { if (!keep.has(k)) localStorage.removeItem(k); });
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch { /* storage unavailable */ }
  listeners.forEach((l) => l());
}

/** Replace the whole state (used by backup restore). */
export function replacePos(next: Partial<PosState>) {
  setPos(() => ({ ...seed(), ...next }));
}

export function setPos(update: (s: PosState) => PosState) {
  state = update(load());
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    alert("Storage full — use smaller photos.");
  }
  listeners.forEach((l) => l());
}

const serverSnap = seed();
export function usePos(): PosState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => load(),
    () => serverSnap,
  );
}

export const fmtOrder = (n: number) => `#${String(n).padStart(3, "0")}`;
export const money = (n: number, c: string) => `${n.toFixed(2)} ${c}`;

export const T = {
  en: { register: "Register", manage: "Menu management", dineIn: "Dine-in", takeaway: "Takeaway", order: "Order", empty: "Tap a dish to add it", total: "Total", cash: "Cash", card: "Card", clear: "Clear", outOfStock: "Out of stock", received: "Amount received", change: "Change owed", exact: "Exact", confirm: "Confirm & print", cancel: "Cancel", cardMsg: "Process the payment on the card terminal, then confirm.", enterPin: "Enter manager PIN", wrongPin: "Wrong PIN", unlock: "Unlock", addItem: "Add item", name: "Name", price: "Price", category: "Category", photo: "Photo", save: "Save", delete: "Delete", inStock: "In stock", settings: "Settings", currency: "Currency", newPin: "New PIN", resetCounter: "Reset order numbers", back: "Back to register", thanks: "Thank you!", paid: "Paid", lock: "Lock", nextOrder: "Next order", burgers: "Burgers", wraps: "Wraps", sides: "Sides", drinks: "Drinks", desserts: "Desserts", all: "All", short: "Not enough" },
  fr: { register: "Caisse", manage: "Gestion du menu", dineIn: "Sur place", takeaway: "À emporter", order: "Commande", empty: "Touchez un plat pour l'ajouter", total: "Total", cash: "Espèces", card: "Carte", clear: "Vider", outOfStock: "Épuisé", received: "Montant reçu", change: "Monnaie à rendre", exact: "Exact", confirm: "Valider & imprimer", cancel: "Annuler", cardMsg: "Encaissez sur le terminal de carte, puis validez.", enterPin: "Code PIN gérant", wrongPin: "Code incorrect", unlock: "Déverrouiller", addItem: "Ajouter un plat", name: "Nom", price: "Prix", category: "Catégorie", photo: "Photo", save: "Enregistrer", delete: "Supprimer", inStock: "Disponible", settings: "Réglages", currency: "Devise", newPin: "Nouveau PIN", resetCounter: "Réinitialiser les numéros", back: "Retour à la caisse", thanks: "Merci !", paid: "Payé", lock: "Verrouiller", nextOrder: "Prochaine commande", burgers: "Burgers", wraps: "Wraps", sides: "Accompagnements", drinks: "Boissons", desserts: "Desserts", all: "Tout", short: "Insuffisant" },
  ar: { register: "الصندوق", manage: "إدارة القائمة", dineIn: "في المطعم", takeaway: "سفري", order: "طلب", empty: "اضغط على طبق لإضافته", total: "المجموع", cash: "نقداً", card: "بطاقة", clear: "مسح", outOfStock: "نفد", received: "المبلغ المستلم", change: "الباقي", exact: "المبلغ بالضبط", confirm: "تأكيد وطباعة", cancel: "إلغاء", cardMsg: "أتمم الدفع على جهاز البطاقة ثم أكّد.", enterPin: "أدخل رمز المدير", wrongPin: "رمز خاطئ", unlock: "فتح", addItem: "إضافة طبق", name: "الاسم", price: "السعر", category: "الفئة", photo: "صورة", save: "حفظ", delete: "حذف", inStock: "متوفر", settings: "الإعدادات", currency: "العملة", newPin: "رمز جديد", resetCounter: "إعادة ترقيم الطلبات", back: "العودة للصندوق", thanks: "شكراً لكم!", paid: "مدفوع", lock: "قفل", nextOrder: "الطلب التالي", burgers: "برغر", wraps: "راب", sides: "مقبلات", drinks: "مشروبات", desserts: "حلويات", all: "الكل", short: "غير كافٍ" },
} as const;
const EXTRA = {
  en: { inventory: "Inventory", reports: "Sales reports", categories: "Categories", addCategory: "Add category", today: "Today", week: "This week", month: "This month", orders: "Orders", revenue: "Revenue", avgTicket: "Average ticket", history: "Sales history", topItems: "Best sellers", noSales: "No sales in this period", uncategorized: "Uncategorized", edit: "Edit", qty: "Qty" },
  fr: { inventory: "Inventaire", reports: "Rapports de ventes", categories: "Catégories", addCategory: "Ajouter une catégorie", today: "Aujourd'hui", week: "Cette semaine", month: "Ce mois", orders: "Commandes", revenue: "Chiffre d'affaires", avgTicket: "Panier moyen", history: "Historique des ventes", topItems: "Meilleures ventes", noSales: "Aucune vente sur cette période", uncategorized: "Sans catégorie", edit: "Modifier", qty: "Qté" },
  ar: { inventory: "المخزون", reports: "تقارير المبيعات", categories: "الفئات", addCategory: "إضافة فئة", today: "اليوم", week: "هذا الأسبوع", month: "هذا الشهر", orders: "الطلبات", revenue: "الإيرادات", avgTicket: "متوسط الطلب", history: "سجل المبيعات", topItems: "الأكثر مبيعاً", noSales: "لا توجد مبيعات في هذه الفترة", uncategorized: "بدون فئة", edit: "تعديل", qty: "الكمية" },
} as const;
export const TX = { en: { ...T.en, ...EXTRA.en }, fr: { ...T.fr, ...EXTRA.fr }, ar: { ...T.ar, ...EXTRA.ar } };

/** Rounds to 2 decimals so money sums never drift (0.1 + 0.2 issues). */
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
/** Parses a typed amount ("1 500,50" → 1500.5); NaN when invalid. */
export const parseAmount = (v: string) => { const n = parseFloat(v.replace(/\s/g, "").replace(",", ".")); return Number.isFinite(n) ? round2(n) : NaN; };

/** Start of the period (local time) containing `now`. Weeks start on Monday. */
export function periodStart(period: "day" | "week" | "month" | "year", now = new Date()): number {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  if (period === "month") d.setDate(1);
  if (period === "year") d.setMonth(0, 1);
  return d.getTime();
}

export function summarize(sales: Sale[], from: number, to = Infinity) {
  const all = sales.filter((x) => x.at >= from && x.at < to);
  const s = all.filter((x) => !x.cancelled);
  const revenue = round2(s.reduce((a, x) => a + x.total, 0));
  const cash = round2(s.filter((x) => x.method === "cash").reduce((a, x) => a + x.total, 0));
  const top = new Map<string, { name: Record<Lang, string>; qty: number; amount: number }>();
  for (const x of s) for (const l of x.lines) {
    const e = top.get(l.id) ?? { name: l.name, qty: 0, amount: 0 };
    e.qty += l.qty; e.amount = round2(e.amount + l.qty * l.price); top.set(l.id, e);
  }
  return { all, sales: s, count: s.length, cancelledCount: all.length - s.length, revenue, cash, card: round2(revenue - cash), avg: s.length ? round2(revenue / s.length) : 0, top: [...top.values()].sort((a, b) => b.qty - a.qty) };
}

/** Expenses since `from`, total and per-category breakdown (largest first). */
export function summarizeExpenses(expenses: Expense[], from: number, to = Infinity) {
  const e = expenses.filter((x) => x.at >= from && x.at < to);
  const byCat = new Map<string, number>();
  for (const x of e) byCat.set(x.category, round2((byCat.get(x.category) ?? 0) + x.amount));
  return { expenses: e, total: round2(e.reduce((a, x) => a + x.amount, 0)), byCat: [...byCat.entries()].sort((a, b) => b[1] - a[1]) };
}

export type TKey = keyof typeof T.en;

/** Local calendar day key YYYY-MM-DD. */
export function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/** Order numbers restart at 1 every calendar day. */
export const currentOrderNum = (s: Pick<PosState, "nextOrder" | "orderDay">, now = Date.now()) =>
  s.orderDay === dayKey(now) ? s.nextOrder : 1;

export const localeOf = (l: Lang) => (l === "ar" ? "ar-DZ" : l === "fr" ? "fr-FR" : "en-GB");
export const fmtDate = (ts: number, l: Lang) => new Date(ts).toLocaleDateString(localeOf(l), { day: "2-digit", month: "2-digit", year: "numeric" });
export const fmtDateTime = (ts: number, l: Lang) =>
  new Date(ts).toLocaleString(localeOf(l), { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

export const openSession = (s: Pick<PosState, "sessions">) => (s.sessions ?? []).find((x) => !x.closedAt);

/** Cash drawer figures for a session (up to its close, or now). */
export function sessionTotals(s: Pick<PosState, "sales" | "expenses">, sess: Session, now = Date.now()) {
  const end = sess.closedAt ?? now;
  const inRange = (t: number) => t >= sess.openedAt && t <= end;
  const all = (s.sales ?? []).filter((x) => inRange(x.at));
  const sales = all.filter((x) => !x.cancelled);
  const cancelled = all.filter((x) => x.cancelled);
  const cash = round2(sales.filter((x) => x.method === "cash").reduce((a, x) => a + x.total, 0));
  const card = round2(sales.filter((x) => x.method === "card").reduce((a, x) => a + x.total, 0));
  const exps = (s.expenses ?? []).filter((x) => inRange(x.at));
  const drawerOut = exps.filter((x) => x.fromDrawer);
  const cashOut = round2(drawerOut.reduce((a, x) => a + x.amount, 0));
  const expensesTotal = round2(exps.reduce((a, x) => a + x.amount, 0));
  const expected = round2(sess.float + cash - cashOut);
  const revenue = round2(cash + card);
  return {
    orders: sales.length, cash, card, cashOut, expected, revenue,
    cancelledCount: cancelled.length, cancelledTotal: round2(cancelled.reduce((a, x) => a + x.total, 0)),
    drawerOut, expensesTotal, net: round2(revenue - expensesTotal),
    diff: sess.counted == null ? null : round2(sess.counted - expected),
  };
}

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
export const toCsv = (rows: (string | number)[][]) => "\uFEFF" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n");

export const CX = {
  en: { openTitle: "Open the register", float: "Starting cash in drawer", open: "Open register", cashDesk: "Register", opened: "Opened", cashSales: "Cash sales", cardSales: "Card sales", cashOut: "Cash paid out", expected: "Expected in drawer", counted: "Cash counted", diff: "Difference", closeReg: "Close register & print", sessions: "Past days", noOpen: "Register is closed", cancelOrder: "Cancel order", cancelled: "Cancelled", reason: "Reason for cancelling (optional)", fromDrawer: "Paid with cash from the drawer", backup: "Backup", exportAll: "Download full backup", restore: "Restore a backup", restoreOk: "Backup restored.", restoreBad: "This file is not a valid MAZAJ backup.", restoreConfirm: "Replace ALL current data with this backup?", csvSales: "Sales (Excel CSV)", csvExp: "Expenses (Excel CSV)", csvMenu: "Menu (Excel CSV)", lastBackup: "Last backup", never: "Never", remind: "No backup for more than 7 days — download one now.", zReport: "DAILY CLOSING", gained: "Takings of the day" },
  fr: { openTitle: "Ouverture de caisse", float: "Fond de caisse", open: "Ouvrir la caisse", cashDesk: "Caisse", opened: "Ouverte le", cashSales: "Ventes espèces", cardSales: "Ventes carte", cashOut: "Sorties de caisse", expected: "Attendu en caisse", counted: "Espèces comptées", diff: "Écart", closeReg: "Clôturer & imprimer", sessions: "Jours précédents", noOpen: "Caisse fermée", cancelOrder: "Annuler la commande", cancelled: "Annulée", reason: "Motif d'annulation (facultatif)", fromDrawer: "Payé en espèces depuis la caisse", backup: "Sauvegarde", exportAll: "Télécharger la sauvegarde complète", restore: "Restaurer une sauvegarde", restoreOk: "Sauvegarde restaurée.", restoreBad: "Ce fichier n'est pas une sauvegarde MAZAJ valide.", restoreConfirm: "Remplacer TOUTES les données actuelles par cette sauvegarde ?", csvSales: "Ventes (CSV Excel)", csvExp: "Charges (CSV Excel)", csvMenu: "Menu (CSV Excel)", lastBackup: "Dernière sauvegarde", never: "Jamais", remind: "Aucune sauvegarde depuis plus de 7 jours — téléchargez-en une.", zReport: "CLÔTURE DE CAISSE", gained: "Recette du jour" },
  ar: { openTitle: "فتح الصندوق", float: "المبلغ الافتتاحي في الدرج", open: "فتح الصندوق", cashDesk: "الصندوق", opened: "فُتح في", cashSales: "مبيعات نقدية", cardSales: "مبيعات بالبطاقة", cashOut: "مصاريف من الصندوق", expected: "المتوقع في الدرج", counted: "النقد المعدود", diff: "الفرق", closeReg: "إغلاق الصندوق وطباعة", sessions: "الأيام السابقة", noOpen: "الصندوق مغلق", cancelOrder: "إلغاء الطلب", cancelled: "ملغى", reason: "سبب الإلغاء (اختياري)", fromDrawer: "مدفوع نقداً من الصندوق", backup: "النسخ الاحتياطي", exportAll: "تنزيل نسخة احتياطية كاملة", restore: "استعادة نسخة احتياطية", restoreOk: "تمت الاستعادة.", restoreBad: "هذا الملف ليس نسخة احتياطية صالحة.", restoreConfirm: "استبدال كل البيانات الحالية بهذه النسخة؟", csvSales: "المبيعات (CSV)", csvExp: "المصاريف (CSV)", csvMenu: "القائمة (CSV)", lastBackup: "آخر نسخة", never: "أبداً", remind: "لا توجد نسخة احتياطية منذ أكثر من 7 أيام — نزّل واحدة الآن.", zReport: "إغلاق الصندوق", gained: "إيراد اليوم" },
};

/** Adds `extra` quantities into `base`, grouping by item id. */
export function mergeLines(base: SaleLine[], extra: SaleLine[]): SaleLine[] {
  const out = base.map((l) => ({ ...l }));
  for (const e of extra) {
    const f = out.find((l) => l.id === e.id);
    if (f) f.qty += e.qty;
    else out.push({ ...e });
  }
  return out.filter((l) => l.qty > 0);
}
export const linesTotal = (lines: SaleLine[]) => lines.reduce((s, l) => s + l.price * l.qty, 0);

/** Menu search: case/accent-insensitive match on any of the three language names. */
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
export function matchItem(item: { name: Record<Lang, string> }, q: string) {
  const n = norm(q);
  if (!n) return true;
  return (["en", "fr", "ar"] as const).some((l) => norm(item.name[l] ?? "").includes(n));
}

/** Algerian banknotes and coins used by the cash counter at closing. */
export const DENOMS = [2000, 1000, 500, 200, 100, 50, 20, 10, 5] as const;
/** Exact total of a bill/coin count, e.g. { "1000": 15 } → 15000. */
export const denomTotal = (d: Record<string, number>) => DENOMS.reduce((s, v) => s + v * Math.max(0, Math.floor(d[String(v)] || 0)), 0);
