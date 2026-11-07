"use client";

import { useSyncExternalStore } from "react";
import { encode } from "uqr";

const noop = () => () => {};

/** Absolute link to a seal's public page (D-023). Empty during prerender, filled in the browser. */
export function useSealUrl(code: string): string {
  const origin = useSyncExternalStore(noop, () => location.origin, () => "");
  return origin && `${origin}/seal/${encodeURIComponent(code)}`;
}

/** QR code as one SVG path, dark on light whatever the theme, so phone cameras always read it. */
export function SealQr({ url, size = 112 }: { url: string; size?: number }) {
  if (!url) return <div style={{ width: size, height: size }} aria-hidden="true" />;
  const { data, size: n } = encode(url, { ecc: "M", border: 2 });
  let d = "";
  data.forEach((row, y) => row.forEach((on, x) => on && (d += `M${x} ${y}h1v1h-1z`)));
  return (
    <svg
      role="img"
      aria-label="QR code for the Handshake Seal page"
      viewBox={`0 0 ${n} ${n}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className="shrink-0"
    >
      <rect width={n} height={n} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}
