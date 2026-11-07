import React, { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ArrowUpRight, X as CloseIcon } from 'lucide-react';
import { FaInstagram, FaXTwitter, FaFacebookF } from 'react-icons/fa6';
import { content, SlideItem } from './content';

export function App() {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('Home');

  const frameRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const notchTrRef = useRef<HTMLDivElement>(null);
  const notchBlRef = useRef<HTMLDivElement>(null);
  const glassCardRef = useRef<HTMLDivElement>(null);
  const autoplayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentSlide: SlideItem = content.slides[currentSlideIndex];

  // Initialize Lenis smooth scroll & GSAP on mount
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
    });

    let animationFrameId: number;
    function raf(time: number) {
      lenis.raf(time);
      animationFrameId = requestAnimationFrame(raf);
    }
    animationFrameId = requestAnimationFrame(raf);

    // Initial page load animations
    const ctx = gsap.context(() => {
      // 1. Device frame scales smoothly from 0.96 to 1 and fades in
      gsap.fromTo(
        frameRef.current,
        { opacity: 0, scale: 0.96, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 1.1, ease: 'power3.out' }
      );

      // 2. Headline lines slide up from an overflow-hidden mask with stagger
      const lines = headlineRef.current?.querySelectorAll('.headline-line');
      if (lines && lines.length > 0) {
        gsap.fromTo(
          lines,
          { yPercent: 120, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1.0,
            stagger: 0.12,
            ease: 'power3.out',
            delay: 0.35,
          }
        );
      }

      // 3. Notches & glass card fade-in smoothly
      gsap.fromTo(
        [notchTrRef.current, notchBlRef.current, glassCardRef.current],
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.85, stagger: 0.15, ease: 'power2.out', delay: 0.5 }
      );
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
      lenis.destroy();
      ctx.revert();
    };
  }, []);

  // Autoplay carousel (6s interval)
  useEffect(() => {
    if (isVideoModalOpen) return;

    autoplayTimerRef.current = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % content.slides.length);
    }, 6000);

    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, [isVideoModalOpen, currentSlideIndex]);

  // Animate headline text whenever slide changes
  useEffect(() => {
    const lines = headlineRef.current?.querySelectorAll('.headline-line');
    if (lines && lines.length > 0) {
      gsap.fromTo(
        lines,
        { yPercent: 70, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.65, stagger: 0.08, ease: 'power2.out' }
      );
    }
  }, [currentSlideIndex]);

  const handleNextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % content.slides.length);
  };

  const handleSelectSlide = (index: number) => {
    setCurrentSlideIndex(index);
  };

  return (
    <main className="page-container">
      {/* A. DEVICE-LIKE FRAME */}
      <div ref={frameRef} className="device-frame" id="hero-frame">
        {/* B. INSIDE FRAME: HERO WRAPPER */}
        <section className="hero-wrapper" aria-label="Japan Experience Showcase">
          {/* BACKGROUND SLIDES WITH CROSS-FADE & SLOW ZOOM */}
          <div className="hero-bg-layer">
            {content.slides.map((slide, idx) => {
              const isActive = idx === currentSlideIndex;
              return (
                <img
                  key={slide.id}
                  src={slide.imageUrl}
                  alt={slide.imageAlt}
                  className={`hero-bg-image ${isActive ? 'active' : 'inactive'}`}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                />
              );
            })}
          </div>

          {/* GRADIENT OVERLAYS */}
          <div className="hero-overlay-horizontal" aria-hidden="true" />
          <div className="hero-overlay-vertical" aria-hidden="true" />

          {/* C.1: TOP-LEFT CORNER ZONE (Sits on the photo) */}
          <header className="corner-top-left">
            {/* Logo Mark: 4-petal geometric icon */}
            <a href="#" className="brand-logo-mark" aria-label="Homepage">
              <svg
                width="28"
                height="28"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M16 4C12.5 4 10 7 10 10.5C10 14 13.5 15.5 16 16C18.5 15.5 22 14 22 10.5C22 7 19.5 4 16 4Z"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 28C12.5 28 10 25 10 21.5C10 18 13.5 16.5 16 16C18.5 16.5 22 18 22 21.5C22 25 19.5 28 16 28Z"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 16C4 12.5 7 10 10.5 10C14 10 15.5 13.5 16 16C15.5 18.5 14 22 10.5 22C7 22 4 19.5 4 16Z"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M28 16C28 12.5 25 10 21.5 10C18 10 16.5 13.5 16 16C16.5 18.5 18 22 21.5 22C25 22 28 19.5 28 16Z"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>

            {/* Nav links */}
            <nav aria-label="Main Navigation">
              <ul className="nav-links-list">
                {content.navLinks.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className={`nav-link-item ${activeNav === link.label ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveNav(link.label);
                      }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </header>

          {/* C.2: TOP-RIGHT NOTCH (Cutout in photo filled with var(--frame) + concave corners) */}
          <aside ref={notchTrRef} className="corner-notch-tr" aria-label="Social and Action Links">
            {/* Social icon buttons */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="social-icon-btn"
              aria-label="Instagram"
            >
              <FaInstagram />
            </a>
            <a
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
              className="social-icon-btn"
              aria-label="X (Twitter)"
            >
              <FaXTwitter />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="social-icon-btn"
              aria-label="Facebook"
            >
              <FaFacebookF />
            </a>

            {/* Explore Now Pill Button */}
            <a href={content.exploreCta.href} className="explore-pill-btn">
              <span>{content.exploreCta.label}</span>
              <span className="arrow-circle" aria-hidden="true">
                <ArrowUpRight strokeWidth={2.4} />
              </span>
            </a>
          </aside>

          {/* D & E: HEADLINE & WATCH MOVIE BUTTON (Left side, vertically centered) */}
          <div className="hero-content-left">
            <h1 ref={headlineRef} className="headline-text-group">
              {currentSlide.headline.map((lineText, i) => (
                <span key={`${currentSlide.id}-${i}`} className="headline-line-wrapper">
                  <span className="headline-line">{lineText}</span>
                </span>
              ))}
            </h1>

            {/* E. Watch Movie button */}
            <button
              type="button"
              className="watch-movie-btn"
              onClick={() => setIsVideoModalOpen(true)}
              aria-label="Watch cinematic movie"
            >
              <span className="watch-play-circle" aria-hidden="true">
                <span className="play-triangle-icon" />
              </span>
              <span className="watch-movie-label">{content.watchMovie.label}</span>
            </button>
          </div>

          {/* C.3: BOTTOM-LEFT NOTCH (Cutout in photo filled with var(--frame) + concave corners) */}
          <aside ref={notchBlRef} className="corner-notch-bl" aria-label="Key Facts & Statistics">
            {/* White floating pill with 3 stats separated by vertical dividers */}
            <div className="stats-pill-card">
              {currentSlide.stats.map((stat, i) => (
                <React.Fragment key={stat.label}>
                  {i > 0 && <span className="stats-divider" aria-hidden="true" />}
                  <div className="stat-item">
                    <span className="stat-number">{stat.number}</span>
                    <span className="stat-label">{stat.label}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </aside>

          {/* C.4: BOTTOM-RIGHT GLASS CARD (Sits directly on the photo, blur glassmorphism) */}
          <aside ref={glassCardRef} className="corner-glass-card" aria-label="Experience Highlights">
            <h2 className="glass-card-title">{currentSlide.cardTitle}</h2>
            <p className="glass-card-text">{currentSlide.cardDescription}</p>
            <button
              type="button"
              className="glass-card-btn"
              onClick={handleNextSlide}
              aria-label={`Explore more about ${currentSlide.cardTitle}`}
            >
              {currentSlide.cardButtonText}
            </button>
          </aside>

          {/* F. RIGHT EDGE VERTICAL INDICATOR (01 / 04) */}
          <nav
            className="right-vertical-indicator"
            aria-label="Slide Indicator"
            onClick={handleNextSlide}
            title="Click to advance slide"
          >
            <span className="indicator-number">{currentSlide.index}</span>
            <div className="indicator-track" role="progressbar" aria-valuenow={currentSlideIndex + 1} aria-valuemin={1} aria-valuemax={4}>
              <span
                className="indicator-fill"
                style={{
                  height: `${((currentSlideIndex + 1) / content.slides.length) * 100}%`,
                }}
              />
            </div>
            <span className="indicator-number">04</span>
          </nav>
        </section>
      </div>

      {/* VIDEO MODAL */}
      {isVideoModalOpen && (
        <div
          className="video-modal-backdrop"
          onClick={() => setIsVideoModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Watch Movie Modal"
        >
          <div className="video-modal-container" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="video-modal-close-btn"
              onClick={() => setIsVideoModalOpen(false)}
              aria-label="Close video modal"
            >
              <CloseIcon size={20} />
            </button>
            <iframe
              className="video-modal-iframe"
              src={currentSlide.videoUrl || content.watchMovie.videoUrl}
              title="Cinematic Japan Travel Showcase"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </main>
  );
}
