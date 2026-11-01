import { z } from "zod";
import { CATALOG, CATEGORIES, search, byId, type Item } from "@/lib/catalog";
import { withModel } from "@/lib/models";
import { generateJSON } from "@/lib/json";
import { readSession } from "@/lib/session";
import { evaluateCart, DEFAULT_RULES } from "@/lib/policy";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Plan = z.object({
  understanding: z.string().describe("One sentence: what the owner wants done"),
  cart: z.array(z.object({ itemId: z.string(), qty: z.number().int().min(1).max(5), why: z.string() })).max(6),
  skipped: z.array(z.string()).describe("Parts of the errand you chose not to buy, and why").max(4),
  note: z.string().describe("Short friendly note to the owner, max 25 words"),
});
export type PlanT = z.infer<typeof Plan>;

/**
 * The agent proposes; the leash disposes. The model only ever sees item ids from the marketplace and the rules as context.
 * Every proposal is re-evaluated by evaluateCart (and again by /api/paypal/charge) — the model cannot approve money.
 */
export async function POST(req: Request) {
  const { errand } = await req.json();
  const text = String(errand || "").slice(0, 400).trim();
  if (!text) return Response.json({ error: "Tell your agent what to do" }, { status: 400 });
  const s = await readSession();
  const rules = s?.rules ?? DEFAULT_RULES;
  const usage = { spent: s?.spent ?? 0, count: s?.count ?? 0 };
  const shortlist = dedupe([...search(text, 16), ...CATALOG.filter((i) => rules.categories.includes(i.category)).slice(0, 10)]);

  let plan: PlanT, model = "heuristic";
  try {
    const r = await withModel((m) => generateJSON({
      model: m, schema: Plan,
      system: `You are "${rules.agentName}", a careful shopping agent that spends a human's PayPal allowance. You may ONLY pick itemIds from the marketplace list. Buy the minimum that fulfils the errand. Respect the leash: prefer allowed categories (${rules.categories.join(", ")}), stay within ${rules.currency} ${rules.perPurchaseCap} per purchase and ${rules.currency} ${(rules.monthlyCap - usage.spent).toFixed(2)} left this month. If something would break the leash, still list it only if it is clearly what the human asked for (the leash will stop it and ask). Never invent items.`,
      messages: [{ role: "user", content: `Errand: ${text}\n\nMarketplace:\n${shortlist.map((i) => `${i.id} | ${i.name} | ${i.merchant} | ${CATEGORIES[i.category].label} | ${i.price} | ${i.blurb}`).join("\n")}` }],
    }));
    plan = r.result.object; model = r.model;
  } catch (e) {
    console.warn("[leash] model fallback:", (e as Error).message?.slice(0, 160));
    plan = heuristic(text, shortlist);
  }
  plan.cart = plan.cart.filter((c) => byId(c.itemId));
  const verdicts = evaluateCart(plan.cart, rules, usage);
  return Response.json({ plan, verdicts, model, items: plan.cart.map((c) => byId(c.itemId)) });
}

const dedupe = (a: Item[]) => Array.from(new Map(a.map((i) => [i.id, i])).values());
function heuristic(text: string, list: Item[]): PlanT {
  const top = search(text, 3).filter((i) => list.includes(i));
  return {
    understanding: `Find what fits “${text}”.`,
    cart: top.slice(0, 2).map((i) => ({ itemId: i.id, qty: 1, why: `Best keyword match: ${i.blurb}` })),
    skipped: [],
    note: top.length ? "Picked the closest matches — check them before I pay." : "Nothing in the marketplace matched that errand.",
  };
}
