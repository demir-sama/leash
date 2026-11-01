import type { Metadata } from "next";
import ConsolePage from "@/components/console/Console";
export const metadata: Metadata = { title: "App" };
export default function Page() { return <ConsolePage />; }
