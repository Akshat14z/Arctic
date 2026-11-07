import Link from "next/link";
import { Suspense } from "react";
import { NavLinks, NavLinksStatic } from "@/components/nav-links";

/** The product's header and column. The landing page (data-landing) hides this header and goes full width (globals.css). */
export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <div data-shell className="flex min-h-full flex-1 flex-col">
      <header data-app-chrome className="bg-bg">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-2 px-4">
          <Link href="/" className="flex min-h-tap shrink-0 items-center font-display text-base uppercase no-underline sm:text-xl">
            Handshake
          </Link>
          <nav aria-label="Main" className="ml-auto flex items-center gap-0 sm:gap-1">
            <Suspense fallback={<NavLinksStatic />}>
              <NavLinks />
            </Suspense>
            <Link href="/listings/new" className="btn btn-primary ml-1">
              Sell
            </Link>
          </nav>
        </div>
        <hr className="rule" />
      </header>
      {/* Pages opt into a wide layout (the agent console) with a data-wide root element; the landing page with data-landing. */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 has-[[data-wide]]:max-w-6xl has-[[data-landing]]:max-w-none has-[[data-landing]]:p-0">
        {children}
      </main>
    </div>
  );
}
