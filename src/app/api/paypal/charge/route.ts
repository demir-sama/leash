import { chargeVault, PayPalError } from "@/lib/paypal";
import { readSession, writeSession, signReceipt } from "@/lib/session";
import { evaluateCart } from "@/lib/policy";
import { byId } from "@/lib/catalog";
export const dynamic = "force-dynamic";

/**
 * The only place money moves. The leash is re-evaluated here against the signed server-side session,
 * so neither the browser nor the model can talk their way past it.
 * Body: { itemId, qty, errand, human?: boolean }
 */
export async function POST(req: Request) {
  const s = await readSession();
  if (!s) return Response.json({ error: "No leash granted yet" }, { status: 401 });
  const { itemId, qty = 1, errand = "", human = false } = await req.json();
  const item = byId(itemId);
  const q = Math.max(1, Math.min(5, Number(qty) || 1));
  if (!item) return Response.json({ error: "Unknown item" }, { status: 400 });
  const [v] = evaluateCart([{ itemId, qty: q }], s.rules, { spent: s.spent, count: s.count });
  if (v.decision === "block") return Response.json({ error: "Blocked by the leash", verdict: v }, { status: 403 });
  if (v.decision === "ask" && !human) return Response.json({ error: "Needs your approval", verdict: v }, { status: 409 });
  const amount = +(item.price * q).toFixed(2);
  const invoiceId = `LEASH-${Date.now().toString(36)}-${item.id}`.toUpperCase();
  try {
    const r = s.mode === "sandbox"
      ? await chargeVault({ vaultId: s.vaultId, amount: amount.toFixed(2), currency: s.rules.currency, description: `${q}× ${item.name} · ${item.merchant}`, merchant: item.merchant, invoiceId, requestId: invoiceId })
      : { orderId: `SIM-O-${crypto.randomUUID().slice(0, 10).toUpperCase()}`, captureId: `SIM-C-${crypto.randomUUID().slice(0, 10).toUpperCase()}`, status: "COMPLETED" };
    await writeSession({ ...s, spent: +(s.spent + amount).toFixed(2), count: s.count + 1 });
    const at = new Date().toISOString();
    return Response.json({
      entry: { id: invoiceId, at, sig: signReceipt(r.captureId, amount, at, s.vaultId), itemId: item.id, name: q > 1 ? `${q}× ${item.name}` : item.name, merchant: item.merchant, category: item.category, amount, currency: s.rules.currency, errand: String(errand).slice(0, 200), why: "", orderId: r.orderId, captureId: r.captureId, mode: s.mode, approvedBy: human ? "human" : "leash" },
    });
  } catch (e) {
    const pe = e as PayPalError;
    return Response.json({ error: pe.message, debugId: pe.debugId }, { status: pe.status && pe.status < 600 ? pe.status : 502 });
  }
}
