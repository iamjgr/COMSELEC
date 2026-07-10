'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Download, CheckCircle2, Search, X, UserCheck, UserX, MoreHorizontal, RefreshCw, Trash2, Pencil, KeyRound, Calendar } from 'lucide-react';
import QRCode from 'qrcode';
import { useElection } from '@/components/ElectionContext';
import { VoterTableSkeleton } from '@/components/AdminSkeletons';
import { useCountdownRefresh } from '@/lib/useCountdownRefresh';

function VoterActionsDialog({ voter, onClose, onEdit, onDelete, onResetPin, onDownloadQR }: {
  voter: any;
  onClose: () => void;
  onEdit: (v: any) => void;
  onDelete: (v: any) => void;
  onResetPin: (v: any) => void;
  onDownloadQR: (v: any) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Voter info header */}
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-gray-900">{voter.full_name}</p>
              <p className="text-xs font-mono text-gray-400 mt-0.5">{voter.student_id}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  voter.has_voted ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'
                }`}>
                  {voter.has_voted && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  {voter.has_voted ? 'Voted' : 'Pending'}
                </span>
                <span className="text-xs text-gray-400">{voter.course} · Year {voter.year_level}</span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="p-3 space-y-1">
          <button
            onClick={() => { onClose(); onEdit(voter); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
              <Pencil className="w-3.5 h-3.5 text-gray-500" />
            </div>
            Edit voter info
          </button>
          <button
            onClick={() => { onClose(); onResetPin(voter); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 rounded-xl transition-colors"
          >
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
              <KeyRound className="w-3.5 h-3.5 text-blue-500" />
            </div>
            Reset PIN
          </button>
          <button
            onClick={() => { onClose(); onDownloadQR(voter); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-purple-50 rounded-xl transition-colors"
          >
            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center shrink-0">
              <Download className="w-3.5 h-3.5 text-purple-500" />
            </div>
            Download QR Code
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={() => { onClose(); onDelete(voter); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </div>
            Delete voter
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VotersPage() {
  const { activeElection, elections, isLoading: electionsLoading } = useElection();
  
  const [voters, setVoters] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showActionsDialog, setShowActionsDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const [selectedVoter, setSelectedVoter] = useState<any>(null);
  const [newVoter, setNewVoter] = useState({ first_name: '', middle_name: '', last_name: '', course: '', year_level: '' });
  const [editVoter, setEditVoter] = useState({ first_name: '', middle_name: '', last_name: '', course: '', year_level: '' });
  const [generatedData, setGeneratedData] = useState<{ pin: string; qr_token: string; dataUrl: string; student_id: string } | null>(null);
  const [resetPin, setResetPin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchVoters = useCallback(async (silent = false) => {
    if (electionsLoading || !activeElection) return; // wait for context to settle
    if (!silent) setIsLoading(true);
    try {
      const token = localStorage.getItem('admin_session');
      const [votersRes, coursesRes] = await Promise.all([
        fetch(`/api/admin/voters?election_id=${activeElection.id}&_t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' }),
        fetch(`/api/admin/courses?_t=${Date.now()}`, { headers: { 'Authorization': `Bearer ${token}` }, cache: 'no-store' })
      ]);
      
      if (votersRes.status === 401) { localStorage.removeItem('admin_session'); window.location.href = '/admin/login'; return; }
      
      const votersData = await votersRes.json();
      const coursesData = await coursesRes.json();
      
      if (votersRes.ok && votersData.voters) setVoters(votersData.voters);
      if (coursesRes.ok && coursesData.courses) setCourses(coursesData.courses);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, [activeElection]);

  // Reset loading state immediately when election changes
  useEffect(() => {
    setIsLoading(true);
  }, [activeElection?.id]);

  useEffect(() => {
    if (electionsLoading) return; // context not ready yet
    if (activeElection) {
      fetchVoters();
    } else if (elections.length === 0) {
      setIsLoading(false);
    }
  }, [activeElection, fetchVoters, electionsLoading, elections.length]);

  // 10-second countdown refresh (voters page uses 15s — slightly slower since
  // new voters appear instantly via optimistic update on add)
  const { secondsLeft, triggerRefresh } = useCountdownRefresh({
    onRefresh: () => fetchVoters(true),
    intervalSeconds: 15,
    enabled: !isLoading && !!activeElection,
  });

  const token = () => localStorage.getItem('admin_session');

  // --- ADD ---
  const handleAddVoter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeElection) return;
    setIsSubmitting(true); setError(null);
    const full_name = `${newVoter.first_name} ${newVoter.middle_name ? newVoter.middle_name + ' ' : ''}${newVoter.last_name}`.trim();
    try {
      const res = await fetch('/api/admin/add-voter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
        body: JSON.stringify({ ...newVoter, full_name, election_id: activeElection.id })
      });
      if (res.status === 401) { localStorage.removeItem('admin_session'); window.location.href = '/admin/login'; return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const dataUrl = await QRCode.toDataURL(data.qr_token, { width: 400, margin: 2, color: { dark: '#0F1117', light: '#ffffff' } });
      setGeneratedData({ pin: data.pin, qr_token: data.qr_token, dataUrl, student_id: data.voter?.student_id || '' });
      setShowAddModal(false); setShowSuccessModal(true);
      setNewVoter({ first_name: '', middle_name: '', last_name: '', course: '', year_level: '' });
      // Optimistically prepend the new voter so it appears instantly without
      // waiting for the re-fetch to win the race against the Supabase write.
      if (data.voter) setVoters(prev => [data.voter, ...prev]);
      // Background sync in case anything differs (e.g. server-computed fields)
      setTimeout(() => fetchVoters(true), 1500);
    } catch { setError('Something went wrong. Please try again.'); }
    finally { setIsSubmitting(false); }
  };

  // --- EDIT ---
  const openEdit = (voter: any) => {
    setSelectedVoter(voter);
    // Some older records may only have full_name; split it as a fallback
    const parts = (voter.full_name || '').trim().split(' ');
    const fallbackFirst = parts[0] || '';
    const fallbackLast = parts.length > 1 ? parts[parts.length - 1] : '';
    const fallbackMiddle = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';

    setEditVoter({
      first_name: voter.first_name || fallbackFirst,
      middle_name: voter.middle_name || fallbackMiddle,
      last_name: voter.last_name || fallbackLast,
      course: voter.course || '',
      year_level: voter.year_level || '',
    });
    setError(null);
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true); setError(null);
    try {
      const res = await fetch('/api/admin/manage-voter', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
        body: JSON.stringify({ voter_id: selectedVoter.id, election_id: activeElection?.id, ...editVoter })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowEditModal(false); fetchVoters(true);
    } catch { setError('Failed to update voter.'); }
    finally { setIsSubmitting(false); }
  };

  // --- DELETE ---
  const openDelete = (voter: any) => { setSelectedVoter(voter); setShowDeleteModal(true); };
  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await fetch('/api/admin/manage-voter', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
        body: JSON.stringify({ voter_id: selectedVoter.id, election_id: activeElection?.id })
      });
      setShowDeleteModal(false); fetchVoters(true);
    } catch { console.error('Delete failed'); }
    finally { setIsSubmitting(false); }
  };

  // --- RESET PIN ---
  const openResetPin = (voter: any) => { setSelectedVoter(voter); setResetPin(null); setShowResetModal(true); };
  const handleResetPin = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
        body: JSON.stringify({ voter_id: selectedVoter.id, election_id: activeElection?.id })
      });
      const data = await res.json();
      if (res.ok) setResetPin(data.pin);
    } catch { console.error('Reset PIN failed'); }
    finally { setIsSubmitting(false); }
  };

  // --- DOWNLOAD QR ---
  const handleDownloadQR = async (voter: any) => {
    if (!voter.qr_token) {
      alert("This voter doesn't have a QR token.");
      return;
    }
    try {
      const dataUrl = await QRCode.toDataURL(voter.qr_token, { width: 400, margin: 2, color: { dark: '#0F1117', light: '#ffffff' } });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `qr-${voter.student_id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to generate QR', err);
      alert('Failed to generate QR code.');
    }
  };

  const filteredVoters = voters.filter(v =>
    v.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.student_id?.toLowerCase().includes(search.toLowerCase()) ||
    v.course?.toLowerCase().includes(search.toLowerCase())
  );

  const voted = voters.filter(v => v.has_voted).length;
  const pending = voters.length - voted;
  const turnout = voters.length > 0 ? (voted / voters.length) * 100 : 0;

  const YEARS = ['1', '2', '3', '4', '5'];
  const YEAR_LABELS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#9B7248] focus:ring-2 focus:ring-[#9B7248]/10 transition-all";

  // No elections — prompt to create one
  if (!electionsLoading && elections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#F0E6D6] flex items-center justify-center">
          <Calendar className="w-8 h-8 text-[#9B7248]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">No Elections Yet</h2>
          <p className="text-gray-400 text-sm max-w-sm">Create an election first before registering voters.</p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Voters</h1>
          <p className="text-sm text-gray-400 mt-1">{voters.length} registered · {voted} voted · {pending} pending</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={triggerRefresh} className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 bg-white px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh <span className="text-gray-400 text-xs tabular-nums">({secondsLeft}s)</span>
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-[#0F1117] text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-gray-800 transition-colors">
            <Plus className="w-4 h-4" /> Register Voter
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-3 gap-5">
        {/* Main table */}
        <div className="col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3 rounded-t-2xl">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input type="text" placeholder="Search by name, ID, or course..." value={search} onChange={e => setSearch(e.target.value)}
                className="flex-1 text-sm text-gray-900 placeholder-gray-400 bg-transparent focus:outline-none" />
              {search && <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
            </div>

            <div className="overflow-x-auto rounded-b-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Voter ID</th>
                    <th className="px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Course / Year</th>
                    <th className="px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    <VoterTableSkeleton />
                  ) : filteredVoters.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-sm">
                      {search ? `No results for "${search}"` : 'No voters registered yet.'}
                    </td></tr>
                  ) : (
                    filteredVoters.map(voter => (
                      <tr key={voter.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-mono text-[11px] text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{voter.student_id}</span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <p className="text-sm font-semibold text-gray-900">{voter.full_name}</p>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-500">
                          {voter.course} · Year {voter.year_level}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${voter.has_voted ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                            {voter.has_voted && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                            {voter.has_voted ? 'Voted' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          <button
                            onClick={() => { setSelectedVoter(voter); setShowActionsDialog(true); }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Turnout</p>
            <p className="text-4xl font-black text-gray-900 tracking-tight mb-1">{turnout.toFixed(1)}%</p>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-3 mb-4">
              <div className="h-full bg-gradient-to-r from-[#9B7248] to-[#C4993A] rounded-full transition-all duration-700" style={{ width: `${Math.min(turnout, 100)}%` }} />
            </div>
            <div className="space-y-2 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-gray-500"><UserCheck className="w-4 h-4 text-emerald-500" /> Voted</span>
                <span className="text-sm font-bold text-gray-900">{voted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-gray-500"><UserX className="w-4 h-4 text-gray-400" /> Pending</span>
                <span className="text-sm font-bold text-gray-900">{pending}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-sm text-gray-500">Total</span>
                <span className="text-sm font-bold text-gray-900">{voters.length}</span>
              </div>
            </div>
          </div>

          {voters.length > 0 && (() => {
            const courses: Record<string, number> = {};
            voters.forEach(v => { courses[v.course] = (courses[v.course] || 0) + 1; });
            return (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">By Course</p>
                <div className="space-y-2.5">
                  {Object.entries(courses).sort((a, b) => b[1] - a[1]).map(([course, count]) => (
                    <div key={course} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 font-medium">{course}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#9B7248] rounded-full" style={{ width: `${(count / voters.length) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 w-4 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ─── MODALS ─── */}

      {/* Actions Dialog */}
      {showActionsDialog && selectedVoter && (
        <VoterActionsDialog
          voter={selectedVoter}
          onClose={() => setShowActionsDialog(false)}
          onEdit={openEdit}
          onDelete={openDelete}
          onResetPin={openResetPin}
          onDownloadQR={handleDownloadQR}
        />
      )}

      {/* Register Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Register Voter</h3>
                <p className="text-xs text-gray-400 mt-0.5">A voter ID will be auto-generated</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">{error}</div>}
            <form onSubmit={handleAddVoter} className="space-y-4">
              {(['first_name', 'middle_name', 'last_name'] as const).map((key) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {key === 'first_name' ? 'First Name' : key === 'middle_name' ? <>Middle Name <span className="normal-case font-normal text-gray-400">(optional)</span></> : 'Last Name'}
                  </label>
                  <input type="text" required={key !== 'middle_name'} value={newVoter[key]}
                    onChange={e => setNewVoter({ ...newVoter, [key]: e.target.value })} className={inputClass} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Course</label>
                  <select required value={newVoter.course} onChange={e => setNewVoter({ ...newVoter, course: e.target.value })} className={`${inputClass} bg-white`}>
                    <option value="" disabled>Select</option>
                    {courses.map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Year Level</label>
                  <select required value={newVoter.year_level} onChange={e => setNewVoter({ ...newVoter, year_level: e.target.value })} className={`${inputClass} bg-white`}>
                    <option value="" disabled>Select</option>
                    {YEARS.map((y, i) => <option key={y} value={y}>{YEAR_LABELS[i]}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-semibold bg-[#0F1117] text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
                  {isSubmitting ? 'Registering...' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success / QR Modal */}
      {showSuccessModal && generatedData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Voter Registered</h3>
            <p className="text-xs text-gray-400 mb-6">Record the PIN now — it cannot be recovered later.</p>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-4 text-left space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Voter ID</span>
                <span className="font-mono text-xs font-bold text-gray-700">{generatedData.student_id}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">PIN</span>
                <span className="font-mono text-3xl font-black text-gray-900 tracking-[0.2em]">{generatedData.pin}</span>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={generatedData.dataUrl} alt="QR Code" className="w-44 h-44 mx-auto mb-6 rounded-xl border border-gray-100 shadow-sm" />
            <div className="space-y-2">
              <a href={generatedData.dataUrl} download={`qr-${generatedData.student_id}.png`}
                className="flex items-center justify-center gap-2 w-full bg-[#0F1117] text-white text-sm font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors">
                <Download className="w-4 h-4" /> Download QR Code
              </a>
              <button onClick={() => { setShowSuccessModal(false); setGeneratedData(null); }}
                className="w-full text-sm font-medium text-gray-500 hover:text-gray-800 py-2.5 rounded-xl hover:bg-gray-100 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedVoter && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Voter</h3>
                <p className="text-xs font-mono text-gray-400 mt-0.5">{selectedVoter.student_id}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">{error}</div>}
            <form onSubmit={handleEdit} className="space-y-4">
              {(['first_name', 'middle_name', 'last_name'] as const).map((key) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {key === 'first_name' ? 'First Name' : key === 'middle_name' ? <>Middle Name <span className="normal-case font-normal text-gray-400">(optional)</span></> : 'Last Name'}
                  </label>
                  <input type="text" required={key !== 'middle_name'} value={editVoter[key]}
                    onChange={e => setEditVoter({ ...editVoter, [key]: e.target.value })} className={inputClass} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Course</label>
                  <select required value={editVoter.course} onChange={e => setEditVoter({ ...editVoter, course: e.target.value })} className={`${inputClass} bg-white`}>
                    <option value="" disabled>Select</option>
                    {courses.map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Year Level</label>
                  <select required value={editVoter.year_level} onChange={e => setEditVoter({ ...editVoter, year_level: e.target.value })} className={`${inputClass} bg-white`}>
                    <option value="" disabled>Select</option>
                    {YEARS.map((y, i) => <option key={y} value={y}>{YEAR_LABELS[i]}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-semibold bg-[#0F1117] text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteModal && selectedVoter && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Delete Voter?</h3>
            <p className="text-sm text-gray-500 text-center mb-2">
              This will permanently remove <strong className="text-gray-800">{selectedVoter.full_name}</strong> from the system.
            </p>
            {selectedVoter.has_voted && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center mb-4">
                This voter has already cast a ballot. Their submitted votes will remain in the tally.
              </p>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={isSubmitting} className="flex-1 px-4 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors">
                {isSubmitting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset PIN Modal */}
      {showResetModal && selectedVoter && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Reset PIN</h3>
            <p className="text-sm text-gray-500 mb-6">
              Generate a new PIN for <strong className="text-gray-800">{selectedVoter.full_name}</strong>. The old PIN will immediately stop working.
            </p>

            {!resetPin ? (
              <div className="flex gap-3">
                <button onClick={() => setShowResetModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200">
                  Cancel
                </button>
                <button onClick={handleResetPin} disabled={isSubmitting} className="flex-1 px-4 py-2.5 text-sm font-semibold bg-[#0F1117] text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
                  {isSubmitting ? 'Generating...' : 'Generate New PIN'}
                </button>
              </div>
            ) : (
              <>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">New PIN</p>
                  <p className="font-mono text-4xl font-black text-gray-900 tracking-[0.25em]">{resetPin}</p>
                  <p className="text-xs text-gray-400 mt-3">Hand this PIN directly to the voter. It will not be shown again.</p>
                </div>
                <button onClick={() => { setShowResetModal(false); setResetPin(null); }}
                  className="w-full px-4 py-2.5 text-sm font-semibold bg-[#0F1117] text-white rounded-xl hover:bg-gray-800 transition-colors">
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
