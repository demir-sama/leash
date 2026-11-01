import type { Metadata } from "next";
export const metadata: Metadata = { title: "Terms" };
export default function T() {
  return (
    <article className="prose-doc mx-auto max-w-3xl px-5 pt-16">
      <div className="tick">Legal</div><h1 className="display text-6xl mt-3">Terms</h1>
      <p>Leash is a non-commercial prototype built for a hackathon. Use it to explore the idea, not to buy real things.</p>
      <ul>
        <li>It runs on PayPal Sandbox or in simulated mode, and no real money moves.</li>
        <li>The marketplace, merchants and products are fictional.</li>
        <li>It is provided as is, without warranty. The source is open on GitHub.</li>
        <li>Leash is not affiliated with or endorsed by PayPal.</li>
      </ul>
    </article>
  );
}
