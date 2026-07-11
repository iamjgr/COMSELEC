'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface ElectionInfo {
  id: string;
  name: string;
  voting_start: string | null;
  voting_end: string | null;
}

interface Props {
  activeElections: ElectionInfo[];
  hasActiveElection: boolean;
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

export default function LandingClient({ activeElections, hasActiveElection }: Props) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);

  const handleBeginVoting = () => {
    if (!hasActiveElection) return;
    if (activeElections.length === 1) {
      router.push('/scan');
      return;
    }
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

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center p-6">
        <div className="max-w-sm w-full space-y-7">

    

          {/* ── Header ── */}
          <div className="text-center animate-fade-up" style={{ animationDelay: '0.05s' }}>

            {/* Logo placeholder — swap this <div> with an <Image> when ready */}
            <div className="landing-seal mx-auto mb-6 md:mb-8">
              <div className="landing-seal-ring-outer" />
              <div className="landing-seal-ring-inner" />
              <div className="landing-seal-body">
                <Image
                  src="/comseleclogo.png"
                  alt="COMSELEC Logo"
                  fill
                  style={{ objectFit: 'contain' }}
                  priority
                />
              </div>
              <div className="landing-seal-pulse" style={{ animationDelay: '0s' }} />
              <div className="landing-seal-pulse" style={{ animationDelay: '1.4s' }} />
            </div>

            <p className="landing-eyebrow">
              University Student Government Election
            </p>
            <h1 className="landing-title text-shimmer">
              PAGHIRANG &apos;26
            </h1>
            <div className="landing-title-divider" />
            <p className="landing-subtitle">
              Palawan State University — Narra Campus
            </p>
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
              <button
                onClick={handleBeginVoting}
                className="btn-primary text-[16px] py-[18px] rounded-2xl group"
              >
                Begin Voting
                <svg
                  className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            ) : (
              <div className="flex flex-col items-center gap-3 px-5 py-5 rounded-2xl text-center"
                style={{
                  background: 'rgba(28, 20, 10, 0.6)',
                  border: '1px solid rgba(196, 153, 58, 0.18)',
                }}>
                {/* Icon */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(196, 153, 58, 0.1)', border: '1px solid rgba(196, 153, 58, 0.2)' }}>
                  <svg className="w-5 h-5" style={{ color: 'rgba(196,153,58,0.7)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 px-1">
              <div className="flex-1 h-px landing-divider" />
              <span className="text-[10px] font-semibold uppercase tracking-widest landing-or-label">or</span>
              <div className="flex-1 h-px landing-divider" />
            </div>

            {/* Live Results */}
            <Link href="/live-results">
              <button className="landing-results-btn flex items-center justify-center px-10 py-3 rounded-2xl transition-all duration-200 mx-auto">
                <p className="text-sm font-semibold landing-results-label">Live Results</p>
              </button>
            </Link>
          </div>

          {/* ── Footer ── */}
          <p className="text-center text-[10px] landing-footer-label animate-fade-up" style={{ animationDelay: '0.42s' }}>
            Commission on Election
          </p>

        </div>
      </main>

      {/* ── Election Picker Dialog ── */}
      {showDialog && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(44, 36, 22, 0.5)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowDialog(false)}
        >
          <div
            className="w-full max-w-sm animate-fade-scale"
            onClick={e => e.stopPropagation()}
          >
            <div className="card !p-0 overflow-hidden">
              <div className="px-6 pt-6 pb-4 border-b border-[var(--color-border)]">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-bold text-[var(--color-text-primary)]">Active Elections</h2>
                  <button
                    onClick={() => setShowDialog(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[var(--color-accent-light)] transition-colors text-[var(--color-text-muted)]"
                  >
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
                  const end = formatDateTime(election.voting_end);
                  return (
                    <div
                      key={election.id}
                      className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
                    >
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
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
