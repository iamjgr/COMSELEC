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
      router.replace('/scan');
      return;
    }
    setSummary(JSON.parse(stored));
    sessionStorage.removeItem('voted_summary');
    window.history.pushState(null, '', window.location.href);
    window.onpopstate = () => window.history.go(1);
  }, [router]);

  const grouped = summary ? groupByPosition(summary.votes) : [];

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-5 pt-12 pb-16"
      style={{ background: '#F5F0E8' }}>
      <div className="max-w-sm w-full space-y-5">

        {/* Header */}
        <div className="animate-fade-up text-center">
          <div className="w-18 h-18 w-[72px] h-[72px] mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(74,124,89,0.12)', border: '1.5px solid rgba(74,124,89,0.3)' }}>
            <CheckCircle className="w-9 h-9" style={{ color: '#4A7C59' }} />
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#2C2416' }}>Already Voted</h1>
          {summary && (
            <p className="text-sm" style={{ color: '#A39280' }}>
              {summary.name} · {summary.course} · Year {summary.year}
            </p>
          )}
        </div>

        {/* Message */}
        <div className="ballot-message-card animate-fade-up stagger-1 text-center">
          <p>
            Your vote has already been recorded. Thank you for participating in the betterment of our beloved{' '}
            <strong>Palawan State University – Narra</strong>.
          </p>
        </div>

        {/* Vote summary — ballot card */}
        {grouped.length > 0 && (
          <div className="animate-fade-up stagger-2">
            {/* Ballot card */}
            <div className="overflow-hidden rounded-2xl"
              style={{ border: '1.5px solid rgba(196,153,58,0.35)', boxShadow: '0 4px 20px rgba(44,36,22,0.07)' }}>

              {/* Header strip */}
              <div className="ballot-header-strip">
                <h2>Official Ballot · Submitted Votes</h2>
              </div>

              {/* Ballot entries */}
              <div className="bg-white px-4 py-3 space-y-2">
                {grouped.map((item, i) => (
                  <div key={i} className="ballot-entry">
                    <p className="ballot-entry-position">{item.positionName}</p>
                    {item.candidates.length > 0 ? (
                      item.candidates.map((name, j) => (
                        <p key={j} className="ballot-entry-name">{name}</p>
                      ))
                    ) : (
                      <p className="ballot-entry-abstain">Abstained</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Footer strip */}
              <div className="px-4 py-3 text-center"
                style={{ background: '#FDFAF5', borderTop: '1px solid rgba(196,153,58,0.18)' }}>
                <div className="ballot-rule">
                  <div className="ballot-rule-diamond" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-widest mt-2"
                  style={{ color: '#C4993A' }}>
                  Palawan State University – Narra
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer note */}
        <div className="animate-fade-up stagger-3 text-center">
          <p className="text-xs leading-relaxed" style={{ color: '#A39280' }}>
            If you believe this is an error, please approach a{' '}
            <strong style={{ color: '#6B5E4A' }}>COMELEC Officer</strong> immediately.
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-sm font-semibold underline underline-offset-2"
            style={{ color: '#9B7248' }}
          >
            Back to Home
          </button>
        </div>

      </div>
    </main>
  );
}
