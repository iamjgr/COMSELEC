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
  const [activeElectionId, setActiveElectionIdState] = useState<string | null>(null);
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
        
        // If we don't have an active election selected, or the selected one was deleted,
        // default to the first one (or the one marked 'active' if available)
        const savedId = localStorage.getItem('admin_active_election_id');
        const validSaved = savedId ? data.elections.find((e: Election) => e.id === savedId) : null;
        // If there's a currently active election, always prefer it over a stale saved ID
        const currentlyActive = data.elections.find((e: Election) => e.status === 'active');

        if (currentlyActive) {
          // Always switch to the live active election automatically
          setActiveElectionIdState(currentlyActive.id);
          localStorage.setItem('admin_active_election_id', currentlyActive.id);
        } else if (validSaved) {
          setActiveElectionIdState(savedId!);
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
