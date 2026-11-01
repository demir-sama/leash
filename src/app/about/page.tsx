import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/Chrome";
import { Mark } from "@/components/Logo";
export const metadata: Metadata = { title: "About", description: "Why Leash exists: agents are about to spend money, and the safe default is an allowance, not a card." };
export default function About() {
  return (
    <div className="mx-auto max-w-5xl px-5 pt-16">
      <Reveal><div className="tick">About</div><h1 className="display text-6xl md:text-8xl mt-4">Agents are about to <em className="text-lime">spend money.</em></h1></Reveal>
      <Reveal delay={.08}><p className="text-xl text-mute mt-8 max-w-3xl leading-relaxed">Today the choice is bad: hand an AI agent your full card, or approve every purchase yourself, which defeats the point of having one. We think the right default is the one people already use with teenagers, assistants and company cards: <span className="text-paper">an allowance with rules</span>.</p></Reveal>
      <div className="grid md:grid-cols-3 gap-4 mt-16">
        {[
          ["The problem", "Models follow instructions, including ones hidden in a product listing. A single injected sentence can turn “buy a mug” into “buy five gift cards”."],
          ["Our bet", "Never let the model hold the money. It proposes listing IDs; deterministic code, signed carts and a server-held ledger decide what gets paid."],
          ["Why PayPal", "Vaulting means one approval, no stored card numbers and real refunds. People everywhere already trust it to sit between them and a merchant."],
        ].map(([t, d], i) => <Reveal key={t} delay={i * .06}><div className="card p-6 h-full"><div className="font-semibold text-lg">{t}</div><p className="text-mute mt-3 leading-relaxed">{d}</p></div></Reveal>)}
      </div>
      <Reveal><h2 className="display text-5xl mt-24">Principles</h2></Reveal>
      <div className="mt-8 divide-y divide-line border-y border-line">
        {[
          ["Rules live in code", "Not in a prompt that can be argued with. Every cap is checked when the cart is planned and again at the moment of charge."],
          ["Small by default", "Leash starts at a modest allowance and an “ask me” line. Loosening is a deliberate act; tightening is one tap."],
          ["Undo is a feature", "Every purchase can be refunded in full. Cutting the leash deletes the vault token at PayPal."],
          ["Show your work", "The agent's reasoning, each rule it passed or failed, and every PayPal ID are on screen, not hidden in logs."],
        ].map(([t, d]) => <Reveal key={t}><div className="py-6 grid md:grid-cols-[260px_1fr] gap-3"><div className="flex items-center gap-3 font-medium"><Mark size={18} />{t}</div><p className="text-mute leading-relaxed">{d}</p></div></Reveal>)}
      </div>
      <Reveal>
        <div className="card p-8 mt-20 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div><div className="display text-3xl">Built for the PayPal AI hackathon.</div><p className="text-mute mt-2">Open source. Runs on PayPal Sandbox. No real money moves.</p></div>
          <div className="flex gap-3"><Link href="/app" className="btn btn-lime">Try it</Link><a href="https://github.com/demir-sama/leash" className="btn btn-ghost">Source</a></div>
        </div>
      </Reveal>
    </div>
  );
}
