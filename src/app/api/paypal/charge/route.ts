import { chargeVault, PayPalError } from "@/lib/paypal";
import { readSession, writeSession, publicView } from "@/lib/session";
import { readMandate } from "@/lib/mandate";
import { evaluateCart } from "@/lib/policy";
import { byId } from "@/lib/catalog";
import { limit } from "@/lib/ratelimit";
export const dynamic = "force-dynamic";

/**
 * The only place money moves. Body: { mandate, line, approve? }.
 * The line must come from a server-signed cart, can be spent once, and is re-checked against the current rules.
 */
export async function POST(req: Request) {
  const s = await readSession();
  if (!s) return Response.json({ error: "No leash granted yet" }, { status: 401 });
  if (!limit(req, "charge", 20)) return Response.json({ error: "Too many charges in a minute" }, { status: 429 });
  const { mandate, line, approve = false } = await req.json().catch(() => ({}));
  let m;
  try { m = readMandate(mandate, s.vaultId); } catch (e) { return Response.json({ error: (e as Error).message }, { status: 403 }); }
  const i = Number(line), l = m.lines[i];
  if (!l) return Response.json({ error: "That line is not in the signed cart" }, { status: 400 });
  const tag = `${m.n}:${i}`;
  if (s.used.includes(tag)) return Response.json({ error: "Already paid. A signed line can only be spent once.", code: "replay" }, { status: 409 });
  const item = byId(l.itemId)!;
  const [v] = evaluateCart([l], s.rules, { spent: s.spent, count: s.count });
  if (v.decision === "block") return Response.json({ error: v.checks.find((c) => !c.ok)?.text || "Blocked by the leash", verdict: v, code: "blocked" }, { status: 403 });
  if (v.decision === "ask" && approve !== true) return Response.json({ error: "Needs your tap", verdict: v, code: "ask" }, { status: 409 });
  const amount = v.amount;
  const invoiceId = `LSH-${m.n}-${i}`.toUpperCase();
  // reserve the line before calling PayPal so a double tap can't charge twice
  await writeSession({ ...s, used: [...s.used, tag] });
  try {
    const r = s.mode === "sandbox"
      ? await chargeVault({ vaultId: s.vaultId, amount: amount.toFixed(2), currency: s.rules.currency, description: `${l.qty}× ${item.name} · ${item.merchant}`, merchant: item.merchant, invoiceId, requestId: invoiceId })
      : { orderId: `SIM-O-${rand()}`, captureId: `SIM-C-${rand()}`, status: "COMPLETED" };
    const row = { id: invoiceId, at: new Date().toISOString(), itemId: item.id, qty: l.qty, amount, currency: s.rules.currency, orderId: r.orderId, captureId: r.captureId, by: approve ? "human" as const : "leash" as const, errand: m.errand.slice(0, 90) };
    const next = { ...s, used: [...s.used, tag], spent: +(s.spent + amount).toFixed(2), count: s.count + 1, ledger: [row, ...s.ledger] };
    await writeSession(next);
    return Response.json({ row, session: publicView(next) });
  } catch (e) {
    await writeSession({ ...s, used: s.used.filter((u) => u !== tag) }); // release so the owner can retry
    const pe = e as PayPalError;
    return Response.json({ error: `PayPal declined: ${pe.message}`, debugId: pe.debugId, code: "paypal" }, { status: 502 });
  }
}
const rand = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
