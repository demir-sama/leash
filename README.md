# Leash

**Give your AI an allowance, not your wallet.** · https://leash-sama-5806.vercel.app

You vault PayPal once and set plain rules. After that, an AI agent can run errands for you. The model only proposes listing IDs. Deterministic server code decides what gets paid, using signed carts and a server-held ledger. Every purchase can be refunded in one tap.

- **Errand → cart → verdict → charge → ledger → refund**, streamed live
- **Rules:** monthly allowance, per-purchase cap, ask-me-above line, categories, daily count, quiet hours in your time zone. Values are clamped server-side.
- **Signed cart mandates:** HMAC-signed, expire after 15 minutes, each line can be spent once, reserved before the PayPal call, and re-checked at charge time. Prices come from the catalog, never from the client.
- **Injection-aware:** listings that address AI agents are blocked. Cash-equivalents (gift cards) are never allowed.
- **PayPal:** Vault v3 setup and payment tokens, Orders v2 merchant-initiated charges with `stored_credential`, Captures refunds, and vault token deletion. Every write carries a `PayPal-Request-Id`.
- **Simulated mode** is clearly labelled and used until `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are set. With keys present, everything goes to PayPal Sandbox automatically.

Pages: `/` home, `/app` product, `/about`, `/docs` (getting started, rules, agent, mandates, PayPal, refunds, API, self-hosting, FAQ), `/privacy`, `/terms`. Brand assets are in `public/brand/`.

```
npm i && npm run dev   # optional: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, LEASH_SECRET
```
