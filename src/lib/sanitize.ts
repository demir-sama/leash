import { CATEGORIES, CURRENCIES, MERCHANTS, NEVER, type Category, type Currency } from "./catalog";
import { DEFAULT_RULES, type Rules } from "./policy";
const num = (v: unknown, lo: number, hi: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.round(Math.min(hi, Math.max(lo, n)) * 100) / 100 : d; };
/** Hard ceilings live in code, not in a prompt. */
export const HARD_MAX_PER_PURCHASE = 200;
const zoneOk = (z: unknown) => { try { new Intl.DateTimeFormat("en", { timeZone: String(z) }); return true; } catch { return false; } };
export function sanitizeRules(r: Partial<Rules> = {}): Rules {
  const monthlyCap = num(r.monthlyCap, 5, 2000, DEFAULT_RULES.monthlyCap);
  const perPurchaseCap = num(r.perPurchaseCap, 1, Math.min(HARD_MAX_PER_PURCHASE, monthlyCap), Math.min(DEFAULT_RULES.perPurchaseCap, monthlyCap));
  return {
    agentName: String(r.agentName || DEFAULT_RULES.agentName).replace(/[^\p{L}\p{N} ._-]/gu, "").slice(0, 24) || "Errand",
    currency: (r.currency && r.currency in CURRENCIES ? r.currency : "USD") as Currency,
    monthlyCap, perPurchaseCap,
    askAbove: num(r.askAbove, 0, perPurchaseCap, Math.min(DEFAULT_RULES.askAbove, perPurchaseCap)),
    categories: Array.from(new Set((Array.isArray(r.categories) ? r.categories : DEFAULT_RULES.categories).filter((c): c is Category => c in CATEGORIES && !NEVER.includes(c as Category)))),
    blockedMerchants: (Array.isArray(r.blockedMerchants) ? r.blockedMerchants : []).filter((m) => MERCHANTS.includes(m)),
    maxPerDay: num(r.maxPerDay, 1, 20, DEFAULT_RULES.maxPerDay),
    quiet: r.quiet !== false,
    tz: zoneOk(r.tz) ? String(r.tz) : "UTC",
  };
}
