/**
 * Tie detection for election results.
 *
 * Rules:
 * - Rank is determined purely by vote count, not array index.
 * - If multiple candidates share the same vote count, they all share the same rank.
 * - A "winner" is any candidate whose rank number is <= max_selections AND has votes > 0.
 * - We NEVER promote candidates beyond max_selections just to fill seats.
 *   e.g. max=3, top 3 all tied at #1 → seats 1-3 are contested; candidates #4 and #5
 *   stay at rank 4 and 5 — they are NOT pulled up.
 *
 * Tie types:
 * - "internal" tie: multiple candidates are tied WITHIN the winner zone (all rank <= N)
 * - "boundary" tie: the Nth and (N+1)th candidates share the same vote count —
 *   the last winner seat is contested by an outside candidate
 */

export interface CandidateWithVotes {
  id: string;
  votes: number;
  [key: string]: unknown;
}

export interface TieInfo {
  /** True rank (1-based), shared among all candidates with the same vote count */
  rank: number;
  /** Whether this candidate is inside the winner zone (rank <= max_selections and votes > 0) */
  isWinner: boolean;
  /**
   * Whether this candidate is part of a tie that involves the boundary between
   * winner zone and non-winner zone. i.e. tied with someone on the other side of the cutoff.
   */
  isBoundaryTie: boolean;
  /**
   * Whether this candidate is tied with at least one other candidate at the same rank,
   * regardless of whether they're winners or not.
   */
  isTied: boolean;
}

/**
 * Compute tie information for a sorted list of candidates.
 *
 * @param sorted - Candidates sorted descending by votes (highest first).
 * @param maxSelections - How many seats are available for this position.
 */
export function computeTieInfo(
  sorted: CandidateWithVotes[],
  maxSelections: number
): Map<string, TieInfo> {
  const result = new Map<string, TieInfo>();
  if (sorted.length === 0) return result;

  // Step 1: assign true ranks based on vote count
  // Candidates with equal votes share the same rank.
  // e.g. votes: [50, 50, 50, 30, 20] → ranks: [1, 1, 1, 4, 5]
  const ranks = new Map<string, number>();
  let currentRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].votes < sorted[i - 1].votes) {
      // rank jumps to actual position (not just +1)
      currentRank = i + 1;
    }
    ranks.set(sorted[i].id, currentRank);
  }

  // Step 2: determine which vote-count groups span the winner/non-winner boundary
  // A vote count is "boundary-spanning" if candidates with that vote count exist
  // both at rank <= max_selections AND rank > max_selections.
  const voteCountRankMap = new Map<number, { insideWinner: boolean; outsideWinner: boolean }>();
  for (const c of sorted) {
    const rank = ranks.get(c.id)!;
    const inside = rank <= maxSelections && c.votes > 0;
    const existing = voteCountRankMap.get(c.votes) || { insideWinner: false, outsideWinner: false };
    voteCountRankMap.set(c.votes, {
      insideWinner: existing.insideWinner || inside,
      outsideWinner: existing.outsideWinner || !inside || c.votes === 0,
    });
  }

  // Step 3: detect which vote counts appear more than once (tied groups)
  const voteCountCount = new Map<number, number>();
  for (const c of sorted) {
    voteCountCount.set(c.votes, (voteCountCount.get(c.votes) || 0) + 1);
  }

  // Step 4: build result for each candidate
  for (const c of sorted) {
    const rank = ranks.get(c.id)!;
    const isWinner = rank <= maxSelections && c.votes > 0;
    const tiedGroupSize = voteCountCount.get(c.votes) || 1;
    const isTied = tiedGroupSize > 1;
    const boundaryInfo = voteCountRankMap.get(c.votes)!;
    // boundary tie: this vote count group spans both sides of the cutoff
    const isBoundaryTie = isTied && boundaryInfo.insideWinner && boundaryInfo.outsideWinner;

    result.set(c.id, { rank, isWinner, isBoundaryTie, isTied });
  }

  return result;
}
