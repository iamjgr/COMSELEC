'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
            <div className="landing-seal mx-auto mb-6">
              <div className="landing-seal-ring-outer" />
              <div className="landing-seal-ring-inner" />
              <div className="landing-seal-body">
                {/* Replace everything inside this div with your <Image> */}
                <div className="landing-seal-placeholder">
                  <span className="landing-seal-text">PSU</span>
                  <span className="landing-seal-subtext">LOGO</span>
                </div>
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-4">
              How to vote
            </p>
            <div className="space-y-1">
              {steps.map((step, i) => (
                <div
                  key={step.num}
                  className="flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-[var(--color-accent-light)] transition-all duration-200 cursor-default animate-fade-up"
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
              <div className="text-center p-5 rounded-2xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)] text-[var(--color-danger)] font-medium text-sm">
                Voting is not currently open.
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 px-1">
              <div className="flex-1 h-px bg-[var(--color-border)]" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">or</span>
              <div className="flex-1 h-px bg-[var(--color-border)]" />
            </div>

            {/* Live Results */}
            <Link href="/live-results">
              <button className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-accent-light)] hover:border-[var(--color-accent)] transition-all duration-200 group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--color-accent-light)] border border-[var(--color-border)] flex items-center justify-center shrink-0 group-hover:bg-white transition-colors duration-200">
                    <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-[var(--color-accent)]">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">Live Results</p>
                    <p className="text-xs text-[var(--color-text-muted)]">View real-time vote tallies</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <svg className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </Link>
          </div>

          {/* ── Footer ── */}
          <p className="text-center text-[10px] text-[var(--color-text-muted)] animate-fade-up" style={{ animationDelay: '0.42s' }}>
            Palawan State University · Narra Campus
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
