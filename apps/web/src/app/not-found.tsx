import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex flex-1 flex-col items-start justify-center gap-4">
      <h1 className="page-title">We couldn&apos;t find that page</h1>
      <p className="text-muted">The link may be old, or the listing may have been removed.</p>
      <Link
        href="/"
        className="btn btn-primary"
      >
        Go to Handshake
      </Link>
    </section>
  );
}
