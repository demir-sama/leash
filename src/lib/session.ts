import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { DEFAULT_RULES, type Row, type Rules } from "./policy";

export type Session = {
  vaultId: string; email?: string; mode: "sandbox" | "simulated"; grantedAt: string;
  rules: Rules; month: string; spent: number; day: string; count: number;
  ledger: Row[]; // newest first, capped
  used: string[]; // mandate lines already spent (replay guard)
};
const NAME = "leash.v2";
const LEDGER_MAX = 18;
const key = () => process.env.LEASH_SECRET || process.env.PAYPAL_CLIENT_SECRET || "leash-dev-only-secret";
export const hmac = (s: string) => createHmac("sha256", key()).update(s).digest("base64url");
export const safeEq = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

export async function readSession(): Promise<Session | null> {
  const raw = (await cookies()).get(NAME)?.value;
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig || !safeEq(hmac(body), sig)) return null;
  try { return roll(JSON.parse(Buffer.from(body, "base64url").toString())); } catch { return null; }
}
export async function writeSession(s: Session) {
  const t = { ...s, ledger: s.ledger.slice(0, LEDGER_MAX), used: s.used.slice(-40) };
  const body = Buffer.from(JSON.stringify(t)).toString("base64url");
  (await cookies()).set(NAME, `${body}.${hmac(body)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 60 });
}
export async function clearSession() { (await cookies()).delete(NAME); }

/** Reset counters when the calendar moves on (month and day in the owner's zone). */
export function roll(s: Session, now = new Date()): Session {
  const d = dayIn(s.rules?.tz, now), m = d.slice(0, 7);
  return { ...s, ledger: s.ledger ?? [], used: s.used ?? [], ...(s.month !== m ? { month: m, spent: 0 } : {}), ...(s.day !== d ? { day: d, count: 0 } : {}) };
}
export const dayIn = (tz = "UTC", now = new Date()) => { try { return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now); } catch { return now.toISOString().slice(0, 10); } };
export function newSession(vaultId: string, mode: Session["mode"], email: string | undefined, rules: Rules = DEFAULT_RULES): Session {
  const now = new Date(), d = dayIn(rules.tz, now);
  return { vaultId, email, mode, grantedAt: now.toISOString(), rules, month: d.slice(0, 7), spent: 0, day: d, count: 0, ledger: [], used: [] };
}
/** What the browser is allowed to see. */
export const publicView = (s: Session | null) => s && {
  email: s.email, mode: s.mode, grantedAt: s.grantedAt, rules: s.rules, spent: s.spent, count: s.count,
  vault: s.vaultId.slice(0, 5) + "…" + s.vaultId.slice(-3), ledger: s.ledger,
};
export type PublicSession = NonNullable<ReturnType<typeof publicView>>;
