import type { Metadata } from "next";
export const metadata: Metadata = { title: "Privacy" };
export default function P() {
  return (
    <article className="prose-doc mx-auto max-w-3xl px-5 pt-16">
      <div className="tick">Legal</div><h1 className="display text-6xl mt-3">Privacy</h1>
      <p>Leash is a hackathon demo that runs on PayPal Sandbox. This page says plainly what it keeps.</p>
      <h2>What we store</h2>
      <ul><li>Your rules, usage counters, the last 18 ledger rows and a PayPal vault token reference, in one HMAC-signed, http-only cookie in your browser.</li><li>No database, accounts or analytics.</li></ul>
      <h2>What we send</h2>
      <ul><li>Your errand text and a list of catalog listings go to an AI model through Vercel AI Gateway, to plan the cart.</li><li>Charge, refund and vault calls go to PayPal's sandbox API when keys are configured.</li></ul>
      <h2>Deleting it</h2>
      <p>Press <em>Cut the leash</em>. This deletes the vault token at PayPal and clears the cookie. Clearing your browser cookies does the same locally.</p>
    </article>
  );
}
