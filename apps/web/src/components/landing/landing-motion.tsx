"use client";

/* All of the landing's motion in one place (DHRUMIL-T16). The page is complete without it: every element
   sits in its finished state in the server HTML, and this only animates *from* elsewhere when motion is
   allowed. Transform and opacity only, one GSAP ticker driving Lenis and ScrollTrigger, so scroll stays on
   the compositor at 60fps.
   - Lenis smooth scroll, synced to ScrollTrigger.
   - Hero: the title rises line by line (GSAP SplitText, after React Bits' SplitText), the screens settle.
   - Story chapter: pinned while Priya and Kenji trade messages, the deal is sealed, and Sarah arrives.
   - Footer: the street of people steps up onto the rule and sways.
   - Magnet on the primary buttons (after React Bits' Magnet), fine pointers only. */

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

export function LandingMotion() {
  const marker = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const root = marker.current?.closest<HTMLElement>("[data-landing]");
    if (!root) return;
    const q = gsap.utils.selector(root);
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      let streetIO: IntersectionObserver | undefined;
      root.classList.add("is-live");

      // Smooth scroll on one ticker with ScrollTrigger.
      const lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 1 });
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (t: number) => lenis.raf(t * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      // Hero entrance. SplitText re-splits on resize and waits for the web font (autoSplit), and each split
      // plays its own rise, so the masked lines are never measured on the fallback face.
      const title = q(".l-title")[0];
      const split = title
        ? SplitText.create(title, {
            type: "lines",
            mask: "lines",
            linesClass: "l-line",
            autoSplit: true,
            onSplit: (self) => gsap.from(self.lines, { yPercent: 110, duration: 1.1, stagger: 0.12, ease: "expo.out" }),
          })
        : null;
      const intro = gsap.timeline({ defaults: { ease: "expo.out" }, delay: 0.25 });
      intro
        .from(q(".l-sub, .l-actions"), { y: 18, autoAlpha: 0, duration: 0.8, stagger: 0.08 })
        .from(q(".l-cutout"), { y: 60, autoAlpha: 0, duration: 1.1, stagger: 0.12 }, "-=0.6")
        .from(q(".l-drift span"), { autoAlpha: 0, duration: 1.2, stagger: 0.05 }, "-=0.9")
        .add(() => {
          gsap.to(q(".l-cutout"), { y: -12, duration: 3.5, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: 1.75 });
        });

      // Loops only run while they are on screen: the drifting words pause once the hero is scrolled away.
      ScrollTrigger.create({ trigger: q(".l-hero")[0], start: "top top", end: "bottom top", onToggle: (self) => root.classList.toggle("is-away", !self.isActive) });

      // Footer street: step up onto the rule, then sway from the feet.
      const people = q(".l-street > img");
      if (people.length) {
        gsap.from(people, {
          yPercent: 100,
          duration: 1,
          ease: "expo.out",
          stagger: { each: 0.07, from: "random" },
          scrollTrigger: { trigger: q(".l-street")[0], start: "top 92%" },
        });
        const sway = gsap.timeline({ paused: true });
        people.forEach((p, i) => {
          sway.to(p, { rotate: i % 2 ? 2.2 : -2.2, duration: 2.4 + (i % 4) * 0.5, ease: "sine.inOut", yoyo: true, repeat: -1 }, i * 0.13);
        });
        // The walker: the length of the street, a turn (scaleX -1, so they always face the way they go), and back.
        // Transform only. ponytail: one still figure with a step bob; swap in a sprite sheet for real leg frames.
        const street = q(".l-street")[0];
        const walker = q<HTMLElement>(".l-walker")[0];
        const figure = walker?.querySelector("img");
        if (street && walker && figure) {
          const far = () => street.clientWidth - walker.offsetWidth;
          const pace = () => Math.max(6, far() / 90); // ~90px per second, whatever the screen width
          sway
            .to(walker, { x: far, duration: pace, ease: "none", repeat: -1, repeatRefresh: true, yoyo: true,
              onRepeat: () => gsap.set(figure, { scaleX: gsap.getProperty(figure, "scaleX") === 1 ? -1 : 1 }) }, 0)
            .to(figure, { y: -5, duration: 0.32, ease: "sine.inOut", yoyo: true, repeat: -1 }, 0);
        }
        // Play only while the street is on screen (an observer: reliable at the very bottom of the page).
        streetIO = new IntersectionObserver(([e]) => (e.isIntersecting ? sway.play() : sway.pause()));
        if (street) streetIO.observe(street);
      }

      return () => {
        streetIO?.disconnect();
        root.classList.remove("is-live", "is-away");
        gsap.ticker.remove(tick);
        gsap.ticker.lagSmoothing(500, 33);
        lenis.destroy();
        split?.revert();
      };
    });

    // The pinned chapter needs a screen tall enough to hold its stage; short screens keep the still scene.
    mm.add("(prefers-reduced-motion: no-preference) and (min-height: 40rem)", () => {
      // Story chapter: pinned, scrubbed. Every element already sits at its end state; we play from hidden.
      const chapter = q("[data-chapter]")[0];
      if (chapter) {
        chapter.classList.add("is-pinned");
        const s = (sel: string) => chapter.querySelectorAll(sel);
        const tl = gsap.timeline({
          defaults: { ease: "power3.out", duration: 1 },
          scrollTrigger: { trigger: chapter, start: "top top", end: "+=2600", pin: chapter.querySelector(".l-chapter-pin"), scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true },
        });
        const step = (n: number) => s(`.l-step[data-step="${n}"]`);
        // An amount crossing from one person to the other, along the whole track (measured on refresh).
        const fly = (n: 1 | 2) => {
          const track = chapter.querySelector<HTMLElement>(`[data-fly="${n}"]`);
          const chip = track?.querySelector<HTMLElement>("span");
          const t = gsap.timeline();
          if (!track || !chip) return t;
          const far = () => track.offsetWidth - chip.offsetWidth;
          gsap.set(chip, { autoAlpha: 0 });
          return t
            .fromTo(chip, { x: () => (n === 1 ? 0 : far()) }, { x: () => (n === 1 ? far() : 0), duration: 0.8, ease: "power2.inOut" })
            .to(chip, { autoAlpha: 1, duration: 0.15 }, 0)
            .to(chip, { autoAlpha: 0, duration: 0.15 }, 0.65);
        };
        gsap.set(s(".l-step"), { autoAlpha: 0, y: 24 });
        gsap.set(s("[data-say], [data-deal], [data-seal], [data-who='sarah']"), { autoAlpha: 0 });

        tl.to(step(1), { autoAlpha: 1, y: 0 })
          .fromTo(s("[data-say='1a']"), { y: 16, scale: 0.92 }, { autoAlpha: 1, y: 0, scale: 1 }, "<0.2")
          .fromTo(s("[data-who='priya']"), { y: 0 }, { y: -10, duration: 0.3, yoyo: true, repeat: 1 }, "<")
          .add(fly(1), "-=0.3")
          .fromTo(s("[data-say='1b']"), { y: 16, scale: 0.92 }, { autoAlpha: 1, y: 0, scale: 1 }, "-=0.2")
          .to(step(1), { autoAlpha: 0, y: -24 }, "+=0.4")
          .to(step(2), { autoAlpha: 1, y: 0 }, "<0.2")
          .fromTo(s("[data-say='2a']"), { y: 16, scale: 0.92 }, { autoAlpha: 1, y: 0, scale: 1 }, "<0.2")
          .fromTo(s("[data-who='kenji']"), { y: 0 }, { y: -10, duration: 0.3, yoyo: true, repeat: 1 }, "<")
          .add(fly(2), "-=0.3")
          .fromTo(s("[data-say='2b']"), { y: 16, scale: 0.92 }, { autoAlpha: 1, y: 0, scale: 1 }, "-=0.2")
          .to(step(2), { autoAlpha: 0, y: -24 }, "+=0.4")
          .to(step(3), { autoAlpha: 1, y: 0 }, "<0.2")
          .to(s("[data-say]:not([data-say='4'])"), { autoAlpha: 0.35 }, "<")
          .fromTo(s("[data-deal]"), { y: 60, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1 }, "<0.1")
          .fromTo(s("[data-seal]"), { scale: 2.2, rotate: -40 }, { autoAlpha: 1, scale: 1, rotate: -12, ease: "back.out(2)", duration: 0.6 })
          .to(step(3), { autoAlpha: 0, y: -24 }, "+=0.4")
          .to(step(4), { autoAlpha: 1, y: 0 }, "<0.2")
          .fromTo(s("[data-who='sarah']"), { xPercent: 60 }, { autoAlpha: 1, xPercent: 0, duration: 1.2 }, "<")
          .fromTo(s("[data-say='4']"), { y: 16, scale: 0.92 }, { autoAlpha: 1, y: 0, scale: 1 }, "-=0.3")
          .to({}, { duration: 0.6 }); // hold the last frame before the pin releases
      }
      return () => chapter?.classList.remove("is-pinned");
    });

    // Magnet: the primary buttons lean toward a fine pointer.
    mm.add("(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)", () => {
      const cleanups = q<HTMLElement>("[data-magnet]").map((el) => {
        const toX = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
        const toY = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          toX((e.clientX - (r.left + r.width / 2)) * 0.28);
          toY((e.clientY - (r.top + r.height / 2)) * 0.28);
        };
        const leave = () => {
          toX(0);
          toY(0);
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerleave", leave);
        return () => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerleave", leave);
        };
      });
      return () => cleanups.forEach((c) => c());
    });

    return () => mm.revert();
  });

  return <span ref={marker} hidden />;
}
