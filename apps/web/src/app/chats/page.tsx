import Link from "next/link";

export const metadata = { title: "Chats" };

/** Wide screens: the right pane before a chat is picked (the list itself lives in the chats layout). */
export default function ChatsPage() {
  return (
    <div className="tile min-h-[420px] items-center justify-center text-center p-8 gap-4">
      <div className="grid size-16 place-items-center rounded-full bg-surface-2 text-2xl shadow-xs">
        💬
      </div>
      <div>
        <h2 className="section-title text-xl font-bold text-text">Select a conversation</h2>
        <p className="max-w-[40ch] text-xs text-muted mt-1 leading-relaxed">
          Every negotiation message arrives auto-translated in your language. Make formal offers, seal deals, or call in real time.
        </p>
      </div>
      <Link href="/listings" className="btn btn-primary btn-sm text-xs font-semibold shadow-xs">
        Browse Marketplace Items →
      </Link>
    </div>
  );
}
