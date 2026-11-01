import { CATALOG, type Category, type Currency, money } from "./catalog";

export type Rules = {
  agentName: string;
  currency: Currency;
  monthlyCap: number;
  perPurchaseCap: number;
  askAbove: number; // purchases above this need a human tap
  categories: Category[]; // allowed
  blockedMerchants: string[];
  maxPerDay: number; // purchases per day
  quiet: boolean; // no purchases 00:00–06:00 local
};
export const DEFAULT_RULES: Rules = {
  agentName: "Errand",
  currency: "USD",
  monthlyCap: 250,
  perPurchaseCap: 80,
  askAbove: 40,
  categories: ["groceries", "gifts", "books", "home", "wellness", "travel"],
  blockedMerchants: [],
  maxPerDay: 6,
  quiet: true,
};

export type Entry = {
  id: string; at: string; itemId: string; name: string; merchant: string; category: Category; amount: number; currency: Currency;
  errand: string; why: string; orderId: string; captureId: string; mode: "sandbox" | "simulated"; approvedBy: "leash" | "human";
  refunded?: boolean; refundId?: string; sig: string;
};

export type Decision = "auto" | "ask" | "block";
export type Verdict = { decision: Decision; reasons: { ok: boolean; text: string }[] };

export function spentThisMonth(ledger: Entry[], now = new Date()) {
  return ledger.filter((e) => !e.refunded && sameMonth(new Date(e.at), now)).reduce((a, e) => a + e.amount, 0);
}
export function countToday(ledger: Entry[], now = new Date()) {
  return ledger.filter((e) => !e.refunded && new Date(e.at).toDateString() === now.toDateString()).length;
}
const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

/** Evaluate a whole cart in order, so that later items see the budget the earlier ones would use. */
export type Usage = { spent: number; count: number };
export function evaluateCart(cart: { itemId: string; qty: number }[], rules: Rules, usage: Usage, now = new Date()): Verdict[] {
  let spent = usage.spent;
  let today = usage.count;
  return cart.map(({ itemId, qty }) => {
    const item = CATALOG.find((i) => i.id === itemId);
    if (!item) return { decision: "block" as Decision, reasons: [{ ok: false, text: "Not in the marketplace" }] };
    const amt = item.price * qty;
    const m = (n: number) => money(n, rules.currency);
    const r: Verdict["reasons"] = [];
    const catOk = rules.categories.includes(item.category);
    r.push({ ok: catOk, text: catOk ? `${cap(item.category)} is allowed` : `${cap(item.category)} is off-leash` });
    const merchOk = !rules.blockedMerchants.includes(item.merchant);
    if (!merchOk) r.push({ ok: false, text: `${item.merchant} is blocked` });
    const capOk = amt <= rules.perPurchaseCap;
    r.push({ ok: capOk, text: capOk ? `${m(amt)} ≤ ${m(rules.perPurchaseCap)} per purchase` : `${m(amt)} is over the ${m(rules.perPurchaseCap)} per-purchase cap` });
    const left = rules.monthlyCap - spent;
    const budgetOk = amt <= left;
    r.push({ ok: budgetOk, text: budgetOk ? `${m(left - amt)} left this month after` : `Only ${m(Math.max(0, left))} left this month` });
    const dayOk = today < rules.maxPerDay;
    if (!dayOk) r.push({ ok: false, text: `Daily limit of ${rules.maxPerDay} purchases reached` });
    const h = now.getHours();
    const quietOk = !rules.quiet || h >= 6;
    if (!quietOk) r.push({ ok: false, text: "Quiet hours (00:00–06:00)" });
    const hard = !catOk || !merchOk || !capOk || !budgetOk || !dayOk || !quietOk;
    const needsHuman = amt > rules.askAbove;
    if (needsHuman && !hard) r.push({ ok: true, text: `Over ${m(rules.askAbove)}, so it waits for your tap` });
    if (!hard) { spent += amt; today += 1; }
    return { decision: hard ? "block" : needsHuman ? "ask" : "auto", reasons: r };
  });
}
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
