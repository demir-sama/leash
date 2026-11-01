import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Nav, Footer } from "@/components/Chrome";
import "./globals.css";
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--f-serif" });
const sans = Space_Grotesk({ subsets: ["latin"], variable: "--f-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--f-mono" });
const url = "https://leash-sama-5806.vercel.app";
export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: { default: "Leash: give your AI an allowance, not your wallet", template: "%s · Leash" },
  description: "Vault PayPal once, set the rules, and let an AI agent run errands. Every purchase is checked server-side against a signed cart, charged to your vaulted PayPal wallet, and refundable in one tap.",
  openGraph: { type: "website", url, siteName: "Leash" },
  twitter: { card: "summary_large_image" },
};
export const viewport: Viewport = { themeColor: "#0b0e14" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body><Nav /><main>{children}</main><Footer /></body>
    </html>
  );
}
