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
  const [showLOA, setShowLOA] = useState(false);
  const [loaScrolled, setLoaScrolled] = useState(false);
  const loaBodyRef = useRef<HTMLDivElement>(null);

  const handleLoaScroll = () => {
    const el = loaBodyRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 32;
    if (atBottom) setLoaScrolled(true);
  };

  const handleLoaAgree = () => {
    setShowLOA(false);
    setLoaScrolled(false);
    if (activeElections.length === 1) { router.push('/scan'); return; }
    setShowDialog(true);
  };

  const handleLoaDisagree = () => {
    setShowLOA(false);
    setLoaScrolled(false);
  };

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
    setShowLOA(true);
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
                      Meet the Candidates
                    </button>
                  </Link>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 px-1 my-2">
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

      {/* ── LOA / Terms Modal ── */}
      {showLOA && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4"
          style={{ background: 'rgba(10, 7, 3, 0.82)', backdropFilter: 'blur(10px)' }}
        >
          <div className="w-full max-w-lg animate-fade-scale flex flex-col" style={{ maxHeight: '92vh' }}>

            {/* ── Card shell ── */}
            <div className="flex flex-col overflow-hidden rounded-2xl"
              style={{
                background: 'rgba(22, 16, 10, 0.97)',
                border: '1px solid rgba(196, 153, 58, 0.28)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}>

              {/* Header */}
              <div className="px-6 pt-6 pb-5 shrink-0"
                style={{ borderBottom: '1px solid rgba(196, 153, 58, 0.14)' }}>
                <div className="flex items-start gap-3">
                  {/* Shield icon */}
                  <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center mt-0.5"
                    style={{ background: 'rgba(196, 153, 58, 0.12)', border: '1px solid rgba(196, 153, 58, 0.28)' }}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#C4993A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1"
                      style={{ color: 'rgba(196, 153, 58, 0.6)' }}>
                      PAGHIRANG &apos;26 · COMSELEC
                    </p>
                    <h2 className="text-base font-bold leading-snug"
                      style={{ color: 'rgba(245, 235, 210, 0.97)' }}>
                      Voter&apos;s Agreement &amp; Privacy Notice
                    </h2>
                    <p className="text-xs mt-1" style={{ color: 'rgba(160, 135, 95, 0.7)' }}>
                      Please read carefully before proceeding
                    </p>
                  </div>
                </div>
              </div>

              {/* Scrollable body */}
              <div
                ref={loaBodyRef}
                onScroll={handleLoaScroll}
                className="overflow-y-auto px-6 py-5 space-y-5 flex-1"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(196,153,58,0.25) transparent' }}
              >
                {/* Section 1 */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(196,153,58,0.15)', border: '1px solid rgba(196,153,58,0.3)' }}>
                      <span className="text-[10px] font-bold" style={{ color: '#C4993A' }}>1</span>
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: 'rgba(196, 153, 58, 0.85)' }}>
                      Ballot Finality
                    </h3>
                  </div>
                  <div className="rounded-xl p-4 space-y-2"
                    style={{ background: 'rgba(196,153,58,0.06)', border: '1px solid rgba(196,153,58,0.12)' }}>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(225, 210, 180, 0.88)' }}>
                      Once you click <strong style={{ color: 'rgba(245,235,210,0.97)' }}>Submit Ballot</strong>, your votes are <strong style={{ color: 'rgba(245,235,210,0.97)' }}>final and irrevocable</strong>. No changes, corrections, or cancellations can be made after submission.
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(225, 210, 180, 0.88)' }}>
                      Review every selection carefully on the review screen before you confirm. You will have a chance to go back and change your choices up until the final submission.
                    </p>
                  </div>
                </section>

                {/* Section 2 */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(196,153,58,0.15)', border: '1px solid rgba(196,153,58,0.3)' }}>
                      <span className="text-[10px] font-bold" style={{ color: '#C4993A' }}>2</span>
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: 'rgba(196, 153, 58, 0.85)' }}>
                      Proper Voting Conduct
                    </h3>
                  </div>
                  <div className="rounded-xl p-4"
                    style={{ background: 'rgba(196,153,58,0.06)', border: '1px solid rgba(196,153,58,0.12)' }}>
                    <ul className="space-y-2.5">
                      {[
                        'Vote only for yourself. Voting on behalf of another student is strictly prohibited.',
                        'Do not allow others to view or influence your selections while voting.',
                        'You may abstain from any position by leaving it unselected — this is your right.',
                        'Any attempt to manipulate, duplicate, or tamper with the system is a violation of COMSELEC election rules and may be subject to disciplinary action.',
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                            style={{ background: 'rgba(196,153,58,0.6)' }} />
                          <p className="text-sm leading-relaxed" style={{ color: 'rgba(225, 210, 180, 0.88)' }}>{item}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                {/* Section 3 — Vote Secrecy */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(196,153,58,0.15)', border: '1px solid rgba(196,153,58,0.3)' }}>
                      <span className="text-[10px] font-bold" style={{ color: '#C4993A' }}>3</span>
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: 'rgba(196, 153, 58, 0.85)' }}>
                      Vote Secrecy &amp; Data Privacy
                    </h3>
                  </div>
                  {/* Highlighted notice box */}
                  <div className="rounded-xl p-4 space-y-3"
                    style={{ background: 'rgba(74, 124, 89, 0.08)', border: '1px solid rgba(74, 124, 89, 0.28)' }}>
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none"
                        stroke="rgba(100,200,130,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" />
                        <path d="M9 12l2 2 4-4" />
                      </svg>
                      <p className="text-sm font-semibold leading-snug" style={{ color: 'rgba(130, 210, 150, 0.9)' }}>
                        We value and uphold the secrecy of your vote.
                      </p>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(200, 225, 205, 0.8)' }}>
                      Your vote choices are kept confidential. Only <strong style={{ color: 'rgba(210,235,215,0.97)' }}>authorized personnel of COMSELEC</strong> have access to the database, and all access is governed by PSU&apos;s data privacy policies under the <strong style={{ color: 'rgba(210,235,215,0.97)' }}>Data Privacy Act of 2012 (R.A. 10173)</strong>. Any unauthorized access or disclosure is a punishable offense.
                    </p>
                  </div>
                </section>

                {/* Section 4 — One Vote */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(196,153,58,0.15)', border: '1px solid rgba(196,153,58,0.3)' }}>
                      <span className="text-[10px] font-bold" style={{ color: '#C4993A' }}>4</span>
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: 'rgba(196, 153, 58, 0.85)' }}>
                      One Voter, One Ballot
                    </h3>
                  </div>
                  <div className="rounded-xl p-4 space-y-2"
                    style={{ background: 'rgba(196,153,58,0.06)', border: '1px solid rgba(196,153,58,0.12)' }}>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(225, 210, 180, 0.88)' }}>
                      Each student is entitled to cast exactly <strong style={{ color: 'rgba(245,235,210,0.97)' }}>one (1) ballot</strong> per election. Your QR code and PIN are unique to you and are single-use. Once your ballot is submitted, re-scanning your QR will only show your submitted receipt — no re-voting is possible.
                    </p>
                  </div>
                </section>

                {/* Section 5 — Agreement */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(196,153,58,0.15)', border: '1px solid rgba(196,153,58,0.3)' }}>
                      <span className="text-[10px] font-bold" style={{ color: '#C4993A' }}>5</span>
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-widest"
                      style={{ color: 'rgba(196, 153, 58, 0.85)' }}>
                      Your Consent
                    </h3>
                  </div>
                  <div className="rounded-xl p-4"
                    style={{ background: 'rgba(196,153,58,0.06)', border: '1px solid rgba(196,153,58,0.12)' }}>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(225, 210, 180, 0.88)' }}>
                      By clicking <strong style={{ color: 'rgba(245,235,210,0.97)' }}>I Agree</strong> below, you confirm that:
                    </p>
                    <ul className="mt-2.5 space-y-2">
                      {[
                        'You have read and understood the rules stated above.',
                        'You are the legitimate owner of the QR code and PIN you are about to use.',
                        'You consent to the processing of your participation record (not your vote choices) for election integrity purposes.',
                        'You agree to cast your vote freely, voluntarily, and without coercion.',
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <svg className="w-3.5 h-3.5 mt-1 shrink-0" viewBox="0 0 24 24" fill="none"
                            stroke="rgba(196,153,58,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          <p className="text-sm leading-relaxed" style={{ color: 'rgba(225, 210, 180, 0.88)' }}>{item}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                {/* Scroll indicator — only shown when not yet scrolled */}
                {!loaScrolled && (
                  <div className="flex flex-col items-center gap-1.5 pb-2 pointer-events-none select-none">
                    <p className="text-[11px] font-medium" style={{ color: 'rgba(196,153,58,0.5)' }}>
                      Scroll down to continue
                    </p>
                    <svg className="w-4 h-4 animate-bounce" viewBox="0 0 24 24" fill="none"
                      stroke="rgba(196,153,58,0.45)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12l7 7 7-7" />
                    </svg>
                  </div>
                )}

                {/* Bottom padding so content isn't hidden behind action bar */}
                <div className="h-2" />
              </div>

              {/* Action bar */}
              <div className="px-5 py-4 shrink-0 flex gap-3"
                style={{ borderTop: '1px solid rgba(196, 153, 58, 0.14)', background: 'rgba(16, 11, 6, 0.6)' }}>

                {/* Disagree */}
                <button
                  onClick={handleLoaDisagree}
                  className="flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{
                    background: 'rgba(155, 58, 58, 0.1)',
                    border: '1px solid rgba(155, 58, 58, 0.28)',
                    color: 'rgba(210, 140, 140, 0.9)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(155,58,58,0.18)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(155,58,58,0.5)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(155,58,58,0.1)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(155,58,58,0.28)';
                  }}
                >
                  I Disagree
                </button>

                {/* Agree — disabled until scrolled */}
                <button
                  onClick={loaScrolled ? handleLoaAgree : undefined}
                  disabled={!loaScrolled}
                  className="flex-[1.6] py-3.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2"
                  style={{
                    background: loaScrolled
                      ? 'linear-gradient(135deg, #9B7248, #C4993A)'
                      : 'rgba(100, 80, 40, 0.25)',
                    border: loaScrolled
                      ? '1px solid rgba(196,153,58,0.5)'
                      : '1px solid rgba(100,80,40,0.2)',
                    color: loaScrolled
                      ? '#fdf6e8'
                      : 'rgba(160, 135, 95, 0.4)',
                    cursor: loaScrolled ? 'pointer' : 'not-allowed',
                    boxShadow: loaScrolled ? '0 4px 16px rgba(196,153,58,0.25)' : 'none',
                  }}
                >
                  {loaScrolled ? (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      I Agree &amp; Proceed
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4M12 16h.01" />
                      </svg>
                      Read all sections first
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

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
