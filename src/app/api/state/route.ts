import { hasPayPal } from "@/lib/paypal";
import { readSession, publicView } from "@/lib/session";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ paypal: hasPayPal(), env: process.env.PAYPAL_ENV === "live" ? "live" : "sandbox", session: publicView(await readSession()) }, { headers: { "cache-control": "no-store" } });
}
