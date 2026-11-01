"use client";
import { CATEGORIES, CURRENCIES, NEVER, money, type Category, type Currency } from "@/lib/catalog";
import type { Rules } from "@/lib/policy";

export default function RulesEditor({ rules, onChange }: { rules: Rules; onChange: (r: Rules) => void }) {
  const set = <K extends keyof Rules>(k: K, v: Rules[K]) => {
    const n = { ...rules, [k]: v };
    n.perPurchaseCap = Math.min(n.perPurchaseCap, n.monthlyCap);
    n.askAbove = Math.min(n.askAbove, n.perPurchaseCap);
    onChange(n);
  };
  const m = (x: number) => money(x, rules.currency);
  const cats = (Object.keys(CATEGORIES) as Category[]).filter((c) => !NEVER.includes(c));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <label className="block"><span className="tick">Agent name</span><input className="field mt-2" value={rules.agentName} maxLength={24} onChange={(e) => set("agentName", e.target.value)} /></label>
        <label className="block"><span className="tick">Currency</span>
          <select className="field mt-2 pr-8" value={rules.currency} onChange={(e) => set("currency", e.target.value as Currency)}>
            {Object.keys(CURRENCIES).map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
      </div>
      <Slider label="Monthly allowance" value={rules.monthlyCap} min={20} max={1000} step={10} fmt={m} onChange={(v) => set("monthlyCap", v)} />
      <Slider label="Max per purchase" value={rules.perPurchaseCap} min={5} max={Math.min(200, rules.monthlyCap)} step={5} fmt={m} onChange={(v) => set("perPurchaseCap", v)} />
      <Slider label="Ask me above" hint="Anything bigger waits for your tap" value={rules.askAbove} min={0} max={rules.perPurchaseCap} step={5} fmt={m} onChange={(v) => set("askAbove", v)} />
      <Slider label="Purchases per day" value={rules.maxPerDay} min={1} max={20} step={1} fmt={(x) => String(x)} onChange={(v) => set("maxPerDay", v)} />
      <div>
        <div className="tick mb-2.5">Allowed categories</div>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => {
            const on = rules.categories.includes(c);
            return (
              <button key={c} type="button" aria-pressed={on} onClick={() => set("categories", on ? rules.categories.filter((x) => x !== c) : [...rules.categories, c])}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${on ? "bg-lime/12 border-lime/50 text-lime" : "border-line text-mute hover:border-line2"}`}>
                <span className="mr-1.5 opacity-70">{CATEGORIES[c].glyph}</span>{CATEGORIES[c].label}
              </button>
            );
          })}
          <span className="px-3 py-1.5 rounded-full text-sm border border-red/30 text-red/80 line-through decoration-red/60" title="Never allowed">¤ Gift cards & cash</span>
        </div>
      </div>
      <label className="flex items-center justify-between gap-4 rounded-2xl border border-line p-4 cursor-pointer">
        <span><span className="font-medium">Quiet hours</span><span className="block text-sm text-mute">No purchases 00:00–06:00 in {rules.tz.replace("_", " ")}</span></span>
        <button type="button" role="switch" aria-checked={rules.quiet} onClick={() => set("quiet", !rules.quiet)} className={`w-12 h-7 rounded-full p-1 transition ${rules.quiet ? "bg-lime" : "bg-line2"}`}>
          <span className={`block w-5 h-5 rounded-full bg-ink transition ${rules.quiet ? "translate-x-5" : ""}`} />
        </button>
      </label>
    </div>
  );
}
function Slider({ label, hint, value, min, max, step, fmt, onChange }: { label: string; hint?: string; value: number; min: number; max: number; step: number; fmt: (n: number) => string; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between"><span className="tick">{label}</span><span className="font-mono text-paper">{fmt(value)}</span></div>
      {hint && <div className="text-xs text-dim mt-1">{hint}</div>}
      <input type="range" className="mt-2.5" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
