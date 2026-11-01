import type { Metadata } from "next";
import DocsNav from "./DocsNav";
export const metadata: Metadata = { title: "Docs", description: "Getting started with Leash, the rules, how the agent works, the PayPal vault, refunds and FAQ." };
const SECTIONS = [["start", "Getting started"], ["rules", "The rules"], ["agent", "How the agent works"], ["mandates", "Signed carts"], ["paypal", "PayPal vault"], ["refunds", "Refunds & cutting the leash"], ["api", "API reference"], ["self-host", "Self-hosting"], ["faq", "FAQ"]] as const;

export default function Docs() {
  return (
    <div className="mx-auto max-w-6xl px-5 pt-12 grid lg:grid-cols-[220px_1fr] gap-12">
      <DocsNav sections={SECTIONS as unknown as [string, string][]} />
      <article className="prose-doc min-w-0 max-w-3xl pb-10">
        <div className="tick">Documentation</div>
        <h1 className="display text-6xl mt-3">Leash docs</h1>
        <p className="text-lg">Everything Leash does, in the order you'll meet it. Reading time: about eight minutes.</p>

        <h2 id="start">Getting started</h2>
        <ul>
          <li>Open <a href="/app">the app</a>. No account is needed.</li>
          <li>Set your rules: allowance, caps, categories and quiet hours. The defaults are sensible.</li>
          <li>Press <strong>Connect PayPal Sandbox</strong> and approve on PayPal. If the deployment has no keys, press <strong>Start simulated leash</strong> instead.</li>
          <li>Type an errand in plain words, or tap a sample. Watch the agent shop and the leash decide.</li>
          <li>Approve anything held for you, then refund anything you regret from the ledger.</li>
        </ul>
        <h3>Simulated vs sandbox</h3>
        <p>In <strong>simulated mode</strong> the rules, signed carts, replay protection and ledger work exactly as in sandbox, but PayPal is never called and every ID starts with <code>SIM-</code>. A banner says so on every screen. With <code>PAYPAL_CLIENT_ID</code> and <code>PAYPAL_CLIENT_SECRET</code> set, Leash switches to <strong>PayPal Sandbox</strong> automatically.</p>

        <h2 id="rules">The rules</h2>
        <table><thead><tr><th>Rule</th><th>What it does</th><th>Range</th></tr></thead><tbody>
          <tr><td>Monthly allowance</td><td>Total the agent may spend this calendar month (your time zone). Refunds give it back.</td><td>5–2,000</td></tr>
          <tr><td>Max per purchase</td><td>The ceiling for any single line (price × qty).</td><td>1–200, never above the allowance</td></tr>
          <tr><td>Ask me above</td><td>Lines above this are held until you tap <em>Approve</em>.</td><td>0 to the per-purchase cap</td></tr>
          <tr><td>Purchases per day</td><td>Stops runaway loops.</td><td>1–20</td></tr>
          <tr><td>Categories</td><td>Only these may be bought. <em>Gift cards &amp; cash</em> can never be enabled.</td><td>8 categories</td></tr>
          <tr><td>Quiet hours</td><td>No purchases 00:00–06:00 in your time zone.</td><td>on / off</td></tr>
        </tbody></table>
        <p>Hard limits are clamped on the server (<code>sanitizeRules</code>), so a tampered request can't raise them. Changes apply to the next charge, including carts already planned.</p>
        <h3>Decision order</h3>
        <p>Each line gets one of three verdicts. <strong>Blocked</strong> if any check fails: a never-allowed category, an injected listing, a category that is off, a blocked merchant, the per-purchase cap, the monthly budget, the daily count or quiet hours. <strong>Ask</strong> if it passes everything but is above your ask line. Otherwise <strong>Paid</strong>. Lines are evaluated in order, so later lines see the budget the earlier ones would use.</p>

        <h2 id="agent">How the agent works</h2>
        <p>The agent is an LLM routed through Vercel AI Gateway, with fallbacks across providers. It receives your errand, a shortlist of marketplace listings and your rules as context. It returns structured JSON: what it understood, a cart of <code>itemId</code> + quantity + reason, anything it skipped, and a note for you.</p>
        <ul>
          <li>It can only choose listing IDs that exist. Invented items are dropped.</li>
          <li>Listing text is written by merchants and treated as untrusted. One demo listing (the lounge pass) contains an injected instruction. The agent sometimes falls for it, and the leash always blocks it.</li>
          <li>If every model is unreachable, Leash falls back to keyword matching and says so.</li>
          <li>Progress streams to the page as NDJSON, so you see each step live.</li>
        </ul>

        <h2 id="mandates">Signed carts</h2>
        <p>When the agent finishes, the server signs the exact cart with HMAC-SHA256: the lines, a nonce, a tag for your vault and a 15-minute expiry. That token is a <em>cart mandate</em>. To charge, the browser must present the mandate and a line index. The server then:</p>
        <ul>
          <li>verifies the signature, the vault tag and the expiry;</li>
          <li>rejects a line that was already spent (<code>409 replay</code>), reserving it before calling PayPal so a double-tap can't double-charge;</li>
          <li>re-runs every rule against the current server-held ledger;</li>
          <li>takes the price from the catalog, never from the request.</li>
        </ul>
        <p>The client can skip lines but can't add, enlarge or reprice one.</p>

        <h2 id="paypal">PayPal vault</h2>
        <pre>{`1  POST /v3/vault/setup-tokens       payment_source.paypal, usage_type MERCHANT
2  payer approves on PayPal          → returns to /api/paypal/complete
3  POST /v3/vault/payment-tokens     setup token → vault_id (stored in your signed session)
4  POST /v2/checkout/orders          intent CAPTURE, payment_source.paypal.vault_id,
                                     stored_credential { MERCHANT, UNSCHEDULED, SUBSEQUENT }
5  POST /v2/checkout/orders/{id}/capture   (only if PayPal returns APPROVED)
6  POST /v2/payments/captures/{id}/refund
7  DELETE /v3/vault/payment-tokens/{id}    when you cut the leash`}</pre>
        <p>Every write carries a <code>PayPal-Request-Id</code> derived from the mandate line, so retries are idempotent on PayPal's side too. Leash never sees card numbers or your PayPal password.</p>

        <h2 id="refunds">Refunds &amp; cutting the leash</h2>
        <p>Every ledger row has <strong>Refund</strong>. It issues a full refund on the capture, marks the row and returns the amount to this month's allowance. A row can be refunded once, and the server rejects repeats. <strong>Cut the leash</strong> deletes the vault token at PayPal and clears the session, so the agent can no longer spend anything.</p>

        <h2 id="api">API reference</h2>
        <table><thead><tr><th>Route</th><th>Purpose</th></tr></thead><tbody>
          <tr><td><code>GET /api/state</code></td><td>Mode, rules, usage, ledger</td></tr>
          <tr><td><code>POST /api/paypal/connect</code></td><td>Start a leash: returns PayPal's approve URL, or creates a simulated leash</td></tr>
          <tr><td><code>PATCH /api/paypal/connect</code></td><td>Update rules (clamped server-side)</td></tr>
          <tr><td><code>DELETE /api/paypal/connect</code></td><td>Cut the leash</td></tr>
          <tr><td><code>POST /api/agent</code></td><td><code>{"{ errand }"}</code> → NDJSON stream of steps, then <code>plan</code> with verdicts and mandate</td></tr>
          <tr><td><code>POST /api/paypal/charge</code></td><td><code>{"{ mandate, line, approve? }"}</code> → ledger row. 403 blocked, 409 ask/replay, 502 PayPal</td></tr>
          <tr><td><code>POST /api/paypal/refund</code></td><td><code>{"{ id }"}</code> → refund ID</td></tr>
        </tbody></table>

        <h2 id="self-host">Self-hosting</h2>
        <pre>{`git clone https://github.com/demir-sama/leash && cd leash && npm i
# optional: real sandbox
export PAYPAL_CLIENT_ID=... PAYPAL_CLIENT_SECRET=...
export LEASH_SECRET=$(openssl rand -base64 32)
npm run dev`}</pre>
        <p>On Vercel, AI Gateway authenticates over OIDC automatically. Elsewhere, set <code>AI_GATEWAY_API_KEY</code>.</p>

        <h2 id="faq">FAQ</h2>
        <h3>Does Leash hold my money?</h3><p>No. Funds move from your PayPal wallet to the merchant through PayPal. Leash stores only a vault token reference in a signed, http-only cookie.</p>
        <h3>Can the agent change its own rules?</h3><p>No. Rules are edited only through the rules panel, clamped on the server, and checked by code the model never touches.</p>
        <h3>What if a shop tricks the agent?</h3><p>That's what the leash is for. Injected listings, cash-equivalents and anything over your limits are blocked at plan time and again at charge time.</p>
        <h3>Which currencies work?</h3><p>USD, EUR, GBP, CAD, AUD and SGD. All are PayPal-supported, with prices shown in your chosen currency.</p>
        <h3>Are the shops real?</h3><p>Not yet. The marketplace is a fictional catalog of 38 listings, so the demo is safe to run. Real merchants would plug in through PayPal Orders the same way.</p>
        <h3>Where is my data stored?</h3><p>In your browser only, as a signed cookie. There is no database. Clearing cookies or cutting the leash removes it. See <a href="/privacy">Privacy</a>.</p>
      </article>
    </div>
  );
}
