import { LANGUAGES } from "@/lib/languages";
import { HomeActions } from "./home-actions";

export default function Home() {
  return (
    <section className="flex flex-1 flex-col justify-center gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="page-title text-balance">
          Same deal, in both languages.
        </h1>
        <p className="text-muted text-pretty">
          Buy and sell with anyone. Every message is translated, every amount is spelled out, and the deal you
          agree to reads the same on both sides.
        </p>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 border-y border-border py-3" aria-label="Supported languages">
        {LANGUAGES.map(({ code, native }) => (
          <li key={code} lang={code} className="text-sm">
            {native}
          </li>
        ))}
      </ul>

      <HomeActions />
    </section>
  );
}
