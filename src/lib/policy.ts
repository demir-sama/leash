import { CATALOG, NEVER, injected, type Category, type Currency, money, CATEGORIES } from "./catalog";

export type Rules = {
  agentName: string;
  currency: Currency;
  monthlyCap: number;
  perPurchaseCap: number;
  askAbove: number; // purchases above this wait for a human tap
  categories: Category[]; // allowed
  blockedMerchants: string[];
  maxPerDay: number;
  quiet: boolean; // no purchases 00:00–06:00 (owner's local time)
  tz: string; // IANA zone of the owner, used for quiet hours
};
export const DEFAULT_RULES: Rules = {
  agentName: "Errand", currency: "USD", monthlyCap: 250, perPurchaseCap: 80, askAbove: 40,
  categories: ["groceries", "gifts", "books", "home", "wellness", "travel"],
  blockedMerchants: [], maxPerDay: 6, quiet: true, tz: "UTC",
};

/** One row of the server-held ledger (kept compact: it lives inside the signed session). */
export type Row = {
  id: string; at: string; itemId: string; qty: number; amount: number; currency: Currency;
  orderId: string; captureId: string; by: "leash" | "human"; errand: string;
  refundId?: string; refundedAt?: string;
};

export type Decision = "auto" | "ask" | "block";
export type Check = { ok: boolean; text: string; rule: string };
export type Verdict = { decision: Decision; amount: number; checks: Check[] };
export type Usage = { spent: number; count: number };

export function hourIn(tz: string, now = new Date()) {
  try { return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(now)); } catch { return now.getUTCHours(); }
}

/** Evaluate a whole cart in order, so later lines see the budget the earlier ones would use. Pure and deterministic. */
export function evaluateCart(cart: { itemId: string; qty: number }[], rules: Rules, usage: Usage, now = new Date()): Verdict[] {
  let spent = usage.spent, today = usage.count;
  const m = (n: number) => money(n, rules.currency);
  return cart.map(({ itemId, qty }) => {
    const item = CATALOG.find((i) => i.id === itemId);
    if (!item) return { decision: "block" as Decision, amount: 0, checks: [{ ok: false, rule: "catalog", text: "Not a real listing" }] };
    const amt = +(item.price * qty).toFixed(2);
    const c: Check[] = [];
    const never = NEVER.includes(item.category);
    if (never) c.push({ ok: false, rule: "never", text: `${CATEGORIES[item.category].label} can never be bought by an agent` });
    const inj = injected(item);
    if (inj) c.push({ ok: false, rule: "injection", text: "Listing contains instructions aimed at AI agents" });
    const catOk = rules.categories.includes(item.category);
    if (!never) c.push({ ok: catOk, rule: "category", text: catOk ? `${CATEGORIES[item.category].label} is allowed` : `${CATEGORIES[item.category].label} is off-leash` });
    const merchOk = !rules.blockedMerchants.includes(item.merchant);
    if (!merchOk) c.push({ ok: false, rule: "merchant", text: `${item.merchant} is blocked` });
    const capOk = amt <= rules.perPurchaseCap;
    c.push({ ok: capOk, rule: "per-purchase", text: capOk ? `${m(amt)} is within the ${m(rules.perPurchaseCap)} cap` : `${m(amt)} is over the ${m(rules.perPurchaseCap)} cap` });
    const left = rules.monthlyCap - spent;
    const budgetOk = amt <= left + 1e-9;
    c.push({ ok: budgetOk, rule: "monthly", text: budgetOk ? `${m(left - amt)} left this month after` : `Only ${m(Math.max(0, left))} left this month` });
    const dayOk = today < rules.maxPerDay;
    c.push({ ok: dayOk, rule: "daily", text: dayOk ? `Purchase ${today + 1} of ${rules.maxPerDay} today` : `Daily limit of ${rules.maxPerDay} reached` });
    const quietOk = !rules.quiet || hourIn(rules.tz, now) >= 6;
    if (!quietOk) c.push({ ok: false, rule: "quiet", text: "Quiet hours (00:00–06:00 your time)" });
    const hard = c.some((x) => !x.ok);
    const ask = amt > rules.askAbove;
    if (!hard) c.push({ ok: true, rule: "ask", text: ask ? `Over ${m(rules.askAbove)}, so it waits for your tap` : `Under ${m(rules.askAbove)}, so the leash pays it` });
    if (!hard) { spent += amt; today += 1; }
    return { decision: hard ? "block" : ask ? "ask" : "auto", amount: amt, checks: c };
  });
}
