'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Users, Vote, TrendingUp, Calendar, Clock, Activity, CheckCircle, XCircle, Archive, AlertTriangle, Play, Square, Eye, EyeOff, Wifi, Plus } from 'lucide-react';
import { useElection } from '@/components/ElectionContext';
import AdminResultsPage from './results/page';
import { DashboardSkeleton } from '@/components/AdminSkeletons';
import { useCountdownRefresh } from '@/lib/useCountdownRefresh';

interface ElectionSettings {
  id: string;
  election_name: string;
  election_date: string;
  voting_start: string;
  voting_end: string;
  is_active: boolean;
  results_visible: boolean;
  status: string;
}

type ConfirmAction = {
  title: string;
  description: string;
  warning?: string;
  confirmLabel: string;
  confirmClass: string;
  icon: React.ReactNode;
  onConfirm: () => Promise<void>;
} | null;

export default function AdminDashboard() {
  const { activeElection, elections, refreshElections, isLoading: electionsLoading } = useElection();

  const [stats, setStats] = useState({ totalVoters: 0, votesCast: 0, turnout: 0 });
  const [settings, setSettings] = useState<ElectionSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Confirmation modal state
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // Archive modal
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveText, setArchiveText] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);

  const fetchStats = useCallback(async (silent = false) => {
    if (!activeElection) return; // context still settling — do not clear loading state
    const token = localStorage.getItem('admin_session');
    if (!silent) {
      setIsSyncing(true);
      setIsLoading(true);
    }
    try {
      const res = await fetch(`/api/admin/stats?election_id=${activeElection.id}&_t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.status === 401) { localStorage.removeItem('admin_session'); window.location.href = '/admin/login'; return; }
      const data = await res.json();
      if (res.ok) {
        setStats({ totalVoters: data.totalVoters, votesCast: data.votesCast, turnout: data.turnout });
        setSettings({
          ...data.settings,
          election_name: data.settings?.name,
          election_date: data.settings?.election_date,
          is_active: data.settings?.status === 'active',
          status: data.settings?.status,
        });
        setLastUpdated(new Date());
      }
    } catch (e) { console.error(e); }
    finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, [activeElection]);

  // Reset loading state immediately when election changes
  useEffect(() => {
    setIsLoading(true);
  }, [activeElection?.id]);

  // Initial load
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Safety valve: if elections are fully loaded but none exist, stop the skeleton
  useEffect(() => {
    if (!electionsLoading && elections.length === 0) {
      setIsLoading(false);
    }
  }, [electionsLoading, elections.length]);

  // 10-second wall-clock-aligned countdown refresh
  const { secondsLeft, triggerRefresh } = useCountdownRefresh({
    onRefresh: () => fetchStats(true),
    intervalSeconds: 10,
    enabled: !isLoading,
  });

  const patchElection = async (updates: Record<string, unknown>) => {
    if (!activeElection) return;
    const token = localStorage.getItem('admin_session');

    // Optimistic update so the UI reflects the change immediately
    setSettings(prev => {
      if (!prev) return prev;
      const optimistic = { ...prev, ...updates } as ElectionSettings;
      if ('status' in updates) {
        optimistic.is_active = updates.status === 'active';
        optimistic.status = updates.status as string;
      }
      return optimistic;
    });

    const res = await fetch(`/api/admin/elections/${activeElection.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      // Roll back optimistic update on failure
      await fetchStats(true);
      throw new Error('Update failed');
    }
    await fetchStats(true);
  };

  const triggerConfirm = (action: ConfirmAction) => setConfirmAction(action);

  const executeConfirm = async () => {
    if (!confirmAction) return;
    setIsConfirmLoading(true);
    try {
      await confirmAction.onConfirm();
      setConfirmAction(null);
    } catch {
      alert('Action failed. Please try again.');
    } finally {
      setIsConfirmLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!activeElection) return;
    setIsArchiving(true);
    const token = localStorage.getItem('admin_session');
    try {
      const res = await fetch(`/api/admin/elections/${activeElection.id}/archive`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setShowArchiveModal(false);
        setArchiveText('');
        await refreshElections();
        await fetchStats(true);
      } else {
        alert(`Archive failed: ${data.error}`);
      }
    } catch {
      alert('Archive failed.');
    } finally {
      setIsArchiving(false);
    }
  };

  if (isLoading) return <DashboardSkeleton />;

  // No elections exist yet — prompt admin to create one
  if (!electionsLoading && elections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#F0E6D6] flex items-center justify-center">
          <Calendar className="w-8 h-8 text-[#9B7248]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">No Elections Yet</h2>
          <p className="text-gray-400 text-sm max-w-sm">
            Create your first election to get started. You can configure positions, candidates, and voters after.
          </p>
        </div>
        <a
          href="/admin/config"
          className="inline-flex items-center gap-2 bg-[#0F1117] text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create an Election
        </a>
      </div>
    );
  }

  const isArchived = settings?.status === 'archived';

  if (isArchived) {
    return <AdminResultsPage />;
  }

  const remaining = stats.totalVoters - stats.votesCast;
  const isCompleted = settings?.status === 'completed';
  const isPending = settings?.status === 'pending';

  const statusConfig = {
    active: { label: 'Live', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', pulse: true },
    completed: { label: 'Ended', dot: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200', pulse: false },
    archived: { label: 'Archived', dot: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700 border-purple-200', pulse: false },
    pending: { label: 'Pending', dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-600 border-gray-200', pulse: false },
  };
  const sc = statusConfig[settings?.status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <div className="space-y-6 pb-8">
      {/* ── Confirm Modal ─────────────────────────────────────────────────── */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  {confirmAction.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{confirmAction.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{confirmAction.description}</p>
                </div>
              </div>
              {confirmAction.warning && (
                <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">{confirmAction.warning}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={isConfirmLoading}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirm}
                disabled={isConfirmLoading}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${confirmAction.confirmClass}`}
              >
                {isConfirmLoading
                  ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Working...</>
                  : confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Archive Modal ──────────────────────────────────────────────────── */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Archive className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Archive & Purge Data</h3>
                  <p className="text-sm text-red-100 mt-0.5">This action cannot be undone</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                {[
                  `${stats.totalVoters} voter records`,
                  `${stats.votesCast} individual votes`,
                  'All candidate records',
                  'All positions & partylists',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    {item} will be <span className="font-semibold text-red-600">permanently deleted</span>
                  </div>
                ))}
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-700">A full summary (winners, vote counts, turnout) will be permanently saved before deletion.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                  Type <span className="text-red-600">ARCHIVE</span> to confirm
                </label>
                <input
                  type="text"
                  value={archiveText}
                  onChange={e => setArchiveText(e.target.value)}
                  placeholder="ARCHIVE"
                  className="w-full border-2 border-gray-200 focus:border-red-400 rounded-xl px-4 py-3 text-sm font-mono font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-red-100 transition-all"
                />
              </div>
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button
                onClick={() => { setShowArchiveModal(false); setArchiveText(''); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={archiveText !== 'ARCHIVE' || isArchiving}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-sm font-bold text-white transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isArchiving
                  ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Archiving...</>
                  : <><Archive className="w-4 h-4" /> Archive Now</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            <p className="text-xs text-gray-400">
              {isSyncing ? 'Syncing...' : lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
            </p>
            <Wifi className="w-3 h-3 text-gray-300" />
            <p className="text-xs text-gray-300">Refreshes in {secondsLeft}s</p>
          </div>
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${sc.badge}`}>
          <span className={`w-2 h-2 rounded-full ${sc.dot} ${sc.pulse ? 'animate-pulse' : ''}`} />
          {sc.label}
        </div>
      </div>

      {/* ── Archived Banner ────────────────────────────────────────────────── */}
      {isArchived && (
        <div className="flex items-center gap-3 px-5 py-4 bg-purple-50 border border-purple-200 rounded-2xl">
          <Archive className="w-5 h-5 text-purple-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-purple-800">This election has been archived</p>
            <p className="text-xs text-purple-600 mt-0.5">All raw data was purged. Only the summary is stored.</p>
          </div>
        </div>
      )}

      {/* ── Stat Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Registered Voters', value: stats.totalVoters, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Votes Cast', value: stats.votesCast, icon: Vote, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Turnout', value: `${stats.turnout.toFixed(1)}%`, icon: TrendingUp, color: 'text-[#9B7248]', bg: 'bg-amber-50', border: 'border-amber-100' },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`bg-white rounded-2xl border ${border} p-5 shadow-sm`}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
              <div className={`${bg} w-9 h-9 rounded-xl flex items-center justify-center`}>
                <Icon className={`w-4.5 h-4.5 ${color}`} />
              </div>
            </div>
            <p className="text-4xl font-black text-gray-900 tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Main two-column ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-5">
        {/* LEFT col (3/5) */}
        <div className="col-span-3 space-y-5">
          {/* Turnout bar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-gray-800">Participation Progress</p>
              <span className="text-sm font-bold text-[#9B7248]">{stats.turnout.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${Math.min(stats.turnout, 100)}%`,
                  background: 'linear-gradient(90deg, #9B7248, #C4993A)',
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span className="font-medium">{stats.votesCast} voted</span>
              <span>{remaining} remaining</span>
            </div>
          </div>

          {/* Election Info Card */}
          {settings && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-sm">Election Information</h2>
              </div>
              <div className="p-6 grid grid-cols-3 gap-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Election Name</p>
                  <p className="text-gray-900 font-bold text-sm">{settings.election_name || '—'}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                    <Calendar className="w-3 h-3" /> Scheduled Date
                  </div>
                  <p className="text-gray-900 font-bold text-sm">
                    {settings.election_date ? new Date(settings.election_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                    <Clock className="w-3 h-3" /> Voting Window
                  </div>
                  {settings.voting_start ? (
                    <>
                      <p className="text-gray-900 text-xs font-semibold">{new Date(settings.voting_start).toLocaleString()}</p>
                      <p className="text-gray-400 text-xs mt-0.5">to {settings.voting_end ? new Date(settings.voting_end).toLocaleString() : 'ongoing'}</p>
                    </>
                  ) : <p className="text-gray-400 text-sm">Not started</p>}
                </div>
              </div>
              <div className="border-t border-gray-100 px-6 py-3 bg-gray-50/50 flex justify-between">
                {[
                  { label: 'Not Yet Voted', value: remaining },
                  { label: 'Voted', value: stats.votesCast },
                  { label: 'Total', value: stats.totalVoters },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                    <p className="text-xl font-black text-gray-900 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT col (2/5) */}
        <div className="col-span-2 space-y-4">
          {/* Controls Card */}
          {!isArchived && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-gray-400" /> Election Controls
                </p>
              </div>
              <div className="p-4 space-y-3">

                {/* Voting control */}
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Voting</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {settings?.is_active ? '🟢 Open — accepting ballots' : isCompleted ? '🔴 Ended' : '⚪ Not started'}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${sc.badge}`}>
                      {sc.label}
                    </span>
                  </div>
                  {!isCompleted && (
                    <div className="p-3 flex gap-2">
                      <button
                        onClick={() => triggerConfirm({
                          title: 'Start Voting?',
                          description: `This will open the election and allow all registered voters to cast their ballots immediately.`,
                          warning: 'Make sure all candidates, positions, and voters are fully configured before starting.',
                          confirmLabel: 'Start Voting',
                          confirmClass: 'bg-emerald-600 hover:bg-emerald-700',
                          icon: <Play className="w-5 h-5 text-emerald-600" />,
                          onConfirm: () => patchElection({ status: 'active', voting_start: new Date().toISOString() }),
                        })}
                        disabled={settings?.is_active || isConfirmLoading}
                        className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center gap-1.5"
                      >
                        {isConfirmLoading && !settings?.is_active
                          ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Starting...</>
                          : <><Play className="w-3.5 h-3.5" /> Start</>
                        }
                      </button>
                      <button
                        onClick={() => triggerConfirm({
                          title: 'End Voting?',
                          description: 'This will immediately close ballot submission. No further votes will be accepted.',
                          warning: 'Make sure all votes have been cast. Ending is permanent — voters who haven\'t voted yet will not be able to do so.',
                          confirmLabel: 'End Voting',
                          confirmClass: 'bg-red-600 hover:bg-red-700',
                          icon: <Square className="w-5 h-5 text-red-600" />,
                          onConfirm: () => patchElection({ status: 'completed', voting_end: new Date().toISOString() }),
                        })}
                        disabled={!settings?.is_active || isConfirmLoading}
                        className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-red-600 hover:bg-red-700 active:scale-95 text-white flex items-center justify-center gap-1.5"
                      >
                        {isConfirmLoading && settings?.is_active
                          ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Ending...</>
                          : <><Square className="w-3.5 h-3.5" /> End</>
                        }
                      </button>
                    </div>
                  )}
                  {isCompleted && (
                    <div className="px-3 py-3 text-center text-xs text-gray-400 bg-orange-50 border-t border-orange-100">
                      Election ended · Voting is closed
                    </div>
                  )}
                </div>

                {/* Results visibility */}
                <div className="rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Results</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{settings?.results_visible ? 'Visible to voters' : 'Hidden from voters'}</p>
                  </div>
                  <button
                    onClick={() => triggerConfirm({
                      title: settings?.results_visible ? 'Hide Results?' : 'Publish Results?',
                      description: settings?.results_visible
                        ? 'Results will no longer be visible to voters on the public page.'
                        : 'All voters will be able to see the live vote tally on the public results page.',
                      confirmLabel: settings?.results_visible ? 'Hide Results' : 'Publish Results',
                      confirmClass: settings?.results_visible ? 'bg-gray-600 hover:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700',
                      icon: settings?.results_visible
                        ? <EyeOff className="w-5 h-5 text-gray-500" />
                        : <Eye className="w-5 h-5 text-blue-600" />,
                      onConfirm: () => patchElection({ results_visible: !settings?.results_visible }),
                    })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 ${settings?.results_visible ? 'bg-blue-500' : 'bg-gray-300'}`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings?.results_visible ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Archive section */}
                {isCompleted && (
                  <div className="rounded-xl border-2 border-dashed border-red-200 bg-red-50 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <Archive className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-red-800">Archive & Purge Data</p>
                        <p className="text-[11px] text-red-600 mt-0.5">
                          Saves a permanent summary and deletes all raw voter/vote/candidate data.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowArchiveModal(true)}
                      className="w-full py-2.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 active:scale-95 text-white transition-all flex items-center justify-center gap-1.5"
                    >
                      <Archive className="w-3.5 h-3.5" /> Archive & Purge Data
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-800">Quick Stats</p>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { label: 'Status', value: sc.label, highlight: true },
                { label: 'Results', value: settings?.results_visible ? 'Public' : 'Hidden', highlight: false },
                { label: 'Voted', value: stats.votesCast, highlight: false },
                { label: 'Remaining', value: remaining, highlight: false },
                { label: 'Turnout', value: `${stats.turnout.toFixed(1)}%`, highlight: false },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className={`text-sm font-bold ${highlight ? '' : 'text-gray-900'}`}>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
