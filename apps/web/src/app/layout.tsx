import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import { AppChrome } from "./app-chrome";
import { HtmlLang } from "./html-lang";
import { CallModal } from "@/components/call-modal";
import "./globals.css";

// One system (T15): Instrument Serif for the wordmark and page titles, Inter for everything else. Only the weights used.
const serif = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400", display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Handshake: same deal, in both languages", template: "%s · Handshake" },
  description: "Marketplace chat that translates every message and spells out every amount, so both sides agree to the same deal.",
};

export const viewport: Viewport = { themeColor: "oklch(96.4% 0.006 250)" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // "en" in the static HTML; HtmlLang switches it to the user's language after hydration.
    <html lang="en" className={`${inter.variable} ${serif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <HtmlLang />
        <AppChrome>{children}</AppChrome>
        <CallModal />
      </body>
    </html>
  );
}
