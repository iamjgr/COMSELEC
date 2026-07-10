'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

interface VoteEntry {
  position_id: string;
  candidate_id: string | null;
  positions: { name: string; order_index: number } | null;
  candidates: { full_name: string } | null;
}

interface VotedSummary {
  name: string;
  course: string;
  year: string | number;
  votes: VoteEntry[];
}

// Group votes by position
function groupByPosition(votes: VoteEntry[]) {
  const map = new Map<string, { positionName: string; order: number; candidates: string[] }>();
  for (const v of votes) {
    const posName = v.positions?.name ?? 'Unknown Position';
    const order = v.positions?.order_index ?? 0;
    if (!map.has(v.position_id)) {
      map.set(v.position_id, { positionName: posName, order, candidates: [] });
    }
    if (v.candidate_id && v.candidates?.full_name) {
      map.get(v.position_id)!.candidates.push(v.candidates.full_name);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.order - b.order);
}

export default function VotedPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<VotedSummary | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('voted_summary');
    if (!stored) {
      // No legitimate entry point — send them back to scan
      router.replace('/scan');
      return;
    }

    setSummary(JSON.parse(stored));
    // Clear immediately so the data can't be read by navigating back
    sessionStorage.removeItem('voted_summary');

    window.history.pushState(null, '', window.location.href);
    window.onpopstate = () => window.history.go(1);
  }, [router]);

  const grouped = summary ? groupByPosition(summary.votes) : [];

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-6 pt-14 pb-12">
      <div className="max-w-sm w-full space-y-6">

        {/* Header */}
        <div className="animate-fade-up text-center">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-[var(--color-success-bg)] flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-[var(--color-success)]" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Already Voted</h1>
          {summary && (
            <p className="text-sm text-[var(--color-text-muted)]">
              {summary.name} · {summary.course} · Year {summary.year}
            </p>
          )}
        </div>

        {/* Message */}
        <div className="card animate-fade-up stagger-1 p-5 text-center">
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            Your vote has already been recorded. Thank you for participating in the betterment of our beloved{' '}
            <span className="font-semibold text-[var(--color-text-primary)]">Palawan State University – Narra</span>.
          </p>
        </div>

        {/* Vote summary */}
        {grouped.length > 0 && (
          <div className="animate-fade-up stagger-2 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] px-1">
              Your Submitted Votes
            </p>
            {grouped.map((item, i) => (
              <div key={i} className="card p-4">
                <p className="text-xs text-[var(--color-text-muted)] font-semibold uppercase tracking-wide mb-1">
                  {item.positionName}
                </p>
                {item.candidates.length > 0 ? (
                  item.candidates.map((name, j) => (
                    <p key={j} className="text-base font-semibold text-[var(--color-text-primary)]">{name}</p>
                  ))
                ) : (
                  <p className="text-base font-medium italic text-[var(--color-text-muted)]">Abstained</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer note */}
        <div className="animate-fade-up stagger-3 text-center">
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            If you believe this is an error, please approach a{' '}
            <strong className="text-[var(--color-text-secondary)]">COMELEC Officer</strong> immediately.
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-sm font-semibold text-[var(--color-accent)] underline underline-offset-2"
          >
            Back to Home
          </button>
        </div>

      </div>
    </main>
  );
}
