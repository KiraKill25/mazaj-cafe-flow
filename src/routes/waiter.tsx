import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Minus, Plus, Send, Printer, LogOut, ShoppingBag, X, Search, ClipboardList, Pencil, Ban, Sparkles } from "lucide-react";
const logoAsset = { url: "/mazaj-logo.jpg" };
import { T, fmtDateTime, matchItem, money, usePos, type Category, type Item } from "@/lib/pos";
import { LangBar, useDir } from "@/components/LangBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { relay, type WaiterOrder } from "@/lib/waiterLink";
import { GameQR } from "@/components/GameQR";
import { MoodPicker } from "@/components/MoodPicker";

export const Route = createFileRoute("/waiter")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Waiter — MAZAJ Coffee Shop" },
      { name: "description", content: "MAZAJ waiter app: take table orders on your phone and send them to the register over the shop Wi-Fi." },
      { property: "og:title", content: "Waiter — MAZAJ Coffee Shop" },
      { property: "og:description", content: "Take table orders on the phone and send them to the MAZAJ register." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Waiter,
});

type Menu = { items: Item[]; categories: Category[]; currency: string };
type Line = { item: Item; qty: number };
const PIN_KEY = "mazaj-waiter-pin";

const TXT = {
  en: { title: "Waiter", pin: "Register PIN", connect: "Connect", wrong: "Wrong PIN", offline: "Register not reachable. Is it open on the same Wi-Fi?", table: "Table number", tableReq: "Enter the table number", note: "Note for the kitchen (optional)", send: "Send to register", sent: "Order sent to register", newOrder: "New order", print: "Print ticket", logout: "Disconnect", cart: "Order", noMenu: "Waiting for the register menu…", sending: "Sending…", orders: "Orders", noOrders: "No orders waiting at the register", modify: "Modify", reqCancel: "Request cancel", reason: "Reason for cancelling?", pendingCancel: "Waiting for register approval", update: "Send update", updated: "Update sent to register", editing: "Editing order", stopEdit: "Stop editing", gone: "This order was already handled by the register." },
  fr: { title: "Serveur", pin: "PIN de la caisse", connect: "Connecter", wrong: "PIN incorrect", offline: "Caisse injoignable. Est-elle ouverte sur le même Wi-Fi ?", table: "Numéro de table", tableReq: "Saisissez le numéro de table", note: "Note pour la cuisine (facultatif)", send: "Envoyer à la caisse", sent: "Commande envoyée à la caisse", newOrder: "Nouvelle commande", print: "Imprimer le ticket", logout: "Déconnecter", cart: "Commande", noMenu: "En attente du menu de la caisse…", sending: "Envoi…", orders: "Commandes", noOrders: "Aucune commande en attente à la caisse", modify: "Modifier", reqCancel: "Demander l'annulation", reason: "Motif de l'annulation ?", pendingCancel: "En attente de validation de la caisse", update: "Envoyer la modification", updated: "Modification envoyée à la caisse", editing: "Modification de commande", stopEdit: "Arrêter", gone: "Cette commande a déjà été traitée par la caisse." },
  ar: { title: "النادل", pin: "رمز الصندوق", connect: "اتصال", wrong: "رمز خاطئ", offline: "الصندوق غير متاح. هل هو مفتوح على نفس الواي فاي؟", table: "رقم الطاولة", tableReq: "أدخل رقم الطاولة", note: "ملاحظة للمطبخ (اختياري)", send: "إرسال إلى الصندوق", sent: "تم إرسال الطلب إلى الصندوق", newOrder: "طلب جديد", print: "طباعة التذكرة", logout: "قطع الاتصال", cart: "الطلب", noMenu: "في انتظار قائمة الصندوق…", sending: "جارٍ الإرسال…", orders: "الطلبات", noOrders: "لا توجد طلبات في انتظار الصندوق", modify: "تعديل", reqCancel: "طلب إلغاء", reason: "سبب الإلغاء؟", pendingCancel: "في انتظار موافقة الصندوق", update: "إرسال التعديل", updated: "تم إرسال التعديل إلى الصندوق", editing: "تعديل الطلب", stopEdit: "إيقاف", gone: "تمت معالجة هذا الطلب من قبل الصندوق." },
};

function Waiter() {
  useDir();
  const pos = usePos();
  const lang = pos.lang;
  const t = T[lang];
  const w = TXT[lang];
  const [pin, setPin] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [waiterName, setWaiterName] = useState("");
  useEffect(() => { setWaiterName(localStorage.getItem("mazaj-waiter-name") ?? ""); }, []);
  const nameLbl = { en: "Your first name", fr: "Votre prénom", ar: "اسمك" }[pos.lang];
  const [err, setErr] = useState("");
  const [menu, setMenu] = useState<Menu | null>(null);
  const [cat, setCat] = useState("all");
  const [cart, setCart] = useState<Line[]>([]);
  const [type, setType] = useState<"dineIn" | "takeaway">("dineIn");
  const [table, setTable] = useState("");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<WaiterOrder | null>(null);
  const [orders, setOrders] = useState<WaiterOrder[]>([]);
  const [showOrders, setShowOrders] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [renew, setRenew] = useState(false);
  const [renewTable, setRenewTable] = useState("");

  useEffect(() => { setPin(localStorage.getItem(PIN_KEY) ?? ""); }, []);

  // Staff list (declared by the manager) and who is clocked in
  const [staff, setStaff] = useState<string[]>([]);
  const [onDuty, setOnDuty] = useState<Record<string, number>>({});
  const [clockBusy, setClockBusy] = useState(false);
  const loadStaff = useCallback(async (p: string) => {
    try { const r = await relay<{ staff: string[]; onDuty: Record<string, number> }>({ action: "staff", pin: p }); if (r.staff) { setStaff(r.staff); setOnDuty(r.onDuty ?? {}); } } catch { /* offline */ }
  }, []);
  useEffect(() => { if (!pin && pinInput.length === 4) loadStaff(pinInput); }, [pin, pinInput, loadStaff]);
  useEffect(() => {
    if (!pin) return;
    loadStaff(pin);
    const id = setInterval(() => loadStaff(pin), 10000);
    return () => clearInterval(id);
  }, [pin, loadStaff]);
  const C = { en: { in: "Clock in", out: "Clock out", since: "On duty since", off: "Not clocked in", confirm: "Clock out now?", pick: "Choose your name" }, fr: { in: "Pointer mon arrivée", out: "Pointer mon départ", since: "En service depuis", off: "Pas encore pointé", confirm: "Pointer votre départ maintenant ?", pick: "Choisissez votre prénom" }, ar: { in: "تسجيل الدخول", out: "تسجيل الخروج", since: "في الخدمة منذ", off: "لم تسجل الدخول بعد", confirm: "تسجيل الخروج الآن؟", pick: "اختر اسمك" } }[lang];
  const clock = async (kind: "in" | "out") => {
    if (kind === "out" && !window.confirm(C.confirm)) return;
    setClockBusy(true);
    try {
      const r = await relay<{ onDuty: Record<string, number> }>({ action: "clock", pin, name: waiterName.trim(), kind });
      if (r.onDuty) setOnDuty(r.onDuty); else setErr(w.offline);
    } catch { setErr(w.offline); }
    setClockBusy(false);
  };
  const dutySince = onDuty[waiterName.trim()];
  const LX = { en: "Also record your exit (clock out)?", fr: "Voulez-vous aussi enregistrer votre sortie ?", ar: "هل تريد أيضاً تسجيل خروجك؟" }[lang];

  const loadMenu = useCallback(async (p: string) => {
    try {
      const r = await relay<{ menu: Menu | null }>({ action: "menu", pin: p });
      if (r.error === "wrong_pin") { setErr(w.wrong); setPin(""); localStorage.removeItem(PIN_KEY); return false; }
      if (r.error) { setErr(w.offline); return false; }
      setErr("");
      setMenu(r.menu);
      return true;
    } catch { setErr(w.offline); return false; }
  }, [w]);

  useEffect(() => {
    if (!pin) return;
    loadMenu(pin);
    const id = setInterval(() => loadMenu(pin), 20000);
    return () => clearInterval(id);
  }, [pin, loadMenu]);

  const loadOrders = useCallback(async (p: string) => {
    try { const r = await relay<{ orders: WaiterOrder[] }>({ action: "list", pin: p }); if (r.orders) setOrders(r.orders); } catch { /* offline */ }
  }, []);
  useEffect(() => {
    if (!pin) return;
    loadOrders(pin);
    const id = setInterval(() => loadOrders(pin), 5000);
    return () => clearInterval(id);
  }, [pin, loadOrders]);
  const startEdit = (o: WaiterOrder) => {
    setCart(o.lines.map((l) => ({ qty: l.qty, item: menu?.items.find((i) => i.id === l.id) ?? ({ id: l.id, name: l.name, price: l.price, category: "", image: "", outOfStock: false } as Item) })));
    setType(o.type); setTable(o.table ?? ""); setNote(o.note ?? ""); setEditId(o.id); setShowOrders(false); setOpen(true);
  };
  const stopEdit = () => { setEditId(null); setCart([]); setTable(""); setNote(""); setOpen(false); };
  const requestCancel = async (o: WaiterOrder) => {
    const reason = window.prompt(w.reason);
    if (reason === null) return;
    const r = await relay({ action: "cancelReq", pin, id: o.id, reason: reason.trim() || undefined }).catch(() => ({ error: "network" }));
    if (r.error) setErr(r.error === "not_found" ? w.gone : w.offline); else loadOrders(pin);
  };

  const connect = async () => {
    const p = pinInput.trim();
    if (!waiterName.trim()) return;
    if (await loadMenu(p)) { localStorage.setItem("mazaj-waiter-name", waiterName.trim()); localStorage.setItem(PIN_KEY, p); setPin(p); setPinInput(""); }
  };

  const total = useMemo(() => cart.reduce((s, l) => s + l.item.price * l.qty, 0), [cart]);
  const count = cart.reduce((s, l) => s + l.qty, 0);
  const cur = menu?.currency ?? pos.currency;
  const used = (menu?.categories ?? []).filter((c) => menu?.items.some((i) => i.category === c.id));
  const items = (menu?.items ?? []).filter((i) => (q.trim() ? matchItem(i, q) : cat === "all" || i.category === cat));
  const add = (item: Item) => {
    if (item.outOfStock) return;
    setCart((c) => { const f = c.find((l) => l.item.id === item.id); return f ? c.map((l) => (l === f ? { ...l, qty: l.qty + 1 } : l)) : [...c, { item, qty: 1 }]; });
  };
  const bump = (id: string, d: number) => setCart((c) => c.map((l) => (l.item.id === id ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0));

  const send = async () => {
    if (type === "dineIn" && !table.trim()) { setErr(w.tableReq); return; }
    setBusy(true);
    try {
      const r = await relay<{ order: WaiterOrder }>({ action: editId ? "update" : "order", ...(editId ? { id: editId } : {}), pin, type, table: type === "dineIn" ? table.trim() : undefined, note: note.trim() || undefined, ...(editId ? {} : { waiter: waiterName.trim() || undefined }), lines: cart.map((l) => ({ id: l.item.id, name: l.item.name, price: l.item.price, qty: l.qty })) });
      if (r.order) { setSent(r.order); setCart([]); setTable(""); setNote(""); setOpen(false); setErr(""); setEditId(null); loadOrders(pin); }
      else setErr(r.error === "wrong_pin" ? w.wrong : r.error === "table_required" ? w.tableReq : r.error === "not_found" ? w.gone : w.offline);
    } catch { setErr(w.offline); }
    setBusy(false);
  };

  if (!pin) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background p-6 text-foreground">
        <div className="w-full max-w-sm space-y-4 rounded-3xl bg-card p-6 text-center shadow-xl">
          <img src={logoAsset.url} alt="MAZAJ Coffee Shop" className="mx-auto h-20 w-20 rounded-2xl object-cover" />
          <h1 className="font-display text-2xl font-black">MAZAJ · {w.title}</h1>
          <div className="flex justify-center"><LangBar /></div>
          <label className="block text-sm font-bold text-muted-foreground">{w.pin}</label>
          <input inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code" maxLength={4} autoFocus value={pinInput} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && connect()} className="h-16 w-full rounded-xl border border-input bg-background text-center text-3xl font-black tracking-[0.5em]" />
          <label className="block text-sm font-bold text-muted-foreground">{nameLbl}</label>
          {staff.length > 0 ? (
            <select value={staff.includes(waiterName) ? waiterName : ""} onChange={(e) => setWaiterName(e.target.value)} className="h-14 w-full rounded-xl border border-input bg-background text-center text-xl font-bold">
              <option value="" disabled>{C.pick}</option>
              {staff.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          ) : (
            <input value={waiterName} maxLength={30} onChange={(e) => setWaiterName(e.target.value)} autoComplete="given-name" className="h-14 w-full rounded-xl border border-input bg-background text-center text-xl font-bold" />
          )}
          {err && <p className="text-sm font-bold text-destructive">{err}</p>}
          <button onClick={connect} disabled={pinInput.length !== 4 || !waiterName.trim() || (staff.length > 0 && !staff.includes(waiterName))} className="h-14 w-full rounded-xl bg-primary text-lg font-extrabold text-primary-foreground disabled:opacity-40">{w.connect}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-[calc(6rem+env(safe-area-inset-bottom))] text-foreground">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <img src={logoAsset.url} alt="MAZAJ Coffee Shop" className="h-10 w-10 rounded-xl object-cover" />
          <h1 className="truncate font-display text-lg font-extrabold">{w.title}{waiterName && <span className="ms-1 text-sm text-muted-foreground">· {waiterName}</span>}</h1>
        </div>
        <div className="flex items-center gap-1">
          <LangBar />
          <ThemeToggle />
          <button onClick={() => { setRenewTable(""); setRenew(true); }} aria-label="Mazaj game" title="Mazaj game" className="flex h-11 items-center gap-1 rounded-xl bg-accent px-2 text-xs font-bold text-accent-foreground"><Sparkles size={16} /><span className="hidden sm:inline">{{ ar: "لعبة مزاج", fr: "Jeu Mazaj", en: "Mazaj game" }[lang]}</span></button>
          <button onClick={() => setShowOrders(true)} aria-label={w.orders} title={w.orders} className="relative grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground"><ClipboardList size={18} />{orders.length > 0 && <span className="absolute -end-1 -top-1 min-w-5 rounded-full bg-primary px-1 text-xs leading-5 text-primary-foreground">{orders.length}</span>}</button>
          <button onClick={async () => { if (dutySince && window.confirm(LX)) { try { await relay({ action: "clock", pin, name: waiterName.trim(), kind: "out" }); } catch { /* offline */ } } localStorage.removeItem(PIN_KEY); setPin(""); setMenu(null); }} aria-label={w.logout} title={w.logout} className="grid h-11 w-11 place-items-center rounded-xl bg-muted"><LogOut size={18} /></button>
        </div>
      </header>
      {editId && <div className="flex items-center gap-2 bg-accent px-4 py-2 font-bold text-accent-foreground"><Pencil size={16} /><span className="flex-1">{w.editing}</span><button onClick={stopEdit} className="h-9 rounded-lg bg-background/30 px-3 text-sm">{w.stopEdit}</button></div>}
      {staff.includes(waiterName.trim()) && (
        <div className={`flex items-center gap-2 px-3 py-2 ${dutySince ? "bg-success/15" : "bg-muted"}`}>
          <span className="flex-1 text-sm font-bold">{dutySince ? `${C.since} ${new Date(dutySince).toLocaleTimeString(lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-GB", { hour: "2-digit", minute: "2-digit" })}` : C.off}</span>
          <button onClick={() => clock(dutySince ? "out" : "in")} disabled={clockBusy} className={`h-10 rounded-xl px-4 text-sm font-extrabold disabled:opacity-50 ${dutySince ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}>{dutySince ? C.out : C.in}</button>
        </div>
      )}
      {err && <p className="bg-destructive/10 px-4 py-2 text-center text-sm font-bold text-destructive">{err}</p>}
      <div className="flex gap-2 px-3 pt-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={{ en: "Search the menu…", fr: "Rechercher dans le menu…", ar: "ابحث في القائمة…" }[lang]} className="h-12 w-full rounded-xl border border-input bg-card ps-10 pe-10 font-semibold" />
          {q && <button onClick={() => setQ("")} aria-label="Clear" className="absolute end-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg bg-muted"><X size={16} /></button>}
        </div>
        <MoodPicker items={menu?.items ?? []} lang={lang} currency={cur} onPick={(list) => { list.forEach(add); if (list.length) setOpen(true); }} />
      </div>
      <div className="flex gap-2 overflow-x-auto px-3 py-3">
        {[{ id: "all", label: t.all }, ...used.map((c) => ({ id: c.id, label: c.name[lang] }))].map((c) => (
          <button key={c.id} onClick={() => { setCat(c.id); setQ(""); }} className={`h-11 shrink-0 rounded-full px-4 font-bold ${!q && cat === c.id ? "bg-foreground text-background" : "border border-border bg-card"}`}>{c.label}</button>
        ))}
      </div>
      {!menu && <p className="py-10 text-center text-muted-foreground">{w.noMenu}</p>}
      <div className="grid grid-cols-2 gap-3 px-3 sm:grid-cols-3">
        {items.map((i) => {
          const q = cart.find((l) => l.item.id === i.id)?.qty;
          return (
            <button key={i.id} onClick={() => add(i)} disabled={i.outOfStock} className="relative overflow-hidden rounded-2xl border border-border bg-card text-start shadow-sm active:scale-95 disabled:opacity-50">
              <div className="aspect-[4/3] bg-muted">{i.image && <img src={i.image} alt={i.name[lang]} className="h-full w-full object-cover" />}</div>
              <div className="p-2"><div className="font-bold leading-tight">{i.name[lang]}</div><div className="text-sm font-extrabold text-primary">{money(i.price, cur)}</div></div>
              {q && <span className="absolute end-2 top-2 grid h-8 min-w-8 place-items-center rounded-full bg-primary px-2 font-black text-primary-foreground">{q}</span>}
              {i.outOfStock && <span className="absolute start-2 top-2 rounded-md bg-destructive px-2 py-1 text-xs font-bold text-destructive-foreground">{t.outOfStock}</span>}
            </button>
          );
        })}
      </div>

      {count > 0 && !open && (
        <button onClick={() => setOpen(true)} className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 flex h-16 items-center justify-between rounded-2xl bg-primary px-5 text-lg font-extrabold text-primary-foreground shadow-xl">
          <span className="flex items-center gap-2"><ShoppingBag />{w.cart} · {count}</span><span>{money(total, cur)}</span>
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-40 flex items-end bg-foreground/40" onClick={() => setOpen(false)}>
          <div className="max-h-[90dvh] w-full space-y-3 overflow-y-auto overscroll-contain rounded-t-3xl bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-xl font-extrabold">{w.cart}</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-xl bg-muted"><X /></button>
            </div>
            <div className="flex rounded-xl bg-muted p-1">
              {(["dineIn", "takeaway"] as const).map((o) => <button key={o} onClick={() => setType(o)} className={`h-11 flex-1 rounded-lg font-bold ${type === o ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>{t[o]}</button>)}
            </div>
            {type === "dineIn" && (
              <div>
                <label className="text-sm font-bold text-muted-foreground">{w.table} *</label>
                <input value={table} onChange={(e) => setTable(e.target.value.slice(0, 20))} inputMode="text" placeholder="5" className="h-14 w-full rounded-xl border border-input bg-background px-4 text-center text-2xl font-black" />
              </div>
            )}
            {cart.map((l) => (
              <div key={l.item.id} className="flex items-center gap-2 border-b border-border py-2">
                <div className="min-w-0 flex-1"><div className="truncate font-bold">{l.item.name[lang]}</div><div className="text-sm text-muted-foreground">{money(l.item.price * l.qty, cur)}</div></div>
                <button onClick={() => bump(l.item.id, -1)} className="grid h-11 w-11 place-items-center rounded-xl bg-muted"><Minus size={18} /></button>
                <span className="w-6 text-center font-extrabold">{l.qty}</span>
                <button onClick={() => bump(l.item.id, 1)} className="grid h-11 w-11 place-items-center rounded-xl bg-muted"><Plus size={18} /></button>
              </div>
            ))}
            <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} placeholder={w.note} className="h-12 w-full rounded-xl border border-input bg-background px-3" />
            <div className="flex justify-between font-display text-2xl font-black"><span>{t.total}</span><span>{money(total, cur)}</span></div>
            {err && <p className="text-center text-sm font-bold text-destructive">{err}</p>}
            <button onClick={send} disabled={busy || !cart.length || (type === "dineIn" && !table.trim())} className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-success text-lg font-extrabold text-success-foreground disabled:opacity-40"><Send />{busy ? w.sending : editId ? w.update : w.send}</button>
          </div>
        </div>
      )}

      {showOrders && (
        <div className="fixed inset-0 z-40 flex items-end bg-foreground/40" onClick={() => setShowOrders(false)}>
          <div className="max-h-[90dvh] w-full space-y-3 overflow-y-auto overscroll-contain rounded-t-3xl bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-extrabold">{w.orders} ({orders.length})</h2>
              <button onClick={() => setShowOrders(false)} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-xl bg-muted"><X /></button>
            </div>
            {!orders.length && <p className="py-8 text-center text-muted-foreground">{w.noOrders}</p>}
            {[...orders].reverse().map((o) => (
              <div key={o.id} className="rounded-2xl bg-muted p-3">
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg font-extrabold">{o.table ? `${w.table}: ${o.table}` : t.takeaway}</span>
                  <span className="text-xs text-muted-foreground">{fmtDateTime(o.at, lang)}</span>
                  <span className="ms-auto font-bold">{money(o.total, cur)}</span>
                </div>
                <ul className="mt-1 text-sm">{o.lines.map((l) => <li key={l.id}>{l.qty} × {l.name[lang]}</li>)}</ul>
                {o.note && <p className="text-sm italic">“{o.note}”</p>}
                {o.cancelRequest ? (
                  <p className="mt-2 rounded-lg bg-destructive/10 p-2 text-center text-sm font-bold text-destructive">{w.pendingCancel}</p>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => startEdit(o)} className="flex h-11 flex-1 items-center justify-center gap-1 rounded-lg bg-accent font-bold text-accent-foreground"><Pencil size={16} /><span className="ms-1">{w.modify}</span></button>
                    <button onClick={() => requestCancel(o)} className="flex h-11 flex-1 items-center justify-center gap-1 rounded-lg bg-destructive/10 font-bold text-destructive"><Ban size={16} /><span className="ms-1">{w.reqCancel}</span></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {renew && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-4" onClick={() => setRenew(false)}>
          <div className="w-full max-w-sm space-y-3 rounded-3xl bg-card p-6 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-2xl font-black">{{ ar: "تجديد لعبة مزاج", fr: "Renouveler le jeu Mazaj", en: "Renew Mazaj game" }[lang]}</h2>
            <input inputMode="numeric" value={renewTable} onChange={(e) => setRenewTable(e.target.value)} placeholder={w.table} className="h-12 w-full rounded-xl border border-input bg-background px-3 text-center text-lg font-bold" />
            {renewTable.trim() && (
              <GameQR
                key={renewTable}
                table={renewTable.trim()}
                items={orders.filter((o) => String(o.table) === renewTable.trim()).flatMap((o) => o.lines.map((l) => l.name.fr))}
                lang={lang}
              />
            )}
            <button onClick={() => setRenew(false)} className="h-12 w-full rounded-xl bg-muted font-bold">OK</button>
          </div>
        </div>
      )}

      {sent && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-3xl bg-card p-6 text-center shadow-xl">
            <h2 className="font-display text-2xl font-black text-success">✓ {sent.modifiedAt ? w.updated : w.sent}</h2>
            <p className="font-display text-xl font-extrabold">{sent.table ? `${w.table}: ${sent.table}` : t.takeaway}</p>
            <ul className="text-start">{sent.lines.map((l) => <li key={l.id} className="flex justify-between"><span>{l.qty} × {l.name[lang]}</span><span>{money(l.price * l.qty, cur)}</span></li>)}</ul>
            <div className="flex justify-between border-t border-border pt-2 text-xl font-black"><span>{t.total}</span><span>{money(sent.total, cur)}</span></div>
            {sent.table && <GameQR table={String(sent.table)} items={sent.lines.map((l) => l.name.fr)} lang={lang} />}
            <button onClick={() => window.print()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-muted font-bold"><Printer size={18} />{w.print}</button>
            <button onClick={() => setSent(null)} className="h-14 w-full rounded-xl bg-primary text-lg font-extrabold text-primary-foreground">{w.newOrder}</button>
          </div>
          <div id="print-area" dir={lang === "ar" ? "rtl" : "ltr"}>
            <div className="receipt">
              <h2>MAZAJ COFFEE SHOP</h2>
              <p className="c">{fmtDateTime(sent.at, lang)}</p>
              <p className="big c">{sent.table ? `Table ${sent.table}` : t.takeaway}</p>
              <hr />
              {sent.lines.map((l) => <div className="row" key={l.id}><span>{l.qty} × {l.name[lang]}</span><span>{money(l.price * l.qty, cur)}</span></div>)}
              <hr />
              <div className="row big"><span>{t.total}</span><span>{money(sent.total, cur)}</span></div>
              {sent.note && <p>{sent.note}</p>}
              <hr />
              <p className="c">{t.thanks}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
