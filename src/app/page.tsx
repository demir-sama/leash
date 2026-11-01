import Link from "next/link";
import HeroDemo from "@/components/HeroDemo";
import { Reveal } from "@/components/Chrome";
import { Mark } from "@/components/Logo";

const ERRANDS = ["Restock coffee and oat milk", "A small gift for my sister", "Airport train for Friday", "Renew the password manager", "Water filters before they run out", "Flowers for the anniversary", "A 48h museum pass for Lisbon", "eSIM before I land in Tokyo"];

export default function Home() {
  return (
    <>
      <section className="relative">
        <div className="absolute inset-0 grid-bg pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-5 pt-14 md:pt-24 pb-16 grid lg:grid-cols-[1.15fr_1fr] gap-12 items-center">
          <div>
            <Reveal><span className="chip text-violet border-violet/40">Built on PayPal Vault · Sandbox</span></Reveal>
            <Reveal delay={.05}><h1 className="display text-[56px] sm:text-[76px] md:text-[92px] mt-6">Give your AI an allowance, <em className="text-lime">not your wallet.</em></h1></Reveal>
            <Reveal delay={.1}><p className="text-lg text-mute mt-6 max-w-xl leading-relaxed">Vault PayPal once. Set a monthly allowance and a few plain rules. Your agent runs errands, and every purchase is checked by code, not by the model, before a cent moves. Undo anything with one tap.</p></Reveal>
            <Reveal delay={.15}>
              <div className="flex flex-wrap gap-3 mt-8">
                <Link href="/app" className="btn btn-lime">Try it, no account needed →</Link>
                <Link href="/docs" className="btn btn-ghost">Read the docs</Link>
              </div>
              <p className="text-xs text-dim mt-4">Runs in a clearly labelled simulated mode until PayPal sandbox keys are connected.</p>
            </Reveal>
          </div>
          <Reveal delay={.2}><HeroDemo /></Reveal>
        </div>
      </section>

      <div className="border-y border-line overflow-hidden py-4 bg-ink2/40">
        <div className="marquee flex gap-10 w-max">
          {[...ERRANDS, ...ERRANDS].map((e, i) => <span key={i} className="flex items-center gap-3 text-mute whitespace-nowrap"><Mark size={14} /> {e}</span>)}
        </div>
      </div>

      <section id="how" className="mx-auto max-w-6xl px-5 pt-24 scroll-mt-20">
        <Reveal><div className="tick">How it works</div><h2 className="display text-5xl md:text-6xl mt-3 max-w-3xl">Four steps between “do it for me” and money moving.</h2></Reveal>
        <div className="grid md:grid-cols-4 gap-4 mt-12">
          {[
            ["01", "Vault once", "Approve Leash on PayPal one time. We store a payment token, never your card or login."],
            ["02", "Set the leash", "Monthly allowance, per-purchase cap, an “ask me above” line, allowed categories, quiet hours."],
            ["03", "Send an errand", "In plain words. The agent shops a marketplace and proposes a cart, which the server signs."],
            ["04", "The leash decides", "Each line is paid, held for your tap, or blocked, re-checked at charge time. Refund any of it."],
          ].map(([n, t, d], i) => (
            <Reveal key={n} delay={i * .06}>
              <div className="card p-6 h-full group hover:border-line2 transition">
                <div className="font-mono text-lime text-sm">{n}</div>
                <div className="text-xl font-semibold mt-6">{t}</div>
                <p className="text-mute mt-2 leading-relaxed text-[15px]">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="safety" className="mx-auto max-w-6xl px-5 pt-28 scroll-mt-20">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12 items-start">
          <Reveal>
            <div className="tick">Safety model</div>
            <h2 className="display text-5xl md:text-6xl mt-3">The model proposes. <em className="text-lime">Code disposes.</em></h2>
            <p className="text-mute mt-5 leading-relaxed">Language models can be talked into anything, including by the shops they browse. So Leash never lets the model approve money. It can only suggest listing IDs. Everything after that is deterministic, server-side and auditable.</p>
          </Reveal>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              ["Signed carts", "Each proposed cart is HMAC-signed with a 15-minute expiry. The browser can drop lines, never add or enlarge one. Each line pays once."],
              ["Injection-aware", "Listings that address “AI agents” are blocked outright, even if the agent fell for them. Try the lounge pass in the demo."],
              ["Never cash", "Gift cards and other cash-equivalents can never be bought, whatever the rules say. That's where hijacked agents launder money."],
              ["Re-checked at pay time", "Caps, budget, daily count and quiet hours are evaluated again when the charge is made, against the server-held ledger."],
              ["Human in the loop", "Anything above your “ask me” line waits for a tap from you. The agent can't press it."],
              ["One-tap undo", "Every purchase can be refunded in full through PayPal. The allowance comes back straight away."],
            ].map(([t, d], i) => (
              <Reveal key={t} delay={i * .05}><div className="card-soft p-5 h-full"><div className="font-semibold">{t}</div><p className="text-sm text-mute mt-2 leading-relaxed">{d}</p></div></Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pt-28">
        <Reveal>
          <div className="card p-8 md:p-12 grid md:grid-cols-[1.3fr_1fr] gap-10 items-center overflow-hidden relative">
            <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-violet/20 blur-3xl" />
            <div className="relative">
              <div className="tick">Under the hood</div>
              <h3 className="display text-4xl md:text-5xl mt-3">PayPal Vault, used the way it was meant to be.</h3>
              <p className="text-mute mt-4 leading-relaxed">Leash uses the Payment Method Tokens API v3: a setup token you approve, exchanged for a reusable payment token. Merchant-initiated Orders v2 charges with <code className="font-mono text-paper">stored_credential</code>. Captures API refunds. No buyer redirect per purchase, and no stored card numbers.</p>
            </div>
            <pre className="relative font-mono text-[12px] leading-relaxed bg-ink/80 border border-line rounded-2xl p-5 overflow-x-auto text-mute">{`POST /v3/vault/setup-tokens     → approve
POST /v3/vault/payment-tokens   → vault_id
POST /v2/checkout/orders
  payment_source.paypal.vault_id
  stored_credential: MERCHANT
POST /v2/payments/captures/{id}/refund
DELETE /v3/vault/payment-tokens/{id}`}</pre>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-5 pt-28 text-center">
        <Reveal>
          <h2 className="display text-6xl md:text-7xl">Let it run the errand.<br /><em className="text-lime">Keep the leash.</em></h2>
          <Link href="/app" className="btn btn-lime mt-10">Open Leash →</Link>
        </Reveal>
      </section>
    </>
  );
}
