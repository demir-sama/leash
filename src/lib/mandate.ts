import "server-only";
import { hmac, safeEq } from "./session";
export const vtag = (vault: string) => hmac("v:" + vault).slice(0, 12);

/**
 * A cart mandate: the exact lines the agent proposed, signed by the server when the plan was made.
 * Charges must present it; each line can be spent once, and only within 15 minutes.
 * The browser can drop lines, never add or enlarge them.
 */
export type Mandate = { n: string; exp: number; v: string; errand: string; lines: { itemId: string; qty: number }[] };
export function signMandate(m: Omit<Mandate, "n" | "exp">) {
  const full: Mandate = { ...m, n: crypto.randomUUID().slice(0, 12), exp: Date.now() + 15 * 60_000 };
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  return `${body}.${hmac("mandate:" + body)}`;
}
export function readMandate(token: string, vault: string): Mandate {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig || !safeEq(hmac("mandate:" + body), sig)) throw new Error("This cart was not signed by your leash");
  const m = JSON.parse(Buffer.from(body, "base64url").toString()) as Mandate;
  if (m.v !== vtag(vault)) throw new Error("This cart belongs to a different leash");
  if (Date.now() > m.exp) throw new Error("This cart expired. Ask the agent again");
  return m;
}
