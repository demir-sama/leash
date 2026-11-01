"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { byId, CATEGORIES, money } from "@/lib/catalog";
import { DEFAULT_RULES, type Rules } from "@/lib/policy";
import RulesEditor from "./RulesEditor";
import { Ring, Spinner, Stamp, Toasts, useToast } from "./ui";
import type { LineState, Run, State } from "./types";
import { Mark } from "../Logo";

const SAMPLES = [
  "My sister just started pottery. Get her something small for her birthday.",
  "Flying Friday. Sort the airport train and something to listen to on the way.",
  "We're out of coffee and oat milk, restock for the week.",
  "Get me a prepaid gift card I can send to a friend.",
  "Buy a new mechanical keyboard for my desk.",
];
const TONE: Record<LineState, [string, string]> = {
  pending: ["var(--color-mute)", "QUEUED"], paying: ["var(--color-sky)", "PAYING"], paid: ["var(--color-lime)", "PAID"],
  waiting: ["var(--color-amber)", "ASK"], blocked: ["var(--color-red)", "BLOCKED"], declined: ["var(--color-dim)", "DECLINED"], failed: ["var(--color-red)", "FAILED"],
};

export default function ConsolePage() { return <Toasts><Console /></Toasts>; }

async function j<T = any>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T }> {
  try {
    const r = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers || {}) }, cache: "no-store" });
    const data = await r.json().catch(() => ({ error: `Server error (${r.status})` }));
    return { ok: r.ok, status: r.status, data };
  } catch { return { ok: false, status: 0, data: { error: "You look offline. Check your connection." } as T }; }
}

function Console() {
  const toast = useToast();
  const [st, setSt] = useState<State | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [draft, setDraft] = useState<Rules>(DEFAULT_RULES);
  const [granting, setGranting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [errand, setErrand] = useState("");
  const runRef = useRef<Run | null>(null);
  const update = (f: (r: Run) => Run) => { const cur = runRef.current; if (!cur) return; const n = f(cur); runRef.current = n; setRun(n); };

  const load = useCallback(async () => {
    const r = await j<State>("/api/state");
    if (!r.ok) { setLoadErr(true); return; }
    setLoadErr(false); setSt(r.data); if (r.data.session) setDraft(r.data.session.rules);
  }, []);
  useEffect(() => {
    setDraft((d) => ({ ...d, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" }));
    load();
    const q = new URLSearchParams(location.search);
    const v = q.get("leash");
    if (v === "granted") toast("PayPal connected. Your agent is on the leash.");
    if (v === "cancelled") toast("You cancelled on PayPal. Nothing was saved.", "warn");
    if (v === "error") toast(`PayPal couldn't finish: ${q.get("m") || "try again"}`, "err");
    if (v) history.replaceState(null, "", "/app");
  }, [load, toast]);

  const s = st?.session ?? null;
  const setSession = (session: State["session"]) => setSt((x) => x && { ...x, session });

  async function grant() {
    setGranting(true);
    const r = await j("/api/paypal/connect", { method: "POST", body: JSON.stringify({ rules: draft }) });
    if (r.data.approveUrl) { location.href = r.data.approveUrl; return; }
    setGranting(false);
    if (r.data.simulated) { await load(); toast("Simulated leash granted. No real or sandbox money will move."); }
    else toast(r.data.error || "Couldn't start PayPal", "err");
  }
  async function saveRules() {
    const r = await j("/api/paypal/connect", { method: "PATCH", body: JSON.stringify({ rules: draft }) });
    if (r.ok) { setSession(r.data.session); setDraft(r.data.session.rules); setEditing(false); toast("Rules updated. They apply to the very next charge."); }
    else toast(r.data.error || "Couldn't save", "err");
  }
  async function cut() {
    if (!confirm("Cut the leash? This deletes the vaulted PayPal token and clears this ledger.")) return;
    await j("/api/paypal/connect", { method: "DELETE" });
    setRun(null); await load(); toast("Leash cut. Your agent can't spend anything now.", "warn");
  }

  async function charge(i: number, approve: boolean) {
    const m = runRef.current?.mandate; if (!m) return;
    update((r) => ({ ...r, lines: r.lines.map((x, k) => k === i ? "paying" : x), errors: r.errors.map((x, k) => k === i ? undefined : x) }));
    const r = await j("/api/paypal/charge", { method: "POST", body: JSON.stringify({ mandate: m, line: i, approve }) });
    if (r.ok) { setSession(r.data.session); update((x) => ({ ...x, lines: x.lines.map((y, k) => k === i ? "paid" : y) })); return true; }
    const code = r.data.code;
    update((x) => ({ ...x, lines: x.lines.map((y, k) => k === i ? (code === "ask" ? "waiting" : code === "blocked" ? "blocked" : code === "replay" ? "paid" : "failed") : y), errors: x.errors.map((y, k) => k === i ? r.data.error : y) }));
    if (code !== "ask") toast(r.data.error || "Charge failed", "err");
    return false;
  }

  async function go(text = errand) {
    const t = text.trim();
    if (t.length < 4 || busy) return;
    setBusy(true); setErrand(t);
    const fresh: Run = { errand: t, steps: [], lines: [], errors: [] };
    runRef.current = fresh; setRun(fresh);
    try {
      const res = await fetch("/api/agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ errand: t }) });
      if (!res.ok || !res.body) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `The agent couldn't start (${res.status})`); }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl; while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl); buf = buf.slice(nl + 1); if (!line.trim()) continue;
          const ev = JSON.parse(line);
          if (ev.k === "step") update((r) => ({ ...r, steps: [...r.steps.map((s) => s.id === ev.done ? { ...s, done: true } : s), { id: ev.id, text: ev.text }] }));
          if (ev.k === "warn") update((r) => ({ ...r, warn: ev.text }));
          if (ev.k === "error") throw new Error(ev.text);
          if (ev.k === "plan") update((r) => ({ ...r, steps: r.steps.map((s) => ({ ...s, done: true })), plan: ev.plan, verdicts: ev.verdicts, items: ev.items, model: ev.model, mandate: ev.mandate,
            lines: ev.verdicts.map((v: any) => v.decision === "auto" ? "pending" : v.decision === "ask" ? "waiting" : "blocked"), errors: ev.verdicts.map(() => undefined) }));
        }
      }
      const r = runRef.current;
      if (r?.verdicts) for (let i = 0; i < r.verdicts.length; i++) if (r.verdicts[i].decision === "auto") await charge(i, false);
      update((r) => ({ ...r, finished: true }));
    } catch (e) {
      update((r) => ({ ...r, error: (e as Error).message, finished: true }));
    } finally { setBusy(false); }
  }

  async function refund(id: string) {
    const r = await j("/api/paypal/refund", { method: "POST", body: JSON.stringify({ id }) });
    if (r.ok) { setSession(r.data.session); toast(`Refunded. ${r.data.refundId}`); } else toast(r.data.error || "Refund failed", "err");
  }

  if (loadErr) return <Shell><div className="card p-10 text-center"><p>Couldn't reach Leash.</p><button className="btn btn-ghost mt-4" onClick={load}>Retry</button></div></Shell>;
  if (!st) return <Shell><div className="grid md:grid-cols-[360px_1fr] gap-5">{[0, 1].map((i) => <div key={i} className="card h-80 shimmer" />)}</div></Shell>;

  const banner = <ModeBanner paypal={st.paypal} mode={s?.mode} env={st.env} />;

  if (!s) return (
    <Shell banner={banner}>
      <div className="grid lg:grid-cols-[1fr_1.05fr] gap-10 items-start">
        <div className="lg:sticky lg:top-24">
          <div className="tick">Step 1 of 2</div>
          <h1 className="display text-5xl md:text-6xl mt-3">Put your agent <em className="text-lime">on a leash.</em></h1>
          <p className="text-mute mt-5 leading-relaxed max-w-md">Pick the rules first. Then {st.paypal ? "approve Leash on PayPal Sandbox. It vaults a payment token, so no card numbers are stored and you aren't redirected for every purchase." : "start a simulated leash. This deployment has no PayPal sandbox keys yet, so charges and refunds are simulated and clearly marked SIM."}</p>
          <ul className="mt-8 space-y-3 text-sm">
            {["Rules are enforced on the server, never in the prompt", "Gift cards & cash-equivalents are always blocked", "Change rules or cut the leash any time"].map((t) => <li key={t} className="flex gap-3 items-center"><Mark size={16} />{t}</li>)}
          </ul>
        </div>
        <div className="card p-6 md:p-8">
          <RulesEditor rules={draft} onChange={setDraft} />
          <button className="btn btn-lime w-full mt-8 py-3.5" onClick={grant} disabled={granting}>
            {granting ? <><Spinner /> Connecting…</> : st.paypal ? "Connect PayPal Sandbox →" : "Start simulated leash →"}
          </button>
          <p className="text-xs text-dim text-center mt-3">{st.paypal ? "You'll approve on sandbox.paypal.com and come straight back." : "No account, no money. Your leash lives in a signed cookie in this browser."}</p>
        </div>
      </div>
    </Shell>
  );

  const r = s.rules, cur = r.currency, left = Math.max(0, r.monthlyCap - s.spent);
  return (
    <Shell banner={banner}>
      <div className="grid lg:grid-cols-[340px_1fr] gap-5 items-start">
        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="card p-6">
            <div className="flex items-center justify-between"><span className="tick">{r.agentName}'s allowance</span><span className="chip">{s.mode === "sandbox" ? "PayPal sandbox" : "SIM"}</span></div>
            <div className="flex items-center gap-5 mt-5">
              <Ring value={s.spent} max={r.monthlyCap} label={money(left, cur).replace(/\.00$/, "")} sub="left this month" />
              <div className="space-y-3 text-sm">
                <Stat k="Spent" v={money(s.spent, cur)} />
                <Stat k="Today" v={`${s.count} / ${r.maxPerDay}`} />
                <Stat k="Vault" v={s.vault} mono />
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center justify-between"><span className="tick">The leash</span><button className="text-sm text-lime link-u" onClick={() => { setDraft(r); setEditing(true); }}>Edit rules</button></div>
            <dl className="mt-4 space-y-2.5 text-sm">
              <Row k="Per purchase" v={money(r.perPurchaseCap, cur)} />
              <Row k="Ask me above" v={money(r.askAbove, cur)} />
              <Row k="Quiet hours" v={r.quiet ? "00–06 local" : "off"} />
            </dl>
            <div className="flex flex-wrap gap-1.5 mt-4">{r.categories.map((c) => <span key={c} className="chip text-mute">{CATEGORIES[c].glyph} {CATEGORIES[c].label}</span>)}</div>
            <button className="btn btn-ghost btn-sm w-full mt-5 text-red border-red/30 hover:bg-red/10" onClick={cut}>Cut the leash</button>
          </div>
        </aside>

        <section className="space-y-5 min-w-0">
          <div className="card p-5 md:p-6">
            <form onSubmit={(e) => { e.preventDefault(); go(); }} className="flex flex-col sm:flex-row gap-3">
              <input className="field text-[16px] py-3.5" placeholder={`Tell ${r.agentName} what to do…`} value={errand} onChange={(e) => setErrand(e.target.value)} maxLength={400} aria-label="Errand" />
              <button className="btn btn-lime sm:w-40 py-3.5" disabled={busy || errand.trim().length < 4}>{busy ? <><Spinner /> Working</> : "Send errand"}</button>
            </form>
            <div className="flex flex-wrap gap-2 mt-4">
              {SAMPLES.map((x) => <button key={x} disabled={busy} onClick={() => go(x)} className="text-left text-xs px-3 py-1.5 rounded-full border border-line text-mute hover:text-paper hover:border-line2 transition disabled:opacity-40">{x.length > 52 ? x.slice(0, 50) + "…" : x}</button>)}
            </div>
          </div>

          <AnimatePresence mode="wait">{run ? <RunView key={run.errand + run.steps.length * 0} run={run} cur={cur} onApprove={(i) => charge(i, true)} onDecline={(i) => update((x) => ({ ...x, lines: x.lines.map((y, k) => k === i ? "declined" : y) }))} /> : <Empty />}</AnimatePresence>

          <Ledger rows={s.ledger} onRefund={refund} />
        </section>
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div className="fixed inset-0 z-50 flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditing(false)} />
            <motion.div className="relative w-full max-w-md h-full bg-ink2 border-l border-line p-6 overflow-y-auto" initial={{ x: 60 }} animate={{ x: 0 }} exit={{ x: 60 }} transition={{ type: "spring", stiffness: 300, damping: 32 }}>
              <div className="flex items-center justify-between mb-6"><h2 className="display text-3xl">Edit the leash</h2><button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Close</button></div>
              <RulesEditor rules={draft} onChange={setDraft} />
              <button className="btn btn-lime w-full mt-8" onClick={saveRules}>Save rules</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Shell>
  );
}

function Shell({ children, banner }: { children: React.ReactNode; banner?: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl px-5 pt-6 pb-10">{banner}<div className="mt-6">{children}</div></div>;
}
function ModeBanner({ paypal, mode, env }: { paypal: boolean; mode?: string; env: string }) {
  const sim = mode ? mode === "simulated" : !paypal;
  return (
    <div className={`rounded-2xl border px-4 py-2.5 text-sm flex flex-wrap items-center gap-x-3 gap-y-1 ${sim ? "border-amber/30 bg-amber/5 text-amber" : "border-sky/30 bg-sky/5 text-sky"}`}>
      <span className="font-mono text-[11px] tracking-[.16em]">{sim ? "SIMULATED MODE" : `PAYPAL ${env.toUpperCase()}`}</span>
      <span className="text-mute">{sim ? "Same rules, signed carts and ledger, but charges and refunds are simulated (IDs start with SIM-). Add PayPal sandbox keys to go real." : "Charges and refunds go to PayPal's sandbox. Use a sandbox buyer account."}</span>
      <Link href="/docs#paypal" className="ml-auto text-paper/80 link-u">How this works</Link>
    </div>
  );
}
const Stat = ({ k, v, mono }: { k: string; v: string; mono?: boolean }) => <div><div className="tick !text-[10px]">{k}</div><div className={mono ? "font-mono text-xs mt-0.5" : "font-medium mt-0.5"}>{v}</div></div>;
const Row = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between"><dt className="text-mute">{k}</dt><dd className="font-mono">{v}</dd></div>;

function Empty() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card p-10 text-center">
      <Mark size={40} className="mx-auto opacity-80" />
      <p className="display text-3xl mt-4">Nothing on the errand list.</p>
      <p className="text-mute mt-2 text-sm">Send one above, or try the gift card and keyboard samples to watch the leash block them.</p>
    </motion.div>
  );
}

function RunView({ run, cur, onApprove, onDecline }: { run: Run; cur: any; onApprove: (i: number) => void; onDecline: (i: number) => void }) {
  const total = run.verdicts?.reduce((a, v, i) => a + (run.lines[i] === "paid" ? v.amount : 0), 0) ?? 0;
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="card p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0"><div className="tick">Errand</div><p className="mt-1.5 text-lg leading-snug">“{run.errand}”</p></div>
        {run.model && <span className="chip text-mute shrink-0 hidden sm:inline">{run.model}</span>}
      </div>
      <ol className="mt-5 space-y-2">
        {run.steps.map((s) => (
          <motion.li key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 text-sm">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${s.done ? "bg-lime text-ink" : "border border-line2 text-sky"}`}>{s.done ? "✓" : <Spinner />}</span>
            <span className={s.done ? "text-mute" : ""}>{s.text}</span>
          </motion.li>
        ))}
      </ol>
      {run.warn && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-xl border border-amber/30 bg-amber/5 text-amber text-sm px-3.5 py-2.5">⚠ {run.warn}</motion.div>}
      {run.error && <div className="mt-4 rounded-xl border border-red/30 bg-red/5 text-red text-sm px-3.5 py-2.5">{run.error}</div>}
      {run.plan && (
        <>
          <p className="mt-5 text-sm text-mute border-l-2 border-violet/60 pl-3">{run.plan.note}</p>
          <div className="mt-5 space-y-3">
            {run.items?.map((it, i) => {
              if (!it) return null;
              const v = run.verdicts![i], st = run.lines[i], [tone, label] = TONE[st];
              return (
                <motion.div key={i} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .08 }}
                  className={`rounded-2xl border p-4 transition-colors ${st === "blocked" ? "border-red/25 bg-red/[.03]" : st === "waiting" ? "border-amber/30 bg-amber/[.03]" : st === "paid" ? "border-lime/25 bg-lime/[.03]" : "border-line bg-ink2/60"}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-ink3 flex items-center justify-center text-lg shrink-0">{CATEGORIES[it.category].glyph}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap justify-between gap-x-3"><span className="font-medium">{run.plan!.cart[i].qty > 1 ? `${run.plan!.cart[i].qty}× ` : ""}{it.name}</span><span className="font-mono">{money(v.amount, cur)}</span></div>
                      <div className="text-xs text-dim mt-0.5">{it.merchant} · {run.plan!.cart[i].why}</div>
                    </div>
                    <AnimatePresence mode="wait"><motion.div key={st}>{st === "paying" ? <span className="text-sky"><Spinner /></span> : <Stamp tone={tone} text={label} />}</motion.div></AnimatePresence>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {v.checks.map((c, k) => <span key={k} className={`chip ${c.ok ? "text-mute" : "text-red border-red/30"}`}>{c.ok ? "✓" : "✕"} {c.text}</span>)}
                  </div>
                  {run.errors[i] && st !== "blocked" && <p className="text-xs text-red mt-2">{run.errors[i]}</p>}
                  {st === "waiting" && (
                    <div className="flex gap-2 mt-3.5">
                      <button className="btn btn-lime btn-sm" onClick={() => onApprove(i)}>Approve & pay {money(v.amount, cur)}</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => onDecline(i)}>Decline</button>
                    </div>
                  )}
                  {st === "failed" && <button className="btn btn-ghost btn-sm mt-3" onClick={() => onApprove(i)}>Retry</button>}
                </motion.div>
              );
            })}
          </div>
          {run.plan.skipped.length > 0 && <div className="mt-4 text-xs text-dim">Skipped: {run.plan.skipped.join(" · ")}</div>}
          {run.finished && <div className="mt-5 pt-4 border-t border-line flex justify-between text-sm"><span className="text-mute">Paid on this errand</span><span className="font-mono">{money(total, cur)}</span></div>}
        </>
      )}
    </motion.div>
  );
}

function Ledger({ rows, onRefund }: { rows: NonNullable<State["session"]>["ledger"]; onRefund: (id: string) => Promise<void> }) {
  const [pending, setPending] = useState<string | null>(null);
  return (
    <div className="card p-5 md:p-6">
      <div className="flex items-center justify-between"><span className="tick">Ledger</span><span className="text-xs text-dim">{rows.length} purchase{rows.length === 1 ? "" : "s"} · kept server-side, signed</span></div>
      {rows.length === 0 ? <p className="text-sm text-mute mt-4">Paid purchases appear here, each with its PayPal order and capture ID.</p> : (
        <ul className="mt-4 divide-y divide-line">
          <AnimatePresence initial={false}>
            {rows.map((x) => {
              const it = byId(x.itemId);
              return (
                <motion.li key={x.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="py-3.5 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className={`text-sm ${x.refundId ? "line-through text-mute" : ""}`}>{x.qty > 1 ? `${x.qty}× ` : ""}{it?.name} <span className="text-dim">· {it?.merchant}</span></div>
                    <div className="text-[11px] font-mono text-dim mt-1 break-all">{new Date(x.at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · {x.by === "human" ? "you approved" : "leash approved"} · {x.captureId}{x.refundId ? ` · refund ${x.refundId}` : ""}</div>
                  </div>
                  <span className={`font-mono text-sm ${x.refundId ? "text-mute" : ""}`}>{money(x.amount, x.currency)}</span>
                  {x.refundId ? <span className="chip text-violet border-violet/40">REFUNDED</span> : (
                    <button className="btn btn-ghost btn-sm" disabled={pending === x.id} onClick={async () => { setPending(x.id); await onRefund(x.id); setPending(null); }}>{pending === x.id ? <Spinner /> : "Refund"}</button>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
