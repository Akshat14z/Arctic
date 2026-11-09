"use client";

/* Scroll-velocity marquee, ported from React Bits' ScrollVelocity (https://reactbits.dev, MIT + Commons Clause,
   © 2026 David Haz; licence in ./LICENSE-react-bits.md) and trimmed to what the landing uses: a base drift,
   speed and direction from scroll velocity, pause on hover, still under reduced motion. Transform only. */

import { useLayoutEffect, useRef, useState } from "react";
import {
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";

const wrap = (min: number, max: number, v: number) => {
  const r = max - min;
  return ((((v - min) % r) + r) % r) + min;
};

function Row({ items, baseVelocity, className }: { items: { text: string; lang?: string }[]; baseVelocity: number; className: string }) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const smooth = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const factor = useTransform(smooth, [0, 1000], [0, 4], { clamp: false });
  const reduce = useReducedMotion();
  const copy = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box);
  const [w, setW] = useState(0);
  const hovered = useRef(false);
  const dir = useRef(1);
  const pace = useRef(1);

  useLayoutEffect(() => {
    const el = copy.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const x = useTransform(baseX, (v) => (w ? `${wrap(-w, 0, v)}px` : "0px"));

  useAnimationFrame((_, delta) => {
    if (reduce || !inView) return;
    pace.current += ((hovered.current ? 0 : 1) - pace.current) * (1 - Math.exp(-delta / 150));
    const f = factor.get();
    if (f < 0) dir.current = -1;
    else if (f > 0) dir.current = 1;
    let move = dir.current * baseVelocity * (delta / 1000);
    move += dir.current * move * f;
    baseX.set(baseX.get() + move * pace.current);
  });

  const line = (key: number) => (
    <div key={key} ref={key === 0 ? copy : undefined} aria-hidden={key > 0 || undefined} className="flex shrink-0">
      {items.map((it, i) => (
        <span key={i} lang={it.lang} className="pr-[0.5em]">
          {it.text}
        </span>
      ))}
    </div>
  );

  return (
    <div ref={box} onPointerEnter={() => (hovered.current = true)} onPointerLeave={() => (hovered.current = false)} className="overflow-clip">
      <motion.div style={{ x }} className={`flex w-max ${className}`}>
        {[0, 1, 2].map(line)}
      </motion.div>
    </div>
  );
}

/** Two rows drifting in opposite directions, faster as you scroll. */
export function VelocityMarquee({ rows, label }: { rows: { items: { text: string; lang?: string }[]; className: string }[]; label: string }) {
  return (
    <div role="img" aria-label={label} className="flex flex-col gap-2">
      {rows.map((r, i) => (
        <Row key={i} items={r.items} className={r.className} baseVelocity={i % 2 ? -36 : 36} />
      ))}
    </div>
  );
}
