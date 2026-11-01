import { createPaymentToken } from "@/lib/paypal";
import { newSession, writeSession } from "@/lib/session";
import { sanitizeRules } from "@/lib/sanitize";
import { cookies } from "next/headers";
export const dynamic = "force-dynamic";

/** PayPal sends the payer back here with approval_token_id after they approve the setup token. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const setup = u.searchParams.get("approval_token_id") || u.searchParams.get("token");
  if (!setup) return Response.redirect(`${u.origin}/app?leash=error`, 302);
  try {
    const pt = await createPaymentToken(setup);
    const jar = await cookies();
    const pending = jar.get("leash_pending")?.value;
    const rules = sanitizeRules(pending ? JSON.parse(Buffer.from(pending, "base64url").toString()) : {});
    await writeSession(newSession(pt.vaultId, "sandbox", pt.email, rules));
    jar.delete("leash_pending");
    return Response.redirect(`${u.origin}/app?leash=granted`, 302);
  } catch (e) {
    return Response.redirect(`${u.origin}/app?leash=error&m=${encodeURIComponent((e as Error).message.slice(0, 120))}`, 302);
  }
}
