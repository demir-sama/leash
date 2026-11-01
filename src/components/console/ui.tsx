"use client";
import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useState } from "react";

type Toast = { id: number; text: string; tone: "ok" | "warn" | "err" };
const Ctx = createContext<(t: string, tone?: Toast["tone"]) => void>(() => {});
export const useToast = () => useContext(Ctx);
export function Toasts({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setList((l) => [...l.slice(-2), { id, text, tone }]);
    setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 4600);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[min(92vw,440px)]" role="status" aria-live="polite">
        <AnimatePresence>
          {list.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 20, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: .96 }}
              className="card-soft px-4 py-3 text-sm flex items-center gap-3 shadow-2xl">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: t.tone === "ok" ? "var(--color-lime)" : t.tone === "warn" ? "var(--color-amber)" : "var(--color-red)" }} />
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function Ring({ value, max, label, sub }: { value: number; max: number; label: string; sub: string }) {
  const r = 66, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, max ? value / max : 0));
  const tone = p > .9 ? "var(--color-red)" : p > .7 ? "var(--color-amber)" : "var(--color-lime)";
  return (
    <div className="relative w-[168px] h-[168px] shrink-0">
      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
        <circle cx="80" cy="80" r={r} stroke="#1b2230" strokeWidth="12" fill="none" />
        <motion.circle cx="80" cy="80" r={r} stroke={tone} strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray={c}
          initial={false} animate={{ strokeDashoffset: c * (1 - p) }} transition={{ type: "spring", stiffness: 60, damping: 18 }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <motion.div key={label} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="display text-[34px]">{label}</motion.div>
        <div className="text-[11px] text-mute font-mono mt-1">{sub}</div>
      </div>
    </div>
  );
}

export function Stamp({ tone, text }: { tone: string; text: string }) {
  return (
    <motion.span initial={{ scale: 1.9, opacity: 0, rotate: -14 }} animate={{ scale: 1, opacity: 1, rotate: -4 }} transition={{ type: "spring", stiffness: 420, damping: 15 }}
      className="font-mono text-[10px] tracking-[.18em] px-2 py-1 rounded-md border-2 shrink-0" style={{ color: tone, borderColor: tone }}>{text}</motion.span>
  );
}
export const Spinner = () => <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />;
