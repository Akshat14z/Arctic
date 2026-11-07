import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ListingDetailResponseSchema } from "@convocart/contracts";
import { formatPrice } from "@/lib/format";
import { ListingDetail } from "./listing-detail";

/** Link preview for WhatsApp and other chat apps (D-025): title, price and photo instead of a bare URL. */
export async function generateMetadata({ params }: PageProps<"/listings/[id]">): Promise<Metadata> {
  const { id } = await params;
  await connection(); // per-request: the fetch below must not run during prerender (blocking-prerender-current-time)
  try {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const res = await fetch(`${base}/api/listings/${encodeURIComponent(id)}`, { next: { revalidate: 300 } });
    const parsed = ListingDetailResponseSchema.safeParse(await res.json());
    if (!parsed.success) return { title: "Listing" };
    const { listing } = parsed.data;
    const title = `${listing.title} · ${formatPrice(listing.price, listing.lang)}`;
    const description = "Chat with the seller on Handshake. Each of you reads in your own language.";
    return {
      title,
      description,
      openGraph: { title, description, type: "website", ...(listing.imageUrl && { images: [listing.imageUrl] }) },
    };
  } catch {
    return { title: "Listing" };
  }
}

/** Marks the page as per-request, so metadata that reads the URL may block (Next's blocking-prerender-metadata rule). */
async function Dynamic() {
  await connection();
  return null;
}

// Cache Components: URL data (useParams) must sit under Suspense so the static shell can prerender.
export default function ListingPage() {
  return (
    <Suspense fallback={<div aria-busy className="skeleton aspect-[4/3] w-full" />}>
      <ListingDetail />
      <Dynamic />
    </Suspense>
  );
}
