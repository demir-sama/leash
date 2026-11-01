"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Wordmark, Mark } from "./Logo";

const LINKS = [{ href: "/#how", label: "How it works" }, { href: "/docs", label: "Docs" }, { href: "/about", label: "About" }];

export function Nav() {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => { const f = () => setScrolled(window.scrollY > 8); f(); addEventListener("scroll", f, { passive: true }); return () => removeEventListener("scroll", f); }, []);
  useEffect(() => setOpen(false), [path]);
  return (
    <header className={`sticky top-0 z-40 transition-all ${scrolled ? "backdrop-blur-xl bg-ink/70 border-b border-line" : "border-b border-transparent"}`}>
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
        <Link href="/" aria-label="Leash home"><Wordmark /></Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-mute">
          {LINKS.map((l) => <Link key={l.href} href={l.href} className={`link-u hover:text-paper transition ${path === l.href ? "text-paper" : ""}`}>{l.label}</Link>)}
          <Link href="/app" className="btn btn-lime btn-sm">Open the app →</Link>
        </nav>
        <button className="md:hidden btn btn-ghost btn-sm" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">{open ? "Close" : "Menu"}</button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden overflow-hidden border-t border-line bg-ink/95 backdrop-blur-xl">
            <div className="px-5 py-4 flex flex-col gap-3">
              {LINKS.map((l) => <Link key={l.href} href={l.href} className="py-1 text-lg">{l.label}</Link>)}
              <Link href="/app" className="btn btn-lime mt-2">Open the app →</Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line mt-24">
      <div className="mx-auto max-w-6xl px-5 py-12 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr] text-sm">
        <div>
          <Wordmark />
          <p className="text-mute mt-4 max-w-xs leading-relaxed">An allowance for AI agents, paid from a PayPal wallet you vault once and can cut any time.</p>
        </div>
        <Col title="Product" links={[["/app", "Open the app"], ["/#how", "How it works"], ["/#safety", "Safety model"]]} />
        <Col title="Learn" links={[["/docs", "Docs"], ["/docs#faq", "FAQ"], ["/about", "About"]]} />
        <Col title="Legal" links={[["/privacy", "Privacy"], ["/terms", "Terms"], ["https://github.com/demir-sama/leash", "Source"]]} />
      </div>
      <div className="mx-auto max-w-6xl px-5 pb-10 flex flex-wrap items-center justify-between gap-3 text-xs text-dim">
        <span className="flex items-center gap-2"><Mark size={14} /> Leash is a hackathon project. It runs on PayPal Sandbox and moves no real money.</span>
        <span>Not affiliated with or endorsed by PayPal.</span>
      </div>
    </footer>
  );
}
function Col({ title, links }: { title: string; links: [string, string][] }) {
  return <div><div className="tick mb-3">{title}</div><ul className="space-y-2">{links.map(([h, l]) => <li key={h}><Link href={h} className="text-mute hover:text-paper link-u">{l}</Link></li>)}</ul></div>;
}

/** Fade-and-rise when scrolled into view. */
export function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return <motion.div className={className} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: .6, delay, ease: [0.2, 0.7, 0.2, 1] }}>{children}</motion.div>;
}
