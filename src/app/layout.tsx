import type { Metadata } from "next";
import { Instrument_Serif, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--f-serif" });
const sans = Space_Grotesk({ subsets: ["latin"], variable: "--f-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--f-mono" });
export const metadata: Metadata = {
  title: "Leash — give your AI an allowance, not your wallet",
  description: "Connect PayPal once, set the leash, and let an AI agent run errands. Every purchase is checked server-side, charged to a vaulted PayPal wallet, and refundable in one tap.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}><body>{children}</body></html>;
}
