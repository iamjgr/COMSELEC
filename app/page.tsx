import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function formatDateTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default async function Home() {
  // Fetch the active election — fall back to most recent completed for status display
  const { data: activeElection } = await supabaseAdmin
    .from('elections')
    .select('id, name, status, voting_start, voting_end, election_date, results_visible')
    .eq('status', 'active')
    .single();

  // If no active election, check if there's a recently completed one to show info
  let displayElection = activeElection;
  if (!displayElection) {
    const { data: completedElection } = await supabaseAdmin
      .from('elections')
      .select('id, name, status, voting_start, voting_end, election_date, results_visible')
      .eq('status', 'completed')
      .order('voting_end', { ascending: false })
      .limit(1)
      .single();
    displayElection = completedElection || null;
  }

  const isVotingOpen = activeElection?.status === 'active';
  const isCompleted = displayElection?.status === 'completed';
  const electionName = displayElection?.name || 'Student Government Elections';
  const votingStartStr = formatDateTime(displayElection?.voting_start ?? null);
  const votingEndStr = formatDateTime(displayElection?.voting_end ?? null);

  const steps = [
    { num: 1, title: 'Open your QR code', desc: 'From the message sent to you on Messenger' },
    { num: 2, title: 'Verify your identity', desc: 'Enter the 4-digit PIN assigned by COMELEC' },
    { num: 3, title: 'Cast your vote', desc: 'Select candidates and submit your ballot' },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-8">

        {/* Header */}
        <div className="text-center animate-fade-up">
          {/* Seal */}
          <div className="relative mx-auto w-24 h-24 mb-7">
            <div
              className="absolute inset-0 rounded-full border-2 border-dashed border-[var(--color-border-strong)] animate-spin-slow"
              style={{ borderRadius: '50%' }}
            />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-accent-light)] border border-[var(--color-border)] shadow-md flex items-center justify-center">
              <span className="text-xl font-black text-[var(--color-accent)] tracking-tight leading-none">PSU</span>
            </div>
            <div className="absolute inset-0 rounded-full border border-[var(--color-accent)]" style={{ animation: 'pulse-ring 2.8s ease-out infinite', opacity: 0.35 }} />
            <div className="absolute inset-0 rounded-full border border-[var(--color-accent)]" style={{ animation: 'pulse-ring 2.8s ease-out 1.4s infinite', opacity: 0.2 }} />
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)] mb-3">
            Student Government Elections
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-shimmer mb-1">
            {electionName}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Palawan State University — Narra Campus
          </p>
        </div>

        {/* Election status card */}
        {displayElection && (
          <div className="card animate-fade-up stagger-1 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
                Election Status
              </p>
              {isVotingOpen ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Voting Open
                </span>
              ) : isCompleted ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  Voting Ended
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-accent-light)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  Not Started
                </span>
              )}
            </div>

            <div className="space-y-2">
              {votingStartStr && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-text-muted)] text-xs">Voting started</span>
                  <span className="font-semibold text-[var(--color-text-primary)] text-xs">{votingStartStr}</span>
                </div>
              )}
              {votingEndStr && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-text-muted)] text-xs">
                    {isCompleted ? 'Voting ended' : 'Voting ends'}
                  </span>
                  <span className="font-semibold text-[var(--color-text-primary)] text-xs">{votingEndStr}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Steps */}
        {isVotingOpen && (
          <div className="card animate-fade-up stagger-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-4">
              What to prepare
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
        )}

        {/* CTAs */}
        <div className="animate-fade-up stagger-4 space-y-3">
          {isVotingOpen ? (
            <Link href="/scan">
              <button className="btn-primary text-[16px] py-[18px] rounded-2xl group">
                Begin Voting
                <svg
                  className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            </Link>
          ) : !displayElection ? (
            <div className="text-center p-5 rounded-2xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)] text-[var(--color-danger)] font-medium text-sm">
              Voting is not currently open.
            </div>
          ) : null}

          {/* Live Results button — always shown when there's an election */}
          {displayElection && (
            <Link href="/live-results">
              <button className="btn-secondary text-[15px] py-4 rounded-2xl group mt-1">
                <svg
                  className="w-5 h-5 text-[var(--color-accent)]"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Live Results
                {isVotingOpen && (
                  <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE
                  </span>
                )}
              </button>
            </Link>
          )}
        </div>

      </div>
    </main>
  );
}
