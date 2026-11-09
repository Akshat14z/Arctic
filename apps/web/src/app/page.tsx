import Link from "next/link";
import { LANGUAGES } from "@/lib/languages";
import { HomeActions } from "./home-actions";
import "./landing.css";

/* The landing page (DHRUMIL-T14). Editorial on grid paper; every picture is the real app (public/screens),
   and every drifting word comes from the real demo chat. */

/** One word per span, so each inks in as it scrolls past (landing.css .l-ink). */
function Ink({ children }: { children: string }) {
  return (
    <>
      {children.split(" ").map((w, i) => (
        <span key={i} className="l-ink">
          {w}{" "}
        </span>
      ))}
    </>
  );
}

// Lines from the seeded demo chat (Priya writes Hindi, Kenji writes Japanese), placed around the title.
const DRIFT: { text: string; lang?: string; at: string }[] = [
  { text: "पक्का", lang: "hi", at: "left-[6%] top-[8%]" },
  { text: "₹15,000", at: "right-[9%] top-[6%]" },
  { text: "決まり", lang: "ja", at: "left-[14%] bottom-[22%]" },
  { text: "See original", at: "right-[3%] bottom-[12%]" },
  { text: "कल शाम", lang: "hi", at: "left-[38%] top-[2%]" },
  { text: "明日の夕方", lang: "ja", at: "right-[8%] bottom-[4%]" },
  { text: "₹14,000", at: "left-[2%] top-[62%]" },
];

const SPEC: [string, string][] = [
  ["Translation", "Every message, in 8 languages, with the original one tap away"],
  ["Meaning Guard", "Amounts like “2 lakh” checked before you send"],
  ["Deal Card", "The terms, agreed by both sides in their own language"],
  ["Handshake Seal", "A QR code anyone can scan to see the same deal"],
  ["Get help", "A human agent who reads what each side wrote"],
];

export default function Home() {
  const langs = LANGUAGES.map((l) => ({ code: l.code, native: l.native }));
  return (
    <div data-landing className="min-h-dvh">
      <div className="l-wrap">
        <header className="l-nav">
          <Link href="/" className="l-mark">
            Handshake
          </Link>
          <nav aria-label="Main" className="flex items-center gap-5">
            <Link href="/listings" className="l-link max-sm:hidden">
              Browse
            </Link>
            <Link href="/try" className="l-link">
              Try the demo
            </Link>
          </nav>
        </header>

        {/* Hero */}
        <section className="l-hero">
          <div className="l-drift" aria-hidden>
            {DRIFT.map((d) => (
              <span key={d.text} lang={d.lang} className={d.at}>
                {d.text}
              </span>
            ))}
          </div>
          <h1 className="l-title z-[1]">
            <span>Same deal.</span>
            <span>Both languages.</span>
          </h1>
          <p className="l-sub relative z-[1]">Every message translated, every amount checked, one deal both sides can prove.</p>
          <div className="l-actions relative z-[3]">
            <Link href="/try" className="l-btn">
              Try both sides of a chat
            </Link>
            <HomeActions />
          </div>

          <div className="l-cutouts">
            <figure className="l-cutout l-cutout-a">
              {/* eslint-disable-next-line @next/next/no-img-element -- static product captures, sized explicitly */}
              <img src="/screens/chat-buyer.png" alt="Priya's screen: her question about the watch and Kenji's reply, both in Hindi" width={780} height={432} fetchPriority="high" />
              <figcaption>Priya reads Hindi</figcaption>
            </figure>
            <figure className="l-cutout l-cutout-b">
              {/* eslint-disable-next-line @next/next/no-img-element -- static product captures, sized explicitly */}
              <img src="/screens/chat-seller.png" alt="Kenji's screen: the same question and reply, both in Japanese" width={780} height={426} fetchPriority="high" />
              <figcaption>Kenji reads Japanese</figcaption>
            </figure>
          </div>
        </section>

        {/* The story, inked in as you scroll */}
        <p className="l-story">
          <Ink>Priya reads</Ink>
          <span className="l-chip l-chip-gap" lang="hi">हिन्दी</span> <Ink>and Kenji reads</Ink>
          <span className="whitespace-nowrap"><span className="l-chip" lang="ja">日本語</span><span className="l-ink">.</span></span> <Ink>She offers</Ink>
          <span className="l-chip l-chip-blue l-chip-gap">₹14,000</span> <Ink>and he sees the same number, not yen. They agree once, each in their own words, and the deal is</Ink>
          <span className="whitespace-nowrap">
            <span className="l-chip l-chip-blue">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.1em]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l2.2 1.6 2.7-.1.9 2.6 2.2 1.6-.8 2.6.8 2.6-2.2 1.6-.9 2.6-2.7-.1L12 21l-2.2-1.6-2.7.1-.9-2.6L4 15.3l.8-2.6L4 10.1l2.2-1.6.9-2.6 2.7.1z" />
                <path d="M8.8 12.2l2.2 2.1 4.2-4.4" />
              </svg>
              sealed
            </span>
            <span className="l-ink">.</span>
          </span>
        </p>
      </div>

      {/* Spec sheet */}
      <section className="l-wrap l-spec">
        <div className="l-fan">
          <figure className="l-fan-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- static product captures, sized explicitly */}
            <img src="/screens/guard.png" alt="Meaning Guard: “2 lakh” becomes ₹2,00,000 before the message is sent" width={704} height={812} loading="lazy" />
          </figure>
          <figure className="l-fan-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- static product captures, sized explicitly */}
            <img src="/screens/seal.png" alt="A sealed Deal Card: the agreed terms, both agree times and the Seal's QR code" width={716} height={886} loading="lazy" />
          </figure>
        </div>
        <div>
          <h2 className="l-h2">Every amount checked. Every deal sealed.</h2>
          <table className="l-table">
            <tbody>
              {SPEC.map(([k, v]) => (
                <tr key={k}>
                  <th scope="row">{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link href="/try" className="l-btn mt-8">
            Try the demo
          </Link>
        </div>
      </section>

      {/* Every language it reads */}
      <div className="l-marquee" aria-label={`Reads ${langs.map((l) => l.native).join(", ")}`} role="img">
        <div className="l-marquee-track" aria-hidden>
          {[...langs, ...langs].map((l, i) => (
            <span key={i} lang={l.code}>
              {l.native}
            </span>
          ))}
        </div>
      </div>

      {/* Support */}
      <section className="l-wrap l-agent">
        <div className="l-agent-head">
          <h2 className="l-h2 max-w-[16ch]">Help that reads both sides.</h2>
          <p className="l-lead">Tap Get help and a person joins the chat. They see each message in the original and in English, beside the deal you both agreed to.</p>
        </div>
        <div className="l-agent-shot">
          {/* eslint-disable-next-line @next/next/no-img-element -- static product capture, sized explicitly */}
          <img src="/screens/agent.png" alt="The agent console: each message in the original and in English, beside the case summary and the frozen deal" width={2512} height={1452} loading="lazy" />
        </div>
      </section>

      {/* Close */}
      <section className="l-wrap l-close">
        <p className="l-story py-0">
          <Ink>When both sides read the same deal, nothing gets lost in translation.</Ink>
        </p>
        <Link href="/try" className="l-btn">
          Try both sides of a chat
        </Link>
      </section>

      <footer className="l-wrap l-footer">
        <Link href="/" className="l-mark">
          Handshake
        </Link>
        <nav aria-label="Footer">
          <Link href="/try" className="l-link">Try the demo</Link>
          <Link href="/listings" className="l-link">Browse</Link>
          <Link href="/listings/new" className="l-link">Sell</Link>
          <a href="https://github.com/Akshat14z/Arctic" className="l-link">Source code</a>
        </nav>
        <p className="basis-full">Built for the Nexconn Build Challenge 2026. Demo accounts are marked Demo.</p>
      </footer>
    </div>
  );
}
