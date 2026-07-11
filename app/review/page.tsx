/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const parseJwt = (token: string) => {
  try { return JSON.parse(atob(token.split('.')[1])); }
  catch (e) { return null; }
};

export default function ReviewPage() {
  const router = useRouter();
  const [selections, setSelections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = localStorage.getItem('voter_session');
    if (!session) {
      router.push('/scan');
      return;
    }
    const decoded = parseJwt(session);
    if (!decoded || !decoded.election_id) { router.push('/scan'); return; }
    loadSelections(decoded.election_id);
  }, [router]);

  const loadSelections = async (electionId: string) => {
    setIsLoading(true);
    try {
      const savedVotes = JSON.parse(localStorage.getItem('saved_votes') || '{}');
      const session = localStorage.getItem('voter_session');

      const res = await fetch(`/api/ballot?_t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${session}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'ELECTION_PAUSED') {
          setError('Voting is temporarily paused. Please wait for a COMELEC officer to resume it.');
          return;
        }
        router.push('/scan');
        return;
      }
      const { positions, candidates } = await res.json();

      if (positions && candidates) {
        const reviewData = positions.map((pos: any) => {
          const selectedData = savedVotes[pos.id];
          const selectedIds = Array.isArray(selectedData) ? selectedData : (selectedData ? [selectedData] : []);
          const selectedCandidates = selectedIds.map((id: string) => candidates.find((c: any) => c.id === id)).filter(Boolean);
          return {
            position: pos,
            candidates: selectedCandidates
          };
        });
        setSelections(reviewData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const session = localStorage.getItem('voter_session');

      // Build the votes array — every position gets an entry.
      // Skipped positions get candidate_id: null (explicit abstain stored in DB).
      const votes: { position_id: string; candidate_id: string | null }[] = [];
      selections.forEach(s => {
        if (s.candidates && s.candidates.length > 0) {
          // Voter selected at least one candidate for this position
          s.candidates.forEach((c: any) => {
            votes.push({ position_id: s.position.id, candidate_id: c.id });
          });
        } else {
          // Voter skipped this position — record as explicit abstain
          votes.push({ position_id: s.position.id, candidate_id: null });
        }
      });

      const res = await fetch('/api/submit-vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session}`
        },
        body: JSON.stringify({ votes })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 || data.error === 'UNAUTHORIZED') {
          setError("Your voting session has expired because it took too long. Please scan your QR code again.");
          setTimeout(() => router.push('/scan'), 3000);
        } else if (data.error === 'ALREADY_VOTED') {
          setError("Your vote was already submitted — possibly from another device. If you did not do this, approach a COMELEC officer.");
        } else if (data.error === 'ELECTION_PAUSED') {
          setError("Voting is temporarily paused. Please wait for a COMELEC officer to resume it and try again.");
        } else {
          setError("Failed to submit vote. Please try again.");
        }
      } else {
        // Success
        localStorage.removeItem('voter_session');
        localStorage.removeItem('saved_votes');
        router.push('/done');
      }
    } catch (e) {
      console.error(e);
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[var(--color-bg)]">
        <div className="w-8 h-8 rounded-full border-[3px] border-[var(--color-border)] border-t-[var(--color-accent)] animate-spin" />
        <p className="text-sm text-[var(--color-text-muted)]">Loading your ballot...</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-[var(--color-bg)] p-6 pt-12 pb-52">
      {/* Full-screen submission overlay — blocks ALL interaction while submitting */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-5">
          <div className="bg-white rounded-2xl shadow-2xl px-8 py-8 flex flex-col items-center gap-5 max-w-xs w-full mx-4">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-900 text-lg">Submitting your vote...</p>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                Please wait and do not close this page.
              </p>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-400 rounded-full animate-pulse" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Review your votes</h1>
          <p className="text-[var(--color-text-muted)] text-sm">
            Check your selections carefully. You cannot change your vote after submitting.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-[var(--color-danger-bg)] text-[var(--color-danger)] rounded-lg border border-[var(--color-danger)] mb-6">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {selections.map((item, index) => (
            <Card key={item.position.id} className="p-5 overflow-hidden">
              {/* Position label + Change button — always in a row */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] leading-snug">
                  {item.position.name}
                </h3>
                <button
                  onClick={() => !isSubmitting && router.push(`/vote/${index + 1}`)}
                  disabled={isSubmitting}
                  className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--color-border-strong)] bg-white/80 text-[var(--color-accent)] hover:bg-[var(--color-accent-light)] hover:border-[var(--color-accent)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Change
                </button>
              </div>

              {/* Candidate(s) or abstain */}
              {item.candidates && item.candidates.length > 0 ? (
                <div className="space-y-3">
                  {item.candidates.map((c: any) => (
                    <div key={c.id} className="flex items-center gap-3">
                      {/* Photo */}
                      <div className="shrink-0">
                        {c.image_url ? (
                          <img
                            src={c.image_url}
                            alt={c.full_name}
                            className="w-12 h-12 rounded-xl object-cover border border-[var(--color-border)]"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-[var(--color-accent-light)] border border-[var(--color-border)] flex items-center justify-center">
                            <span className="text-base font-bold text-[var(--color-accent)]">
                              {c.full_name?.charAt(0) || '?'}
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Name + partylist — allow wrapping, no truncation */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)] leading-snug break-words">
                          {c.full_name}
                        </p>
                        <p className="text-xs font-medium mt-0.5 break-words"
                          style={{ color: c.partylists?.color || 'var(--color-accent)' }}>
                          {c.partylists?.name || 'Independent'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-medium">
                  <span className="text-[var(--color-warning)] italic">No selection — Abstain</span>
                </p>
              )}
            </Card>
          ))}
        </div>

        <div className="bg-[var(--color-warning-bg)] border border-[var(--color-warning)] rounded-xl p-4 flex items-start gap-3 mt-8">
          <AlertTriangle className="w-6 h-6 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--color-warning)] font-medium">
            Once submitted, your vote is final and cannot be undone.
          </p>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[var(--color-surface)] via-[var(--color-surface)] to-transparent border-t border-[var(--color-border)]/50 pb-8">
        <div className="max-w-md mx-auto space-y-3">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`w-full flex justify-center items-center gap-2 rounded-2xl py-4 px-6 font-semibold text-white text-base transition-all
              ${isSubmitting
                ? 'bg-[var(--color-success)]/70 cursor-not-allowed scale-95'
                : 'bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 active:scale-95'
              }`}
            style={{ width: '100%' }}
          >
            {isSubmitting ? (
              <>
                <svg className="w-5 h-5 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Submitting your vote...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5 shrink-0" />
                Submit Vote
              </>
            )}
          </button>
          <button
            onClick={() => !isSubmitting && router.push('/vote/1')}
            disabled={isSubmitting}
            className="w-full flex justify-center items-center py-3 px-6 rounded-2xl border border-[var(--color-border-strong)] bg-white/80 text-[var(--color-accent)] text-sm font-medium transition-all hover:bg-[var(--color-accent-light)] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ width: '100%' }}
          >
            Go back and change
          </button>
        </div>
      </div>
    </main>
  );
}
