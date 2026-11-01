import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { DEFAULT_RULES, type Rules } from "./policy";

export type Session = {
  vaultId: string; email?: string; mode: "sandbox" | "simulated"; grantedAt: string;
  rules: Rules;
  month: string; spent: number; day: string; count: number;
};
const NAME = "leash";
const key = () => process.env.LEASH_SECRET || process.env.PAYPAL_CLIENT_SECRET || "leash-dev-only-secret";
const sign = (s: string) => createHmac("sha256", key()).update(s).digest("base64url");

export async function readSession(): Promise<Session | null> {
  const raw = (await cookies()).get(NAME)?.value;
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const a = Buffer.from(sign(body)), b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try { return roll(JSON.parse(Buffer.from(body, "base64url").toString())); } catch { return null; }
}
export async function writeSession(s: Session) {
  const body = Buffer.from(JSON.stringify(s)).toString("base64url");
  (await cookies()).set(NAME, `${body}.${sign(body)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 60 });
}
export async function clearSession() { (await cookies()).delete(NAME); }

/** Reset monthly and daily counters when the calendar moves on. */
export function roll(s: Session, now = new Date()): Session {
  const m = now.toISOString().slice(0, 7), d = now.toISOString().slice(0, 10);
  return { ...s, ...(s.month !== m ? { month: m, spent: 0 } : {}), ...(s.day !== d ? { day: d, count: 0 } : {}) };
}
export function newSession(vaultId: string, mode: Session["mode"], email?: string, rules: Rules = DEFAULT_RULES): Session {
  const now = new Date();
  return { vaultId, email, mode, grantedAt: now.toISOString(), rules, month: now.toISOString().slice(0, 7), spent: 0, day: now.toISOString().slice(0, 10), count: 0 };
}
/** What the browser is allowed to see. */
export const publicView = (s: Session | null) => s && { email: s.email, mode: s.mode, grantedAt: s.grantedAt, rules: s.rules, spent: s.spent, count: s.count, vault: s.vaultId.slice(0, 4) + "••••" };
/** A receipt the server signed at charge time, so refunds can't be forged or inflated by the client. */
export const signReceipt = (captureId: string, amount: number, at: string, vault: string) => sign(`${captureId}|${amount.toFixed(2)}|${at}|${vault}`);
export const checkReceipt = (r: { captureId: string; amount: number; at: string; sig: string }, vault: string) => {
  const a = Buffer.from(signReceipt(r.captureId, Number(r.amount), r.at, vault)), b = Buffer.from(String(r.sig || ""));
  return a.length === b.length && timingSafeEqual(a, b);
};
