import type { Metadata, Viewport } from "next";
import { Libre_Franklin, Spectral, Zilla_Slab } from "next/font/google";
import { AppChrome } from "./app-chrome";
import { HtmlLang } from "./html-lang";
import { CallModal } from "@/components/call-modal";
import "./globals.css";

// Newsprint: Zilla Slab heads, Spectral body, Libre Franklin agate for figures. Only the weights used.
const zilla = Zilla_Slab({ variable: "--font-zilla", subsets: ["latin"], weight: "700", display: "swap" });
const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});
const franklin = Libre_Franklin({ variable: "--font-franklin", subsets: ["latin"], weight: "500", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Handshake: same deal, in both languages", template: "%s · Handshake" },
  description: "Marketplace chat that translates every message and spells out every amount, so both sides agree to the same deal.",
};

export const viewport: Viewport = { themeColor: "oklch(94% 0.011 92)" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // "en" in the static HTML; HtmlLang switches it to the user's language after hydration.
    <html lang="en" className={`${zilla.variable} ${spectral.variable} ${franklin.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <HtmlLang />
        <AppChrome>{children}</AppChrome>
        <CallModal />
      </body>
    </html>
  );
}
