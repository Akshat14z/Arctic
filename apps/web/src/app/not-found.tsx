import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex flex-1 flex-col items-start justify-center gap-4">
      <h1 className="text-2xl font-semibold">We couldn&apos;t find that page</h1>
      <p className="text-muted">The link may be old, or the listing may have been removed.</p>
      <Link
        href="/"
        className="inline-flex min-h-tap items-center rounded-lg bg-brand px-4 font-medium text-brand-fg"
      >
        Go to Handshake
      </Link>
    </section>
  );
}
