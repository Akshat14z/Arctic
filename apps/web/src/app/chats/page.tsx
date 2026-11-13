export const metadata = { title: "Chats" };

/** Wide screens: the right pane before a chat is picked (the list itself lives in the chats layout). */
export default function ChatsPage() {
  return (
    <div className="tile min-h-72 items-center justify-center text-center">
      <p className="section-title">Pick a chat</p>
      <p className="max-w-[36ch] text-muted">Every message arrives in your language. Tap See original under any message to read the sender&apos;s own words.</p>
    </div>
  );
}
