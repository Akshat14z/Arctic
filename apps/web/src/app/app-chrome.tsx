import Link from "next/link";

/** The product's header and narrow column. The landing page (data-landing) hides this header and goes full width (globals.css). */
export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header data-app-chrome className="border-b border-border bg-bg">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center px-4">
          <Link href="/" className="flex min-h-tap items-center font-display text-xl">
            Handshake
          </Link>
          <nav className="ml-auto flex items-center gap-1 text-sm font-medium">
            <Link href="/listings" className="flex min-h-tap items-center px-3 hover:underline">
              Browse
            </Link>
            <Link href="/chats" className="flex min-h-tap items-center px-3 hover:underline">
              Chats
            </Link>
            <Link href="/listings/new" className="flex min-h-tap items-center bg-brand px-3 font-display text-brand-fg">
              Sell
            </Link>
          </nav>
        </div>
      </header>
      {/* Pages opt into a wide layout (the agent console) with a data-wide root element; the landing page with data-landing. */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 has-[[data-wide]]:max-w-6xl has-[[data-landing]]:max-w-none has-[[data-landing]]:p-0">
        {children}
      </main>
    </>
  );
}
