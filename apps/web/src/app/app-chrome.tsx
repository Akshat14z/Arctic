import { Suspense } from "react";
import { BottomTabs } from "@/components/nav-links";
import { SiteFooter } from "@/components/site-footer";
import { AppHeader } from "@/components/app-header";

/** The product's header and column. The landing page (data-landing) hides this header and goes full width (globals.css). */
export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <div data-shell className="flex min-h-full flex-1 flex-col">
      <a href="#main-content" className="sr-only z-[var(--z-tooltip)] focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:rounded-full focus:bg-surface focus:px-4 focus:py-3 focus:shadow-lg">Skip to main content</a>
      <Suspense fallback={null}><AppHeader /></Suspense>
      {/* Pages opt into a wide layout (Home, the agent console) with a data-wide root element; the landing page with data-landing. */}
      <main id="main-content" className="mx-auto flex min-h-[calc(100svh-var(--chrome-h))] min-w-0 w-full max-w-2xl flex-1 flex-col px-4 pt-4 pb-[max(6rem,calc(4rem+env(safe-area-inset-bottom)))] md:pb-8 has-[[data-wide]]:max-w-6xl has-[[data-landing]]:min-h-0 has-[[data-landing]]:max-w-none has-[[data-landing]]:p-0">
        {children}
      </main>
      <Suspense fallback={null}>
        <SiteFooter />
      </Suspense>
      <Suspense fallback={null}>
        <BottomTabs />
      </Suspense>
    </div>
  );
}
