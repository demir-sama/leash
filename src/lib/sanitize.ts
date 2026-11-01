import { CATEGORIES, CURRENCIES, MERCHANTS, type Category, type Currency } from "./catalog";
import { DEFAULT_RULES, type Rules } from "./policy";
const num = (v: unknown, lo: number, hi: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
/** Hard ceilings live here, not in the prompt. */
export const HARD_MAX_PER_PURCHASE = 200;
export function sanitizeRules(r: Partial<Rules>): Rules {
  const monthlyCap = num(r.monthlyCap, 5, 2000, DEFAULT_RULES.monthlyCap);
  const perPurchaseCap = num(r.perPurchaseCap, 1, Math.min(HARD_MAX_PER_PURCHASE, monthlyCap), DEFAULT_RULES.perPurchaseCap);
  return {
    agentName: String(r.agentName || DEFAULT_RULES.agentName).slice(0, 24),
    currency: (r.currency && r.currency in CURRENCIES ? r.currency : "USD") as Currency,
    monthlyCap, perPurchaseCap,
    askAbove: num(r.askAbove, 0, perPurchaseCap, Math.min(DEFAULT_RULES.askAbove, perPurchaseCap)),
    categories: (Array.isArray(r.categories) ? r.categories : DEFAULT_RULES.categories).filter((c): c is Category => c in CATEGORIES),
    blockedMerchants: (Array.isArray(r.blockedMerchants) ? r.blockedMerchants : []).filter((m) => MERCHANTS.includes(m)),
    maxPerDay: num(r.maxPerDay, 1, 20, DEFAULT_RULES.maxPerDay),
    quiet: r.quiet !== false,
  };
}
