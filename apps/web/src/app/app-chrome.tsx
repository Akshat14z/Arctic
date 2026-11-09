import Link from "next/link";
import { Suspense } from "react";
import { AccountMenu, BottomTabs, NavTabs } from "@/components/nav-links";

/** The product's header and column. The landing page (data-landing) hides this header and goes full width (globals.css). */
export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <div data-shell className="flex min-h-full flex-1 flex-col">
      <header data-app-chrome className="border-b border-border bg-bg">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4">
          <Link href="/" className="flex min-h-tap shrink-0 items-center font-display text-2xl leading-none no-underline">
            Handshake
          </Link>
          <div className="flex flex-1 justify-center">
            <Suspense fallback={null}>
              <NavTabs />
            </Suspense>
          </div>
          <Suspense fallback={<span className="size-11" aria-hidden />}>
            <AccountMenu />
          </Suspense>
        </div>
      </header>
      {/* Pages opt into a wide layout (Home, the agent console) with a data-wide root element; the landing page with data-landing. */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-4 pb-24 md:pb-8 has-[[data-wide]]:max-w-6xl has-[[data-landing]]:max-w-none has-[[data-landing]]:p-0">
        {children}
      </main>
      <Suspense fallback={null}>
        <BottomTabs />
      </Suspense>
    </div>
  );
}
