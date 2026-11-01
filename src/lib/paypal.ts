import "server-only";

const BASE = process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
export const hasPayPal = () => !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

let cached: { token: string; exp: number } | null = null;
async function token() {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const r = await fetch(`${BASE}/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials", cache: "no-store" });
  if (!r.ok) throw new PayPalError(`PayPal auth failed (${r.status})`, r.status);
  const j = await r.json();
  cached = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return cached.token;
}

export class PayPalError extends Error { constructor(msg: string, public status = 500, public debugId?: string) { super(msg); } }

async function api<T = any>(method: string, path: string, body?: unknown, requestId?: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method, cache: "no-store",
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json", Prefer: "return=representation", ...(requestId ? { "PayPal-Request-Id": requestId } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  const j = text ? JSON.parse(text) : {};
  if (!r.ok) {
    const d = j.details?.[0];
    throw new PayPalError(d ? `${d.issue}: ${d.description ?? ""}`.trim() : j.message || `PayPal ${r.status}`, r.status, j.debug_id);
  }
  return j as T;
}

/** Step 1 of granting a leash: a vault setup token the payer approves on PayPal (no money moves). */
export async function createSetupToken(returnUrl: string, cancelUrl: string, brand: string) {
  const j = await api("POST", "/v3/vault/setup-tokens", {
    payment_source: {
      paypal: {
        description: `${brand}: a spending allowance for your AI agent, enforced by your leash rules`,
        usage_pattern: "IMMEDIATE",
        usage_type: "MERCHANT",
        customer_type: "CONSUMER",
        permit_multiple_payment_tokens: true,
        experience_context: { brand_name: brand, return_url: returnUrl, cancel_url: cancelUrl, shipping_preference: "NO_SHIPPING", vault_instruction: "ON_PAYER_APPROVAL" },
      },
    },
  }, crypto.randomUUID());
  const approve = j.links?.find((l: any) => l.rel === "approve")?.href;
  return { id: j.id as string, approveUrl: approve as string };
}

/** Step 2: exchange the approved setup token for a reusable payment token (vault id). */
export async function createPaymentToken(setupTokenId: string) {
  const j = await api("POST", "/v3/vault/payment-tokens", { payment_source: { token: { id: setupTokenId, type: "SETUP_TOKEN" } } }, crypto.randomUUID());
  return { vaultId: j.id as string, customerId: j.customer?.id as string, email: j.payment_source?.paypal?.email_address as string | undefined };
}

/** Merchant-initiated charge against the vaulted PayPal wallet: no buyer redirect. */
export async function chargeVault(o: { vaultId: string; amount: string; currency: string; description: string; merchant: string; invoiceId: string; requestId: string }) {
  const j = await api("POST", "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [{
      reference_id: o.invoiceId, invoice_id: o.invoiceId, description: o.description.slice(0, 127), soft_descriptor: "LEASH AGENT",
      amount: { currency_code: o.currency, value: o.amount, breakdown: { item_total: { currency_code: o.currency, value: o.amount } } },
      items: [{ name: o.description.slice(0, 127), quantity: "1", category: "DIGITAL_GOODS", unit_amount: { currency_code: o.currency, value: o.amount } }].map((i) => i),
    }],
    payment_source: { paypal: { vault_id: o.vaultId, stored_credential: { payment_initiator: "MERCHANT", payment_type: "UNSCHEDULED", usage: "SUBSEQUENT" } } },
  }, o.requestId);
  let order = j;
  if (order.status === "APPROVED") order = await api("POST", `/v2/checkout/orders/${order.id}/capture`, {}, `${o.requestId}-cap`);
  const cap = order.purchase_units?.[0]?.payments?.captures?.[0];
  if (!cap || cap.status !== "COMPLETED") throw new PayPalError(`Capture not completed (${cap?.status ?? order.status})`, 402);
  return { orderId: order.id as string, captureId: cap.id as string, status: cap.status as string };
}

export async function refundCapture(captureId: string, note: string) {
  const j = await api("POST", `/v2/payments/captures/${captureId}/refund`, { note_to_payer: note.slice(0, 255) }, crypto.randomUUID());
  return { refundId: j.id as string, status: j.status as string };
}

export async function deletePaymentToken(vaultId: string) { await api("DELETE", `/v3/vault/payment-tokens/${vaultId}`); }
