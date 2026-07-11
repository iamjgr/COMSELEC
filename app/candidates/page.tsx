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
          </div>

          {/* Hidden state */}
          {!candidates_public && (
            <div className="rounded-2xl p-8 flex flex-col items-center text-center gap-4"
              style={{ background: 'rgba(28,20,10,0.7)', border: '1px solid rgba(196,153,58,0.15)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(196,153,58,0.08)', border: '1px solid rgba(196,153,58,0.18)' }}>
                <svg className="w-7 h-7" style={{ color: 'rgba(196,153,58,0.5)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </div>
              <div>
                <p className="text-base font-semibold" style={{ color: 'rgba(240,225,195,0.85)' }}>
                  Candidates are not yet revealed
                </p>
                <p className="text-sm mt-1" style={{ color: 'rgba(160,135,95,0.6)' }}>
                  The list of candidates will be published by COMELEC before the election.
                </p>
              </div>
            </div>
          )}

          {/* Candidates by position */}
          {candidates_public && positions.length > 0 && positions.map(position => {
            const posCandidates = candidates.filter(c => c.position_id === position.id);
            return (
              <div key={position.id} className="space-y-3">
                {/* Position header */}
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: '#C4993A' }} />
                  <h2 className="font-bold text-base" style={{ color: 'rgba(240,225,195,0.9)' }}>
                    {position.name}
                  </h2>
                  {position.max_selections > 1 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: 'rgba(196,153,58,0.1)', color: 'rgba(196,153,58,0.7)', border: '1px solid rgba(196,153,58,0.15)' }}>
                      Pick {position.max_selections}
                    </span>
                  )}
                </div>

                {posCandidates.length === 0 ? (
                  <p className="text-sm pl-5" style={{ color: 'rgba(160,135,95,0.5)' }}>No candidates for this position yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {posCandidates.map(candidate => (
                      <button
                        key={candidate.id}
                        onClick={() => setSelected(candidate)}
                        className="text-left rounded-2xl p-4 flex flex-col items-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] group"
                        style={{ background: 'rgba(28,20,10,0.7)', border: '1px solid rgba(196,153,58,0.12)' }}
                      >
                        {/* Photo */}
                        {candidate.image_url ? (
                          <img
                            src={candidate.image_url}
                            alt={candidate.full_name}
                            className="w-16 h-16 rounded-full object-cover shrink-0 group-hover:ring-2 transition-all"
                            style={{ border: '2px solid rgba(196,153,58,0.3)', objectPosition: candidate.image_position || 'center',
                              ['--tw-ring-color' as string]: '#C4993A' }}
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 group-hover:ring-2 transition-all"
                            style={{ background: 'rgba(196,153,58,0.1)', border: '2px solid rgba(196,153,58,0.2)' }}>
                            <span className="text-xl font-bold" style={{ color: '#C4993A' }}>{candidate.full_name?.[0] || '?'}</span>
                          </div>
                        )}

                        {/* Info */}
                        <div className="text-center min-w-0 w-full">
                          <p className="text-sm font-semibold leading-tight" style={{ color: 'rgba(240,225,195,0.9)' }}>
                            {candidate.full_name}
                          </p>
                          {candidate.partylist_name && (
                            <p className="text-xs font-medium mt-0.5 truncate"
                              style={{ color: candidate.partylist_color || 'rgba(196,153,58,0.7)' }}>
                              {candidate.partylist_name}
                            </p>
                          )}
                          {(candidate.course || candidate.year_level) && (
                            <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(160,135,95,0.6)' }}>
                              {[candidate.course, candidate.year_level ? `Yr ${candidate.year_level}` : null].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          {candidate.platform && candidate.platform.length > 0 && (
                            <p className="text-[10px] mt-1.5 font-medium" style={{ color: 'rgba(196,153,58,0.5)' }}>
                              View platform →
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {candidates_public && positions.length === 0 && (
            <div className="rounded-2xl p-8 text-center"
              style={{ background: 'rgba(28,20,10,0.7)', border: '1px solid rgba(196,153,58,0.15)' }}>
              <p className="text-sm" style={{ color: 'rgba(160,135,95,0.6)' }}>No positions have been set up yet.</p>
            </div>
          )}

        </div>
      </main>

      {/* ── Candidate Detail Modal ── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(10,7,3,0.75)', backdropFilter: 'blur(8px)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: '#1a1209', border: '1px solid rgba(196,153,58,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(196,153,58,0.12)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(160,135,95,0.6)' }}>
                Candidate Profile
              </p>
              <button
                onClick={() => setSelected(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'rgba(160,135,95,0.6)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 max-h-[75vh] overflow-y-auto space-y-5">
              {/* Photo + identity */}
              <div className="flex flex-col items-center text-center gap-3">
                {selected.image_url ? (
                  <img
                    src={selected.image_url}
                    alt={selected.full_name}
                    className="w-24 h-24 rounded-2xl object-cover"
                    style={{ border: '2px solid rgba(196,153,58,0.3)', objectPosition: selected.image_position || 'center' }}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(196,153,58,0.1)', border: '2px solid rgba(196,153,58,0.2)' }}>
                    <span className="text-4xl font-bold" style={{ color: '#C4993A' }}>{selected.full_name?.[0] || '?'}</span>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'rgba(240,225,195,0.95)' }}>{selected.full_name}</h3>
                  {selected.partylist_name && (
                    <p className="text-sm font-semibold mt-0.5"
                      style={{ color: selected.partylist_color || 'rgba(196,153,58,0.8)' }}>
                      {selected.partylist_name}
                    </p>
                  )}
                  {(selected.course || selected.year_level) && (
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(160,135,95,0.6)' }}>
                      {[selected.course, selected.year_level ? `Year ${selected.year_level}` : null].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Platform */}
              {selected.platform && selected.platform.length > 0 ? (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-3"
                    style={{ color: 'rgba(160,135,95,0.5)' }}>Platform</p>
                  <ul className="space-y-2">
                    {selected.platform.map((point, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 rounded-xl"
                        style={{ background: 'rgba(196,153,58,0.05)', border: '1px solid rgba(196,153,58,0.1)' }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5"
                          style={{ background: 'rgba(196,153,58,0.15)', color: '#C4993A', border: '1px solid rgba(196,153,58,0.2)' }}>
                          {i + 1}
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'rgba(220,205,175,0.85)' }}>{point}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-center" style={{ color: 'rgba(160,135,95,0.5)' }}>No platform listed yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
