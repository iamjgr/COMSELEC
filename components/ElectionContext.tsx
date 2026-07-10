'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Election = {
  id: string;
  name: string;
  election_date: string;
  status: string;
  voting_start: string | null;
  voting_end: string | null;
};

type ElectionContextType = {
  elections: Election[];
  activeElection: Election | null;
  setActiveElectionId: (id: string) => void;
  refreshElections: () => Promise<void>;
  isLoading: boolean;
};

const ElectionContext = createContext<ElectionContextType>({
  elections: [],
  activeElection: null,
  setActiveElectionId: () => {},
  refreshElections: async () => {},
  isLoading: true,
});

export function ElectionProvider({ children }: { children: React.ReactNode }) {
  const [elections, setElections] = useState<Election[]>([]);
  // Eagerly seed the active election ID from localStorage so the dashboard
  // doesn't have to wait for the network round-trip before it can start
  // rendering. This eliminates the ~30-second blank skeleton on new devices.
  const [activeElectionId, setActiveElectionIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('admin_active_election_id');
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchElections = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('admin_session');
      if (!token) return;

      const res = await fetch(`/api/admin/elections?_t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      
      if (res.ok) {
        const data = await res.json();
        setElections(data.elections || []);
        
        // Determine which election to show:
        // 1. If the admin already has a valid saved selection, keep it (respect manual choice).
        // 2. If no saved selection (first visit or cleared), default to the active election,
        //    then fall back to the first election in the list.
        const savedId = localStorage.getItem('admin_active_election_id');
        const validSaved = savedId ? data.elections.find((e: Election) => e.id === savedId) : null;
        const currentlyActive = data.elections.find((e: Election) => e.status === 'active');

        if (validSaved) {
          // Keep the admin's existing selection — don't override it.
          setActiveElectionIdState(savedId!);
        } else if (currentlyActive) {
          // No prior selection: default to the live active election.
          setActiveElectionIdState(currentlyActive.id);
          localStorage.setItem('admin_active_election_id', currentlyActive.id);
        } else if (data.elections.length > 0) {
          setActiveElectionIdState(data.elections[0].id);
          localStorage.setItem('admin_active_election_id', data.elections[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to fetch elections", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchElections();
  }, []);

  const setActiveElectionId = (id: string) => {
    setActiveElectionIdState(id);
    localStorage.setItem('admin_active_election_id', id);
  };

  const activeElection = elections.find(e => e.id === activeElectionId) || null;

  return (
    <ElectionContext.Provider value={{ elections, activeElection, setActiveElectionId, refreshElections: fetchElections, isLoading }}>
      {children}
    </ElectionContext.Provider>
  );
}

export const useElection = () => useContext(ElectionContext);
