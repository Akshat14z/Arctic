import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";
import { HtmlLang } from "./html-lang";
import { CallModal } from "@/components/call-modal";
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
            <nav className="ml-auto flex items-center gap-1 text-sm font-medium">
              <Link href="/listings" className="flex min-h-tap items-center rounded-lg px-3 hover:bg-bg">
                Browse
              </Link>
              <Link href="/chats" className="flex min-h-tap items-center rounded-lg px-3 hover:bg-bg">
                Chats
              </Link>
              <Link href="/listings/new" className="flex min-h-tap items-center rounded-lg bg-brand px-3 text-brand-fg">
                Sell
              </Link>
            </nav>
          </div>
        </header>
        {/* Pages opt into a wide layout (the agent console) with a data-wide root element. */}
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 has-[[data-wide]]:max-w-6xl">{children}</main>
        <CallModal />
      </body>
    </html>
  );
}
