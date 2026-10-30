import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
const logoAsset = { url: "/mazaj-logo.jpg" };
import { Minus, Plus, Trash2, Banknote, CreditCard, ShieldCheck, ReceiptText, Printer, X, Smartphone, Search, Utensils, ChefHat, Clock } from "lucide-react";
import { T, TX, CX, currentOrderNum, dayKey, fmtDateTime, openSession, fmtOrder, money, resolveImage, matchItem, mergeLines, linesTotal, type SaleLine, type Tab, setPos, usePos, type Item, type Lang, type Sale } from "@/lib/pos";
import { LangBar, useDir } from "@/components/LangBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Splash } from "@/components/Splash";
import { newPin, useWaiterLink, type WaiterOrder } from "@/lib/waiterLink";
import { QRCodeSVG } from "qrcode.react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Register — MAZAJ Coffee Shop" },
      { name: "description", content: "MAZAJ Coffee Shop register: touch-friendly menu with photos, cash & card checkout and receipt printing." },
      { property: "og:title", content: "Register — MAZAJ Coffee Shop" },
      { property: "og:description", content: "MAZAJ Coffee Shop register with photo menu and receipt printing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Register,
});

type Line = { item: Item; qty: number };
type OrderType = "dineIn" | "takeaway";
type Done = { num: number; type: OrderType; lines: Line[]; total: number; method: "cash" | "card"; received?: number | undefined; at: number; lang: Lang; table?: string | undefined; receipt?: boolean; kitchen?: boolean; note?: string | undefined };

function Register() {
  useDir();
  const pos = usePos();
  const t = TX[pos.lang];
  const c = CX[pos.lang];
  const orderNum = currentOrderNum(pos);
  const session = openSession(pos);
  const [float, setFloat] = useState("");
  const [now, setNow] = useState(0);
  useEffect(() => setNow(Date.now()), []);
  const [cat, setCat] = useState<string>("all");
  const [cart, setCart] = useState<Line[]>([]);
  const [type, setType] = useState<OrderType>("dineIn");
  const [pay, setPay] = useState<null | "cash" | "card">(null);
  const [received, setReceived] = useState("");
  const [printed, setPrinted] = useState<Done | null>(null);
  const [fromWaiter, setFromWaiter] = useState<WaiterOrder | null>(null);
  const [showWaiter, setShowWaiter] = useState(false);
  const link = useWaiterLink(pos);
  const [q, setQ] = useState("");
  const [printRec, setPrintRec] = useState(true);
  const [printKit, setPrintKit] = useState(true);
  const [tabId, setTabId] = useState<string | null>(null);
  const [showTabs, setShowTabs] = useState(false);
  const [alertOrder, setAlertOrder] = useState<WaiterOrder | null>(null);
  const seenIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(link.orders.map((o) => o.id));
    if (seenIds.current) {
      const fresh = link.orders.find((o) => !seenIds.current!.has(o.id));
      if (fresh) setAlertOrder(fresh);
    }
    seenIds.current = ids;
  }, [link.orders]);
  useEffect(() => {
    if (!alertOrder) return;
    const id = setTimeout(() => setAlertOrder(null), 15000);
    return () => clearTimeout(id);
  }, [alertOrder]);
  const tabs = pos.tabs ?? [];
  const curTab = tabs.find((x) => x.id === tabId);
  const P = {
    en: { search: "Search the menu…", receipt: "Customer receipt", kitchen: "Kitchen ticket", kitchenBtn: "Kitchen ticket", newOrder: "New waiter order", view: "View", tables: "Open tables", noTables: "No open tables", hold: "Save to table", tableQ: "Table number?", open: "Open", addTab: "Add to table bill", del: "Delete", confirmDel: "Delete this open table bill?", min: "min", tab: "Table bill" },
    fr: { search: "Rechercher dans le menu…", receipt: "Ticket client", kitchen: "Ticket cuisine", kitchenBtn: "Ticket cuisine", newOrder: "Nouvelle commande serveur", view: "Voir", tables: "Tables ouvertes", noTables: "Aucune table ouverte", hold: "Garder sur la table", tableQ: "Numéro de table ?", open: "Ouvrir", addTab: "Ajouter à la table", del: "Supprimer", confirmDel: "Supprimer cette addition ouverte ?", min: "min", tab: "Addition table" },
    ar: { search: "ابحث في القائمة…", receipt: "وصل الزبون", kitchen: "تذكرة المطبخ", kitchenBtn: "تذكرة المطبخ", newOrder: "طلب نادل جديد", view: "عرض", tables: "الطاولات المفتوحة", noTables: "لا توجد طاولات مفتوحة", hold: "حفظ على الطاولة", tableQ: "رقم الطاولة؟", open: "فتح", addTab: "إضافة إلى فاتورة الطاولة", del: "حذف", confirmDel: "حذف فاتورة الطاولة المفتوحة؟", min: "د", tab: "فاتورة طاولة" },
  }[pos.lang];
  const toSaleLines = (ls: Line[]): SaleLine[] => ls.map((l) => ({ id: l.item.id, name: l.item.name, price: l.item.price, qty: l.qty }));
  const toCart = (ls: SaleLine[]): Line[] => ls.map((l) => ({ qty: l.qty, item: pos.items.find((i) => i.id === l.id) ?? ({ id: l.id, name: l.name, price: l.price, category: "", image: "", outOfStock: false } as Item) }));
  const kitchenOnly = (lines: SaleLine[], table?: string, note?: string, ty: OrderType = "dineIn") =>
    setPrinted({ num: 0, type: ty, lines: toCart(lines), total: linesTotal(lines), method: "cash", at: Date.now(), lang: pos.lang, table, receipt: false, kitchen: true, note });
  /** Adds lines to the open bill of `table` (creating it) and returns the new items to send to the kitchen. */
  const addToTab = (table: string, lines: SaleLine[]) =>
    setPos((s) => {
      const list = s.tabs ?? [];
      const ex = list.find((x) => x.table.toLowerCase() === table.toLowerCase());
      return { ...s, tabs: ex ? list.map((x) => (x === ex ? { ...x, lines: mergeLines(x.lines, lines) } : x)) : [...list, { id: crypto.randomUUID(), table, openedAt: Date.now(), lines }] };
    });
  const holdToTable = () => {
    const lines = toSaleLines(cart);
    if (curTab) {
      const delta = lines.map((l) => ({ ...l, qty: l.qty - (curTab.lines.find((x) => x.id === l.id)?.qty ?? 0) })).filter((l) => l.qty > 0);
      setPos((s) => ({ ...s, tabs: (s.tabs ?? []).map((x) => (x.id === curTab.id ? { ...x, lines } : x)) }));
      if (delta.length && printKit) kitchenOnly(delta, curTab.table);
    } else {
      const table = (fromWaiter?.table ?? window.prompt(P.tableQ) ?? "").trim();
      if (!table) return;
      addToTab(table, lines);
      if (fromWaiter) void link.done(fromWaiter.id);
      else if (printKit) kitchenOnly(lines, table);
    }
    setCart([]); setTabId(null); setFromWaiter(null);
  };
  const openTab = (x: Tab) => { setCart(toCart(x.lines)); setType("dineIn"); setTabId(x.id); setFromWaiter(null); setShowTabs(false); };
  const minsSince = (t0: number) => Math.max(0, Math.floor(((now || Date.now()) - t0) / 60000));
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id); }, []);
  const [waiterHost, setWaiterHost] = useState("");
  useEffect(() => { setWaiterHost(localStorage.getItem("mazaj-waiter-host") || window.location.origin); }, []);
  const waiterUrl = waiterHost.trim() ? `${waiterHost.trim().replace(/\/+$/, "").replace(/\/waiter$/, "")}/waiter` : "";
  const W = {
    en: { title: "Waiter orders", none: "No waiter orders waiting", pin: "Waiter PIN", addr: "Waiters open on their phone (same Wi-Fi):", hint: "Replace the address with this PC's Wi-Fi IP (Windows: ipconfig → IPv4).", cashOut: "Cash out", remove: "Remove", table: "Table", newPin: "New PIN", offline: "Link offline", online: "Link active", confirmRemove: "Remove this waiter order?" },
    fr: { title: "Commandes serveurs", none: "Aucune commande serveur en attente", pin: "PIN serveurs", addr: "Les serveurs ouvrent sur leur téléphone (même Wi-Fi) :", hint: "Remplacez l'adresse par l'IP Wi-Fi de ce PC (Windows : ipconfig → IPv4).", cashOut: "Encaisser", remove: "Retirer", table: "Table", newPin: "Nouveau PIN", offline: "Liaison hors ligne", online: "Liaison active", confirmRemove: "Retirer cette commande serveur ?" },
    ar: { title: "طلبات النُدُل", none: "لا توجد طلبات في الانتظار", pin: "رمز النُدُل", addr: "يفتح النُدُل على هواتفهم (نفس الواي فاي):", hint: "استبدل العنوان بعنوان IP لهذا الحاسوب (ويندوز: ipconfig ← IPv4).", cashOut: "تحصيل", remove: "حذف", table: "طاولة", newPin: "رمز جديد", offline: "الربط غير متصل", online: "الربط نشط", confirmRemove: "حذف طلب النادل هذا؟" },
  }[pos.lang];
  const loadWaiter = (o: WaiterOrder) => {
    setCart(o.lines.map((l) => ({ qty: l.qty, item: pos.items.find((i) => i.id === l.id) ?? ({ id: l.id, name: l.name, price: l.price, category: "", image: "", outOfStock: false } as Item) })));
    setType(o.type);
    setFromWaiter(o);
    setTabId(null);
    setShowWaiter(false);
  };

  const total = useMemo(() => cart.reduce((s, l) => s + l.item.price * l.qty, 0), [cart]);
  const items = pos.items.filter((i) => (q.trim() ? matchItem(i, q) : cat === "all" || i.category === cat));
  const usedCats = pos.categories.filter((c) => pos.items.some((i) => i.category === c.id));

  const add = (item: Item) => {
    if (item.outOfStock) return;
    setCart((c) => {
      const f = c.find((l) => l.item.id === item.id);
      return f ? c.map((l) => (l === f ? { ...l, qty: l.qty + 1 } : l)) : [...c, { item, qty: 1 }];
    });
  };
  const bump = (id: string, d: number) =>
    setCart((c) => c.map((l) => (l.item.id === id ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0));

  const rec = parseFloat(received.replace(",", ".")) || 0;
  const presets = Array.from(new Set([Math.ceil(total), Math.ceil(total / 5) * 5, Math.ceil(total / 10) * 10, 20, 50, 100, 200]))
    .filter((v) => v >= total && v > 0).sort((a, b) => a - b).slice(0, 6);

  const confirm = () => {
    const at = Date.now();
    const table = curTab?.table ?? fromWaiter?.table;
    const done: Done = { num: orderNum, type, lines: cart, total, method: pay!, received: pay === "cash" ? rec : undefined, at, lang: pos.lang, table, receipt: printRec, kitchen: printKit };
    if (fromWaiter) { void link.done(fromWaiter.id); setFromWaiter(null); }
    if (curTab) { setPos((s) => ({ ...s, tabs: (s.tabs ?? []).filter((x) => x.id !== curTab.id) })); setTabId(null); }
    setPos((s) => ({ ...s, nextOrder: currentOrderNum(s, at) + 1, orderDay: dayKey(at), sales: [...(s.sales ?? []), { num: currentOrderNum(s, at), at, type, method: pay!, total, table, lines: cart.map((l) => ({ id: l.item.id, name: l.item.name, price: l.item.price, qty: l.qty })) }] }));
    if (printRec || printKit) setPrinted(done);
    setCart([]);
    setPay(null);
    setReceived("");
  };

  useEffect(() => {
    if (!printed) return;
    const id = setTimeout(() => window.print(), 150);
    return () => clearTimeout(id);
  }, [printed]);
  useEffect(() => {
    const after = () => setPrinted(null);
    window.addEventListener("afterprint", after);
    return () => window.removeEventListener("afterprint", after);
  }, []);

  const [showOrders, setShowOrders] = useState(false);
  const L = {
    en: { title: "Today's orders", none: "No orders yet today", reprint: "Reprint", confirm: "Cancel this order?", reason: "Reason (optional)" },
    fr: { title: "Commandes du jour", none: "Aucune commande aujourd'hui", reprint: "Réimprimer", confirm: "Annuler cette commande ?", reason: "Motif (facultatif)" },
    ar: { title: "طلبات اليوم", none: "لا توجد طلبات اليوم", reprint: "إعادة الطباعة", confirm: "إلغاء هذا الطلب؟", reason: "السبب (اختياري)" },
  }[pos.lang];
  const today = dayKey(now || Date.now());
  const todays = now ? (pos.sales ?? []).filter((s) => dayKey(s.at) === today).sort((a, b) => b.at - a.at) : [];
  const cancelSale = (s: Sale) => {
    if (!window.confirm(`${L.confirm} ${fmtOrder(s.num)}`)) return;
    const reason = window.prompt(L.reason) ?? "";
    setPos((st) => ({ ...st, sales: st.sales.map((x) => (x.at === s.at && x.num === s.num ? { ...x, cancelled: { at: Date.now(), reason: reason.trim() || undefined } } : x)) }));
  };
  const reprint = (s: Sale) =>
    setPrinted({ num: s.num, type: s.type, method: s.method, total: s.total, at: s.at, lang: pos.lang, lines: s.lines.map((l) => ({ qty: l.qty, item: { id: l.id, name: l.name, price: l.price } as unknown as Item })) });

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="relative z-50 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card px-4 py-3 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <img src={logoAsset.url} alt="MAZAJ Coffee Shop" className="h-11 w-11 shrink-0 rounded-xl border border-border object-cover" />
          <h1 className="truncate font-display text-xl font-extrabold">MAZAJ <span className="font-bold text-muted-foreground">· {t.register}</span></h1>
          <span className="hidden rounded-lg bg-accent px-3 py-1 text-sm font-bold text-accent-foreground sm:inline">{t.nextOrder} {fmtOrder(orderNum)}</span>
        </div>
        <div className="flex items-center gap-2">
          <LangBar />
          <ThemeToggle />
          <button onClick={() => setShowWaiter(true)} aria-label={W.title} title={W.title} className={`relative flex h-12 items-center gap-2 rounded-xl px-3 font-bold ${link.orders.length ? "animate-pulse bg-success text-success-foreground" : "bg-muted text-foreground"}`}><Smartphone /><span className="hidden lg:inline">{W.title}</span>{link.orders.length > 0 && <span className="absolute -end-1.5 -top-1.5 min-w-5 rounded-full bg-primary px-1.5 text-xs leading-5 text-primary-foreground">{link.orders.length}</span>}</button>
          <button onClick={() => setShowTabs(true)} aria-label={P.tables} title={P.tables} className="relative flex h-12 items-center gap-2 rounded-xl bg-muted px-3 font-bold text-foreground"><Utensils /><span className="hidden lg:inline">{P.tables}</span>{tabs.length > 0 && <span className="absolute -end-1.5 -top-1.5 min-w-5 rounded-full bg-primary px-1.5 text-xs leading-5 text-primary-foreground">{tabs.length}</span>}</button>
          <button onClick={() => setShowOrders(true)} aria-label={L.title} title={L.title} className="relative flex h-12 items-center gap-2 rounded-xl bg-accent px-3 font-bold text-accent-foreground"><ReceiptText /><span className="hidden sm:inline">{L.title}</span>{todays.length > 0 && <span className="absolute -end-1.5 -top-1.5 min-w-5 rounded-full bg-primary px-1.5 text-xs leading-5 text-primary-foreground">{todays.length}</span>}</button>
          <Link to="/manage" aria-label="Management" title="Management" className="flex h-12 items-center gap-2 rounded-xl bg-primary px-3 font-bold text-primary-foreground"><ShieldCheck /><span className="hidden sm:inline">{{ en: "Management", fr: "Gestion", ar: "الإدارة" }[pos.lang]}</span></Link>
        </div>
        <Splash />
      </header>

      {alertOrder && (
        <div role="alert" className="flex items-center gap-3 bg-success px-4 py-3 text-success-foreground">
          <Smartphone className="shrink-0 animate-bounce" />
          <span className="min-w-0 flex-1 truncate text-lg font-extrabold">{P.newOrder} · {alertOrder.table ? `${W.table} ${alertOrder.table}` : t.takeaway} · {money(alertOrder.total, pos.currency)}</span>
          <button onClick={() => { kitchenOnly(alertOrder.lines, alertOrder.table, alertOrder.note, alertOrder.type); }} className="flex h-11 items-center gap-2 rounded-lg bg-background px-3 font-bold text-foreground"><ChefHat size={18} /><span className="hidden sm:inline">{P.kitchenBtn}</span></button>
          <button onClick={() => { setShowWaiter(true); setAlertOrder(null); }} className="h-11 rounded-lg bg-background/20 px-3 font-bold">{P.view}</button>
          <button onClick={() => setAlertOrder(null)} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-lg bg-background/20"><X size={18} /></button>
        </div>
      )}
      {now > 0 && now - (pos.lastBackup ?? 0) > 7 * 864e5 && (
        <Link to="/settings" className="bg-accent px-4 py-2 text-center text-sm font-bold text-accent-foreground">{c.remind}</Link>
      )}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <main className="flex min-h-0 flex-1 flex-col">
          <div className="px-4 pt-3">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={P.search} className="h-12 w-full rounded-xl border border-input bg-card ps-10 pe-10 font-semibold" />
              {q && <button onClick={() => setQ("")} aria-label="Clear" className="absolute end-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg bg-muted"><X size={16} /></button>}
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 py-3">
            {[{ id: "all", label: t.all }, ...usedCats.map((c) => ({ id: c.id, label: c.name[pos.lang] }))].map((c) => (
              <button key={c.id} onClick={() => { setCat(c.id); setQ(""); }} className={`h-12 shrink-0 rounded-full px-5 font-bold ${!q && cat === c.id ? "bg-foreground text-background" : "bg-card text-foreground border border-border"}`}>{c.label}</button>
            ))}
          </div>
          <div className="grid flex-1 auto-rows-max grid-cols-2 gap-3 overflow-y-auto px-4 pb-4 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((i) => (
              <button key={i.id} onClick={() => add(i)} disabled={i.outOfStock} className="group relative overflow-hidden rounded-2xl border border-border bg-card text-start shadow-sm transition active:scale-95 disabled:opacity-50">
                <div className="aspect-[4/3] bg-muted">{i.image && <img src={resolveImage(i.image)} alt={i.name[pos.lang]} className="h-full w-full object-cover" />}</div>
                <div className="flex items-end justify-between gap-2 p-3">
                  <span className="font-bold leading-tight">{i.name[pos.lang]}</span>
                  <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-sm font-extrabold text-primary">{money(i.price, pos.currency)}</span>
                </div>
                {i.outOfStock && <span className="absolute start-2 top-2 rounded-md bg-destructive px-2 py-1 text-xs font-bold text-destructive-foreground">{t.outOfStock}</span>}
              </button>
            ))}
          </div>
        </main>

        <aside className="flex max-h-[45dvh] w-full flex-col border-t border-border bg-card md:max-h-none md:w-96 md:border-s md:border-t-0">
          <div className="flex items-center justify-between gap-2 p-4">
            <div className="font-display text-lg font-extrabold">{t.order} {fmtOrder(orderNum)}{fromWaiter?.table && <span className="ms-2 rounded-md bg-success px-2 py-0.5 text-sm text-success-foreground">{W.table} {fromWaiter.table}</span>}{curTab && <span className="ms-2 rounded-md bg-accent px-2 py-0.5 text-sm text-accent-foreground">{W.table} {curTab.table}</span>}</div>
            <div className="flex rounded-xl bg-muted p-1">
              {(["dineIn", "takeaway"] as const).map((o) => (
                <button key={o} onClick={() => setType(o)} className={`h-10 rounded-lg px-3 text-sm font-bold ${type === o ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>{t[o]}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4">
            {cart.length === 0 && <p className="py-8 text-center text-muted-foreground">{t.empty}</p>}
            {cart.map((l) => (
              <div key={l.item.id} className="flex items-center gap-2 border-b border-border py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{l.item.name[pos.lang]}</div>
                  <div className="text-sm text-muted-foreground">{money(l.item.price * l.qty, pos.currency)}</div>
                </div>
                <button onClick={() => bump(l.item.id, -1)} className="grid h-11 w-11 place-items-center rounded-xl bg-muted"><Minus size={18} /></button>
                <span className="w-6 text-center font-extrabold">{l.qty}</span>
                <button onClick={() => bump(l.item.id, 1)} className="grid h-11 w-11 place-items-center rounded-xl bg-muted"><Plus size={18} /></button>
              </div>
            ))}
          </div>
          <div className="space-y-3 border-t border-border p-4">
            <div className="flex items-center justify-between font-display text-2xl font-black"><span>{t.total}</span><span>{money(total, pos.currency)}</span></div>
            {type === "dineIn" && (
              <button onClick={holdToTable} disabled={!cart.length} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent font-bold text-accent-foreground disabled:opacity-40"><Utensils size={18} />{P.hold}{curTab ? ` · ${curTab.table}` : fromWaiter?.table ? ` · ${fromWaiter.table}` : ""}</button>
            )}
            <div className="grid grid-cols-[auto_1fr_1fr] gap-2">
              <button onClick={() => { setCart([]); setFromWaiter(null); setTabId(null); }} disabled={!cart.length} aria-label={t.clear} className="grid h-14 w-14 place-items-center rounded-xl bg-muted disabled:opacity-40"><Trash2 /></button>
              <button onClick={() => setPay("cash")} disabled={!cart.length} className="flex h-14 items-center justify-center gap-2 rounded-xl bg-success text-lg font-extrabold text-success-foreground disabled:opacity-40"><Banknote />{t.cash}</button>
              <button onClick={() => setPay("card")} disabled={!cart.length} className="flex h-14 items-center justify-center gap-2 rounded-xl bg-primary text-lg font-extrabold text-primary-foreground disabled:opacity-40"><CreditCard />{t.card}</button>
            </div>
          </div>
        </aside>
      </div>

      {pay && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-4">
          <div className="w-full max-w-md space-y-4 rounded-3xl bg-card p-6 shadow-xl">
            <div className="flex justify-between font-display text-2xl font-black"><span>{t.total}</span><span>{money(total, pos.currency)}</span></div>
            {pay === "cash" ? (
              <>
                <label className="block text-sm font-bold text-muted-foreground">{t.received}</label>
                <input inputMode="decimal" autoFocus value={received} onChange={(e) => setReceived(e.target.value)} className="h-14 w-full rounded-xl border border-input bg-background px-4 text-2xl font-bold" />
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setReceived(total.toFixed(2))} className="h-12 rounded-xl bg-accent font-bold text-accent-foreground">{t.exact}</button>
                  {presets.map((p) => <button key={p} onClick={() => setReceived(String(p))} className="h-12 rounded-xl bg-muted font-bold">{p} {pos.currency}</button>)}
                </div>
                <div className={`flex justify-between rounded-xl p-4 text-xl font-black ${rec >= total ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}>
                  <span>{t.change}</span><span>{rec >= total ? money(rec - total, pos.currency) : t.short}</span>
                </div>
              </>
            ) : <p className="text-lg">{t.cardMsg}</p>}
            <div className="grid grid-cols-2 gap-2">
              {([[P.receipt, printRec, setPrintRec, Printer], [P.kitchen, printKit, setPrintKit, ChefHat]] as const).map(([label, on, set, Icon]) => (
                <button key={label} onClick={() => set(!on)} aria-pressed={on} className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-bold ${on ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground line-through"}`}><Icon size={16} />{label}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPay(null)} className="h-14 rounded-xl bg-muted font-bold">{t.cancel}</button>
              <button onClick={confirm} disabled={pay === "cash" && rec < total} className="h-14 rounded-xl bg-primary font-extrabold text-primary-foreground disabled:opacity-40">{t.confirm}</button>
            </div>
          </div>
        </div>
      )}

      {now > 0 && !session && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-foreground/50 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-3xl bg-card p-6 text-center shadow-xl">
            <img src={logoAsset.url} alt="MAZAJ Coffee Shop" className="mx-auto h-20 w-20 rounded-2xl object-cover" />
            <h2 className="font-display text-2xl font-black">{c.openTitle}</h2>
            <label className="block text-sm font-bold text-muted-foreground">{c.float} ({pos.currency})</label>
            <input inputMode="decimal" autoFocus value={float} onChange={(e) => setFloat(e.target.value)} placeholder="0.00" className="h-14 w-full rounded-xl border border-input bg-background px-4 text-center text-2xl font-bold" />
            <button onClick={() => { const f = parseFloat(float.replace(",", ".")) || 0; setPos((s) => ({ ...s, sessions: [...(s.sessions ?? []), { id: crypto.randomUUID(), openedAt: Date.now(), float: f }] })); setFloat(""); }} className="h-14 w-full rounded-xl bg-primary text-lg font-extrabold text-primary-foreground">{c.open}</button>
          </div>
        </div>
      )}

      {showOrders && (
        <div className="fixed inset-0 z-40 flex justify-end bg-foreground/40" onClick={() => setShowOrders(false)}>
          <div className="flex h-full w-full max-w-md flex-col bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="font-display text-xl font-extrabold">{L.title} ({todays.length})</h2>
              <button onClick={() => setShowOrders(false)} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted"><X /></button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {todays.length === 0 && <p className="py-10 text-center text-muted-foreground">{L.none}</p>}
              {todays.map((s) => (
                <div key={s.at} className={`rounded-xl bg-muted p-3 ${s.cancelled ? "opacity-60" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-extrabold">{fmtOrder(s.num)}</span>
                    <span className="text-sm text-muted-foreground">{fmtDateTime(s.at, pos.lang)}</span>
                    <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">{t[s.type]}</span>
                    <span className="rounded-md bg-background px-2 py-0.5 text-xs font-bold">{t[s.method]}</span>
                    {s.cancelled && <span className="rounded-md bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">{c.cancelled}</span>}
                    <span className={`ms-auto font-bold ${s.cancelled ? "line-through" : ""}`}>{money(s.total, pos.currency)}</span>
                  </div>
                  <ul className="mt-1 text-sm">
                    {s.lines.map((l) => <li key={l.id}>{l.qty} × {l.name[pos.lang]}</li>)}
                  </ul>
                  {s.cancelled ? (
                    <p className="pt-1 text-sm text-destructive">{c.cancelled} · {fmtDateTime(s.cancelled.at, pos.lang)}{s.cancelled.reason ? ` · ${s.cancelled.reason}` : ""}</p>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => reprint(s)} className="flex h-11 items-center gap-2 rounded-lg bg-background px-3 font-bold"><Printer className="h-4 w-4" />{L.reprint}</button>
                      <button onClick={() => cancelSale(s)} className="h-11 rounded-lg bg-destructive/10 px-3 font-bold text-destructive">{c.cancelOrder}</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showWaiter && (
        <div className="fixed inset-0 z-40 flex justify-end bg-foreground/40" onClick={() => setShowWaiter(false)}>
          <div className="flex h-full w-full max-w-md flex-col bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="font-display text-xl font-extrabold">{W.title} ({link.orders.length})</h2>
              <button onClick={() => setShowWaiter(false)} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted"><X /></button>
            </div>
            <div className="space-y-2 border-b border-border bg-muted/50 p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${link.online ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}>{link.online ? W.online : W.offline}</span>
                <span className="font-bold">{W.pin}: <span className="font-display text-2xl font-black tracking-widest">{pos.waiterPin}</span></span>
                <button onClick={() => setPos((s) => ({ ...s, waiterPin: newPin() }))} className="h-9 rounded-lg bg-background px-2 text-xs font-bold">{W.newPin}</button>
              </div>
              <p>{W.addr}</p>
              <input dir="ltr" value={waiterHost} onChange={(e) => { setWaiterHost(e.target.value); localStorage.setItem("mazaj-waiter-host", e.target.value); }} placeholder="http://192.168.1.10:8080" className="h-11 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm" />
              {waiterUrl && (
                <div className="flex flex-col items-center gap-1 rounded-lg bg-background p-3">
                  <QRCodeSVG value={waiterUrl} size={180} />
                  <b dir="ltr" className="select-all text-xs">{waiterUrl}</b>
                </div>
              )}
              <p className="text-muted-foreground">{W.hint}</p>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {link.orders.length === 0 && <p className="py-10 text-center text-muted-foreground">{W.none}</p>}
              {[...link.orders].reverse().map((o) => (
                <div key={o.id} className="rounded-xl bg-muted p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-extrabold">{o.table ? `${W.table} ${o.table}` : t.takeaway}</span>
                    <span className="text-sm text-muted-foreground">{fmtDateTime(o.at, pos.lang)}</span>
                    <span className="ms-auto font-bold">{money(o.total, pos.currency)}</span>
                  </div>
                  <ul className="mt-1 text-sm">{o.lines.map((l) => <li key={l.id}>{l.qty} × {l.name[pos.lang]}</li>)}</ul>
                  {o.note && <p className="mt-1 text-sm italic">“{o.note}”</p>}
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => loadWaiter(o)} className="h-11 flex-1 rounded-lg bg-success px-3 font-bold text-success-foreground">{W.cashOut}</button>
                    <button onClick={() => kitchenOnly(o.lines, o.table, o.note, o.type)} aria-label={P.kitchenBtn} title={P.kitchenBtn} className="flex h-11 items-center gap-1 rounded-lg bg-background px-3 font-bold"><ChefHat size={18} /></button>
                    {o.table && <button onClick={() => { addToTab(o.table!, o.lines); void link.done(o.id); }} title={P.addTab} className="flex h-11 items-center gap-1 rounded-lg bg-accent px-3 text-sm font-bold text-accent-foreground"><Utensils size={16} /><span className="hidden sm:inline">{P.addTab}</span></button>}
                    <button onClick={() => { if (window.confirm(W.confirmRemove)) void link.done(o.id); }} className="h-11 rounded-lg bg-destructive/10 px-3 font-bold text-destructive">{W.remove}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showTabs && (
        <div className="fixed inset-0 z-40 flex justify-end bg-foreground/40" onClick={() => setShowTabs(false)}>
          <div className="flex h-full w-full max-w-md flex-col bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="font-display text-xl font-extrabold">{P.tables} ({tabs.length})</h2>
              <button onClick={() => setShowTabs(false)} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted"><X /></button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {tabs.length === 0 && <p className="py-10 text-center text-muted-foreground">{P.noTables}</p>}
              {tabs.map((x) => (
                <div key={x.id} className={`rounded-xl bg-muted p-3 ${x.id === tabId ? "ring-2 ring-primary" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-extrabold">{W.table} {x.table}</span>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground"><Clock size={14} />{minsSince(x.openedAt)} {P.min}</span>
                    <span className="ms-auto font-bold">{money(linesTotal(x.lines), pos.currency)}</span>
                  </div>
                  <ul className="mt-1 text-sm">{x.lines.map((l) => <li key={l.id}>{l.qty} × {l.name[pos.lang]}</li>)}</ul>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => openTab(x)} className="h-11 flex-1 rounded-lg bg-success px-3 font-bold text-success-foreground">{P.open}</button>
                    <button onClick={() => { if (window.confirm(P.confirmDel)) { setPos((s) => ({ ...s, tabs: (s.tabs ?? []).filter((y) => y.id !== x.id) })); if (tabId === x.id) { setTabId(null); setCart([]); } } }} className="h-11 rounded-lg bg-destructive/10 px-3 font-bold text-destructive">{P.del}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {printed && <PrintArea done={printed} currency={pos.currency} />}
    </div>
  );
}

function PrintArea({ done, currency }: { done: Done; currency: string }) {
  const t = T[done.lang];
  const fr = T.fr;
  return (
    <div id="print-area" dir={done.lang === "ar" ? "rtl" : "ltr"}>
      {done.receipt !== false && <div className="receipt">
        <h2>MAZAJ COFFEE SHOP</h2>
        <p className="c">{fmtDateTime(done.at, done.lang)}</p>
        <p className="big c">{t.order} {fmtOrder(done.num)}</p>
        <p className="c">{t[done.type]}{done.table ? ` · Table ${done.table}` : ""}</p>
        <hr />
        {done.lines.map((l) => (
          <div className="row" key={l.item.id}><span>{l.qty} × {l.item.name[done.lang]}</span><span>{money(l.item.price * l.qty, currency)}</span></div>
        ))}
        <hr />
        <div className="row big"><span>{t.total}</span><span>{money(done.total, currency)}</span></div>
        <div className="row"><span>{t.paid} ({t[done.method]})</span><span>{money(done.received ?? done.total, currency)}</span></div>
        {done.method === "cash" && <div className="row"><span>{t.change}</span><span>{money((done.received ?? 0) - done.total, currency)}</span></div>}
        <hr />
        <p className="c">{t.thanks}</p>
      </div>}
      {done.kitchen !== false && <div className="receipt kitchen" dir="ltr">
        <h2>CUISINE</h2>
        {done.num > 0 && <p className="big c">{fr.order} {fmtOrder(done.num)}</p>}
        <p className="big c">{fr[done.type].toUpperCase()}{done.table ? ` · TABLE ${done.table}` : ""}</p>
        <p className="c">{fmtDateTime(done.at, "fr")}</p>
        <hr />
        {done.lines.map((l) => <p className="big" key={l.item.id}>{l.qty} × {l.item.name.fr}</p>)}
        {done.note && <p className="big">NOTE : {done.note}</p>}
        <hr />
      </div>}
    </div>
  );
}
