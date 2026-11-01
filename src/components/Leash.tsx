"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CATEGORIES, CURRENCIES, MERCHANTS, money, type Category, type Currency, type Item } from "@/lib/catalog";
import { DEFAULT_RULES, type Entry, type Rules, type Verdict } from "@/lib/policy";

type SessionView = { email?: string; mode: "sandbox" | "simulated"; grantedAt: string; rules: Rules; spent: number; count: number; vault: string } | null;
type Caps = { paypal: boolean; env: string; session: SessionView };
type Plan = { understanding: string; cart: { itemId: string; qty: number; why: string }[]; skipped: string[]; note: string };
type Run = { errand: string; plan: Plan; verdicts: Verdict[]; items: Item[]; model: string; status: ("pending" | "paying" | "paid" | "asked" | "blocked" | "declined" | "failed")[]; errors: string[] };

const SAMPLES = [
  "My sister just started pottery. Get her something small for her birthday, under 40.",
  "We're out of coffee and oat milk, restock for the week.",
  "Book me the airport train for Friday and something to listen to on the way.",
  "Buy a new 4K monitor for my desk.",
];
const LS = "leash.ledger.v1";

export default function Leash() {
  const [caps, setCaps] = useState<Caps | null>(null);
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES);
  const [ledger, setLedger] = useState<Entry[]>([]);
  const [errand, setErrand] = useState("");
  const [run, setRun] = useState<Run | null>(null);
  const [thinking, setThinking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const c: Caps = await fetch("/api/caps", { cache: "no-store" }).then((r) => r.json());
    setCaps(c); if (c.session) setRules(c.session.rules);
  }, []);
  useEffect(() => {
    refresh();
    try { setLedger(JSON.parse(localStorage.getItem(LS) || "[]")); } catch {}
    const q = new URLSearchParams(location.search).get("leash");
    if (q === "granted") flash("PayPal connected. Your agent is on the leash.");
    if (q === "cancelled") flash("Connection cancelled — nothing was saved.");
    if (q === "error") flash("PayPal could not finish connecting. Try again.");
    if (q) history.replaceState(null, "", "/");
  }, [refresh]);
  const saveLedger = (l: Entry[]) => { setLedger(l); localStorage.setItem(LS, JSON.stringify(l)); };
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(null), 3800); };

  const session = caps?.session ?? null;
  const cur = rules.currency;

  async function grant() {
    const r = await fetch("/api/paypal/connect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rules }) }).then((r) => r.json());
    if (r.approveUrl) location.href = r.approveUrl;
    else if (r.simulated) { await refresh(); flash("Simulated leash granted (no PayPal keys on this deployment)."); }
    else flash(r.error || "Could not connect");
  }
  async function saveRules(next: Rules) {
    setRules(next);
    if (session) await fetch("/api/paypal/connect", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ rules: next }) });
  }
  async function cut() {
    if (!confirm("Cut the leash? This deletes the vaulted PayPal token.")) return;
    await fetch("/api/paypal/connect", { method: "DELETE" }); await refresh(); setRun(null); flash("Leash cut. The agent can't spend anything now.");
  }

  async function send(text = errand) {
    if (!text.trim() || thinking) return;
    setThinking(true); setRun(null);
    try {
      const r = await fetch("/api/agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ errand: text }) }).then((r) => r.json());
      if (r.error) { flash(r.error); return; }
      const status = (r.verdicts as Verdict[]).map((v) => (v.decision === "block" ? "blocked" : v.decision === "ask" ? "asked" : "pending")) as Run["status"];
      const next: Run = { errand: text, ...r, status, errors: [] };
      setRun(next);
      if (session) await payAuto(next);
    } finally { setThinking(false); }
  }

  async function pay(i: number, human: boolean, base: Run) {
    let cur = { ...base, status: [...base.status] as Run["status"], errors: [...base.errors] };
    cur.status[i] = "paying"; setRun(cur);
    const c = base.plan.cart[i];
    const r = await fetch("/api/paypal/charge", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ itemId: c.itemId, qty: c.qty, errand: base.errand, human }) });
    const j = await r.json();
    cur = { ...cur, status: [...cur.status] as Run["status"], errors: [...cur.errors] };
    if (r.ok) {
      cur.status[i] = "paid";
      const e: Entry = { ...j.entry, why: c.why };
      setLedger((l) => { const n = [e, ...l]; localStorage.setItem(LS, JSON.stringify(n)); return n; });
    } else { cur.status[i] = r.status === 403 ? "blocked" : "failed"; cur.errors[i] = j.error; }
    setRun(cur); return cur;
  }
  async function payAuto(r: Run) {
    let cur = r;
    for (let i = 0; i < r.status.length; i++) if (r.status[i] === "pending") { await wait(650); cur = await pay(i, false, cur); }
    await refresh();
  }
  async function approve(i: number) { if (run) { await pay(i, true, run); await refresh(); } }
  function decline(i: number) { if (run) { const s = [...run.status] as Run["status"]; s[i] = "declined"; setRun({ ...run, status: s }); } }

  async function refund(e: Entry) {
    const r = await fetch("/api/paypal/refund", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ captureId: e.captureId, amount: e.amount, at: e.at, sig: e.sig }) });
    const j = await r.json();
    if (!r.ok) return flash(j.error || "Refund failed");
    saveLedger(ledger.map((x) => (x.id === e.id ? { ...x, refunded: true, refundId: j.refundId } : x)));
    await refresh(); flash(`Refunded ${money(e.amount, e.currency)} · ${j.refundId}`);
  }

  const spent = session?.spent ?? 0;
  return (
    <main className="grain mx-auto max-w-6xl px-5 pb-24 pt-8 md:px-8">
      <Header caps={caps} onCut={cut} />
      <Hero granted={!!session} />
      <div className="mt-10 grid gap-6 lg:grid-cols-[380px_1fr]">
        <RulesCard rules={rules} setRules={saveRules} spent={spent} count={session?.count ?? 0} session={session} onGrant={grant} paypal={!!caps?.paypal} />
        <div className="space-y-6">
          <Console errand={errand} setErrand={setErrand} send={send} thinking={thinking} agent={rules.agentName} granted={!!session} />
          <AnimatePresence mode="wait">{(thinking || run) && <RunView key={run?.errand ?? "t"} run={run} thinking={thinking} cur={cur} approve={approve} decline={decline} granted={!!session} />}</AnimatePresence>
          <LedgerView ledger={ledger} refund={refund} />
        </div>
      </div>
      <Footer />
      <AnimatePresence>{toast && <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-paper px-5 py-2.5 text-sm font-medium text-ink shadow-2xl">{toast}</motion.div>}</AnimatePresence>
    </main>
  );
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Header({ caps, onCut }: { caps: Caps | null; onCut: () => void }) {
  const s = caps?.session;
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <LeashMark />
        <span className="font-serif text-2xl tracking-tight">Leash</span>
      </div>
      <div className="flex items-center gap-2">
        {caps && <span className="chip" title={caps.paypal ? "Real PayPal sandbox API calls" : "No PayPal keys configured — everything is simulated and labelled as such"}>{caps.paypal ? `PayPal ${caps.env}` : "simulated mode"}</span>}
        {s && <span className="chip text-lime">vault {s.vault}</span>}
        {s && <button onClick={onCut} className="chip text-red hover:bg-red/10">cut leash</button>}
      </div>
    </header>
  );
}
function LeashMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none"><circle cx="8" cy="8" r="5" stroke="#c6ff3d" strokeWidth="2.2" />
      <motion.path d="M11.5 11.5 C 16 16, 12 22, 22 24" stroke="#c6ff3d" strokeWidth="2.2" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "easeInOut" }} />
      <circle cx="23" cy="24" r="3" fill="#8b7bff" /></svg>
  );
}

function Hero({ granted }: { granted: boolean }) {
  return (
    <section className="mt-14 max-w-3xl">
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="tick">Agentic commerce · PayPal Vault · server-side policy</motion.p>
      <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-3 font-serif text-5xl leading-[1.02] md:text-7xl">
        Give your AI an <em className="text-lime">allowance</em>,<br />not your wallet.
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-5 max-w-xl text-lg text-mute">
        Connect PayPal once. Set the leash. Your agent runs errands and pays merchants on its own — but only inside the rules, and every charge can be yanked back in one tap.
      </motion.p>
      {!granted && <p className="mt-4 text-sm text-amber">① Shape the leash on the left · ② Connect PayPal · ③ Give your agent an errand.</p>}
    </section>
  );
}

function Ring({ spent, cap }: { spent: number; cap: number }) {
  const p = Math.min(1, spent / Math.max(cap, 1)), R = 54, C = 2 * Math.PI * R;
  const col = p > 0.9 ? "#ff5d5d" : p > 0.7 ? "#ffb547" : "#c6ff3d";
  return (
    <svg width="132" height="132" viewBox="0 0 132 132" className="-rotate-90">
      <circle cx="66" cy="66" r={R} stroke="#232a38" strokeWidth="10" fill="none" />
      <motion.circle cx="66" cy="66" r={R} stroke={col} strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={C} animate={{ strokeDashoffset: C * (1 - p) }} initial={{ strokeDashoffset: C }} transition={{ type: "spring", stiffness: 60, damping: 16 }} />
    </svg>
  );
}

function RulesCard({ rules, setRules, spent, count, session, onGrant, paypal }: { rules: Rules; setRules: (r: Rules) => void; spent: number; count: number; session: SessionView; onGrant: () => void; paypal: boolean }) {
  const [local, setLocal] = useState(rules);
  useEffect(() => setLocal(rules), [rules]);
  const set = <K extends keyof Rules>(k: K, v: Rules[K]) => setLocal((r) => ({ ...r, [k]: v }));
  const dirty = JSON.stringify(local) !== JSON.stringify(rules);
  const m = (n: number) => money(n, local.currency);
  const toggleCat = (c: Category) => set("categories", local.categories.includes(c) ? local.categories.filter((x) => x !== c) : [...local.categories, c]);
  return (
    <aside className="card h-fit p-6 lg:sticky lg:top-6">
      <div className="flex items-center justify-between"><span className="tick">The leash</span><span className="chip">{session ? (session.mode === "sandbox" ? "enforced · PayPal" : "enforced · simulated") : "draft"}</span></div>
      <div className="relative mt-4 flex items-center gap-5">
        <div className="relative"><Ring spent={spent} cap={local.monthlyCap} />
          <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="font-mono text-lg">{m(Math.max(0, local.monthlyCap - spent))}</span><span className="text-[10px] text-mute">left this month</span></div></div>
        <div className="space-y-1 text-sm"><div className="text-mute">Spent</div><div className="font-mono">{m(spent)}</div><div className="pt-1 text-mute">Today</div><div className="font-mono">{count}/{local.maxPerDay} buys</div></div>
      </div>
      <label className="mt-5 block text-xs text-mute">Agent name
        <input value={local.agentName} onChange={(e) => set("agentName", e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-ink px-3 py-2 text-paper outline-none focus:border-lime" /></label>
      <div className="mt-3 flex flex-wrap gap-1.5">{(Object.keys(CURRENCIES) as Currency[]).map((c) => <button key={c} onClick={() => set("currency", c)} className={`chip ${local.currency === c ? "border-lime text-lime" : "text-mute"}`}>{c}</button>)}</div>
      <Slider label="Monthly allowance" v={local.monthlyCap} min={20} max={1000} step={10} on={(v) => set("monthlyCap", v)} fmt={m} />
      <Slider label="Max per purchase" v={local.perPurchaseCap} min={5} max={Math.min(200, local.monthlyCap)} step={5} on={(v) => set("perPurchaseCap", v)} fmt={m} />
      <Slider label="Ask me above" v={Math.min(local.askAbove, local.perPurchaseCap)} min={0} max={local.perPurchaseCap} step={5} on={(v) => set("askAbove", v)} fmt={m} />
      <div className="mt-4 text-xs text-mute">Allowed aisles</div>
      <div className="mt-2 flex flex-wrap gap-1.5">{(Object.keys(CATEGORIES) as Category[]).map((c) => {
        const on = local.categories.includes(c);
        return <motion.button whileTap={{ scale: 0.92 }} key={c} onClick={() => toggleCat(c)} className={`chip ${on ? "border-lime/60 bg-lime/10 text-lime" : "text-mute line-through decoration-red/70"}`}>{CATEGORIES[c].glyph} {CATEGORIES[c].label}</motion.button>;
      })}</div>
      <details className="mt-4 text-xs text-mute"><summary className="cursor-pointer">More rules</summary>
        <Slider label="Purchases per day" v={local.maxPerDay} min={1} max={20} step={1} on={(v) => set("maxPerDay", v)} fmt={String} />
        <label className="mt-3 flex items-center gap-2"><input type="checkbox" checked={local.quiet} onChange={(e) => set("quiet", e.target.checked)} /> No buying 00:00–06:00</label>
        <div className="mt-3">Blocked merchants</div>
        <div className="mt-2 flex flex-wrap gap-1">{MERCHANTS.map((x) => { const b = local.blockedMerchants.includes(x); return <button key={x} onClick={() => set("blockedMerchants", b ? local.blockedMerchants.filter((y) => y !== x) : [...local.blockedMerchants, x])} className={`chip ${b ? "border-red/60 text-red" : "text-mute"}`}>{x}</button>; })}</div>
      </details>
      {session ? (
        <button disabled={!dirty} onClick={() => setRules(local)} className="mt-5 w-full rounded-2xl bg-paper py-3 font-medium text-ink transition disabled:opacity-30">{dirty ? "Tighten / loosen the leash" : "Leash is up to date"}</button>
      ) : (
        <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => { setRules(local); onGrant(); }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ffc439] py-3 font-semibold text-[#111]">
          Connect <span className="italic font-bold text-[#003087]">Pay<span className="text-[#009cde]">Pal</span></span> {paypal ? "" : "(simulated)"}
        </motion.button>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-mute">Rules are signed and enforced on the server for every charge. The AI can propose purchases; it can never approve them.</p>
    </aside>
  );
}
function Slider({ label, v, min, max, step, on, fmt }: { label: string; v: number; min: number; max: number; step: number; on: (v: number) => void; fmt: (n: number) => string }) {
  return (<label className="mt-4 block text-xs text-mute"><div className="flex justify-between"><span>{label}</span><span className="font-mono text-paper">{fmt(v)}</span></div>
    <input type="range" className="mt-1.5 w-full" value={v} min={min} max={max} step={step} onChange={(e) => on(+e.target.value)} /></label>);
}

function Console({ errand, setErrand, send, thinking, agent, granted }: { errand: string; setErrand: (s: string) => void; send: (t?: string) => void; thinking: boolean; agent: string; granted: boolean }) {
  return (
    <section className="card p-6">
      <div className="flex items-center justify-between"><span className="tick">Errand for {agent}</span>{!granted && <span className="chip text-amber">preview — connect PayPal to let it pay</span>}</div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-3 flex gap-2">
        <input value={errand} onChange={(e) => setErrand(e.target.value)} placeholder="e.g. Restock coffee and get my sister a pottery gift under 40" className="flex-1 rounded-2xl border border-line bg-ink px-4 py-3 outline-none placeholder:text-mute/60 focus:border-lime" />
        <motion.button whileTap={{ scale: 0.95 }} disabled={thinking} className="rounded-2xl bg-lime px-5 font-semibold text-ink disabled:opacity-50">{thinking ? "…" : "Send"}</motion.button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">{SAMPLES.map((s) => <button key={s} onClick={() => { setErrand(s); send(s); }} className="rounded-full border border-line px-3 py-1 text-left text-xs text-mute transition hover:border-violet hover:text-paper">{s}</button>)}</div>
    </section>
  );
}

const STATUS: Record<Run["status"][number], { label: string; cls: string }> = {
  pending: { label: "queued", cls: "text-mute" }, paying: { label: "charging PayPal…", cls: "text-violet" }, paid: { label: "paid", cls: "text-lime" },
  asked: { label: "needs your tap", cls: "text-amber" }, blocked: { label: "blocked by leash", cls: "text-red" }, declined: { label: "you declined", cls: "text-mute" }, failed: { label: "failed", cls: "text-red" },
};
function RunView({ run, thinking, cur, approve, decline, granted }: { run: Run | null; thinking: boolean; cur: Currency; approve: (i: number) => void; decline: (i: number) => void; granted: boolean }) {
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="card overflow-hidden">
      <div className="border-b border-line px-6 py-4">
        {thinking || !run ? <Thinking /> : (<><div className="tick">Plan · {run.model}</div><p className="mt-1 font-serif text-2xl leading-snug">{run.plan.understanding}</p><p className="mt-1 text-sm text-mute">{run.plan.note}</p></>)}
      </div>
      {run && <ul className="divide-y divide-line">
        {run.plan.cart.map((c, i) => {
          const item = run.items[i]; const v = run.verdicts[i]; const st = STATUS[run.status[i]];
          return (
            <motion.li key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 * i }} className="px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div><div className="font-medium">{c.qty > 1 && `${c.qty}× `}{item.name}</div><div className="text-xs text-mute">{item.merchant} · {CATEGORIES[item.category].label} · {c.why}</div></div>
                <div className="text-right"><div className="font-mono">{money(item.price * c.qty, cur)}</div><motion.div key={run.status[i]} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`mt-0.5 font-mono text-[11px] ${st.cls}`}>{granted || run.status[i] !== "pending" ? st.label : "would auto-buy"}</motion.div></div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">{v.reasons.map((r, k) => <motion.span key={k} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 * i + 0.06 * k + 0.2 }} className={`chip ${r.ok ? "border-lime/30 text-lime/90" : "border-red/40 text-red"}`}>{r.ok ? "✓" : "✕"} {r.text}</motion.span>)}</div>
              {run.errors[i] && <div className="mt-2 text-xs text-red">{run.errors[i]}</div>}
              {run.status[i] === "asked" && granted && <div className="mt-3 flex gap-2"><button onClick={() => approve(i)} className="rounded-xl bg-amber px-4 py-1.5 text-sm font-semibold text-ink">Approve {money(item.price * c.qty, cur)}</button><button onClick={() => decline(i)} className="rounded-xl border border-line px-4 py-1.5 text-sm text-mute">Decline</button></div>}
            </motion.li>);
        })}
        {run.plan.cart.length === 0 && <li className="px-6 py-4 text-sm text-mute">Nothing to buy.</li>}
        {run.plan.skipped.length > 0 && <li className="px-6 py-3 text-xs text-mute">Skipped: {run.plan.skipped.join(" · ")}</li>}
      </ul>}
    </motion.section>
  );
}
function Thinking() {
  const steps = ["Reading the errand", "Searching the marketplace", "Checking the leash"];
  return <div className="flex flex-wrap gap-4">{steps.map((s, i) => <motion.span key={s} className="tick" animate={{ opacity: [0.25, 1, 0.25] }} transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.35 }}>● {s}</motion.span>)}</div>;
}

function LedgerView({ ledger, refund }: { ledger: Entry[]; refund: (e: Entry) => void }) {
  const total = useMemo(() => ledger.filter((e) => !e.refunded).length, [ledger]);
  return (
    <section className="card p-6">
      <div className="flex items-center justify-between"><span className="tick">Ledger</span><span className="chip">{total} live charges</span></div>
      {ledger.length === 0 ? <p className="mt-4 text-sm text-mute">Every purchase your agent makes lands here with the errand, the reason, and the PayPal capture id.</p> : (
        <ul className="mt-3 space-y-2"><AnimatePresence initial={false}>{ledger.map((e) => (
          <motion.li layout key={e.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className={`flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3 ${e.refunded ? "opacity-50" : ""}`}>
            <div className="min-w-0"><div className="truncate text-sm font-medium">{e.name} <span className="text-mute">· {e.merchant}</span></div>
              <div className="truncate font-mono text-[11px] text-mute">{new Date(e.at).toLocaleString()} · {e.approvedBy === "human" ? "you approved" : "auto"} · {e.captureId}{e.mode === "simulated" ? " · simulated" : ""}</div></div>
            <div className="flex shrink-0 items-center gap-3"><span className={`font-mono text-sm ${e.refunded ? "line-through" : ""}`}>{money(e.amount, e.currency)}</span>
              {e.refunded ? <span className="chip text-violet">refunded</span> : <button onClick={() => refund(e)} className="chip hover:border-red hover:text-red">yank back</button>}</div>
          </motion.li>))}</AnimatePresence></ul>)}
    </section>
  );
}
function Footer() {
  return <footer className="mt-20 flex flex-wrap justify-between gap-3 text-xs text-mute"><span>Leash · built for the PayPal AI hackathon · MIT</span><span>Sandbox marketplace — merchants are fictional; payments use PayPal sandbox when keys are present.</span></footer>;
}
