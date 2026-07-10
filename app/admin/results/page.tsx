'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Trophy, Users, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { useElection } from '@/components/ElectionContext';
import { ResultsSkeleton } from '@/components/AdminSkeletons';

export default function AdminResultsPage() {
  const { activeElection } = useElection();
  
  const [positions, setPositions] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [tally, setTally] = useState<Record<string, number>>({});
  const [abstainCounts, setAbstainCounts] = useState<Record<string, number>>({});
  const [totalVoters, setTotalVoters] = useState(0);
  const [votesCast, setVotesCast] = useState(0);
  const [voterDemographics, setVoterDemographics] = useState<any[]>([]);
  const [expandedPrograms, setExpandedPrograms] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [electionSettings, setElectionSettings] = useState<any>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('');

  const fetchResults = useCallback(async (silent = false) => {
    if (!activeElection) return;
    const token = localStorage.getItem('admin_session');
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/stats?election_id=${activeElection.id}&_t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      if (res.status === 401) { localStorage.removeItem('admin_session'); window.location.href = '/admin/login'; return; }
      const data = await res.json();
      if (res.ok) {
        setPositions(data.positions || []);
        setCandidates(data.candidates || []);
        setTally(data.tally || {});
        setAbstainCounts(data.abstainCounts || {});
        setTotalVoters(data.totalVoters || 0);
        setVotesCast(data.votesCast || 0);
        setVoterDemographics(data.voterDemographics || []);
        setElectionSettings(data.settings || null);
        setLastRefreshed(new Date());
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, [activeElection]);

  useEffect(() => { setIsLoading(true); }, [activeElection?.id]);
  useEffect(() => {
    fetchResults();
    const interval = setInterval(() => fetchResults(true), 10000);
    return () => clearInterval(interval);
  }, [fetchResults]);

  if (isLoading) return <ResultsSkeleton />;

  const turnoutPct = totalVoters > 0 ? (votesCast / totalVoters) * 100 : 0;
  const remaining = totalVoters - votesCast;
  const totalAbstainCount = Object.values(abstainCounts).reduce((a, b) => a + b, 0);
  const totalPossibleVotes = positions.length * votesCast;
  const overallAbstainPct = totalPossibleVotes > 0 ? (totalAbstainCount / totalPossibleVotes) * 100 : 0;

  // Unique courses from candidates (for the filter)
  const availableCourses = Array.from(new Set(candidates.map(c => c.course).filter(Boolean))).sort();

  // Apply course filter to candidates
  const filteredCandidates = selectedCourse
    ? candidates.filter(c => c.course === selectedCourse)
    : candidates;

  const leaders = positions.map(pos => {
    const posCandidates = candidates
      .filter(c => c.position_id === pos.id)
      .map(c => ({ ...c, votes: tally[c.id] || 0 }))
      .sort((a, b) => b.votes - a.votes);
    return { position: pos, leader: posCandidates[0] || null };
  }).filter(l => l.leader && l.leader.votes > 0);

  const toggleProgram = (course: string) =>
    setExpandedPrograms(prev => ({ ...prev, [course]: !prev[course] }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Results Tally</h1>
          {activeElection?.status !== 'archived' && (
            <p className="text-sm text-gray-400 mt-1">
              {lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString()}` : 'Loading...'} · Auto-refreshes every 10s
            </p>
          )}
        </div>
        {activeElection?.status !== 'archived' && (
          <button onClick={() => fetchResults(false)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 bg-white px-3 py-2 rounded-lg transition-all">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        )}
      </div>

      {/* Course / Department Filter Bar */}
      {availableCourses.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 shrink-0">
            <Filter className="w-4 h-4" />
            Filter by Course
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCourse('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedCourse === ''
                  ? 'bg-[#0F1117] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Courses
            </button>
            {availableCourses.map(course => (
              <button
                key={course}
                onClick={() => setSelectedCourse(selectedCourse === course ? '' : course)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedCourse === course
                    ? 'bg-[#9B7248] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-[#F0E6D6] hover:text-[#7C5C3A]'
                }`}
              >
                {course}
              </button>
            ))}
          </div>
          {selectedCourse && (
            <span className="ml-auto text-xs text-gray-400 italic">
              Showing candidates from <strong className="text-gray-600">{selectedCourse}</strong>
            </span>
          )}
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-3 gap-5">
        {/* Main: per-position results */}
        <div className="col-span-2 space-y-4">
          {/* Turnout bar — hidden when filtered */}
          {!selectedCourse && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">Overall Voter Turnout</p>
                <p className="text-sm font-bold text-gray-900">{votesCast} / {totalVoters}</p>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#9B7248] to-[#C4993A] rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(turnoutPct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                <span>{turnoutPct.toFixed(1)}% turnout</span>
                <span>{remaining} not yet voted</span>
              </div>
            </div>
          )}

          {/* Voter Turnout by Program — hidden when filtered */}
          {!selectedCourse && voterDemographics.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#9B7248]" />
                <p className="text-sm font-semibold text-gray-700">Voter Turnout by Program</p>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full ml-auto">
                  {voterDemographics.length} program{voterDemographics.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {voterDemographics.map((prog) => {
                  const pct = prog.total > 0 ? (prog.voted / prog.total) * 100 : 0;
                  const notVoted = prog.total - prog.voted;
                  const isExpanded = expandedPrograms[prog.course];
                  return (
                    <div key={prog.course}>
                      <button
                        onClick={() => toggleProgram(prog.course)}
                        className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50/70 transition-colors text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900 text-sm">{prog.course}</span>
                              {notVoted > 0 && (
                                <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                                  {notVoted} pending
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-gray-900">
                                {prog.voted}<span className="text-xs font-normal text-gray-400"> / {prog.total}</span>
                              </span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                pct >= 80 ? 'bg-green-50 text-green-700' : pct >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'
                              }`}>
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                pct >= 80 ? 'bg-green-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
                              }`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="shrink-0 text-gray-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="bg-gray-50/60 border-t border-gray-100 px-6 py-3 space-y-2.5">
                          {prog.years.map((y: any) => {
                            const yPct = y.total > 0 ? (y.voted / y.total) * 100 : 0;
                            const yNotVoted = y.total - y.voted;
                            return (
                              <div key={y.year} className="flex items-center gap-3">
                                <span className="text-xs font-medium text-gray-500 w-14 shrink-0">{y.year}</span>
                                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-700 ${
                                      yPct >= 80 ? 'bg-green-400' : yPct >= 50 ? 'bg-amber-400' : 'bg-red-400'
                                    }`}
                                    style={{ width: `${Math.min(yPct, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-600 font-semibold w-16 text-right shrink-0">{y.voted}/{y.total}</span>
                                {yNotVoted > 0 && (
                                  <span className="text-xs text-red-400 w-14 shrink-0 text-right">{yNotVoted} left</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Per-position results */}
          {positions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
              <p className="text-gray-400 text-sm">No positions or votes yet.</p>
            </div>
          ) : (
            positions.map(position => {
              const allPosCandidates = candidates
                .filter(c => c.position_id === position.id)
                .map(c => ({ ...c, votes: tally[c.id] || 0 }))
                .sort((a, b) => b.votes - a.votes);

              const posCandidates = filteredCandidates
                .filter(c => c.position_id === position.id)
                .map(c => ({ ...c, votes: tally[c.id] || 0 }))
                .sort((a, b) => b.votes - a.votes);

              const abstainCount = abstainCounts[position.id] || 0;
              // For totals, always use all candidates (not filtered) so percentages are correct
              const posTotal = allPosCandidates.reduce((sum, c) => sum + c.votes, 0);
              const posDenominator = posTotal + abstainCount || 1;
              const maxVotes = Math.max(allPosCandidates[0]?.votes || 0, abstainCount, 1);
              const abstainPct = (abstainCount / posDenominator) * 100;

              // When filtered and no candidates match, skip rendering this position
              if (selectedCourse && posCandidates.length === 0) return null;

              return (
                <div key={position.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#9B7248]" />
                      <h2 className="font-bold text-gray-900">{position.name}</h2>
                      {selectedCourse && (
                        <span className="text-xs bg-[#F0E6D6] text-[#7C5C3A] px-2 py-0.5 rounded-full font-medium">
                          {posCandidates.length} from {selectedCourse}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {posTotal} vote{posTotal !== 1 ? 's' : ''} total
                      </span>
                      {abstainCount > 0 && !selectedCourse && (
                        <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                          {abstainCount} abstain{abstainCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    {posCandidates.map((candidate, idx) => {
                      // Rank is based on full list, not filtered
                      const globalRank = allPosCandidates.findIndex(c => c.id === candidate.id);
                      const isLeader = globalRank === 0 && candidate.votes > 0;
                      const pct = posDenominator > 0 ? (candidate.votes / posDenominator) * 100 : 0;
                      const barWidth = maxVotes > 0 ? (candidate.votes / maxVotes) * 100 : 0;
                      return (
                        <div key={candidate.id} className={`p-4 rounded-xl border transition-colors ${isLeader ? 'border-amber-200 bg-amber-50/60' : 'border-gray-100 bg-gray-50/50'}`}>
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {isLeader && <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                              <div className="flex items-center gap-2.5 min-w-0">
                                {candidate.image_url && (
                                  <img src={candidate.image_url} alt={candidate.full_name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-gray-200" />
                                )}
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-900 text-sm truncate">{candidate.full_name}</p>
                                  <p className="text-xs text-gray-400">{candidate.course} · Year {candidate.year_level}</p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              <p className="text-xl font-black text-gray-900 leading-none">{candidate.votes}</p>
                              <p className="text-xs text-gray-400">{pct.toFixed(1)}%</p>
                            </div>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${isLeader ? 'bg-amber-400' : 'bg-gray-300'}`} style={{ width: `${barWidth}%` }} />
                          </div>
                        </div>
                      );
                    })}

                    {/* Abstain row — only show when not filtering by course */}
                    {!selectedCourse && votesCast > 0 && (
                      <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/40">
                        <div className="flex items-center justify-between mb-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-orange-300 shrink-0" />
                            <p className="font-semibold text-orange-700 text-sm">Abstain</p>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p className="text-xl font-black text-orange-600 leading-none">{abstainCount}</p>
                            <p className="text-xs text-orange-400">{abstainPct.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-orange-300 transition-all duration-700" style={{ width: `${maxVotes > 0 ? (abstainCount / maxVotes) * 100 : 0}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: summary */}
        <div className="space-y-4">
          {/* Quick stats */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Snapshot</p>
            <div className="space-y-3">
              {[
                { label: 'Total Voters', value: totalVoters },
                { label: 'Votes Cast', value: votesCast },
                { label: 'Remaining', value: remaining },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-bold text-gray-900">{value}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Turnout</span>
                  <span className="text-sm font-bold text-gray-900">{turnoutPct.toFixed(1)}%</span>
                </div>
                {votesCast > 0 && positions.length > 0 && !selectedCourse && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-orange-500">Avg Abstain</span>
                    <span className="text-sm font-bold text-orange-600">{overallAbstainPct.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Per-program quick stats when a filter is active */}
          {selectedCourse && voterDemographics.length > 0 && (() => {
            const progData = voterDemographics.find(p => p.course === selectedCourse);
            if (!progData) return null;
            const pct = progData.total > 0 ? (progData.voted / progData.total) * 100 : 0;
            return (
              <div className="bg-[#F0E6D6] rounded-2xl p-5 border border-[#E8D8C2]">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#9B7248] mb-3">{selectedCourse} Turnout</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#7C5C3A]">Total Enrolled</span>
                    <span className="text-sm font-bold text-[#4A3520]">{progData.total}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#7C5C3A]">Voted</span>
                    <span className="text-sm font-bold text-[#4A3520]">{progData.voted}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-red-600">Pending</span>
                    <span className="text-sm font-bold text-red-700">{progData.total - progData.voted}</span>
                  </div>
                  <div className="h-2 bg-[#E8D8C2] rounded-full overflow-hidden mt-1">
                    <div className={`h-full rounded-full transition-all duration-700 ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <p className="text-xs font-bold text-[#7C5C3A] text-right">{pct.toFixed(1)}% turnout</p>
                </div>
                {/* Year breakdown in sidebar */}
                {progData.years.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#E8D8C2] space-y-2">
                    <p className="text-xs font-semibold text-[#9B7248] uppercase tracking-wider mb-2">By Year Level</p>
                    {progData.years.map((y: any) => {
                      const yPct = y.total > 0 ? (y.voted / y.total) * 100 : 0;
                      return (
                        <div key={y.year} className="flex items-center justify-between text-xs">
                          <span className="text-[#7C5C3A] font-medium">{y.year}</span>
                          <span className="text-[#4A3520] font-bold">{y.voted}/{y.total}</span>
                          <span className={`font-semibold ${yPct >= 80 ? 'text-green-700' : yPct >= 50 ? 'text-amber-700' : 'text-red-600'}`}>
                            {yPct.toFixed(0)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Current leaders */}
          {leaders.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" /> Current Leaders
                </p>
              </div>
              <div className="p-5 space-y-3">
                {leaders.map(({ position, leader }) => (
                  <div key={position.id}>
                    <p className="text-xs text-gray-400 mb-0.5">{position.name}</p>
                    <p className="text-sm font-semibold text-gray-900">{leader?.full_name}</p>
                    <p className="text-xs text-[#9B7248] font-medium">{leader?.course} · Year {leader?.year_level}</p>
                    <p className="text-xs text-amber-600 font-medium">{leader?.votes} vote{leader?.votes !== 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeElection?.status === 'archived' ? (
            <div className="bg-[#0F1117] rounded-2xl p-6 text-white border border-gray-800 shadow-xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 4h14a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zm0 8h14v8a2 2 0 01-2 2H7a2 2 0 01-2-2v-8zm5 3v2h4v-2h-4z" />
                </svg>
                <p className="text-sm font-bold uppercase tracking-wider text-yellow-500">Archived Election</p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                  <span className="text-xs text-white/50">Archived On</span>
                  <span className="text-sm font-medium text-white/90">
                    {electionSettings?.summary_data?.archived_at ? new Date(electionSettings.summary_data.archived_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                  <span className="text-xs text-white/50">Election Date</span>
                  <span className="text-sm font-medium text-white/90">
                    {activeElection.election_date ? new Date(activeElection.election_date).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                  <span className="text-xs text-white/50">Started</span>
                  <span className="text-sm font-medium text-white/90">
                    {activeElection.voting_start ? new Date(activeElection.voting_start).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/50">Ended</span>
                  <span className="text-sm font-medium text-white/90">
                    {activeElection.voting_end ? new Date(activeElection.voting_end).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#0F1117] rounded-2xl p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">Live Mode</p>
              <p className="text-sm text-white/70 leading-relaxed">
                This page refreshes automatically every 10 seconds. Click Refresh for an immediate update.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
