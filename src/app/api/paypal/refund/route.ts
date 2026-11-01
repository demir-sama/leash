import { refundCapture, PayPalError } from "@/lib/paypal";
import { readSession, writeSession, checkReceipt } from "@/lib/session";
export const dynamic = "force-dynamic";

/** "Yank the leash": full refund of an agent purchase, and the budget comes back. */
export async function POST(req: Request) {
  const s = await readSession();
  if (!s) return Response.json({ error: "No leash" }, { status: 401 });
  const { captureId, amount, at, sig } = await req.json();
  if (!checkReceipt({ captureId, amount, at, sig }, s.vaultId)) return Response.json({ error: "That receipt was not issued by this leash" }, { status: 403 });
  try {
    const r = s.mode === "sandbox" && !String(captureId).startsWith("SIM-")
      ? await refundCapture(String(captureId), "Refunded from Leash: the owner reversed an agent purchase.")
      : { refundId: `SIM-R-${crypto.randomUUID().slice(0, 10).toUpperCase()}`, status: "COMPLETED" };
    const sameMonth = typeof at === "string" && at.slice(0, 7) === s.month;
    if (sameMonth) await writeSession({ ...s, spent: Math.max(0, +(s.spent - Number(amount || 0)).toFixed(2)) });
    return Response.json(r);
  } catch (e) {
    const pe = e as PayPalError;
    return Response.json({ error: pe.message, debugId: pe.debugId }, { status: 502 });
  }
}
