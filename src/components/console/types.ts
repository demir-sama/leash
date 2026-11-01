import type { Item } from "@/lib/catalog";
import type { Verdict } from "@/lib/policy";
import type { PublicSession } from "@/lib/session";
export type State = { paypal: boolean; env: string; session: PublicSession | null };
export type Plan = { understanding: string; cart: { itemId: string; qty: number; why: string }[]; skipped: string[]; note: string };
export type LineState = "pending" | "paying" | "paid" | "waiting" | "blocked" | "declined" | "failed";
export type Run = {
  errand: string; steps: { id: string; text: string; done?: boolean }[]; warn?: string;
  plan?: Plan; verdicts?: Verdict[]; items?: Item[]; model?: string; mandate?: string | null;
  lines: LineState[]; errors: (string | undefined)[]; error?: string; finished?: boolean;
};
