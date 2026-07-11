/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Candidate {
  id: string;
  position_id: string;
  full_name: string;
  course: string | null;
  year_level: string | null;
  image_url: string | null;
  image_position: string | null;
  platform: string[] | null;
  partylist_name: string | null;
  partylist_color: string | null;
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
  election_date: string | null;
}

interface CandidatesData {
  hasElection: boolean;
  candidates_public: boolean;
  election?: ElectionInfo;
  positions?: Position[];
  candidates?: Candidate[];
}

export default function CandidatesPage() {
  const [data, setData] = useState<CandidatesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [asOf] = useState(() => new Date()); // captured once on mount

  useEffect(() => {
    fetch('/api/public-candidates', { cache: 'no-store' })
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="landing-bg" aria-hidden="true">
        <div className="landing-bg-pattern" />
        <div className="landing-bg-glow-top" />
        <div className="landing-bg-glow-bottom" />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-white/10 border-t-[#C4993A] rounded-full animate-spin" />
            <p className="text-sm" style={{ color: 'rgba(160,135,95,0.7)' }}>Loading candidates...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── No pending election ──
  if (!data || !data.hasElection || !data.election) {
    return (
      <>
        <div className="landing-bg" aria-hidden="true">
          <div className="landing-bg-pattern" />
          <div className="landing-bg-glow-top" />
          <div className="landing-bg-glow-bottom" />
        </div>
        <main className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
          <div className="max-w-sm w-full text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: 'rgba(196,153,58,0.1)', border: '1px solid rgba(196,153,58,0.2)' }}>
              <svg className="w-7 h-7" style={{ color: 'rgba(196,153,58,0.7)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold mb-1" style={{ color: 'rgba(240,225,195,0.9)' }}>No Upcoming Election</h2>
              <p className="text-sm" style={{ color: 'rgba(160,135,95,0.6)' }}>There is no election in the upcoming period to show candidates for.</p>
            </div>
            <Link href="/">
              <button className="text-sm px-5 py-2.5 rounded-xl font-semibold transition-all"
                style={{ background: 'rgba(28,20,10,0.6)', border: '1px solid rgba(196,153,58,0.18)', color: 'rgba(196,153,58,0.8)' }}>
                ← Back to Home
              </button>
            </Link>
          </div>
        </main>
      </>
    );
  }

  const { election, positions = [], candidates = [], candidates_public } = data;

  return (
    <>
      <div className="landing-bg" aria-hidden="true">
        <div className="landing-bg-pattern" />
        <div className="landing-bg-glow-top" />
        <div className="landing-bg-glow-bottom" />
      </div>

      <main className="relative z-10 min-h-screen p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Back nav */}
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
            style={{ color: 'rgba(160,135,95,0.7)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>

          {/* Header */}
          <div className="rounded-2xl p-6 space-y-1"
            style={{ background: 'rgba(28,20,10,0.7)', border: '1px solid rgba(196,153,58,0.15)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em]"
              style={{ color: 'rgba(160,135,95,0.6)' }}>Meet the Candidates</p>
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: 'rgba(240,225,195,0.95)' }}>
              {election.name}
            </h1>
            <p className="text-sm" style={{ color: 'rgba(160,135,95,0.6)' }}>
              Palawan State University — Narra Campus
              {election.election_date && (
                <span className="ml-2">
                  · Election Date:{' '}
                  <span style={{ color: 'rgba(196,153,58,0.8)' }}>
                    {new Date(election.election_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </span>
              )}
            </p>
            {/* As of notice */}
            <div className="flex items-center gap-2 pt-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(196,153,58,0.08)', border: '1px solid rgba(196,153,58,0.18)' }}>
                <svg className="w-3 h-3 shrink-0" style={{ color: 'rgba(196,153,58,0.6)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[11px] font-semibold" style={{ color: 'rgba(196,153,58,0.7)' }}>
                  As of{' '}
                  {asOf.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                  {', '}
                  {asOf.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[11px]" style={{ color: 'rgba(160,135,95,0.4)' }}>
                — candidate list may still change before the election.
              </p>
            </div>
          </div>

          {/* Hidden state */}
          {!candidates_public && (
            <div className="rounded-2xl p-10 flex flex-col items-center text-center gap-4"
              style={{ background: 'rgba(28,20,10,0.7)', border: '1px solid rgba(196,153,58,0.15)' }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(196,153,58,0.08)', border: '1px solid rgba(196,153,58,0.18)' }}>
                <svg className="w-8 h-8" style={{ color: 'rgba(196,153,58,0.5)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-bold" style={{ color: 'rgba(240,225,195,0.9)' }}>
                  Candidates are not yet revealed
                </p>
                <p className="text-sm mt-1.5" style={{ color: 'rgba(160,135,95,0.55)' }}>
                  The list of candidates will be published by COMELEC before the election.
                </p>
              </div>
            </div>
          )}

          {/* Candidates by position */}
          {candidates_public && positions.length > 0 && positions.map(position => {
            const posCandidates = candidates.filter(c => c.position_id === position.id);
            return (
              <div key={position.id} className="space-y-4">

                {/* Position header */}
                <div className="flex items-center gap-3 px-1">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#C4993A' }} />
                  <h2 className="text-lg font-extrabold tracking-tight" style={{ color: 'rgba(240,225,195,0.95)' }}>
                    {position.name}
                  </h2>
                  {position.max_selections > 1 && (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold"
                      style={{ background: 'rgba(196,153,58,0.12)', color: 'rgba(196,153,58,0.8)', border: '1px solid rgba(196,153,58,0.2)' }}>
                      {position.max_selections} seats
                    </span>
                  )}
                </div>

                {posCandidates.length === 0 ? (
                  <p className="text-sm pl-6" style={{ color: 'rgba(160,135,95,0.4)' }}>
                    No candidates for this position yet.
                  </p>
                ) : (
                  <div className={`grid gap-4 ${
                    posCandidates.length === 1
                      ? 'grid-cols-1 max-w-[200px]'
                      : posCandidates.length === 2
                      ? 'grid-cols-2 max-w-sm'
                      : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
                  }`}>
                    {posCandidates.map(candidate => {
                      const partyColor = candidate.partylist_color || '#9B7248';
                      const partyLabel = candidate.partylist_name || 'Independent';
                      return (
                        <button
                          key={candidate.id}
                          onClick={() => setSelected(candidate)}
                          className="text-left rounded-2xl flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl active:scale-[0.98] group"
                          style={{
                            background: 'rgba(22,15,7,0.85)',
                            border: '1px solid rgba(196,153,58,0.15)',
                            borderLeft: `4px solid ${partyColor}`,
                          }}
                        >
                          {/* Party color top strip */}
                          <div className="w-full h-1 shrink-0"
                            style={{ background: `linear-gradient(to right, ${partyColor}cc, ${partyColor}22)` }} />

                          {/* Photo — aspect 4/3 like voting cards */}
                          <div className="w-full aspect-[4/3] relative overflow-hidden shrink-0"
                            style={{ background: `linear-gradient(135deg, ${partyColor}18, ${partyColor}06)` }}>
                            {candidate.image_url ? (
                              <img
                                src={candidate.image_url}
                                alt={candidate.full_name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                style={{ objectPosition: candidate.image_position || 'center' }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-5xl font-black" style={{ color: partyColor, opacity: 0.7 }}>
                                  {candidate.full_name?.[0] || '?'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="p-3 flex flex-col items-center text-center gap-1.5 flex-1">
                            {/* Name */}
                            <p className="text-sm font-extrabold uppercase tracking-tight leading-tight line-clamp-2 w-full"
                              style={{ color: 'rgba(240,225,195,0.95)' }}>
                              {candidate.full_name}
                            </p>

                            {/* Course & Year */}
                            {(candidate.course || candidate.year_level) && (
                              <p className="text-[11px] leading-tight w-full"
                                style={{ color: 'rgba(160,135,95,0.65)' }}>
                                {[candidate.course, candidate.year_level ? `Yr ${candidate.year_level}` : null].filter(Boolean).join(' · ')}
                              </p>
                            )}

                            {/* Partylist badge */}
                            <div className="mt-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest w-full truncate"
                              style={{
                                color: partyColor,
                                background: `${partyColor}18`,
                                border: `1px solid ${partyColor}35`,
                              }}>
                              {partyLabel}
                            </div>

                            {/* Platform hint */}
                            {candidate.platform && candidate.platform.length > 0 && (
                              <p className="text-[10px] font-semibold mt-0.5"
                                style={{ color: 'rgba(196,153,58,0.45)' }}>
                                View platform →
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {candidates_public && positions.length === 0 && (
            <div className="rounded-2xl p-10 text-center"
              style={{ background: 'rgba(28,20,10,0.7)', border: '1px solid rgba(196,153,58,0.15)' }}>
              <p className="text-sm" style={{ color: 'rgba(160,135,95,0.5)' }}>No positions have been set up yet.</p>
            </div>
          )}

        </div>
      </main>

      {/* ── Candidate Detail Modal ── */}
      {selected && (() => {
        const partyColor = selected.partylist_color || '#9B7248';
        const partyLabel = selected.partylist_name || 'Independent';
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(10,7,3,0.8)', backdropFilter: 'blur(10px)' }}
            onClick={() => setSelected(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: '#130e06', border: `1px solid ${partyColor}35`, borderTop: `3px solid ${partyColor}` }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: `1px solid ${partyColor}18` }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: `${partyColor}99` }}>
                  Candidate Profile
                </p>
                <button
                  onClick={() => setSelected(null)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: 'rgba(160,135,95,0.5)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal body */}
              <div className="max-h-[75vh] overflow-y-auto">
                {/* Photo banner */}
                <div className="w-full h-48 relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${partyColor}22, ${partyColor}08)` }}>
                  {selected.image_url ? (
                    <img
                      src={selected.image_url}
                      alt={selected.full_name}
                      className="w-full h-full object-cover"
                      style={{ objectPosition: selected.image_position || 'center' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-8xl font-black" style={{ color: partyColor, opacity: 0.4 }}>
                        {selected.full_name?.[0] || '?'}
                      </span>
                    </div>
                  )}
                  {/* Gradient overlay at bottom */}
                  <div className="absolute inset-x-0 bottom-0 h-16"
                    style={{ background: 'linear-gradient(to top, #130e06, transparent)' }} />
                </div>

                {/* Identity */}
                <div className="px-5 pt-2 pb-4 text-center space-y-2">
                  <h3 className="text-xl font-extrabold uppercase tracking-tight"
                    style={{ color: 'rgba(240,225,195,0.98)' }}>
                    {selected.full_name}
                  </h3>
                  {(selected.course || selected.year_level) && (
                    <p className="text-sm" style={{ color: 'rgba(160,135,95,0.65)' }}>
                      {[selected.course, selected.year_level ? `Year ${selected.year_level}` : null].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {/* Partylist badge */}
                  <div className="inline-block px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest"
                    style={{ color: partyColor, background: `${partyColor}18`, border: `1px solid ${partyColor}35` }}>
                    {partyLabel}
                  </div>
                </div>

                {/* Platform */}
                <div className="px-5 pb-6" style={{ borderTop: `1px solid ${partyColor}15` }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider pt-4 mb-3"
                    style={{ color: 'rgba(160,135,95,0.45)' }}>Platform</p>
                  {selected.platform && selected.platform.length > 0 ? (
                    <ul className="space-y-2">
                      {selected.platform.map((point, i) => (
                        <li key={i} className="flex items-start gap-3 p-3 rounded-xl"
                          style={{ background: `${partyColor}0c`, border: `1px solid ${partyColor}20` }}>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5"
                            style={{ background: `${partyColor}25`, color: partyColor, border: `1px solid ${partyColor}40` }}>
                            {i + 1}
                          </div>
                          <p className="text-sm leading-relaxed" style={{ color: 'rgba(220,205,175,0.88)' }}>{point}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-center py-4" style={{ color: 'rgba(160,135,95,0.4)' }}>
                      No platform listed yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
