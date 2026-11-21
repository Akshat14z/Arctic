import Link from "next/link";

export const metadata = { title: "Chats" };

/** Wide screens: the right pane before a chat is picked (the list itself lives in the chats layout). */
export default function ChatsPage() {
  return (
    <div className="flex min-h-[420px] flex-col items-start justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-border p-8">
      <h2 className="text-lg font-semibold">Pick a chat</h2>
      <p className="max-w-[45ch] text-muted">Every message arrives in your language. Agree on a deal and both of you get the same Deal Card.</p>
      <Link href="/listings" className="btn btn-secondary mt-2">
        Browse listings
      </Link>
    </div>
  );
}
