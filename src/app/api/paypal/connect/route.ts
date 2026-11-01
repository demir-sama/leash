import { createSetupToken, hasPayPal } from "@/lib/paypal";
import { newSession, writeSession, clearSession, readSession } from "@/lib/session";
import { DEFAULT_RULES, type Rules } from "@/lib/policy";
import { sanitizeRules } from "@/lib/sanitize";
export const dynamic = "force-dynamic";

/** Start granting a leash. Real sandbox: returns PayPal's approval URL. Without keys: a clearly simulated grant. */
export async function POST(req: Request) {
  const { rules } = (await req.json().catch(() => ({}))) as { rules?: Rules };
  const r = sanitizeRules(rules ?? DEFAULT_RULES);
  const origin = new URL(req.url).origin;
  if (!hasPayPal()) {
    await writeSession(newSession(`SIM-${crypto.randomUUID().slice(0, 8)}`, "simulated", "you@example.com", r));
    return Response.json({ simulated: true });
  }
  try {
    const st = await createSetupToken(`${origin}/api/paypal/complete`, `${origin}/?leash=cancelled`, "Leash");
    const res = Response.json({ approveUrl: st.approveUrl });
    // remember the rules the user chose while they are away at PayPal
    res.headers.append("Set-Cookie", `leash_pending=${Buffer.from(JSON.stringify(r)).toString("base64url")}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
    return res;
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}

/** Update rules on an existing leash (server re-signs them; the agent can never loosen them itself). */
export async function PATCH(req: Request) {
  const s = await readSession();
  if (!s) return Response.json({ error: "No leash yet" }, { status: 401 });
  const { rules } = await req.json();
  await writeSession({ ...s, rules: sanitizeRules(rules) });
  return Response.json({ ok: true });
}

/** Cut the leash: delete the vaulted payment token and forget the session. */
export async function DELETE() {
  const s = await readSession();
  if (s?.mode === "sandbox") { try { const { deletePaymentToken } = await import("@/lib/paypal"); await deletePaymentToken(s.vaultId); } catch {} }
  await clearSession();
  return Response.json({ ok: true });
}
