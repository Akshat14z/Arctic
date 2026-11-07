import Link from "next/link";

/** The product's header and column. The landing page (data-landing) hides this header and goes full width (globals.css). */
export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header data-app-chrome className="bg-bg">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-2 px-4">
          <Link href="/" className="flex min-h-tap items-center font-display text-xl tracking-tight no-underline">
            Handshake
          </Link>
          <nav aria-label="Main" className="ml-auto flex items-center gap-1">
            <Link href="/listings" className="btn btn-quiet no-underline hover:underline">
              Browse
            </Link>
            <Link href="/chats" className="btn btn-quiet no-underline hover:underline">
              Chats
            </Link>
            <Link href="/listings/new" className="btn btn-primary ml-1">
              Sell
            </Link>
          </nav>
        </div>
        <hr className="rule-double" />
      </header>
      {/* Pages opt into a wide layout (the agent console) with a data-wide root element; the landing page with data-landing. */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 has-[[data-wide]]:max-w-6xl has-[[data-landing]]:max-w-none has-[[data-landing]]:p-0">
        {children}
      </main>
    </>
  );
}
