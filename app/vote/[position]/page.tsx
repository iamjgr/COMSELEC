/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CandidateCard } from '@/components/CandidateCard';
import { ChevronLeft, X } from 'lucide-react';

const parseJwt = (token: string) => {
  try { return JSON.parse(atob(token.split('.')[1])); }
  catch (e) { return null; }
};

export default function VotePage({ params }: { params: { position: string } }) {
  const router = useRouter();
  const pageIndex = parseInt(params.position);

  const [positions, setPositions] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [detailsCandidate, setDetailsCandidate] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [pausedError, setPausedError] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem('voter_session');
    if (!session) { router.push('/scan'); return; }
    const decoded = parseJwt(session);
    if (!decoded || !decoded.election_id) { router.push('/scan'); return; }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, pageIndex]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const session = localStorage.getItem('voter_session');
      const res = await fetch(`/api/ballot?_t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${session}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'ELECTION_PAUSED') {
          setPausedError(true);
          return;
        }
        router.push('/scan');
        return;
      }
      const { positions: posData, candidates: candData } = await res.json();

      if (posData) setPositions(posData);
      
      const currentPos = posData?.[pageIndex - 1];
      if (currentPos && candData) {
        setCandidates(candData.filter((c: any) => c.position_id === currentPos.id));
      }
      // Load saved selection
      const saved = JSON.parse(localStorage.getItem('saved_votes') || '{}');
      if (currentPos && saved[currentPos.id]) {
        const existing = saved[currentPos.id];
        setSelectedCandidates(Array.isArray(existing) ? existing : [existing]);
      }
      else setSelectedCandidates([]);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleSelect = (candidateId: string) => {
    const currentPos = positions[pageIndex - 1];
    if (!currentPos) return;

    let newSelection = [...selectedCandidates];
    const max = currentPos.max_selections || 1;

    if (newSelection.includes(candidateId)) {
      newSelection = newSelection.filter(id => id !== candidateId);
    } else {
      if (newSelection.length < max) {
        newSelection.push(candidateId);
      } else if (max === 1) {
        newSelection = [candidateId];
      } else {
        alert(`You can only select up to ${max} candidates for this position.`);
        return;
      }
    }

    setSelectedCandidates(newSelection);
    const saved = JSON.parse(localStorage.getItem('saved_votes') || '{}');
    if (newSelection.length > 0) {
      saved[currentPos.id] = newSelection;
    } else {
      delete saved[currentPos.id];
    }
    localStorage.setItem('saved_votes', JSON.stringify(saved));
  };

  const handleNext = () => {
    if (isNavigating) return; // hard lock — ignore all subsequent clicks
    setIsNavigating(true);
    if (pageIndex < positions.length) router.push(`/vote/${pageIndex + 1}`);
    else router.push('/review');
  };

  const currentPos = positions[pageIndex - 1];

  if (pausedError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6 animate-fade-up">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6M9 3h6a2 2 0 012 2v14a2 2 0 01-2 2H9a2 2 0 01-2-2V5a2 2 0 012-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Voting Paused</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Voting has been temporarily paused by a COMELEC officer. Please wait and try again shortly.
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800">📋 What to do</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              Your session is still valid. Once voting resumes, go back and continue where you left off.
            </p>
          </div>
          <button
            onClick={() => { setPausedError(false); fetchData(); }}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition-colors"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col relative">
      <div className="page-bg" />
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-[var(--color-surface)]/70 backdrop-blur-xl border-b border-[var(--color-border)]/50 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-3">
            <button
              // Back button — also guard against rapid clicks
        onClick={() => {
              if (isNavigating) return;
              setIsNavigating(true);
              if (pageIndex > 1) router.push(`/vote/${pageIndex - 1}`);
              else router.push('/pin');
            }}
              className="p-1.5 -ml-1.5 rounded-lg hover:bg-[var(--color-accent-light)] transition-colors text-[var(--color-text-primary)]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="flex-1 text-center font-bold text-[var(--color-text-muted)] text-xs sm:text-sm tracking-widest uppercase">
              Position {pageIndex} of {positions.length}
            </h2>
            <div className="w-8" />
          </div>
          <ProgressBar current={pageIndex} total={positions.length} />
        </div>
      </header>

      {/* Instructions & Candidates */}
      <div className="flex-1 px-4 py-8 pb-40 overflow-y-auto max-w-5xl w-full mx-auto space-y-8 relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center pt-32">
            <div className="w-8 h-8 rounded-full border-[3px] border-[var(--color-border)] border-t-[var(--color-accent)] animate-spin" />
          </div>
        ) : !currentPos ? (
          <p className="text-center text-[var(--color-text-muted)] text-sm pt-32">Position not found.</p>
        ) : (
          <>
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-10 animate-fade-up">
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                {currentPos?.name}
              </h1>
              <p className="text-gray-600 font-medium text-sm md:text-base">
                Please select {currentPos?.max_selections > 1 ? `up to ${currentPos.max_selections} candidates` : '1 candidate'} for this position.
              </p>
              <div className="inline-block mt-2 px-4 py-2 bg-[var(--color-accent)]/5 border border-[var(--color-accent)]/10 rounded-xl">
                <p className="text-[var(--color-text-muted)] text-xs md:text-sm">
                  If you skip without selecting, this position will be marked as <strong className="text-[var(--color-accent)] font-bold">Abstain</strong>.
                </p>
              </div>
            </div>

            {candidates.length === 0 ? (
              <p className="text-center text-[var(--color-text-muted)] text-sm py-12">No candidates listed for this position.</p>
            ) : (
              <div className={`grid gap-4 items-start ${candidates.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : candidates.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                {candidates.map(c => (
                  <div key={c.id} className="animate-fade-up">
                    <CandidateCard
                      candidate={c}
                      isSelected={selectedCandidates.includes(c.id)}
                      onSelect={() => handleSelect(c.id)}
                      onViewDetails={() => setDetailsCandidate(c)}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/70 backdrop-blur-xl border-t border-white shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pt-5 pb-8 px-4">
        <div className="max-w-5xl mx-auto flex justify-end">
          <button
            onClick={handleNext}
            disabled={isNavigating}
            className={`btn-primary py-4 px-8 rounded-2xl group flex items-center gap-2 transition-all ${
              isNavigating
                ? 'opacity-70 cursor-not-allowed'
                : selectedCandidates.length === 0
                ? 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'
                : ''
            }`}
          >
            {isNavigating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Loading...
              </>
            ) : (
              <>
                {selectedCandidates.length > 0
                  ? pageIndex < positions.length ? 'Next Position' : 'Review Votes'
                  : 'Skip (Abstain)'}
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Platform Modal (Rendered at page level so it isn't clipped by card CSS) */}
      {detailsCandidate && detailsCandidate.platform?.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setDetailsCandidate(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Platform & Details</h3>
              <button onClick={() => setDetailsCandidate(null)} className="p-2 -mr-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto bg-gray-50/50">
              <div className="flex flex-col items-center text-center mb-8 mt-2">
                {detailsCandidate.image_url ? (
                  <img src={detailsCandidate.image_url} alt={detailsCandidate.full_name} className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shadow-sm border border-gray-200 mb-4" />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-[var(--color-accent-light)] to-[var(--color-surface-2)] text-[var(--color-accent)] flex items-center justify-center font-bold text-4xl shadow-sm border border-gray-200 mb-4">
                    {detailsCandidate.full_name.charAt(0)}
                  </div>
                )}
                <h4 className="font-bold text-gray-900 text-xl mb-1">{detailsCandidate.full_name}</h4>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  {detailsCandidate.course} · Year {detailsCandidate.year_level}
                  <br />
                  <span className="text-[var(--color-accent)]">{detailsCandidate.partylists?.name || 'Independent'}</span>
                </p>
              </div>

              <div>
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Platform Details</h5>
                <ul className="space-y-2.5">
                  {detailsCandidate.platform.map((point: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-gray-100 shadow-sm hover:border-[var(--color-border)] transition-colors">
                      <div className="w-6 h-6 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)] flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                        {i + 1}
                      </div>
                      <span className="text-sm text-gray-700 leading-relaxed font-medium pt-0.5">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
