'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserPlus, ChevronDown, ChevronUp, Edit3, Trash2 } from 'lucide-react';
import { useElection } from '@/components/ElectionContext';
import { CandidatesSkeleton } from '@/components/AdminSkeletons';
import { ImagePicker } from '@/components/ImagePicker';

const YEAR_LEVELS = ['1', '2', '3', '4', '5'];

const emptyCandidate = {
  first_name: '',
  middle_name: '',
  last_name: '',
  course: '',
  year_level: '',
  platform: '',
  partylist_id: ''
};

export default function CandidatesPage() {
  const { activeElection } = useElection();

  const [positions, setPositions] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [partylists, setPartylists] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);

  const [newCandidate, setNewCandidate] = useState(emptyCandidate);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePosition, setImagePosition] = useState<string>('center');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset loading state immediately when election changes
  useEffect(() => {
    setIsLoading(true);
  }, [activeElection?.id]);

  useEffect(() => {
    if (activeElection) fetchData();
  }, [activeElection]);

  const fetchData = async (silent = false) => {
    if (!activeElection) return;
    if (!silent) setIsLoading(true);
    const token = localStorage.getItem('admin_session');
    try {
      // Fetch core data and courses independently so a courses failure doesn't kill the rest
      const [posRes, candRes, partyRes] = await Promise.all([
        supabase.from('positions').select('*').eq('election_id', activeElection.id).order('order_index'),
        supabase.from('candidates').select('*').eq('election_id', activeElection.id).order('order_index'),
        supabase.from('partylists').select('*').eq('election_id', activeElection.id).order('name'),
      ]);

      if (posRes.data) {
        setPositions(posRes.data);
        const init: Record<string, boolean> = {};
        posRes.data.forEach((p: any) => { init[p.id] = true; });
        setExpanded(prev => ({ ...init, ...prev }));
      }
      if (candRes.data) setCandidates(candRes.data);
      if (partyRes.data) setPartylists(partyRes.data);

      // Courses fetch separately — failure here is non-fatal
      try {
        const coursesRes = await fetch('/api/admin/courses', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (coursesRes.ok) {
          const courseJson = await coursesRes.json();
          setCourses(courseJson.courses || []);
        }
      } catch (courseErr) {
        console.warn('Could not load courses:', courseErr);
      }
    } catch (err) {
      console.error('fetchData error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPositionId && !editingCandidateId) return;
    setIsSubmitting(true);
    const token = localStorage.getItem('admin_session');

    let imageUrl: string | null | undefined = undefined;
    if (imageFile) {
      const formData = new FormData();
      formData.append('image', imageFile);
      try {
        const uploadRes = await fetch('/api/admin/upload-image', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.url;
        }
      } catch (err) {
        console.error('Image upload failed', err);
      }
    }

    const platformArray = newCandidate.platform.split('\n').filter(p => p.trim() !== '');

    let saveOk = false;
    let saveError = '';

    try {
      let res: Response;
      if (editingCandidateId) {
        res = await fetch(`/api/admin/candidates/${editingCandidateId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            first_name: newCandidate.first_name,
            middle_name: newCandidate.middle_name || null,
            last_name: newCandidate.last_name,
            partylist_id: newCandidate.partylist_id || null,
            course: newCandidate.course,
            year_level: newCandidate.year_level,
            platform: platformArray,
            image_position: imagePosition,
            ...(imageUrl !== undefined ? { image_url: imageUrl } : {})
          })
        });
      } else {
        const positionCandidates = candidates.filter(c => c.position_id === selectedPositionId);
        res = await fetch('/api/admin/candidates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            position_id: selectedPositionId,
            first_name: newCandidate.first_name,
            middle_name: newCandidate.middle_name || null,
            last_name: newCandidate.last_name,
            partylist_id: newCandidate.partylist_id || null,
            course: newCandidate.course,
            year_level: newCandidate.year_level,
            platform: platformArray,
            order_index: positionCandidates.length + 1,
            election_id: activeElection?.id,
            image_url: imageUrl ?? null,
            image_position: imagePosition
          })
        });
      }

      if (res.ok) {
        saveOk = true;
      } else {
        const errData = await res.json().catch(() => ({}));
        saveError = errData.error || `Server error (${res.status})`;
      }
    } catch (err: any) {
      saveError = err?.message || 'Network error';
    }

    setIsSubmitting(false);

    if (!saveOk) {
      alert(`Failed to save candidate: ${saveError}\n\nIf this says "column does not exist", please run the migration: migrations/split_candidate_names.sql in your Supabase SQL editor.`);
      return;
    }

    setNewCandidate(emptyCandidate);
    setImageFile(null);
    setImagePreview(null);
    setImagePosition('center');
    setEditingCandidateId(null);
    setShowCandidateModal(false);
    fetchData(true);
  };

  const handleEditClick = (c: any) => {
    setSelectedPositionId(c.position_id);
    setEditingCandidateId(c.id);
    setNewCandidate({
      first_name: c.first_name || '',
      middle_name: c.middle_name || '',
      last_name: c.last_name || '',
      course: c.course || '',
      year_level: c.year_level || '',
      platform: c.platform ? c.platform.join('\n') : '',
      partylist_id: c.partylist_id || ''
    });
    setImagePreview(c.image_url || null);
    setImagePosition(c.image_position || 'center');
    setShowCandidateModal(true);
  };

  const handleDeleteCandidate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    const token = localStorage.getItem('admin_session');
    await fetch(`/api/admin/candidates/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchData(true);
  };

  const openAddModal = (positionId: string) => {
    setSelectedPositionId(positionId);
    setEditingCandidateId(null);
    setNewCandidate(emptyCandidate);
    setImageFile(null);
    setImagePreview(null);
    setImagePosition('center');
    setShowCandidateModal(true);
  };

  const closeModal = () => {
    setShowCandidateModal(false);
    setImageFile(null);
    setImagePreview(null);
    setImagePosition('center');
    setEditingCandidateId(null);
  };

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-[#9B7248] focus:ring-2 focus:ring-[#9B7248]/10 transition-all bg-white";

  if (isLoading) return <CandidatesSkeleton />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Positions & Candidates</h1>
          <p className="text-sm text-gray-400 mt-1">{positions.length} position{positions.length !== 1 ? 's' : ''} · {partylists.length} partylist{partylists.length !== 1 ? 's' : ''} · {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-3 gap-5">
        {/* Main: positions list */}
        <div className="col-span-2 space-y-4">
          {positions.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center shadow-sm">
              <p className="text-gray-400 text-sm">No positions added yet. Create one to get started.</p>
            </div>
          ) : (
            positions.map(position => {
              const posCandidates = candidates.filter(c => c.position_id === position.id);
              const isOpen = expanded[position.id];
              return (
                <div key={position.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div
                    className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50/70 transition-colors select-none"
                    onClick={() => setExpanded(prev => ({ ...prev, [position.id]: !prev[position.id] }))}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#9B7248]" />
                      <h2 className="font-bold text-gray-900">{position.name}</h2>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {posCandidates.length} candidate{posCandidates.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={e => { e.stopPropagation(); openAddModal(position.id); }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#7C5C3A] bg-[#F0E6D6] hover:bg-[#E8D8C2] px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Add Candidate
                      </button>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-gray-100 px-6 py-4">
                      {posCandidates.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">No candidates added yet.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {posCandidates.map((c, idx) => (
                            <div key={c.id} className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-gray-50 transition-colors group">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#9B7248]/20 to-[#7C5C3A]/10 text-[#7C5C3A] flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden relative">
                                {c.image_url ? (
                                  <img src={c.image_url} alt={c.full_name} className="w-full h-full object-cover" />
                                ) : (
                                  idx + 1
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 text-sm truncate">{c.full_name}</p>
                                <p className="text-xs text-gray-400">
                                  {c.course} · Year {c.year_level}
                                  {c.partylist_id && partylists.find(p => p.id === c.partylist_id) && (
                                    <span className="ml-1 text-[#9B7248]">({partylists.find(p => p.id === c.partylist_id)?.name})</span>
                                  )}
                                </p>
                              </div>
                              <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEditClick(c)} className="p-1.5 text-gray-400 hover:text-[#9B7248] rounded-md hover:bg-white border border-transparent hover:border-gray-200 transition-all"><Edit3 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDeleteCandidate(c.id, c.full_name)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-white border border-transparent hover:border-gray-200 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right: summary panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Ballot Summary</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total Positions</span>
                <span className="text-sm font-bold text-gray-900">{positions.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total Partylists</span>
                <span className="text-sm font-bold text-gray-900">{partylists.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total Candidates</span>
                <span className="text-sm font-bold text-gray-900">{candidates.length}</span>
              </div>
              <div className="pt-2 border-t border-gray-100 space-y-2">
                {positions.map(p => {
                  const count = candidates.filter(c => c.position_id === p.id).length;
                  return (
                    <div key={p.id} className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 truncate mr-2">{p.name}</span>
                      <span className="text-xs font-semibold text-gray-600 shrink-0 bg-gray-100 px-2 py-0.5 rounded-full">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-[#0F1117] rounded-2xl p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">Note</p>
            <p className="text-sm text-white/70 leading-relaxed">
              Candidates are displayed to voters in the order they were added. Create all positions first before adding candidates.
            </p>
          </div>
        </div>
      </div>

      {/* Candidate Modal */}
      {showCandidateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-1">{editingCandidateId ? 'Edit Candidate' : 'Add Candidate'}</h3>
            <p className="text-sm text-gray-400 mb-5">
              {editingCandidateId ? 'Editing in: ' : 'Adding to: '}<strong className="text-gray-700">{positions.find(p => p.id === selectedPositionId)?.name}</strong>
            </p>
            <form onSubmit={handleSaveCandidate} className="space-y-4">
              {/* Photo upload */}
              <ImagePicker
                imagePreview={imagePreview}
                imagePosition={imagePosition}
                onImageChange={(file, url) => {
                  setImageFile(file);
                  setImagePreview(url);
                }}
                onPositionChange={(pos) => setImagePosition(pos)}
              />

              {/* Name fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">First Name <span className="text-red-400">*</span></label>
                  <input required type="text" value={newCandidate.first_name}
                    onChange={e => setNewCandidate({ ...newCandidate, first_name: e.target.value })}
                    className={inputClass} placeholder="Juan" autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Middle Name <span className="text-gray-300 font-normal normal-case">(optional)</span></label>
                  <input type="text" value={newCandidate.middle_name}
                    onChange={e => setNewCandidate({ ...newCandidate, middle_name: e.target.value })}
                    className={inputClass} placeholder="Santos" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Last Name <span className="text-red-400">*</span></label>
                <input required type="text" value={newCandidate.last_name}
                  onChange={e => setNewCandidate({ ...newCandidate, last_name: e.target.value })}
                  className={inputClass} placeholder="Dela Cruz" />
              </div>

              {/* Partylist */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Partylist</label>
                <select value={newCandidate.partylist_id} onChange={e => setNewCandidate({ ...newCandidate, partylist_id: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Independent (No Partylist)</option>
                  {partylists.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Course and Year Level */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Course <span className="text-red-400">*</span></label>
                  <select required value={newCandidate.course} onChange={e => setNewCandidate({ ...newCandidate, course: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Select course...</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.code}>{c.code} – {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Year Level <span className="text-red-400">*</span></label>
                  <select required value={newCandidate.year_level} onChange={e => setNewCandidate({ ...newCandidate, year_level: e.target.value })}
                    className={inputClass}
                  >
                    <option value="">Select year...</option>
                    {YEAR_LEVELS.map(y => (
                      <option key={y} value={y}>Year {y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Platform */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Platform Points <span className="normal-case font-normal text-gray-400">(one per line)</span></label>
                <textarea rows={3} value={newCandidate.platform} onChange={e => setNewCandidate({ ...newCandidate, platform: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:border-[#9B7248] focus:ring-2 focus:ring-[#9B7248]/10 transition-all resize-none"
                  placeholder={'Free WiFi\nBetter Canteen'} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2.5 text-sm font-semibold bg-[#0F1117] text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
                  {isSubmitting ? 'Saving...' : 'Save Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
