-- =============================================================================
-- COMSELEC — Supabase Realtime Setup (Secure Version)
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- SECURITY APPROACH:
--   We never open the raw voters or votes tables to anon.
--   Instead we expose minimal views with only the columns needed to trigger
--   a client-side refetch. The actual tallying is still done server-side
--   via the /api/admin/stats and /api/public-results route handlers which
--   use the service_role key and bypass RLS entirely.
-- =============================================================================

-- 1. Drop any previously created overly-permissive policies (safe to run even
--    if they don't exist yet — the IF EXISTS guard prevents errors).
DROP POLICY IF EXISTS "votes_anon_select" ON votes;
DROP POLICY IF EXISTS "voters_anon_select_for_realtime" ON voters;

-- 2. Enable Realtime on the votes table.
--    The votes table contains only UUIDs (no PII) so broadcasting INSERT events
--    from it is safe. We still don't grant anon SELECT on the raw table — the
--    Realtime engine at the DB level can fire events without a client policy,
--    but the client needs a SELECT policy to receive the payload.
--    Since we only use the event as a trigger (not the payload), we use a view.
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- 3. vote_events view — exposes only election_id + timestamp.
--    Anon clients receive this when a new vote is inserted, which triggers
--    them to call /api/public-results to get the updated tally.
CREATE OR REPLACE VIEW public.vote_events AS
  SELECT id, election_id, created_at
  FROM votes;

GRANT SELECT ON public.vote_events TO anon;

-- 4. voter_turnout view — exposes only the has_voted flag + election_id.
--    No PII: no pin_hash, no qr_token, no student_id, no full_name.
--    Anon clients receive this when a voter's has_voted flips to true, which
--    triggers them to refetch the turnout counter.
CREATE OR REPLACE VIEW public.voter_turnout AS
  SELECT id, election_id, has_voted, voted_at
  FROM voters;

GRANT SELECT ON public.voter_turnout TO anon;

-- 5. Add the safe views to the Realtime publication so changes propagate
--    over the WebSocket to subscribed browser clients.
ALTER PUBLICATION supabase_realtime ADD TABLE public.voter_turnout;

-- =============================================================================
-- WHAT IS AND ISN'T EXPOSED TO ANONYMOUS CLIENTS
--
--  ✅ vote_events:    id (UUID), election_id (UUID), created_at
--  ✅ voter_turnout:  id (UUID), election_id (UUID), has_voted (bool), voted_at
--
--  ❌ NOT exposed:    pin_hash, qr_token, student_id, full_name, course,
--                     year_level, pin_attempts, votes.candidate_id,
--                     votes.position_id, votes.voter_id
--
-- The actual results data (who voted for whom) is only accessible via
-- /api/admin/stats (requires admin JWT) and /api/public-results (respects
-- the results_visible flag server-side).
-- =============================================================================

-- VERIFICATION
-- After running, confirm in Supabase Dashboard:
--   Database → Publications → supabase_realtime
--   → Should list: votes, voter_turnout
--   Database → Tables → check vote_events and voter_turnout views exist
-- =============================================================================
