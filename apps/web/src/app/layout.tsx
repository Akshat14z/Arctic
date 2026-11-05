import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";
import { HtmlLang } from "./html-lang";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Handshake", template: "%s · Handshake" },
  description: "Marketplace chat where nothing gets lost in translation. Same deal, in both languages.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#121211" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // "en" in the static HTML; HtmlLang switches it to the user's language after hydration.
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <HtmlLang />
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex h-14 w-full max-w-2xl items-center px-4">
            <Link href="/" className="flex min-h-tap items-center text-lg font-semibold tracking-tight">
              Handshake
            </Link>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
