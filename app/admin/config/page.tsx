'use client';

import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Settings, Users, Building, AlertTriangle, Calendar, X, Archive, BookOpen } from 'lucide-react';
import { useElection } from '@/components/ElectionContext';
import { ConfigSkeleton } from '@/components/AdminSkeletons';

export default function ConfigPage() {
  const { activeElection, elections, refreshElections } = useElection();
  
  const [activeTab, setActiveTab] = useState<'election' | 'courses' | 'setup'>('election');
  
  const [positions, setPositions] = useState<any[]>([]);
  const [partylists, setPartylists] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Position Modal
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [newPositionName, setNewPositionName] = useState('');
  const [newPositionMax, setNewPositionMax] = useState(1);

  // Partylist Modal
  const [showPartylistModal, setShowPartylistModal] = useState(false);
  const [editingPartylistId, setEditingPartylistId] = useState<string | null>(null);
  const [newPartylistName, setNewPartylistName] = useState('');
  const [newPartylistAcronym, setNewPartylistAcronym] = useState('');
  const [newPartylistColor, setNewPartylistColor] = useState('#9B7248');

  // Courses Modal
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');

  // Election Modal
  const [showElectionModal, setShowElectionModal] = useState(false);
  const [editingElectionId, setEditingElectionId] = useState<string | null>(null);
  const [newElectionName, setNewElectionName] = useState('');
  const [newElectionDate, setNewElectionDate] = useState('');

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
    
    // Fetch election-scoped data via admin API routes (service-key, bypasses RLS)
    const token = localStorage.getItem('admin_session');
    const [posRes, partyRes, coursesRes] = await Promise.all([
      fetch(`/api/admin/positions?election_id=${activeElection.id}&_t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      }),
      fetch(`/api/admin/partylists?election_id=${activeElection.id}&_t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      }),
      fetch(`/api/admin/courses?_t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      }),
    ]);
    
    if (posRes.ok) {
      const { positions } = await posRes.json();
      if (positions) setPositions(positions);
    }
    if (partyRes.ok) {
      const { partylists } = await partyRes.json();
      if (partylists) setPartylists(partylists);
    }
    if (coursesRes.ok) {
      const { courses } = await coursesRes.json();
      setCourses(courses || []);
    }
    
    setIsLoading(false);
  };

  const openEditPosition = (pos: any) => {
    setEditingPositionId(pos.id);
    setNewPositionName(pos.name);
    setNewPositionMax(pos.max_selections || 1);
    setShowPositionModal(true);
  };

  const handleSavePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const token = localStorage.getItem('admin_session');
    
    if (editingPositionId) {
      const res = await fetch(`/api/admin/positions/${editingPositionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newPositionName, max_selections: newPositionMax })
      });
      if (res.ok) {
        setShowPositionModal(false);
        fetchData(true);
      }
    } else {
      const res = await fetch('/api/admin/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newPositionName, order_index: positions.length + 1, max_selections: newPositionMax, election_id: activeElection?.id })
      });
      if (res.ok) {
        setShowPositionModal(false);
        fetchData(true);
      }
    }
    setIsSubmitting(false);
  };

  const handleDeletePosition = async (id: string) => {
    if (!confirm('Delete this position? This may affect existing candidates assigned to it.')) return;
    const token = localStorage.getItem('admin_session');
    await fetch(`/api/admin/positions/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchData(true);
  };

  const openEditPartylist = (party: any) => {
    setEditingPartylistId(party.id);
    setNewPartylistName(party.name);
    setNewPartylistAcronym(party.acronym || '');
    setNewPartylistColor(party.color || '#9B7248');
    setShowPartylistModal(true);
  };

  const handleSavePartylist = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const token = localStorage.getItem('admin_session');
    
    if (editingPartylistId) {
      const res = await fetch(`/api/admin/partylists/${editingPartylistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newPartylistName, acronym: newPartylistAcronym, color: newPartylistColor })
      });
      if (res.ok) {
        setShowPartylistModal(false);
        fetchData(true);
      }
    } else {
      const res = await fetch('/api/admin/partylists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newPartylistName, acronym: newPartylistAcronym, color: newPartylistColor, election_id: activeElection?.id })
      });
      if (res.ok) {
        setShowPartylistModal(false);
        fetchData(true);
      }
    }
    setIsSubmitting(false);
  };

  const handleDeletePartylist = async (id: string) => {
    if (!confirm('Delete this partylist?')) return;
    const token = localStorage.getItem('admin_session');
    await fetch(`/api/admin/partylists/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchData(true);
  };

  const openEditCourse = (course: any) => {
    setEditingCourseId(course.id);
    setNewCourseCode(course.code);
    setNewCourseName(course.name || '');
    setShowCourseModal(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const token = localStorage.getItem('admin_session');
    
    if (editingCourseId) {
      const res = await fetch(`/api/admin/courses/${editingCourseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code: newCourseCode, name: newCourseName })
      });
      if (res.ok) {
        setShowCourseModal(false);
        fetchData(true);
      }
    } else {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code: newCourseCode, name: newCourseName })
      });
      if (res.ok) {
        setShowCourseModal(false);
        fetchData(true);
      }
    }
    setIsSubmitting(false);
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Delete this course?')) return;
    const token = localStorage.getItem('admin_session');
    await fetch(`/api/admin/courses/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchData(true);
  };

  const openEditElection = (el: any) => {
    setEditingElectionId(el.id);
    setNewElectionName(el.name);
    setNewElectionDate(el.election_date || '');
    setShowElectionModal(true);
  };

  const handleSaveElection = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const token = localStorage.getItem('admin_session');
    
    if (editingElectionId) {
      const res = await fetch(`/api/admin/elections/${editingElectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newElectionName, election_date: newElectionDate })
      });
      if (res.ok) {
        setShowElectionModal(false);
        refreshElections();
      }
    } else {
      const res = await fetch('/api/admin/elections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          name: newElectionName, 
          election_date: newElectionDate
        })
      });
      if (res.ok) {
        setShowElectionModal(false);
        refreshElections();
      }
    }
    setIsSubmitting(false);
  };

  const handleDeleteElection = async (id: string) => {
    if (!confirm('Delete this election? This will delete ALL voters, candidates, and votes associated with it!')) return;
    const token = localStorage.getItem('admin_session');
    await fetch(`/api/admin/elections/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    refreshElections();
  };

  const openNewElection = () => {
    setEditingElectionId(null);
    setNewElectionName('');
    setNewElectionDate('');
    setShowElectionModal(true);
  };

  const openNewPosition = () => {
    setEditingPositionId(null);
    setNewPositionName('');
    setNewPositionMax(1);
    setShowPositionModal(true);
  };

  const openNewPartylist = () => {
    setEditingPartylistId(null);
    setNewPartylistName('');
    setNewPartylistAcronym('');
    setNewPartylistColor('#9B7248');
    setShowPartylistModal(true);
  };

  const openNewCourse = () => {
    setEditingCourseId(null);
    setNewCourseCode('');
    setNewCourseName('');
    setShowCourseModal(true);
  };

  if (isLoading) return <ConfigSkeleton />;

  const isActiveElectionArchived = activeElection?.status === 'archived';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configuration</h1>
          <p className="text-sm text-gray-400 mt-1">Manage system settings and setup.</p>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab('election')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'election' ? 'border-[#9B7248] text-[#9B7248]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Elections
        </button>
        <button
          onClick={() => setActiveTab('setup')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'setup' ? 'border-[#9B7248] text-[#9B7248]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Election Setup
        </button>
        <button
          onClick={() => setActiveTab('courses')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'courses' ? 'border-[#9B7248] text-[#9B7248]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          Programs & Courses
        </button>
      </div>

      {activeTab === 'election' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <h2 className="font-bold text-gray-900 text-sm">Elections</h2>
            </div>
            <button
              onClick={openNewElection}
              className="flex items-center gap-1.5 text-xs font-semibold bg-[#0F1117] text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Election
            </button>
          </div>
          <div className="px-6 py-4">
            {elections.length === 0 ? (
              <p className="text-sm text-gray-400 py-10 text-center">No elections created yet.</p>
            ) : (
              <ul className="space-y-2">
                {elections.map(el => {
                  const isArchived = el.status === 'archived';
                  const statusColors: Record<string, string> = {
                    active: 'bg-emerald-100 text-emerald-700',
                    completed: 'bg-orange-100 text-orange-700',
                    archived: 'bg-purple-100 text-purple-700',
                    pending: 'bg-gray-100 text-gray-500',
                  };
                  return (
                    <li key={el.id} className={`p-5 rounded-2xl border transition-all ${isArchived ? 'bg-purple-50/30 border-purple-100' : 'bg-gray-50/50 border-gray-100 shadow-sm hover:shadow-md hover:bg-white'}`}>
                      <div className="flex justify-between items-start">
                        <div className="space-y-4 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-gray-900 mr-2">{el.name}</h3>
                            {el.id === activeElection?.id && <span className="px-2 py-1 rounded bg-[#F0E6D6] text-[#7C5C3A] text-[10px] font-bold uppercase tracking-wider">Active Config</span>}
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${statusColors[el.status] || 'bg-gray-100 text-gray-500'}`}>{el.status}</span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white px-4 py-3 rounded-xl border border-gray-100">
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Target Date</p>
                              <p className="text-sm font-semibold text-gray-700">{el.election_date ? new Date(el.election_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set'}</p>
                            </div>
                            
                            <div className="bg-white px-4 py-3 rounded-xl border border-gray-100">
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Voting Started</p>
                              <p className="text-sm font-semibold text-gray-700">{el.voting_start ? new Date(el.voting_start).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</p>
                            </div>

                            <div className="bg-white px-4 py-3 rounded-xl border border-gray-100">
                              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Voting Ended</p>
                              <p className="text-sm font-semibold text-gray-700">{el.voting_end ? new Date(el.voting_end).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</p>
                            </div>
                          </div>

                          {isArchived && (
                            <div className="inline-block px-3 py-1.5 rounded-lg bg-purple-100/50 border border-purple-100 mt-2">
                              <p className="text-xs text-purple-600 font-medium flex items-center gap-1.5">
                                <Archive className="w-3.5 h-3.5" /> Raw data purged, summary preserved
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {!isArchived && (
                            <button
                              onClick={() => openEditElection(el)}
                              className="p-2 rounded-xl text-gray-400 bg-white hover:text-[#9B7248] hover:bg-[#F0E6D6] transition-colors border border-gray-100 shadow-sm"
                              title="Edit Election"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteElection(el.id)}
                            className="p-2 rounded-xl text-gray-400 bg-white hover:text-red-600 hover:bg-red-50 transition-colors border border-gray-100 shadow-sm"
                            title="Delete Election"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {activeTab === 'setup' && (
        <div className="space-y-6">
          {isActiveElectionArchived && (
             <div className="bg-purple-50 text-purple-700 p-4 rounded-xl text-sm font-medium border border-purple-100 flex items-center gap-3">
               <Archive className="w-5 h-5" /> This election is archived. Setup configuration is locked.
             </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Positions Panel ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-400" />
              <h2 className="font-bold text-gray-900 text-sm">Positions</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{positions.length}</span>
            </div>
            {!isActiveElectionArchived && (
              <button
                onClick={openNewPosition}
                className="flex items-center gap-1.5 text-xs font-semibold bg-[#0F1117] text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            )}
          </div>

          {/* Panel body */}
          <div className="px-6 py-4">
            {positions.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-gray-400">No positions yet. Add one to get started.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {positions.map((pos, i) => (
                  <li key={pos.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100/70 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-gray-400 w-5 shrink-0">#{i + 1}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{pos.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Allowed votes: <span className="font-semibold text-[#9B7248]">{pos.max_selections ?? 1}</span>
                        </p>
                      </div>
                    </div>
                    {!isActiveElectionArchived && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditPosition(pos)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#9B7248] hover:bg-[#9B7248]/10 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePosition(pos.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Partylists Panel ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <h2 className="font-bold text-gray-900 text-sm">Partylists</h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{partylists.length}</span>
            </div>
            {!isActiveElectionArchived && (
              <button
                onClick={openNewPartylist}
                className="flex items-center gap-1.5 text-xs font-semibold bg-[#0F1117] text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            )}
          </div>

          {/* Panel body */}
          <div className="px-6 py-4">
            {partylists.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-gray-400">No partylists yet. Add one to get started.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {partylists.map(party => (
                  <li key={party.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100/70 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Color swatch / acronym badge */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-[10px] shrink-0"
                        style={{ backgroundColor: party.color || '#9B7248' }}
                      >
                        {party.acronym || party.name.substring(0, 2).toUpperCase()}
                      </div>
                      <p className="font-semibold text-gray-900 text-sm truncate">{party.name}</p>
                    </div>
                    {!isActiveElectionArchived && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditPartylist(party)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#9B7248] hover:bg-[#9B7248]/10 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePartylist(party.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        </div>
        </div>
      )}

      {activeTab === 'courses' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gray-400" />
              <h2 className="font-bold text-gray-900 text-sm">Programs / Courses</h2>
            </div>
            {!isActiveElectionArchived && (
              <button
                onClick={openNewCourse}
                className="flex items-center gap-1.5 text-xs font-semibold bg-[#0F1117] text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Program
              </button>
            )}
          </div>

          {courses.length === 0 ? (
            <div className="py-10 text-center bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-sm text-gray-400">No programs added yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {courses.map(course => (
                <div key={course.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-[#9B7248]/30 transition-colors group">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{course.code}</p>
                    {course.name && <p className="text-xs text-gray-500 mt-0.5 truncate">{course.name}</p>}
                  </div>
                  {!isActiveElectionArchived && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditCourse(course)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#9B7248] hover:bg-[#9B7248]/10 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Add Position Modal ── */}
      {showPositionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowPositionModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">{editingPositionId ? 'Edit Position' : 'Add New Position'}</h3>
              <button onClick={() => setShowPositionModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSavePosition}>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Position Name</label>
                  <input
                    required autoFocus type="text"
                    value={newPositionName}
                    onChange={e => setNewPositionName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-[#9B7248] focus:ring-2 focus:ring-[#9B7248]/10 transition-all"
                    placeholder="e.g. President, Senator"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Allowed Votes</label>
                  <input
                    required type="number" min="1"
                    value={newPositionMax}
                    onChange={e => setNewPositionMax(parseInt(e.target.value) || 1)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-[#9B7248] focus:ring-2 focus:ring-[#9B7248]/10 transition-all"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">How many candidates a voter can pick for this position.</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                <button type="button" onClick={() => setShowPositionModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-semibold bg-[#0F1117] text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                  {isSubmitting ? 'Saving...' : (editingPositionId ? 'Update Position' : 'Create Position')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Partylist Modal ── */}
      {showPartylistModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowPartylistModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">{editingPartylistId ? 'Edit Partylist' : 'Add New Partylist'}</h3>
              <button onClick={() => setShowPartylistModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSavePartylist}>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Partylist Name</label>
                  <input
                    required autoFocus type="text"
                    value={newPartylistName}
                    onChange={e => setNewPartylistName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-[#9B7248] focus:ring-2 focus:ring-[#9B7248]/10 transition-all"
                    placeholder="e.g. Student Alliance"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Acronym</label>
                  <input
                    type="text"
                    value={newPartylistAcronym}
                    onChange={e => setNewPartylistAcronym(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-[#9B7248] focus:ring-2 focus:ring-[#9B7248]/10 transition-all"
                    placeholder="e.g. SA"
                    maxLength={6}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Theme Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={newPartylistColor}
                      onChange={e => setNewPartylistColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-1"
                    />
                    <span className="text-sm font-mono text-gray-500">{newPartylistColor}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                <button type="button" onClick={() => setShowPartylistModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-semibold bg-[#0F1117] text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                  {isSubmitting ? 'Saving...' : (editingPartylistId ? 'Update Partylist' : 'Create Partylist')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Course Modal ── */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCourseModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">{editingCourseId ? 'Edit Program' : 'Add New Program'}</h3>
              <button onClick={() => setShowCourseModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCourse}>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Program Code</label>
                  <input
                    required autoFocus type="text"
                    value={newCourseCode}
                    onChange={e => setNewCourseCode(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-[#9B7248] focus:ring-2 focus:ring-[#9B7248]/10 transition-all"
                    placeholder="e.g. BSIT"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Full Name (Optional)</label>
                  <input
                    type="text"
                    value={newCourseName}
                    onChange={e => setNewCourseName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-[#9B7248] focus:ring-2 focus:ring-[#9B7248]/10 transition-all"
                    placeholder="e.g. Bachelor of Science in Information Technology"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                <button type="button" onClick={() => setShowCourseModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-semibold bg-[#0F1117] text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                  {isSubmitting ? 'Saving...' : (editingCourseId ? 'Update Program' : 'Create Program')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Election Modal ── */}
      {showElectionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowElectionModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">{editingElectionId ? 'Edit Election' : 'Add New Election'}</h3>
              <button onClick={() => setShowElectionModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveElection}>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Election Name</label>
                  <input
                    required autoFocus type="text"
                    value={newElectionName}
                    onChange={e => setNewElectionName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-[#9B7248] focus:ring-2 focus:ring-[#9B7248]/10 transition-all"
                    placeholder="e.g. Student Council Election 2026"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Election Date</label>
                  <input
                    required type="date"
                    value={newElectionDate}
                    onChange={e => setNewElectionDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm focus:outline-none focus:border-[#9B7248] focus:ring-2 focus:ring-[#9B7248]/10 transition-all"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                <button type="button" onClick={() => setShowElectionModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-semibold bg-[#0F1117] text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                  {isSubmitting ? 'Saving...' : (editingElectionId ? 'Update Election' : 'Create Election')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
