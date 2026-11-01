"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type L = { name: string; shop: string; price: string; d: "auto" | "ask" | "block"; why: string };
const STORIES: { errand: string; lines: L[] }[] = [
  { errand: "My sister just started pottery. Get her something small for her birthday.", lines: [
    { name: "Hand-thrown ceramic mug", shop: "Slow Clay Studio", price: "$29.00", d: "auto", why: "Under $40, so the leash pays it" },
    { name: "Beginner pottery class", shop: "Slow Clay Studio", price: "$55.00", d: "ask", why: "Over $40, waits for your tap" },
    { name: "Prepaid Visa gift card", shop: "QuickCard Hub", price: "$100.00", d: "block", why: "Cash-equivalents are never allowed" },
  ] },
  { errand: "Flying Friday. Sort the airport train and something to listen to.", lines: [
    { name: "Airport train ticket", shop: "Railway Direct", price: "$19.00", d: "auto", why: "Travel is allowed · $19 ≤ $80" },
    { name: "Audiobook credit", shop: "Murmur Audio", price: "$12.00", d: "auto", why: "Purchase 2 of 6 today" },
    { name: "Lounge pass + priority lane", shop: "Gateway Lounges Plus", price: "$49.00", d: "block", why: "Listing contains instructions aimed at AI agents" },
  ] },
  { errand: "We're out of coffee and oat milk. Restock for the week.", lines: [
    { name: "Single-origin coffee 500g", shop: "Kettle & Crow", price: "$18.00", d: "auto", why: "Groceries allowed · $214 left" },
    { name: "Oat milk, 6-pack", shop: "Greenrow Market", price: "$14.50", d: "auto", why: "Within every rule" },
  ] },
];
export const TONE = { auto: { c: "var(--color-lime)", t: "PAID" }, ask: { c: "var(--color-amber)", t: "ASK" }, block: { c: "var(--color-red)", t: "BLOCKED" } } as const;

export default function HeroDemo() {
  const [s, setS] = useState(0);
  const [n, setN] = useState(0);
  useEffect(() => {
    const story = STORIES[s];
    const t = setTimeout(() => { if (n < story.lines.length + 2) setN(n + 1); else { setN(0); setS((s + 1) % STORIES.length); } }, n === 0 ? 900 : n > story.lines.length ? 2600 : 1100);
    return () => clearTimeout(t);
  }, [s, n]);
  const story = STORIES[s];
  return (
    <div className="card p-5 md:p-6 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="tick">Live errand</span>
        <span className="chip text-lime border-lime/30 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" /> on the leash</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.p key={s} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mt-4 text-[17px] leading-snug min-h-[3.2em]">“{story.errand}”</motion.p>
      </AnimatePresence>
      <div className="mt-4 space-y-2.5 min-h-[228px]">
        <AnimatePresence>
          {story.lines.slice(0, Math.max(0, n)).map((l, i) => (
            <motion.div key={`${s}-${i}`} layout initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="rounded-2xl border border-line bg-ink2/80 p-3.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-3 text-sm"><span className="truncate">{l.name}</span><span className="font-mono text-mute">{l.price}</span></div>
                <div className="text-xs text-dim mt-0.5 truncate">{l.shop} · {l.why}</div>
              </div>
              <motion.span initial={{ scale: 1.8, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: -4 }} transition={{ delay: .35, type: "spring", stiffness: 400, damping: 16 }}
                className="font-mono text-[10px] tracking-[.18em] px-2 py-1 rounded-md border-2" style={{ color: TONE[l.d].c, borderColor: TONE[l.d].c }}>{TONE[l.d].t}</motion.span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="mt-4 pt-4 border-t border-line flex justify-between text-xs text-mute font-mono">
        <span>signed cart · {["7F3A", "C21E", "9B04"][s]}…</span><span>PayPal vault · sandbox</span>
      </div>
    </div>
  );
}
