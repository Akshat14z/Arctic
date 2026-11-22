// A guilloche rosette: the engraved line pattern on banknotes and certificates, the visual language of a seal.
// Pure SVG, computed once on the server, decorative only (aria-hidden). Placed only where no text sits (landing.css).

const TAU = Math.PI * 2;
const f = (n: number) => n.toFixed(1);

/** A closed wave ring: radius r, wobbling by `amp` with `lobes` waves, as one path. */
function ring(r: number, amp: number, lobes: number, phase = 0, steps = 360) {
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * TAU;
    const rr = r + amp * Math.sin(lobes * a + phase);
    d += `${i ? "L" : "M"}${f(100 + rr * Math.cos(a))} ${f(100 + rr * Math.sin(a))}`;
  }
  return `${d}Z`;
}

const PATHS = [
  // outer band: two interleaved wave rings, then a plain edge
  ...Array.from({ length: 6 }, (_, i) => ring(88, 6, 24, (i * TAU) / 12)),
  ring(97, 0, 1),
  // middle band
  ...Array.from({ length: 5 }, (_, i) => ring(62, 9, 16, (i * TAU) / 10)),
  // core rose: petals as wave rings of decreasing size
  ...Array.from({ length: 6 }, (_, i) => ring(30, 14, 8, (i * TAU) / 12)),
  ring(10, 0, 1),
];

export function Rosette({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 200 200" className={`l-rosette ${className}`} fill="none" stroke="currentColor" strokeWidth="0.45">
      {PATHS.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
