import { gateway, type LanguageModel } from "ai";
const CANDIDATES = ["openai/gpt-5-mini", "google/gemini-2.5-flash", "anthropic/claude-haiku-4.5", "meta/llama-4-maverick"];
let preferred = 0;
/** Run fn against the first AI Gateway model this deployment can reach. */
export async function withModel<T>(fn: (m: LanguageModel) => Promise<T>): Promise<{ result: T; model: string }> {
  let last: unknown;
  for (let i = preferred; i < CANDIDATES.length; i++) {
    try { const result = await fn(gateway(CANDIDATES[i])); preferred = i; return { result, model: CANDIDATES[i] }; }
    catch (e) { last = e; console.warn(`[leash] ${CANDIDATES[i]}: ${String((e as Error).message).slice(0, 140)}`); }
  }
  throw last;
}
