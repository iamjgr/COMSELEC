'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import MusicPlayer from '@/components/MusicPlayer';

interface ElectionInfo {
  id: string;
  name: string;
  voting_start: string | null;
  voting_end: string | null;
}

interface CandidatePreview {
  id: string;
  full_name: string;
  image_url: string;
}

interface Props {
  activeElections: ElectionInfo[];
  hasActiveElection: boolean;
  hasPendingElection: boolean;
  carouselCandidates: CandidatePreview[];
}

function formatDateTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

const steps = [
  { num: 1, title: 'Open your QR code', desc: 'Use the QR code that was given to you' },
  { num: 2, title: 'Verify your identity', desc: 'Enter the 4-digit PIN assigned to you' },
  { num: 3, title: 'Cast your vote', desc: 'Select candidates and submit your ballot' },
];

// ── Carousel word sequence ──────────────────────────────────────────────────
const WORDS = ['WHO', 'WILL', 'BE', 'THE NEXT', 'LEADERS?'];
const WORD_VISIBLE_MS      = 650;
const WORD_GAP_MS          = 160;
const LAST_WORD_VISIBLE_MS = 1800;
const MS_PER_CARD          = 1600;

// Total time for one words-phase pass
const WORDS_PHASE_TOTAL_MS =
  (WORDS.length - 1) * (WORD_VISIBLE_MS + WORD_GAP_MS) +
  LAST_WORD_VISIBLE_MS + WORD_GAP_MS + 400;

export default function LandingClient({ activeElections, hasActiveElection, hasPendingElection, carouselCandidates }: Props) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);

  const showCarousel = carouselCandidates.length >= 1;
  const isFewCandidates = carouselCandidates.length <= 2;

  // For 3+ candidates: scroll a 4× repeated list seamlessly
  // For 1-2: just show them centered/stationary — no scroll needed
  const repeatCount = 4;
  const loopList = showCarousel && !isFewCandidates
    ? Array.from({ length: repeatCount }, () => carouselCandidates).flat()
    : carouselCandidates;

  // CSS scroll duration = time for 1 full pass
  const onePassMs          = carouselCandidates.length * MS_PER_CARD;
  const cssScrollDurationS = (onePassMs / 1000).toFixed(2);
  const scrollPct          = `-25%`;

  // ── Sequencer: images always scroll, words overlay after each full pass ──
  const [activeWord, setActiveWord]     = useState<number>(-1);
  const [overlayVisible, setOverlayVisible] = useState(false);
  // mobile-specific: same overlay logic mirrored
  const [mobileOverlay, setMobileOverlay]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  const runWordsOverlay = (onDone: () => void) => {
    setOverlayVisible(true);
    setMobileOverlay(true);
    setActiveWord(-1);

    let delay = 200;
    WORDS.forEach((_, i) => {
      const visibleMs = i === WORDS.length - 1 ? LAST_WORD_VISIBLE_MS : WORD_VISIBLE_MS;
      timerRef.current = setTimeout(() => setActiveWord(i), delay);
      delay += visibleMs;
      timerRef.current = setTimeout(() => setActiveWord(-1), delay);
      delay += WORD_GAP_MS;
    });
    timerRef.current = setTimeout(() => {
      setOverlayVisible(false);
      setMobileOverlay(false);
      onDone();
    }, delay + 200);
  };

  // Cycle: wait one full image pass → show words → repeat
  const cycle = () => {
    if (!showCarousel) {
      // No photos: just loop words forever
      runWordsOverlay(() => { timerRef.current = setTimeout(cycle, 400); });
      return;
    }
    // Wait for all candidates to scroll past, then overlay words
    timerRef.current = setTimeout(() => {
      runWordsOverlay(() => {
        timerRef.current = setTimeout(cycle, 400);
      });
    }, onePassMs);
  };

  useEffect(() => {
    cycle();
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBeginVoting = () => {
    if (!hasActiveElection) return;
    if (activeElections.length === 1) { router.push('/scan'); return; }
    setShowDialog(true);
  };

  return (
    <>
      {/* ── Background ── */}
      <div className="landing-bg" aria-hidden="true">
        <div className="landing-bg-pattern" />
        <div className="landing-bg-glow-top" />
        <div className="landing-bg-glow-bottom" />
      </div>

      {/* ── Desktop side carousels (hidden on mobile) ── */}
      {showCarousel && (
        <>
          {/* Left strip */}
          <div className="carousel-side carousel-side-left" aria-hidden="true">
            <div className="carousel-track-vertical">
              {loopList.map((c, i) => (
                <div key={`l-${c.id}-${i}`} className="carousel-card-vertical">
                  <Image src={c.image_url} alt={c.full_name} fill sizes="138px"
                    style={{ objectFit: 'cover', objectPosition: 'center top' }} />
                  <div className="carousel-card-name">{c.full_name}</div>
                </div>
              ))}
            </div>

            {/* Word overlay — sits on top of left strip */}
            <div className={`carousel-word-overlay ${overlayVisible ? 'carousel-word-overlay--visible' : ''}`}>
              {WORDS.map((w, i) => (
                <span
                  key={w}
                  className={`carousel-overlay-word ${activeWord === i ? 'carousel-overlay-word--active' : ''}`}
                >
                  {w}
                </span>
              ))}
            </div>
          </div>

          {/* Right strip */}
          <div className="carousel-side carousel-side-right" aria-hidden="true">
            <div className="carousel-track-vertical carousel-track-vertical-reverse">
              {loopList.map((c, i) => (
                <div key={`r-${c.id}-${i}`} className="carousel-card-vertical">
                  <Image src={c.image_url} alt={c.full_name} fill sizes="138px"
                    style={{ objectFit: 'cover', objectPosition: 'center top' }} />
                  <div className="carousel-card-name">{c.full_name}</div>
                </div>
              ))}
            </div>

            {/* Word overlay — right strip mirror */}
            <div className={`carousel-word-overlay ${overlayVisible ? 'carousel-word-overlay--visible' : ''}`}>
              {WORDS.map((w, i) => (
                <span
                  key={w}
                  className={`carousel-overlay-word ${activeWord === i ? 'carousel-overlay-word--active' : ''}`}
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        </>
      )}

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center p-6">
        <div className="max-w-sm w-full space-y-7">

          {/* ── Header ── */}
          <div className="text-center animate-fade-up" style={{ animationDelay: '0.05s' }}>
            <div className="landing-seal mx-auto mb-6 md:mb-8">
              <div className="landing-seal-ring-outer" />
              <div className="landing-seal-ring-inner" />
              <div className="landing-seal-body">
                <Image src="/comseleclogo.png" alt="COMSELEC Logo" fill
                  style={{ objectFit: 'contain' }} priority />
              </div>
              <div className="landing-seal-pulse" style={{ animationDelay: '0s' }} />
              <div className="landing-seal-pulse" style={{ animationDelay: '1.4s' }} />
            </div>

            <p className="landing-eyebrow">University Student Government Election</p>
            <h1 className="landing-title text-shimmer">PAGHIRANG &apos;26</h1>
            <p className="landing-subquote text-shimmer-soft">
              PARA SA ESTUDYANTE, MULA SA ESTUDYANTE
            </p>
            <div className="landing-title-divider" />
          </div>

          {/* ── Mobile carousel slot — full viewport width, breakout from max-w-sm ── */}
          <div className="carousel-mobile-slot" aria-hidden="true">

            {/* Scrolling track — always mounted and animating */}
            {showCarousel && (
              <div className="carousel-mobile-photos carousel-mobile-photos--visible">
                {isFewCandidates ? (
                  /* 1-2 candidates: centered stationary, no scroll */
                  <div className="carousel-few-centered">
                    {loopList.map((c, i) => (
                      <div key={`m-${c.id}-${i}`} className="carousel-card-horizontal">
                        <Image src={c.image_url} alt={c.full_name} fill sizes="110px"
                          style={{ objectFit: 'cover', objectPosition: 'center top' }} />
                        <div className="carousel-card-name">{c.full_name}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* 3+ candidates: continuous horizontal scroll */
                  <div
                    className="carousel-track-horizontal"
                    style={{
                      animationDuration: `${cssScrollDurationS}s`,
                      ['--carousel-scroll-pct' as string]: scrollPct,
                    }}
                  >
                    {loopList.map((c, i) => (
                      <div key={`m-${c.id}-${i}`} className="carousel-card-horizontal">
                        <Image src={c.image_url} alt={c.full_name} fill sizes="110px"
                          style={{ objectFit: 'cover', objectPosition: 'center top' }} />
                        <div className="carousel-card-name">{c.full_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Words overlay — layered on top, same pattern as desktop */}
            <div className={`carousel-mobile-words ${mobileOverlay ? 'carousel-mobile-words--visible' : ''} ${showCarousel ? 'carousel-mobile-words--has-photos' : ''}`}>
              {WORDS.map((w, i) => (
                <span
                  key={w}
                  className={`carousel-mobile-word ${activeWord === i ? 'carousel-mobile-word--active' : ''}`}
                >
                  {w}
                </span>
              ))}
            </div>

          </div>

          {/* ── Steps card ── */}
          <div className="card animate-fade-up" style={{ animationDelay: '0.12s' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] landing-section-label mb-4">
              How to vote
            </p>
            <div className="space-y-1">
              {steps.map((step, i) => (
                <div
                  key={step.num}
                  className="flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 cursor-default animate-fade-up landing-step-row"
                  style={{ animationDelay: `${0.18 + i * 0.08}s` }}
                >
                  <div className="step-badge">{step.num}</div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{step.title}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── CTAs ── */}
          <div className="animate-fade-up space-y-4" style={{ animationDelay: '0.32s' }}>

            {hasActiveElection ? (
              <button onClick={handleBeginVoting}
                className="btn-primary text-[16px] py-[18px] rounded-2xl group">
                Begin Voting
                <svg className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                    d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            ) : (
              <div className="flex flex-col items-center gap-3 px-5 py-5 rounded-2xl text-center"
                style={{ background: 'rgba(28, 20, 10, 0.6)', border: '1px solid rgba(196, 153, 58, 0.18)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(196, 153, 58, 0.1)', border: '1px solid rgba(196, 153, 58, 0.2)' }}>
                  <svg className="w-5 h-5" style={{ color: 'rgba(196,153,58,0.7)' }}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'rgba(240, 225, 195, 0.85)' }}>
                    Voting is not currently open
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(160, 135, 95, 0.6)' }}>
                    Please wait for a COMELEC officer to open the election.
                  </p>
                </div>
                {hasPendingElection && (
                  <Link href="/candidates" className="w-full">
                    <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={{ background: 'rgba(196,153,58,0.1)', border: '1px solid rgba(196,153,58,0.25)', color: 'rgba(196,153,58,0.9)' }}>
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      For now, Meet the Candidates
                    </button>
                  </Link>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 px-1">
              <div className="flex-1 h-px landing-divider" />
              <span className="text-[10px] font-semibold uppercase tracking-widest landing-or-label">or</span>
              <div className="flex-1 h-px landing-divider" />
            </div>

            <Link href="/live-results">
              <button className="landing-results-btn flex items-center justify-center px-10 py-3 rounded-2xl transition-all duration-200 mx-auto">
                <p className="text-sm font-semibold landing-results-label">Live Results</p>
              </button>
            </Link>
          </div>

          {/* ── Footer ── */}
          <div className="space-y-0.5 animate-fade-up" style={{ animationDelay: '0.42s' }}>
            <p className="text-center text-[10px] landing-footer-label">
              Commission on Election
            </p>
            <p className="text-center text-[10px] landing-footer-label">
              Palawan State University — Narra Campus
            </p>
          </div>

        </div>
      </main>

      <MusicPlayer />

      {/* ── Election Picker Dialog ── */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(44, 36, 22, 0.5)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowDialog(false)}>
          <div className="w-full max-w-sm animate-fade-scale" onClick={e => e.stopPropagation()}>
            <div className="card !p-0 overflow-hidden">
              <div className="px-6 pt-6 pb-4 border-b border-[var(--color-border)]">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-bold text-[var(--color-text-primary)]">Active Elections</h2>
                  <button onClick={() => setShowDialog(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--color-accent-light)] transition-colors text-[var(--color-text-muted)]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Your QR code is linked to a specific election. Scan it to be directed to the right ballot automatically.
                </p>
              </div>

              <div className="px-4 py-3 space-y-2">
                {activeElections.map((election) => {
                  const start = formatDateTime(election.voting_start);
                  const end   = formatDateTime(election.voting_end);
                  return (
                    <div key={election.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{election.name}</p>
                        {start && (
                          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                            Started {start}{end ? ` · Ends ${end}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-6 pb-6 pt-2">
                <Link href="/scan" onClick={() => setShowDialog(false)}>
                  <button className="btn-primary rounded-xl py-4">
                    Proceed to Scan QR
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                        d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
