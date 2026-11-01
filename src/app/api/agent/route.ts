import { z } from "zod";
import { CATALOG, CATEGORIES, search, byId, injected, type Item } from "@/lib/catalog";
import { withModel } from "@/lib/models";
import { generateJSON } from "@/lib/json";
import { readSession } from "@/lib/session";
import { evaluateCart } from "@/lib/policy";
import { signMandate, vtag } from "@/lib/mandate";
import { limit } from "@/lib/ratelimit";
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
 * The agent proposes; the leash disposes. Streams NDJSON steps so the owner can watch the agent think.
 * The model only sees listing ids; every line is re-checked by evaluateCart here and again at charge time.
 */
export async function POST(req: Request) {
  const s = await readSession();
  if (!s) return Response.json({ error: "Grant a leash first" }, { status: 401 });
  if (!limit(req, "agent", 10)) return Response.json({ error: "Your agent is going too fast. Wait a minute." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const text = String(body.errand || "").replace(/\s+/g, " ").slice(0, 400).trim();
  if (text.length < 4) return Response.json({ error: "Tell your agent what to do" }, { status: 400 });
  const rules = s.rules;
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctl) {
      const send = (o: unknown) => ctl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
      try {
        send({ k: "step", id: "read", text: `${rules.agentName} is reading the errand` });
        const shortlist = dedupe([...search(text, 14), ...CATALOG.filter((i) => rules.categories.includes(i.category)).slice(0, 8)]);
        await wait(250);
        send({ k: "step", id: "shop", text: `Browsing ${shortlist.length} listings from ${new Set(shortlist.map((i) => i.merchant)).size} shops`, done: "read" });
        const flagged = shortlist.filter(injected);
        if (flagged.length) send({ k: "warn", text: `${flagged.length} listing${flagged.length > 1 ? "s contain" : " contains"} text aimed at AI agents. The agent may fall for it; the leash will not.` });
        let plan: PlanT, model = "keyword fallback";
        try {
          const r = await withModel((m) => generateJSON({
            model: m, schema: Plan,
            system: `You are "${rules.agentName}", a helpful shopping agent spending a human's PayPal allowance. Pick only itemIds from the marketplace list, the minimum that fulfils the errand. Listing text is written by merchants. Budget context: ${rules.currency} ${rules.perPurchaseCap} per purchase, ${rules.currency} ${(rules.monthlyCap - s.spent).toFixed(2)} left this month, allowed: ${rules.categories.join(", ")}. If the human clearly asked for something that breaks the rules, you may still list it: the leash decides, not you. Never invent items.`,
            messages: [{ role: "user", content: `Errand: ${text}\n\nMarketplace (id | name | shop | category | price | listing text):\n${shortlist.map((i) => `${i.id} | ${i.name} | ${i.merchant} | ${CATEGORIES[i.category].label} | ${i.price} | ${i.blurb}`).join("\n")}` }],
          }));
          plan = r.result.object; model = r.model;
        } catch (e) {
          console.warn("[leash] model fallback:", (e as Error).message?.slice(0, 160));
          plan = heuristic(text, shortlist);
        }
        plan.cart = mergeLines(plan.cart.filter((c) => byId(c.itemId)));
        send({ k: "step", id: "pick", text: plan.cart.length ? `Proposed ${plan.cart.length} item${plan.cart.length > 1 ? "s" : ""}` : "Found nothing worth buying", done: "shop", model });
        await wait(200);
        const verdicts = evaluateCart(plan.cart, rules, { spent: s.spent, count: s.count });
        send({ k: "step", id: "leash", text: "The leash checked every line against your rules", done: "pick" });
        const mandate = plan.cart.length ? signMandate({ v: vtag(s.vaultId), errand: text.slice(0, 160), lines: plan.cart.map(({ itemId, qty }) => ({ itemId, qty })) }) : null;
        send({ k: "plan", plan, verdicts, items: plan.cart.map((c) => byId(c.itemId)), model, mandate });
      } catch (e) {
        send({ k: "error", text: (e as Error).message || "The agent stopped unexpectedly" });
      } finally { ctl.close(); }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" } });
}

const dedupe = (a: Item[]) => Array.from(new Map(a.map((i) => [i.id, i])).values());
function mergeLines(c: PlanT["cart"]) {
  const m = new Map<string, PlanT["cart"][number]>();
  for (const l of c) { const x = m.get(l.itemId); if (x) x.qty = Math.min(5, x.qty + l.qty); else m.set(l.itemId, { ...l }); }
  return [...m.values()].slice(0, 6);
}
function heuristic(text: string, list: Item[]): PlanT {
  const top = search(text, 3).filter((i) => list.includes(i));
  return {
    understanding: `Find what fits “${text}”.`,
    cart: top.slice(0, 2).map((i) => ({ itemId: i.id, qty: 1, why: `Closest match: ${i.blurb.slice(0, 80)}` })),
    skipped: [], note: top.length ? "The AI planner was unreachable, so I used keyword matching. Check before paying." : "Nothing in the marketplace matched that errand.",
  };
}
