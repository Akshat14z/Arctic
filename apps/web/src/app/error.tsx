"use client";

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return (
    <section className="flex flex-1 flex-col items-start justify-center gap-4">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted">It&apos;s on our side, not yours. Your chats are safe.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="inline-flex min-h-tap items-center rounded-lg bg-brand px-4 font-medium text-brand-fg"
      >
        Try again
      </button>
    </section>
  );
}
