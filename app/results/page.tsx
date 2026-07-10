/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';

export default function ResultsPage() {
  const [positions, setPositions] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [votes, setVotes] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();

    // Subscribe to votes table for real-time updates
    const channel = supabase
      .channel('public:votes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'votes' }, (payload) => {
        // Only add if it belongs to the active election (settings.id checked via closure)
        setVotes(prev => [...prev, payload.new]);
      })
      .subscribe();

    // Re-fetch every 15s as a fallback
    const interval = setInterval(() => {
      // We need settings to get election_id; re-run full init to stay in sync
      fetchInitialData();
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const { data: set } = await supabase
        .from('elections')
        .select('id, name, results_visible, status')
        .eq('status', 'active')
        .single();
      setSettings(set);

      if (set?.results_visible) {
        const { data: posData } = await supabase
          .from('positions')
          .select('*')
          .eq('election_id', set.id)
          .order('order_index');
        const { data: candData } = await supabase
          .from('candidates')
          .select('*')
          .eq('election_id', set.id);
        if (posData) setPositions(posData);
        if (candData) setCandidates(candData);
        await fetchVotes(set.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVotes = async (electionId: string) => {
    const { data } = await supabase
      .from('votes')
      .select('position_id, candidate_id')
      .eq('election_id', electionId);
    if (data) setVotes(data);
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">Loading...</div>;
  }

  if (!settings?.results_visible) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] text-[var(--color-text-secondary)] text-xl">
        Live results are currently hidden by the administrator.
      </div>
    );
  }

  const getTotalVotes = (positionId: string) => votes.filter(v => v.position_id === positionId).length;
  const getCandidateVotes = (candidateId: string) => votes.filter(v => v.candidate_id === candidateId).length;

  return (
    <main className="min-h-screen bg-[var(--color-bg)] p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">{settings?.name || 'Election'} Live Results</h1>
          <p className="text-[var(--color-text-muted)]">Updating in real-time</p>
        </div>

        {positions.map(position => {
          const posCandidates = candidates.filter(c => c.position_id === position.id);
          const totalPosVotes = getTotalVotes(position.id);

          // Sort candidates by votes descending
          const sortedCandidates = [...posCandidates].sort((a, b) => getCandidateVotes(b.id) - getCandidateVotes(a.id));

          return (
            <div key={position.id} className="space-y-4">
              <div className="flex justify-between items-baseline border-b border-[var(--color-border-strong)] pb-2">
                <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">{position.name}</h2>
                <span className="text-sm text-[var(--color-text-muted)]">{totalPosVotes} total votes cast</span>
              </div>
              
              <div className="grid gap-4">
                {sortedCandidates.map(candidate => {
                  const candidateVotes = getCandidateVotes(candidate.id);
                  const percentage = totalPosVotes > 0 ? (candidateVotes / totalPosVotes) * 100 : 0;

                  return (
                    <Card key={candidate.id} className="p-4 flex items-center gap-4">
                      {candidate.image_url ? (
                        <img src={candidate.image_url} alt={candidate.full_name} className="w-16 h-16 rounded-full object-cover border border-[var(--color-border)]" />
                      ) : (
                        <div className="w-16 h-16 flex-shrink-0 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-text-muted)] text-xl font-bold">
                          {candidate.full_name.charAt(0)}
                        </div>
                      )}
                      
                      <div className="flex-grow">
                        <div className="flex justify-between items-baseline mb-2">
                          <h3 className="font-semibold text-[var(--color-text-primary)]">{candidate.full_name}</h3>
                          <span className="font-bold text-[var(--color-accent)]">{candidateVotes.toLocaleString()} <span className="text-xs text-[var(--color-text-muted)] font-normal ml-1">({percentage.toFixed(1)}%)</span></span>
                        </div>
                        <div className="w-full h-3 bg-[var(--color-surface-2)] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[var(--color-accent)] to-[#8B6A42] transition-all duration-1000 ease-out" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
