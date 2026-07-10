/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useCountdownRefresh } from '@/lib/useCountdownRefresh';

export default function ResultsPage() {
  const [positions, setPositions] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [tally, setTally] = useState<Record<string, number>>({});
  const [abstainCounts, setAbstainCounts] = useState<Record<string, number>>({});
  const [election, setElection] = useState<any>(null);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchResults = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch(`/api/public-results?_t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();

      setResultsVisible(data.results_visible ?? false);
      setElection(data.election ?? null);
      setPositions(data.positions ?? []);
      setCandidates(data.candidates ?? []);
      setTally(data.tally ?? {});
      setAbstainCounts(data.abstainCounts ?? {});
      setLastRefreshed(new Date());
    } catch (e) {
      console.error('[public-results fetch error]', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchResults(); }, [fetchResults]);

  // 10-second countdown refresh
  const { secondsLeft, triggerRefresh } = useCountdownRefresh({
    onRefresh: () => fetchResults(true),
    intervalSeconds: 10,
    enabled: !isLoading,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!resultsVisible) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center px-6">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-1">Results Not Available</h2>
          <p className="text-sm text-gray-500">Live results are currently hidden by the administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-black text-gray-900 mb-2">
            {election?.name || 'Election'} — Live Results
          </h1>
          <p className="text-sm text-gray-400">
            {lastRefreshed
              ? `Updated ${lastRefreshed.toLocaleTimeString()} · Refreshes in ${secondsLeft}s`
              : 'Loading...'}
          </p>
        </div>

        {/* Per-position results */}
        {positions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-14 text-center shadow-sm">
            <p className="text-gray-400 text-sm">No results available yet.</p>
          </div>
        ) : (
          positions.map(position => {
            const posCandidates = candidates
              .filter(c => c.position_id === position.id)
              .map(c => ({ ...c, votes: tally[c.id] || 0 }))
              .sort((a, b) => b.votes - a.votes);

            const abstainCount = abstainCounts[position.id] || 0;
            const posTotal = posCandidates.reduce((sum, c) => sum + c.votes, 0);
            const posDenominator = posTotal + abstainCount || 1;
            const maxVotes = Math.max(posCandidates[0]?.votes || 0, abstainCount, 1);

            return (
              <div key={position.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#9B7248]" />
                    <h2 className="font-bold text-gray-900 text-lg">{position.name}</h2>
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {posTotal} vote{posTotal !== 1 ? 's' : ''} cast
                  </span>
                </div>

                <div className="p-5 space-y-3">
                  {posCandidates.map((candidate, idx) => {
                    const isLeader = idx === 0 && candidate.votes > 0;
                    const pct = posDenominator > 0 ? (candidate.votes / posDenominator) * 100 : 0;
                    const barWidth = maxVotes > 0 ? (candidate.votes / maxVotes) * 100 : 0;

                    return (
                      <div
                        key={candidate.id}
                        className={`p-4 rounded-xl border transition-colors ${isLeader ? 'border-amber-200 bg-amber-50/60' : 'border-gray-100 bg-gray-50/50'}`}
                      >
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-3 min-w-0">
                            {isLeader && (
                              <svg className="w-4 h-4 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
                              </svg>
                            )}
                            <div className="flex items-center gap-2.5 min-w-0">
                              {candidate.image_url && (
                                <img
                                  src={candidate.image_url}
                                  alt={candidate.full_name}
                                  className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0"
                                />
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{candidate.full_name}</p>
                                <p className="text-xs text-gray-400">{candidate.course} · Year {candidate.year_level}</p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-2xl font-black text-gray-900 leading-none">{candidate.votes}</p>
                            <p className="text-xs text-gray-400">{pct.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${isLeader ? 'bg-amber-400' : 'bg-gray-300'}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {/* Abstain row */}
                  {abstainCount > 0 && (
                    <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/40">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-orange-300 shrink-0" />
                          <p className="font-semibold text-orange-700 text-sm">Abstain</p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-2xl font-black text-orange-600 leading-none">{abstainCount}</p>
                          <p className="text-xs text-orange-400">
                            {((abstainCount / posDenominator) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-orange-300 transition-all duration-700"
                          style={{ width: `${maxVotes > 0 ? (abstainCount / maxVotes) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
