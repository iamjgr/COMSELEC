/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useCountdownRefresh } from '@/lib/useCountdownRefresh';

interface Candidate {
  id: string;
  position_id: string;
  full_name: string | null;
  image_url: string | null;
  course: string | null;
  year_level: string | null;
  slot?: number;
}

interface Position {
  id: string;
  name: string;
  order_index: number;
  max_selections: number;
}

interface ElectionInfo {
  id: string;
  name: string;
  status: string;
  voting_start: string | null;
  voting_end: string | null;
  election_date: string | null;
}

interface Stats {
  totalVoters: number;
  votesCast: number;
  turnout: number;
}

interface PublicResultsData {
  results_visible: boolean;
  hasElection: boolean;
  election: ElectionInfo | null;
  positions: Position[];
  candidates: Candidate[];
  tally: Record<string, number>;
  abstainCounts: Record<string, number>;
  stats: Stats;
}

function ElectionStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; dot: string; bg: string; text: string }> = {
    active: { label: 'Voting Open', dot: 'bg-emerald-400', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
    completed: { label: 'Voting Ended', dot: 'bg-orange-400', bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
    pending: { label: 'Not Started', dot: 'bg-gray-400', bg: 'bg-gray-50 border-gray-200', text: 'text-gray-600' },
    archived: { label: 'Archived', dot: 'bg-purple-400', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${status === 'active' ? 'animate-pulse' : ''}`} />
      {s.label}
    </span>
  );
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default function LiveResultsPage() {
  const [data, setData] = useState<PublicResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchResults = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch(`/api/public-results?_t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
      setLastRefreshed(new Date());
    } catch (e) {
      console.error('[live-results fetch error]', e);
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
      <div className="live-results-page min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-white/10 border-t-[#C4993A] rounded-full animate-spin" />
          <p className="text-sm" style={{ color: 'rgba(160,135,95,0.7)' }}>Loading results...</p>
        </div>
      </div>
    );
  }

  // No election at all
  if (!data || !data.hasElection || !data.election) {
    return (
      <div className="live-results-page min-h-screen flex flex-col items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl lr-surface lr-border flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 lr-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold lr-primary mb-1">No Active Election</h2>
            <p className="text-sm lr-muted">There is no ongoing or recently concluded election to display results for.</p>
          </div>
          <Link href="/">
            <button className="lr-btn-secondary text-sm py-2.5">← Back to Home</button>
          </Link>
        </div>
      </div>
    );
  }

  const { election, positions, candidates, tally, abstainCounts, stats, results_visible } = data;

  // Top candidate per position for the leaders strip
  const leaders = positions.map(pos => {
    const top = candidates
      .filter(c => c.position_id === pos.id)
      .map(c => ({ ...c, votes: tally[c.id] || 0 }))
      .sort((a, b) => b.votes - a.votes)[0] || null;
    return { position: pos, leader: top };
  });

  return (
    <main className="live-results-page min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Back nav */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm lr-muted transition-colors hover:opacity-80">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>

        {/* ── FULL-WIDTH HEADER ── */}
        <div className="lr-card space-y-5">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] lr-muted mb-1">Live Results</p>
              <h1 className="text-2xl font-extrabold lr-primary tracking-tight leading-tight">{election.name}</h1>
              <p className="text-xs lr-muted mt-1">Palawan State University — Narra Campus</p>
            </div>
            <ElectionStatusBadge status={election.status} />
          </div>

          {/* Timeline + Turnout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {election.election_date && (
                <div className="lr-info-cell rounded-xl px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider lr-muted mb-0.5">Election Date</p>
                  <p className="text-sm font-semibold lr-primary">
                    {new Date(election.election_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              )}
              <div className="lr-info-cell rounded-xl px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider lr-muted mb-0.5">Voting Started</p>
                <p className="text-sm font-semibold lr-primary">{formatDateTime(election.voting_start)}</p>
              </div>
              <div className="lr-info-cell rounded-xl px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider lr-muted mb-0.5">
                  {election.status === 'completed' ? 'Voting Ended' : 'Voting End'}
                </p>
                <p className="text-sm font-semibold lr-primary">{formatDateTime(election.voting_end)}</p>
              </div>
            </div>
            <div className="lr-turnout-cell rounded-xl px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold lr-muted uppercase tracking-wider">Voter Turnout</p>
                <p className="text-sm font-black lr-gold">{stats.turnout}%</p>
              </div>
              <div className="h-2 rounded-full lr-bar-track overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all duration-700 lr-bar-fill" style={{ width: `${stats.turnout}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs lr-muted">
                <span><span className="font-bold lr-primary">{stats.votesCast}</span> voted</span>
                <span><span className="font-bold lr-primary">{stats.totalVoters}</span> total voters</span>
              </div>
            </div>
          </div>

          {/* ── LEADERS STRIP ── */}
          {results_visible && leaders.length > 0 && (
            <div>
              <div className="lr-pos-header pb-3 mb-3 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
                </svg>
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] lr-muted">Current Leaders</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {leaders.map(({ position, leader }) => (
                  <div key={position.id} className="lr-leader-chip">
                    <p className="text-[10px] font-semibold uppercase tracking-wider lr-muted truncate mb-1.5">{position.name}</p>
                    {leader && leader.votes > 0 ? (
                      <div className="flex items-center gap-2 min-w-0">
                        {leader.image_url ? (
                          <img src={leader.image_url} alt={leader.full_name || ''} className="w-7 h-7 rounded-full object-cover lr-border-img shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full lr-avatar flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold lr-gold">{leader.full_name?.[0] || '?'}</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold lr-primary truncate leading-tight">{leader.full_name}</p>
                          <p className="text-[10px] lr-muted">{leader.votes} vote{leader.votes !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs lr-muted italic">No votes yet</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hidden notice */}
          {!results_visible && (
            <div className="flex items-start gap-3 lr-info-cell rounded-xl px-4 py-3">
              <svg className="w-4 h-4 lr-gold mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <div>
                <p className="text-sm font-semibold lr-primary">Candidate identities are hidden</p>
                <p className="text-xs lr-muted mt-0.5">Names and photos will be revealed when the administrator enables public results.</p>
              </div>
            </div>
          )}

          {/* Last updated */}
          <div className="flex items-center justify-between text-xs lr-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Refreshes in {secondsLeft}s
            </span>
            <button
              onClick={triggerRefresh}
              className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString()}` : 'Refresh now'}
            </button>
          </div>
        </div>

        {/* ── POSITION RESULTS GRID ── */}
        {positions.length === 0 ? (
          <div className="lr-card text-center py-12">
            <p className="text-sm lr-muted">No results to display yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {positions.map(position => {
              const posCandidates = candidates
                .filter(c => c.position_id === position.id)
                .map(c => ({ ...c, votes: tally[c.id] || 0 }))
                .sort((a, b) => b.votes - a.votes);

              const abstainCount = abstainCounts[position.id] || 0;
              const posTotal = posCandidates.reduce((sum, c) => sum + c.votes, 0);
              const posDenominator = posTotal + abstainCount || 1;
              const maxVotes = Math.max(...posCandidates.map(c => c.votes), abstainCount, 1);

              return (
                <div key={position.id} className="lr-card overflow-hidden !p-0">
                  <div className="px-5 py-3.5 lr-pos-header flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-[#C4993A]" />
                      <h2 className="font-bold lr-primary">{position.name}</h2>
                      {position.max_selections > 1 && (
                        <span className="text-[10px] lr-muted lr-icon-bg px-2 py-0.5 rounded-full font-semibold">
                          Pick {position.max_selections}
                        </span>
                      )}
                    </div>
                    <span className="text-xs lr-muted">{posTotal} vote{posTotal !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="p-4 space-y-2">
                    {posCandidates.map((candidate, idx) => {
                      const isLeader = idx === 0 && candidate.votes > 0;
                      const pct = posDenominator > 0 ? (candidate.votes / posDenominator) * 100 : 0;
                      const barWidth = maxVotes > 0 ? (candidate.votes / maxVotes) * 100 : 0;
                      const isHidden = !results_visible;
                      return (
                        <div key={candidate.id}
                          className={`p-3 rounded-xl border transition-all ${isLeader && !isHidden ? 'lr-leader-row' : 'lr-candidate-row'}`}>
                          <div className="flex items-center justify-between mb-2 gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-xs font-bold lr-muted w-5 shrink-0">#{idx + 1}</span>
                              {isHidden ? (
                                <img src={`https://api.dicebear.com/9.x/thumbs/svg?seed=${candidate.id}&backgroundColor=b6e3f4,c0aede&backgroundType=gradientLinear&shapeColor=0a5b83`}
                                  alt="Hidden" className="w-8 h-8 rounded-full lr-border-img shrink-0" />
                              ) : candidate.image_url ? (
                                <img src={candidate.image_url} alt={candidate.full_name || ''}
                                  className="w-8 h-8 rounded-full object-cover lr-border-img shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-full lr-avatar flex items-center justify-center shrink-0">
                                  <span className="text-[11px] font-bold lr-gold">{candidate.full_name?.[0] || '?'}</span>
                                </div>
                              )}
                              <div className="min-w-0">
                                {isHidden ? (
                                  <>
                                    <div className="h-3 w-24 rounded lr-skeleton mb-1" />
                                    <div className="h-2.5 w-14 rounded lr-skeleton opacity-60" />
                                  </>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-1">
                                      {isLeader && <svg className="w-3 h-3 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" /></svg>}
                                      <p className="font-semibold lr-primary text-sm truncate">{candidate.full_name}</p>
                                    </div>
                                    {(candidate.course || candidate.year_level) && (
                                      <p className="text-xs lr-muted truncate">
                                        {[candidate.course, candidate.year_level ? `Yr ${candidate.year_level}` : null].filter(Boolean).join(' · ')}
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-lg font-black lr-primary leading-none">{candidate.votes}</p>
                              <p className="text-[11px] lr-muted">{pct.toFixed(1)}%</p>
                            </div>
                          </div>
                          <div className="h-1 rounded-full overflow-hidden lr-bar-track">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${barWidth}%`, background: isLeader && !isHidden ? '#f59e0b' : '#9B7248' }} />
                          </div>
                        </div>
                      );
                    })}

                    {abstainCount > 0 && (
                      <div className="p-3 rounded-xl lr-abstain-row">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 shrink-0" />
                            <div className="w-8 h-8 rounded-full lr-abstain-avatar flex items-center justify-center shrink-0">
                              <div className="w-3 h-3 rounded-full border-2 border-orange-400" />
                            </div>
                            <p className="font-semibold text-orange-300 text-sm">Abstain</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-orange-300 leading-none">{abstainCount}</p>
                            <p className="text-[11px] text-orange-400/70">{((abstainCount / posDenominator) * 100).toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden lr-abstain-track">
                          <div className="h-full rounded-full bg-orange-400/60 transition-all duration-700"
                            style={{ width: `${maxVotes > 0 ? (abstainCount / maxVotes) * 100 : 0}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs lr-muted pb-4">PSU Narra Campus · Student Government Elections</p>
      </div>
    </main>
  );
}