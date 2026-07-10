import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetch the active election
  const { data: activeElection, error } = await supabaseAdmin
    .from('elections')
    .select('*')
    .eq('status', 'active')
    .single();

  const isVotingOpen = !!activeElection;
  const electionName = activeElection?.name || 'Election';

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
            {/* Spinning outer ring */}
            <div
              className="absolute inset-0 rounded-full border-2 border-dashed border-[var(--color-border-strong)] animate-spin-slow"
              style={{ borderRadius: '50%' }}
            />
            {/* Inner surface */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-accent-light)] border border-[var(--color-border)] shadow-md flex items-center justify-center">
              <span className="text-xl font-black text-[var(--color-accent)] tracking-tight leading-none">PSU</span>
            </div>
            {/* Pulse rings */}
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

        {/* Steps */}
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

        {/* CTA */}
        <div className="animate-fade-up stagger-4">
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
          ) : (
            <div className="text-center p-5 rounded-2xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)] text-[var(--color-danger)] font-medium text-sm">
              Voting is not currently open.
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
