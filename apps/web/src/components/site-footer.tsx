"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Abstract decorative SVG: concentric arcs + dot cluster — light-mode atmospheric layer. */
function FooterAbstract() {
  return (
    <svg
      aria-hidden
      className="cg-footer-abstract"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1440 240"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Concentric arcs from bottom-right */}
      <circle cx="1360" cy="260" r="180" fill="none" stroke="currentColor" strokeOpacity="0.07" strokeWidth="1" />
      <circle cx="1360" cy="260" r="260" fill="none" stroke="currentColor" strokeOpacity="0.05" strokeWidth="1" />
      <circle cx="1360" cy="260" r="360" fill="none" stroke="currentColor" strokeOpacity="0.035" strokeWidth="0.75" />
      <circle cx="1360" cy="260" r="470" fill="none" stroke="currentColor" strokeOpacity="0.02" strokeWidth="0.75" />
      {/* Partial arc top-left */}
      <path d="M -40 160 A 220 220 0 0 1 180 -40" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1.2" />
      <path d="M -40 210 A 270 270 0 0 1 230 -40" fill="none" stroke="currentColor" strokeOpacity="0.05" strokeWidth="0.8" />
      {/* Dot cluster centre-top */}
      {[[560,38],[600,58],[545,72],[625,28],[585,88],[650,68],[530,46],[680,48],[660,82],[510,62]].map(([cx,cy],i)=>(
        <circle key={i} cx={cx} cy={cy} r={i%3===0?1.4:0.9} fill="currentColor" fillOpacity={0.11+(i%4)*0.03} />
      ))}
      {/* Accent dots right */}
      <circle cx="1110" cy="62" r="3.5" fill="currentColor" fillOpacity="0.09" />
      <circle cx="1130" cy="105" r="2" fill="currentColor" fillOpacity="0.07" />
      <circle cx="1090" cy="112" r="1.5" fill="currentColor" fillOpacity="0.06" />
    </svg>
  );
}

/** Live clock — ticks every second. */
function LiveClock() {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    function tick() {
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return <span className="cg-footer-clock" aria-live="off" aria-label="Current time">{time}</span>;
}

export function SiteFooter() {
  const path = usePathname();
  if (path === "/" || /^\/(chats|cases|agent\/cases)\/./.test(path) || path === "/try/both") return null;

  return (
    <footer className="cg-footer" aria-label="CommonGrounds footer">
      <FooterAbstract />

      {/* Top meta row */}
      <div className="cg-footer-inner">
        <div className="cg-footer-meta">
          <span className="cg-footer-brand">CommonGrounds</span>
          <span className="cg-footer-divider" aria-hidden>·</span>
          <span className="cg-footer-tagline">Made for Business</span>
        </div>
        <LiveClock />
      </div>


    </footer>
  );
}
