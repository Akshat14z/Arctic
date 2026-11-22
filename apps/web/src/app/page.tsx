import Link from "next/link";
import { LANGUAGES } from "@/lib/languages";
import { VelocityMarquee } from "@/components/bits/velocity-marquee";
import { LandingMotion } from "@/components/landing/landing-motion";
import { HomeActions } from "./home-actions";
import "./landing.css";
import { Rosette } from "@/components/landing/rosette";

/* The landing page (DHRUMIL-T14, motion T16). Editorial on grid paper; every picture is the real app
   (public/screens), every drifting word and speech bubble comes from the real demo chat, and the people are
   Open Peeps (CC0, public/people). The HTML is the finished page; LandingMotion only animates into it. */

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
  // Only in the band beside the title: the lower corners belong to the two screenshots.
  { text: "पक्का", lang: "hi", at: "left-[6%] top-[8%]" },
  { text: "₹15,000", at: "right-[9%] top-[6%]" },
  { text: "कल शाम", lang: "hi", at: "left-[38%] top-[2%]" },
  { text: "決まり", lang: "ja", at: "left-[3%] top-[30%]" },
  { text: "明日の夕方", lang: "ja", at: "right-[3%] top-[30%]" },
];

// The pinned chapter: what happens, one step per screen of scroll.
const STEPS: [string, string][] = [
  ["Priya writes in Hindi.", "Kenji reads it in Japanese."],
  ["Kenji holds at ₹15,000.", "Priya sees the same number, not yen."],
  ["They agree once.", "Both sign the same card, and it is sealed."],
  ["If something goes wrong,", "a person who reads both sides steps in."],
];

// The street at the foot of the page.
const STREET = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"];
// What the street says, one bubble at a time (landing.css .l-bubble). Real phrases from the demo deal.
const SAYS: ({ text: string; lang?: string } | null)[] = [
  { text: "नमस्ते", lang: "hi" },
  { text: "こんにちは", lang: "ja" },
  { text: "₹15,000?" },
  { text: "पक्का!", lang: "hi" },
  { text: "決まり!", lang: "ja" },
  { text: "வணக்கம்", lang: "ta" },
  { text: "See original" },
  { text: "ধন্যবাদ", lang: "bn" },
];

const SPEC: [string, string][] = [
  ["Translation", "Every message, in 8 languages, with the original one tap away"],
  ["Meaning Guard", "Amounts like “2 lakh” checked before you send"],
  ["Deal Card", "The terms, agreed by both sides in their own language"],
  ["CommonGrounds Seal", "A QR code anyone can scan to see the same deal"],
  ["Get help", "A human agent who reads what each side wrote"],
];

export default function Home() {
  const langs = LANGUAGES.map((l) => ({ code: l.code, native: l.native }));
  return (
    <div data-landing className="min-h-dvh">
      <LandingMotion />
      <div className="l-wrap">
        <header className="l-nav">
          <Link href="/" className="l-mark">
            CommonGrounds
          </Link>
          <nav aria-label="Main" className="flex items-center gap-x-5 gap-y-1">
            <Link href="/listings" className="l-link l-link-wide">
              Browse
            </Link>
            <Link href="/try" className="l-link l-link-wide">
              Try the demo
            </Link>
            <Link href="/signin" className="l-link">
              Sign in
            </Link>
            <Link href="/signup" className="l-btn l-btn-sm">
              Get started
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
            <Link href="/try" className="l-btn" data-magnet>
              Try both sides of a chat
            </Link>
            <HomeActions />
          </div>

          <div className="l-cutouts">
            <figure className="l-cutout l-cutout-a">
              {/* eslint-disable-next-line @next/next/no-img-element -- static product captures, sized explicitly */}
              <img src="/screens/chat-buyer.png" alt="Priya's screen: her question about the watch and Kenji's reply, both in Hindi" width={808} height={436} fetchPriority="high" />
              <figcaption>Priya reads Hindi</figcaption>
            </figure>
            <figure className="l-cutout l-cutout-b">
              {/* eslint-disable-next-line @next/next/no-img-element -- static product captures, sized explicitly */}
              <img src="/screens/chat-seller.png" alt="Kenji's screen: the same question and reply, both in Japanese" width={808} height={436} fetchPriority="high" />
              <figcaption>Kenji reads Japanese</figcaption>
            </figure>
          </div>
        </section>

      </div>

      {/* The story, pinned: Priya and Kenji make one deal across two languages */}
      <section data-chapter className="l-chapter l-band-tint" aria-labelledby="chapter-title">
        <div className="l-chapter-pin l-wrap">
          <div className="l-steps">
            <h2 id="chapter-title" className="sr-only">
              How one deal works
            </h2>
            <ol>
              {STEPS.map(([a, b], i) => (
                <li key={a} className="l-step" data-step={i + 1}>
                  <p className="l-step-head">{a}</p>
                  <p className="l-step-sub">{b}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="l-stage" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element -- static Open Peeps SVG */}
            <img data-who="priya" className="l-person l-person-priya" src="/people/priya.svg" alt="" width={1200} height={2980} />
            {/* eslint-disable-next-line @next/next/no-img-element -- static Open Peeps SVG */}
            <img data-who="kenji" className="l-person l-person-kenji" src="/people/kenji.svg" alt="" width={1200} height={2980} />
            <p data-say="1a" className="l-say l-say-left l-say-mine" lang="hi">क्या आप ₹14,000 में देंगे?</p>
            <p data-say="2b" className="l-say l-say-left l-say-low" lang="hi">₹15,000 अंतिम मूल्य है।</p>
            <p data-say="1b" className="l-say l-say-right" lang="ja">₹14,000でいかがですか？</p>
            <p data-say="2a" className="l-say l-say-right l-say-low l-say-mine" lang="ja">₹15,000が最終価格です。</p>
            <div data-fly="1" className="l-fly"><span>₹14,000</span></div>
            <div data-fly="2" className="l-fly l-fly-back"><span>₹15,000</span></div>

            <div data-deal className="l-deal">
              <p className="l-deal-k">Deal</p>
              <p className="l-deal-v">₹15,000</p>
              <p className="l-deal-ok">Agreed by both</p>
              <span data-seal className="l-seal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l2.2 1.6 2.7-.1.9 2.6 2.2 1.6-.8 2.6.8 2.6-2.2 1.6-.9 2.6-2.7-.1L12 21l-2.2-1.6-2.7.1-.9-2.6L4 15.3l.8-2.6L4 10.1l2.2-1.6.9-2.6 2.7.1z" />
                  <path d="M8.8 12.2l2.2 2.1 4.2-4.4" />
                </svg>
                Sealed
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="l-wrap">
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
            <img src="/screens/seal.png" alt="A sealed Deal Card: the agreed terms, both agree times and the Seal's QR code" width={716} height={1048} loading="lazy" />
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
          <Link href="/try" className="l-btn mt-8" data-magnet>
            Try the demo
          </Link>
        </div>
      </section>

      {/* Every language it reads, and the deal in its own words: faster as you scroll */}
      <div className="l-marquee">
        <VelocityMarquee
          label={`Reads ${langs.map((l) => l.native).join(", ")}`}
          rows={[
            { items: langs.map((l) => ({ text: l.native, lang: l.code })), className: "l-marquee-outline" },
            {
              items: [
                { text: "पक्का", lang: "hi" },
                { text: "₹15,000" },
                { text: "決まり", lang: "ja" },
                { text: "See original" },
                { text: "कल शाम", lang: "hi" },
                { text: "明日の夕方", lang: "ja" },
              ],
              className: "l-marquee-fill",
            },
          ]}
        />
      </div>

      {/* Support, on a pale band */}
      <div className="l-band-tint">
      <section className="l-wrap l-agent">
        <div className="l-agent-head">
          <h2 className="l-h2 max-w-[16ch]">Help that reads both sides.</h2>
          <p className="l-lead">Tap Get help and a person joins the chat. They see each message in the original and in English, beside the deal you both agreed to.</p>
        </div>
        <div className="l-agent-shot">
          {/* eslint-disable-next-line @next/next/no-img-element -- static product capture, sized explicitly */}
          <img src="/screens/agent.png" alt="The agent console: each message in the original and in English, beside the case summary and the frozen deal" width={2512} height={1616} loading="lazy" />
        </div>
      </section>
      </div>

      {/* Close, drenched in the brand blue, with the seal at its edges */}
      <div className="l-band-blue">
      <Rosette className="l-rosette-c" />
      <Rosette className="l-rosette-d" />
      <section className="l-wrap l-close">
        <p className="l-story">
          <Ink>When both sides read the same deal, nothing gets lost in translation.</Ink>
        </p>
        <Link href="/try" className="l-btn" data-magnet>
          Try both sides of a chat
        </Link>
      </section>
      </div>

      {/* The street: everyone who might trade here, standing on the footer rule */}
      <div className="l-street" aria-hidden>
        {STREET.map((n, i) => (
          <span key={n} className="l-peep">
            {/* eslint-disable-next-line @next/next/no-img-element -- static Open Peeps SVG */}
            <img src={`/people/${n}.svg`} alt="" width={1200} height={2980} loading="lazy" />
            {SAYS[i] && (
              <span className="l-bubble" lang={SAYS[i]!.lang} style={{ animationDelay: `${i * 1.5}s` }}>
                {SAYS[i]!.text}
              </span>
            )}
          </span>
        ))}
        {/* The walker: strolls the length of the street, turns, and walks back (landing-motion). Still under reduced motion. */}
        <span className="l-walker">
          {/* eslint-disable-next-line @next/next/no-img-element -- static Open Peeps SVG */}
          <img src="/people/p6.svg" alt="" width={1200} height={2980} loading="lazy" />
          <span className="l-walker-shadow" />
        </span>
      </div>

    </div>
  );
}
