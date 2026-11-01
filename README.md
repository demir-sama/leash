# Leash — give your AI an allowance, not your wallet

Leash lets you hand an AI shopping agent a **PayPal allowance with rules**, not your card.

1. **Shape the leash.** Set a monthly allowance, a per-purchase cap, an "ask me above" line, allowed aisles, blocked merchants, a daily limit and quiet hours.
2. **Connect PayPal once.** Leash saves your PayPal wallet with **PayPal Vault v3** (setup token → approval → payment token). No money moves at this step.
3. **Give the agent an errand.** The agent (an LLM via the Vercel AI Gateway) turns plain language into a cart from a sandbox marketplace.
4. **The leash decides.** Each item gets a verdict, shown as chips: *auto-buy*, *waits for your tap*, or *blocked*.
5. **Merchant-initiated PayPal charge.** Approved items are paid with the Orders v2 API against the vaulted token (`stored_credential: MERCHANT / UNSCHEDULED`). There is no redirect.
6. **Yank it back.** Every ledger row has a one-tap refund (Payments v2 refund). The budget comes back too.

## Why it's safe
- **The model proposes; the server disposes.** The policy runs again inside `/api/paypal/charge`, against an HMAC-signed, HttpOnly session cookie. Neither the browser nor the prompt can loosen the rules or the counters.
- **Hard ceilings in code.** The per-purchase cap is clamped to at most 200 in `sanitizeRules`.
- **Signed receipts.** Refunds need the receipt the server signed at charge time, so a client can't refund someone else's capture or inflate its budget.
- **The vault id never reaches the browser.** "Cut leash" deletes the PayPal payment token.

## Run it
```bash
npm i && npm run dev
```
Without PayPal keys, Leash runs in a clearly labelled **simulated mode**. For real sandbox payments, set:

| env | value |
|---|---|
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | from a PayPal Developer **sandbox** app with *Vault* enabled (Advanced options) |
| `LEASH_SECRET` | any long random string (signs sessions and receipts) |
| `PAYPAL_ENV` | `sandbox` (default) |

On Vercel, the AI Gateway authenticates over OIDC. If no model is reachable, the agent falls back to keyword matching.

## Stack
Next.js 15 · React 19 · Tailwind 4 · Framer Motion · AI SDK 5 + Vercel AI Gateway · PayPal Vault v3, Orders v2, Payments v2.

MIT © Demir Sama
