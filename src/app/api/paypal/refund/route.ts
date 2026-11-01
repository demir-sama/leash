import { refundCapture, PayPalError } from "@/lib/paypal";
import { readSession, writeSession, publicView } from "@/lib/session";
export const dynamic = "force-dynamic";

/** Reverse an agent purchase in full. The ledger lives server-side, so a refund can't be forged, inflated or repeated. */
export async function POST(req: Request) {
  const s = await readSession();
  if (!s) return Response.json({ error: "No leash" }, { status: 401 });
  const { id } = await req.json().catch(() => ({}));
  const row = s.ledger.find((r) => r.id === id);
  if (!row) return Response.json({ error: "That purchase isn't in your ledger" }, { status: 404 });
  if (row.refundId) return Response.json({ error: "Already refunded" }, { status: 409 });
  try {
    const r = s.mode === "sandbox" && !row.captureId.startsWith("SIM-")
      ? await refundCapture(row.captureId, "Refunded from Leash: the owner reversed an agent purchase.")
      : { refundId: `SIM-R-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`, status: "COMPLETED" };
    const thisMonth = row.at.slice(0, 7) === s.month;
    const ledger = s.ledger.map((x) => x.id === id ? { ...x, refundId: r.refundId, refundedAt: new Date().toISOString() } : x);
    const next = { ...s, ledger, spent: thisMonth ? Math.max(0, +(s.spent - row.amount).toFixed(2)) : s.spent };
    await writeSession(next);
    return Response.json({ refundId: r.refundId, status: r.status, session: publicView(next) });
  } catch (e) {
    const pe = e as PayPalError;
    return Response.json({ error: `PayPal refused the refund: ${pe.message}`, debugId: pe.debugId }, { status: 502 });
  }
}
