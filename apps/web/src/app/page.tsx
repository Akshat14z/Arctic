import Link from "next/link";
import { LANGUAGES } from "@/lib/languages";
import { HomeActions } from "./home-actions";

/* The landing page (DHRUMIL-T12), in Akshat's site/ theme: dark panels on the pale frame.
   Every picture is the real app (apps/web/public/screens), captured from the demo accounts. */

const panel = "rounded-[28px] bg-bg text-text";

function Shot({ src, alt, w, h, className = "", hero = false }: { src: string; alt: string; w: number; h: number; className?: string; hero?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static product captures, sized explicitly
    <img src={src} alt={alt} width={w} height={h} loading={hero ? "eager" : "lazy"} fetchPriority={hero ? "high" : "auto"} className={`h-auto w-full rounded-[20px] border border-border ${className}`} />
  );
}

export default function Home() {
  return (
    <div data-landing className="flex flex-col gap-3 bg-[var(--color-frame)] p-3">
      {/* Hero */}
      <section className={`${panel} flex min-h-[calc(100dvh-1.5rem)] flex-col`}>
        <header className="flex items-center gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="font-display text-lg uppercase no-underline sm:text-xl">
            Handshake
          </Link>
          <nav aria-label="Main" className="ml-auto flex items-center gap-1">
            <Link href="/listings" className="btn btn-quiet no-underline hover:underline max-sm:hidden">
              Browse
            </Link>
            <Link href="/listings/new" className="btn btn-quiet no-underline hover:underline max-sm:hidden">
              Sell
            </Link>
            <Link href="/try" className="btn btn-primary">
              Try the demo
            </Link>
          </nav>
        </header>

        <div className="grid flex-1 grid-cols-[minmax(0,1fr)] items-center gap-10 px-5 pb-8 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12 lg:px-14">
          <div className="flex flex-col gap-6">
            <h1 className="max-w-none font-display text-[clamp(1.5rem,3.7vw,3.25rem)] uppercase leading-[1.05] tracking-[0.02em]">
              Same deal, in both <span className="whitespace-nowrap">languages.</span>
            </h1>
            <p className="max-w-[40ch] text-lg text-ink-2">Marketplace chat that translates every message and spells out every amount.</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/try" className="btn btn-primary">
                Try both sides of a chat
              </Link>
              <HomeActions />
            </div>
          </div>

          {/* Signature: the same exchange on two screens */}
          <div className="flex flex-col gap-4">
            <figure className="flex w-full flex-col gap-2 sm:w-[88%]">
              <Shot src="/screens/chat-buyer.png" alt="Priya's screen: her message and Kenji's reply, both in Hindi" w={780} h={382} hero />
              <figcaption className="text-sm text-muted">Priya reads Hindi</figcaption>
            </figure>
            <figure className="flex w-full flex-col gap-2 self-end sm:w-[88%]">
              <Shot src="/screens/chat-seller.png" alt="Kenji's screen: the same two messages, both in Japanese" w={780} h={476} hero />
              <figcaption className="text-sm text-muted">Kenji reads Japanese</figcaption>
            </figure>
          </div>
        </div>

        <div className="mx-5 mb-5 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-[20px] border border-border bg-surface px-5 py-3 sm:mx-8 lg:mx-14">
          <p className="text-sm text-muted">Reads in</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Supported languages">
            {LANGUAGES.map(({ code, native }) => (
              <li key={code} lang={code} className="text-sm">
                {native}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Meaning Guard */}
      <section className={`${panel} grid items-center gap-8 px-5 py-12 sm:px-8 grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:px-14 lg:py-20`}>
        <div className="flex flex-col gap-4">
          <h2 className="max-w-[18ch] font-display text-[clamp(1.75rem,3vw,2.75rem)] uppercase leading-[1.05]">Catch the amount before it&apos;s sent.</h2>
          <p className="max-w-[44ch] text-ink-2">
            Type &ldquo;2 lakh&rdquo; and Handshake asks first: it shows ₹2,00,000, so the buyer in Tokyo reads the same number you meant.
          </p>
        </div>
        <Shot src="/screens/guard.png" alt="Meaning Guard: '2 lakh' becomes ₹2,00,000 before the message is sent" w={704} h={856} className="mx-auto max-w-sm" />
      </section>

      {/* Deal Card and Seal */}
      <section className={`${panel} grid items-center gap-8 px-5 py-12 sm:px-8 grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:px-14 lg:py-20`}>
        <Shot src="/screens/seal.png" alt="A sealed Deal Card: the agreed terms, both agree times and the Seal's QR code" w={716} h={1160} className="mx-auto max-w-sm md:order-first" />
        <div className="flex flex-col gap-4">
          <h2 className="max-w-[18ch] font-display text-[clamp(1.75rem,3vw,2.75rem)] uppercase leading-[1.05]">Agree once. Prove it at pickup.</h2>
          <p className="max-w-[44ch] text-ink-2">
            The chat becomes a Deal Card both sides agree to in their own language. Then it&apos;s sealed: a QR code anyone can scan to see the same terms.
          </p>
        </div>
      </section>

      {/* Support */}
      <section className={`${panel} flex flex-col gap-8 px-5 py-12 sm:px-8 lg:px-14 lg:py-20`}>
        <div className="flex flex-col gap-4">
          <h2 className="max-w-[22ch] font-display text-[clamp(1.75rem,3vw,2.75rem)] uppercase leading-[1.05]">Help that reads both sides.</h2>
          <p className="max-w-[56ch] text-ink-2">
            Tap Get help and an agent joins the chat. They see what each side wrote, what each side read, and the deal you both agreed to.
          </p>
        </div>
        <Shot src="/screens/agent.png" alt="The agent console: the conversation in the original and in the agent's language, beside the case summary" w={2512} h={816} />
      </section>

      {/* Close */}
      <section className={`${panel} flex flex-col items-center gap-6 px-5 py-12 text-center sm:px-8 lg:px-14 lg:py-20`}>
        <h2 className="max-w-[20ch] text-balance font-display text-[clamp(1.75rem,3vw,2.75rem)] uppercase leading-[1.05]">Try both sides of a real chat.</h2>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/try" className="btn btn-primary">
            Try the demo
          </Link>
          <Link href="/listings" className="btn btn-secondary">
            Browse listings
          </Link>
        </div>
      </section>

      <footer className={`${panel} flex flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:px-8 lg:px-14`}>
        <p className="font-display text-lg uppercase">Handshake</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-1 text-sm sm:ml-auto">
          <Link href="/try" className="link">Try the demo</Link>
          <Link href="/listings" className="link">Browse</Link>
          <Link href="/listings/new" className="link">Sell</Link>
          <a href="https://github.com/Akshat14z/Arctic" className="link">Source code</a>
        </nav>
        <p className="text-sm text-muted sm:basis-full">Built for the Nexconn Build Challenge 2026. Demo accounts are marked Demo.</p>
      </footer>
    </div>
  );
}
