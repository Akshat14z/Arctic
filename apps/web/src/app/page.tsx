import { SUPPORTED_LANGUAGES } from "@convocart/contracts";

// Each language's own name for itself, e.g. "हिन्दी", "தமிழ்", "日本語".
const languages = SUPPORTED_LANGUAGES.map((code) => ({
  code,
  name: new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code,
}));

export default function Home() {
  return (
    <section className="flex flex-1 flex-col justify-center gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Same deal, in both languages.
        </h1>
        <p className="text-muted text-pretty">
          Buy and sell with anyone. Every message is translated, every amount is spelled out, and the deal you
          agree to reads the same on both sides.
        </p>
      </div>

      <ul className="flex flex-wrap gap-2" aria-label="Supported languages">
        {languages.map(({ code, name }) => (
          <li key={code} lang={code} className="rounded-full border border-border bg-surface px-3 py-1 text-sm">
            {name}
          </li>
        ))}
      </ul>

      <p className="text-sm text-muted">Sign-in is coming soon.</p>
    </section>
  );
}
