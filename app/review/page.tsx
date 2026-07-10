/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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
      
      const { data: positions } = await supabase.from('positions')
        .select('*')
        .eq('election_id', electionId)
        .order('order_index');
      const { data: candidates } = await supabase.from('candidates')
        .select('*')
        .eq('election_id', electionId);

      if (positions && candidates) {
        const reviewData = positions.map(pos => {
          const selectedData = savedVotes[pos.id];
          const selectedIds = Array.isArray(selectedData) ? selectedData : (selectedData ? [selectedData] : []);
          const selectedCandidates = selectedIds.map((id: string) => candidates.find(c => c.id === id)).filter(Boolean);
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
          setError("You have already voted. You cannot vote again.");
        } else {
          setError("Failed to submit vote. Please try again.");
        }
      } else {
        // Success
        localStorage.removeItem('voter_session');
        localStorage.removeItem('saved_votes');
        // Pass data to done page via sessionStorage (since it's transient)
        sessionStorage.setItem('vote_receipt', JSON.stringify(data));
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
    <main className="flex min-h-screen flex-col bg-[var(--color-bg)] p-6 pt-12 pb-32">
      {/* Full-screen submission overlay — blocks ALL interaction while submitting */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-5">
          <div className="bg-white rounded-2xl shadow-2xl px-8 py-8 flex flex-col items-center gap-4 max-w-xs w-full mx-4">
            <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-[var(--color-accent)] animate-spin" />
            <div className="text-center">
              <p className="font-bold text-gray-900 text-base">Submitting your vote...</p>
              <p className="text-sm text-gray-500 mt-1">Please wait. Do not close this page.</p>
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
            <Card key={item.position.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-muted)] mb-1">{item.position.name}</h3>
                {item.candidates && item.candidates.length > 0 ? (
                  item.candidates.map((c: any) => (
                    <p key={c.id} className="text-lg font-medium text-[var(--color-text-primary)]">{c.full_name}</p>
                  ))
                ) : (
                  <p className="text-lg font-medium"><span className="text-[var(--color-warning)] italic">No selection</span></p>
                )}
              </div>
              {/* Change button is fully disabled while submitting */}
              <Button
                variant="secondary"
                onClick={() => !isSubmitting && router.push(`/vote/${index + 1}`)}
                disabled={isSubmitting}
                className="sm:w-auto px-4 py-2 text-sm !w-auto inline-block disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Change
              </Button>
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
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full flex justify-center items-center gap-2 bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 border-[var(--color-success)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Submit Vote
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={() => !isSubmitting && router.push('/vote/1')}
            disabled={isSubmitting}
            className="disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Go back and change
          </Button>
        </div>
      </div>
    </main>
  );
}
