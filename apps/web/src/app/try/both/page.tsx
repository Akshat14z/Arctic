export const metadata = {
  title: "Both sides at once",
  description: "Watch Priya (Hindi) and Kenji (Japanese) in the same Handshake chat, side by side. Demo accounts, no sign-up.",
};

const CHAT = "/chats/ch_demo_watch_2";
// Each frame's name gives it its own sign-in (lib/session.ts seatName), so the two people never overwrite each other.
const SEATS = [
  { seat: "buyer", who: "Priya, the buyer", reads: "हिन्दी", lang: "hi" },
  { seat: "seller", who: "Kenji, the seller", reads: "日本語", lang: "ja" },
] as const;

/** DHRUMIL-T22 judge mode: two real sessions in one window. Type on one side, read it translated on the other. */
export default function BothSidesPage() {
  return (
    <section data-wide className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="page-title">Both sides at once</h1>
        <p className="text-muted">Type as Priya on the left. Kenji reads it in Japanese on the right, live. Then reply.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {SEATS.map((s) => (
          <figure key={s.seat} className="flex flex-col gap-2">
            <figcaption className="meta">
              {s.who} · reads <span lang={s.lang}>{s.reads}</span>
            </figcaption>
            <iframe
              name={`hs-seat-${s.seat}`}
              title={`${s.who}'s screen`}
              src={`/try?as=${s.seat}&next=${encodeURIComponent(CHAT)}`}
              allow="microphone; autoplay"
              className="h-[min(78dvh,760px)] w-full rounded-lg border border-border bg-bg"
            />
          </figure>
        ))}
      </div>
    </section>
  );
}
