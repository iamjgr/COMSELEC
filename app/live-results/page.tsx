/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useCountdownRefresh } from '@/lib/useCountdownRefresh';
import { computeTieInfo } from '@/lib/tieDetection';

interface Candidate {
  id: string;
  position_id: string;
  full_name: string | null;
  image_url: string | null;
  image_position?: string | null;
  course: string | null;
  year_level: string | null;
  partylist_name: string | null;
  platform?: string[] | null;
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
  snapshotExpiresAt?: number;
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
    paused: { label: 'Paused', dot: 'bg-yellow-400', bg: 'bg-yellow-50 border-yellow-300', text: 'text-yellow-700' },
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

const CACHE_KEY = 'live_results_cache';
const CACHE_EXPIRES_KEY = 'live_results_expires_at';

export default function LiveResultsPage() {
  const [data, setData] = useState<PublicResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [detailCandidate, setDetailCandidate] = useState<Candidate | null>(null);

  const fetchResults = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch(`/api/public-results?_t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const json: PublicResultsData = await res.json();

      // Store the snapshot and its server-provided expiry time
      const expiresAt = json.snapshotExpiresAt ?? (Date.now() + 30_000);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(json));
        sessionStorage.setItem(CACHE_EXPIRES_KEY, String(expiresAt));
      } catch { /* quota exceeded — ignore */ }

      setData(json);
      setLastRefreshed(new Date());
    } catch (e) {
      console.error('[live-results fetch error]', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Wraps fetchResults with a cache-expiry guard.
  // Any automatic refresh trigger (countdown boundary OR tab visibility change)
  // goes through here — if the snapshot is still valid, the fetch is skipped
  // and the cached data stays on screen until the window expires.
  const fetchIfExpired = useCallback(async (silent = false) => {
    const expiresAt = Number(sessionStorage.getItem(CACHE_EXPIRES_KEY) || '0');
    if (Date.now() < expiresAt) {
      // Snapshot still valid — don't fetch
      return;
    }
    await fetchResults(silent);
  }, [fetchResults]);

  // On mount: use cached snapshot if it hasn't expired yet.
  // Hard refresh, new tab, back navigation — all honour the same window.
  useEffect(() => {
    const raw = sessionStorage.getItem(CACHE_KEY);
    const expiresAt = Number(sessionStorage.getItem(CACHE_EXPIRES_KEY) || '0');
    const stillValid = raw && Date.now() < expiresAt;

    if (stillValid) {
      try {
        setData(JSON.parse(raw!));
        setLastRefreshed(new Date(expiresAt - 30_000));
        setIsLoading(false);
        return; // snapshot is still live — do not fetch
      } catch { /* corrupt cache — fall through */ }
    }

    // No valid cache: first visit or expired — fetch immediately
    fetchResults();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 30-second countdown refresh (wall-clock aligned).
  // Uses fetchIfExpired so tab-visibility-change and boundary ticks both
  // respect the snapshot window — no premature updates.
  const { secondsLeft } = useCountdownRefresh({
    onRefresh: () => fetchIfExpired(true),
    intervalSeconds: 30,
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

  // Top N candidates per position for the leaders strip, where N = max_selections
  // Uses rank-based logic — ties share the same rank number, no index promotion
  const leaders = positions.map(pos => {
    const sorted = candidates
      .filter(c => c.position_id === pos.id)
      .map(c => ({ ...c, votes: tally[c.id] || 0 }))
      .sort((a, b) => b.votes - a.votes);
    const maxSel = pos.max_selections || 1;
    const tieInfoMap = computeTieInfo(sorted, maxSel);
    const top = sorted.filter(c => tieInfoMap.get(c.id)?.isWinner);
    return { position: pos, leaders: top, tieInfoMap };
  });

  return (
    <>
    <main className="live-results-page min-h-screen p-4 md:p-8 lg:p-10">
      <div className="max-w-screen-2xl mx-auto space-y-8">

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
              <h1 className="text-3xl font-extrabold lr-primary tracking-tight leading-tight">{election.name}</h1>
              <p className="text-sm lr-muted mt-1">Palawan State University — Narra Campus</p>
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

              {/* Desktop: all chips in one row, wrapping only when the parent card
                  truly runs out of width. Mobile: stack chips vertically. */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                {leaders.map(({ position, leaders: topLeaders, tieInfoMap }) => {
                  // Group leaders by rank so tied candidates share a rank label
                  const byRank = topLeaders.reduce<Record<number, typeof topLeaders>>((acc, l) => {
                    const r = tieInfoMap.get(l.id)?.rank ?? 1;
                    (acc[r] = acc[r] || []).push(l);
                    return acc;
                  }, {});
                  const rankGroups = Object.entries(byRank).sort(([a], [b]) => Number(a) - Number(b));

                  return (
                    <div key={position.id} className="lr-leader-chip flex-shrink-0">
                      {/* Position label */}
                      <p className="text-[11px] font-semibold uppercase tracking-wider lr-muted mb-2 whitespace-nowrap">
                        {position.name}
                        {position.max_selections > 1 && (
                          <span className="ml-1 opacity-60">({position.max_selections})</span>
                        )}
                      </p>

                      {topLeaders.length > 0 ? (
                        /* All rank groups laid out horizontally — no wrapping inside the chip */
                        <div className="flex flex-row items-center gap-4 flex-nowrap">
                          {rankGroups.map(([rank, group]) => (
                            <div key={rank} className="flex flex-row items-center gap-2 flex-nowrap">
                              {/* Rank number */}
                              <span className="text-[10px] font-bold lr-muted shrink-0">#{rank}</span>

                              {/* Tie badge — only when 2+ share this rank */}
                              {group.length > 1 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide bg-blue-900/40 text-blue-300 border border-blue-700/30 shrink-0">
                                  Tied
                                </span>
                              )}

                              {/* Candidates at this rank, side-by-side */}
                              {group.map((leader) => (
                                <div
                                  key={leader.id}
                                  className="flex items-center gap-2 cursor-pointer group/leader flex-nowrap"
                                  onClick={() => setDetailCandidate(leader)}
                                >
                                  {leader.image_url ? (
                                    <img
                                      src={leader.image_url}
                                      alt={leader.full_name || ''}
                                      className="w-9 h-9 rounded-full object-cover lr-border-img shrink-0 group-hover/leader:ring-2 group-hover/leader:ring-amber-400 transition-all"
                                    />
                                  ) : (
                                    <div className="w-9 h-9 rounded-full lr-avatar flex items-center justify-center shrink-0 group-hover/leader:ring-2 group-hover/leader:ring-amber-400 transition-all">
                                      <span className="text-xs font-bold lr-gold">{leader.full_name?.[0] || '?'}</span>
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold lr-primary leading-tight whitespace-nowrap group-hover/leader:underline">
                                      {leader.full_name}
                                    </p>
                                    <p className="text-xs lr-muted whitespace-nowrap">{leader.votes} vote{leader.votes !== 1 ? 's' : ''}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs lr-muted italic">No votes yet</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Paused notice */}
          {election.status === 'paused' && (
            <div className="flex items-start gap-3 rounded-xl px-4 py-3 bg-yellow-950/30 border border-yellow-500/30">
              <svg className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-yellow-300">Voting is temporarily paused</p>
                <p className="text-xs text-yellow-400/70 mt-0.5">Results shown below reflect votes cast so far. Voting will resume when the administrator unpauses the election.</p>
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

          {/* Last updated + countdown */}
          <div className="flex items-center justify-between">
            {/* Circular countdown arc */}
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 shrink-0">
                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 40 40">
                  {/* Track */}
                  <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(196,153,58,0.12)" strokeWidth="2.5" />
                  {/* Arc — drains as time passes */}
                  <circle
                    cx="20" cy="20" r="16" fill="none"
                    stroke="#C4993A"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 16}`}
                    strokeDashoffset={`${2 * Math.PI * 16 * ((30 - secondsLeft) / 30)}`}
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                {/* Number in center */}
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums lr-gold">
                  {secondsLeft}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold lr-primary leading-none">
                  Updating in {secondsLeft}s
                </p>
                {lastRefreshed && (
                  <p className="text-[10px] lr-muted mt-0.5">
                    Last: {lastRefreshed.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── POSITION RESULTS GRID ── */}
        {positions.length === 0 ? (
          <div className="lr-card text-center py-12">
            <p className="text-sm lr-muted">No results to display yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {positions.map(position => {
              const posCandidates = candidates
                .filter(c => c.position_id === position.id)
                .map(c => ({ ...c, votes: tally[c.id] || 0 }))
                .sort((a, b) => b.votes - a.votes);

              const abstainCount = abstainCounts[position.id] || 0;
              const posTotal = posCandidates.reduce((sum, c) => sum + c.votes, 0);
              const posDenominator = posTotal + abstainCount || 1;
              const maxSel = position.max_selections || 1;
              const tieInfoMap = computeTieInfo(posCandidates, maxSel);
              const hasBoundaryTie = posCandidates.some(c => tieInfoMap.get(c.id)?.isBoundaryTie);

              return (
                <div key={position.id} className="lr-card overflow-hidden !p-0">
                  <div className="px-5 py-4 lr-pos-header flex items-center justify-between">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#C4993A]" />
                      <h2 className="font-bold lr-primary text-base">{position.name}</h2>
                      {position.max_selections > 1 && (
                        <span className="text-[11px] lr-muted lr-icon-bg px-2 py-0.5 rounded-full font-semibold">
                          Pick {position.max_selections}
                        </span>
                      )}
                      {hasBoundaryTie && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700/40 flex items-center gap-1">
                          ⚖ Contested seat
                        </span>
                      )}
                    </div>
                    <span className="text-sm lr-muted">{posTotal} vote{posTotal !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="p-5 space-y-3">
                    {posCandidates.map((candidate) => {
                      const info = tieInfoMap.get(candidate.id)!;
                      const { isWinner, isTied, isBoundaryTie, rank } = info;
                      const isInternalTie = isWinner && isTied && !isBoundaryTie;
                      const pct = posDenominator > 0 ? (candidate.votes / posDenominator) * 100 : 0;
                      const barWidth = pct;
                      const isHidden = !results_visible;

                      // Bar color: blue for any tie, amber for clear winner, default otherwise
                      const barColor = isTied ? '#60a5fa' : isWinner && !isHidden ? '#f59e0b' : '#9B7248';

                      return (
                        <div key={candidate.id}
                          className={`p-4 rounded-xl border transition-all ${
                            isWinner && isBoundaryTie && !isHidden ? 'border-blue-500/40 bg-blue-950/20' :
                            isWinner && !isHidden ? 'lr-leader-row' :
                            isBoundaryTie && !isHidden ? 'border-blue-500/20 bg-blue-950/10' :
                            'lr-candidate-row'
                          } ${!isHidden ? 'cursor-pointer active:scale-[0.98]' : ''}`}
                          onClick={() => { if (!isHidden) setDetailCandidate(candidate); }}
                        >
                          <div className="flex items-center justify-between mb-2.5 gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xs font-bold lr-muted w-5 shrink-0">#{rank}</span>
                              {isHidden ? (
                                <img
                                  src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${candidate.id}&backgroundColor=1a1209`}
                                  alt="Hidden"
                                  className="w-10 h-10 rounded-full lr-border-img shrink-0"
                                />
                              ) : candidate.image_url ? (
                                <img src={candidate.image_url} alt={candidate.full_name || ''}
                                  className="w-10 h-10 rounded-full object-cover lr-border-img shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-full lr-avatar flex items-center justify-center shrink-0">
                                  <span className="text-sm font-bold lr-gold">{candidate.full_name?.[0] || '?'}</span>
                                </div>
                              )}
                              <div className="min-w-0">
                                {isHidden ? (
                                  <>
                                    <div className="h-3.5 w-28 rounded lr-skeleton mb-1.5" />
                                    <div className="h-2.5 w-16 rounded lr-skeleton opacity-60" />
                                  </>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {isWinner && !isTied && (
                                        <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
                                        </svg>
                                      )}
                                      {(isInternalTie || isBoundaryTie) && (
                                        <span className="text-[10px]">⚖</span>
                                      )}
                                      <p className="font-semibold lr-primary text-sm break-words">{candidate.full_name}</p>
                                      {isTied && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide bg-blue-900/40 text-blue-300">
                                          Tied
                                        </span>
                                      )}
                                    </div>
                                    {candidate.partylist_name && (
                                      <p className="text-xs font-medium text-amber-400/80 break-words leading-snug">
                                        {candidate.partylist_name}
                                      </p>
                                    )}
                                    {(candidate.course || candidate.year_level) && (
                                      <p className="text-xs lr-muted break-words leading-snug">
                                        {[candidate.course, candidate.year_level ? `Yr ${candidate.year_level}` : null].filter(Boolean).join(' · ')}
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xl font-black lr-primary leading-none">{candidate.votes}</p>
                              <p className="text-xs lr-muted">{pct.toFixed(1)}%</p>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden lr-bar-track">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${barWidth}%`, background: barColor }} />
                          </div>
                        </div>
                      );
                    })}

                    {abstainCount > 0 && (
                      <div className="p-4 rounded-xl lr-abstain-row">
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-3">
                            <span className="w-5 shrink-0" />
                            <div className="w-10 h-10 rounded-full lr-abstain-avatar flex items-center justify-center shrink-0">
                              <div className="w-3.5 h-3.5 rounded-full border-2 border-orange-400" />
                            </div>
                            <p className="font-semibold text-orange-200 text-sm">Abstain</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-black text-orange-200 leading-none">{abstainCount}</p>
                            <p className="text-xs text-orange-300/90">{((abstainCount / posDenominator) * 100).toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden lr-abstain-track">
                          <div className="h-full rounded-full bg-orange-400/60 transition-all duration-700"
                            style={{ width: `${(abstainCount / posDenominator) * 100}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs lr-muted pb-4">University Student Government Election</p>
      </div>

      {/* ── Candidate Detail Modal ── */}
      {detailCandidate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setDetailCandidate(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base">Platform & Details</h3>
              <button
                onClick={() => setDetailCandidate(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto bg-gray-50/50">
              {/* Photo + identity */}
              <div className="flex flex-col items-center text-center mb-7 mt-1">
                {detailCandidate.image_url ? (
                  <img
                    src={detailCandidate.image_url}
                    alt={detailCandidate.full_name || ''}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shadow-sm border border-gray-200 mb-4"
                    style={{ objectPosition: detailCandidate.image_position || 'center' }}
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700 flex items-center justify-center font-bold text-4xl shadow-sm border border-amber-200 mb-4">
                    {detailCandidate.full_name?.[0] || '?'}
                  </div>
                )}
                <h4 className="font-bold text-gray-900 text-xl mb-1 break-words px-2">
                  {detailCandidate.full_name}
                </h4>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  {detailCandidate.course} · Year {detailCandidate.year_level}
                </p>
                {detailCandidate.partylist_name && (
                  <p className="text-sm font-semibold text-amber-600 mt-0.5">
                    {detailCandidate.partylist_name}
                  </p>
                )}
              </div>

              {/* Platform */}
              {detailCandidate.platform && detailCandidate.platform.length > 0 ? (
                <div>
                  <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">
                    Platform Details
                  </h5>
                  <ul className="space-y-2.5">
                    {detailCandidate.platform.map((point, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm"
                      >
                        <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5 border border-amber-200">
                          {i + 1}
                        </div>
                        <span className="text-sm text-gray-700 leading-relaxed font-medium pt-0.5">
                          {point}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center italic py-4">No platform points listed.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>

      {/* ── Candidate Detail Modal — rendered via portal to escape stacking context ── */}
      {detailCandidate && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setDetailCandidate(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base">Platform & Details</h3>
              <button
                onClick={() => setDetailCandidate(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto bg-gray-50/50">
              {/* Photo + identity */}
              <div className="flex flex-col items-center text-center mb-7 mt-1">
                {detailCandidate.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={detailCandidate.image_url}
                    alt={detailCandidate.full_name || ''}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover shadow-sm border border-gray-200 mb-4"
                    style={{ objectPosition: detailCandidate.image_position || 'center' }}
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700 flex items-center justify-center font-bold text-4xl shadow-sm border border-amber-200 mb-4">
                    {detailCandidate.full_name?.[0] || '?'}
                  </div>
                )}
                <h4 className="font-bold text-gray-900 text-xl mb-1 break-words px-2">
                  {detailCandidate.full_name}
                </h4>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  {detailCandidate.course} · Year {detailCandidate.year_level}
                </p>
                {detailCandidate.partylist_name && (
                  <p className="text-sm font-semibold text-amber-600 mt-0.5">
                    {detailCandidate.partylist_name}
                  </p>
                )}
              </div>

              {/* Platform */}
              {detailCandidate.platform && detailCandidate.platform.length > 0 ? (
                <div>
                  <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">
                    Platform Details
                  </h5>
                  <ul className="space-y-2.5">
                    {detailCandidate.platform.map((point, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm"
                      >
                        <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5 border border-amber-200">
                          {i + 1}
                        </div>
                        <span className="text-sm text-gray-700 leading-relaxed font-medium pt-0.5">
                          {point}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center italic py-4">No platform points listed.</p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}