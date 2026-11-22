import type { Metadata } from "next";
import { WatchlistView } from "./watchlist-view";
export const metadata: Metadata = { title: "Saved listings" };
export default function WatchlistPage() { return <WatchlistView />; }
