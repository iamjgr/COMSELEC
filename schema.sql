-- PSU Narra Campus Election System - Supabase Schema

CREATE TABLE voters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    TEXT UNIQUE NOT NULL,       -- e.g. "2023-00142"
  full_name     TEXT NOT NULL,              -- "Juan Dela Cruz"
  first_name    TEXT NOT NULL,
  middle_name   TEXT,
  last_name     TEXT NOT NULL,
  course        TEXT NOT NULL,              -- "BSCS"
  year_level    TEXT NOT NULL,              -- "3A"
  pin_hash      TEXT NOT NULL,              -- bcrypt hash of 4-digit PIN
  qr_token      TEXT UNIQUE NOT NULL,       -- unique random token encoded in QR
  has_voted     BOOLEAN DEFAULT FALSE,
  voted_at      TIMESTAMPTZ,
  token_used    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE positions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,             -- "President", "VP Internal", etc.
  order_index   INT NOT NULL,              -- 1, 2, 3, 4... (ballot page order)
  is_active     BOOLEAN DEFAULT TRUE
);

CREATE TABLE candidates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id   UUID REFERENCES positions(id),
  full_name     TEXT NOT NULL,
  nickname      TEXT,
  course        TEXT NOT NULL,
  year_level    TEXT NOT NULL,
  photo_url     TEXT,                      -- Supabase Storage URL
  platform      TEXT[],                    -- array of platform points
  order_index   INT NOT NULL
);

CREATE TABLE votes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_id      UUID REFERENCES voters(id),
  position_id   UUID REFERENCES positions(id),
  candidate_id  UUID REFERENCES candidates(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(voter_id, position_id)            -- one vote per position per voter
);

CREATE TABLE election_settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_name TEXT NOT NULL,
  election_date DATE NOT NULL,
  voting_start  TIMESTAMPTZ NOT NULL,
  voting_end    TIMESTAMPTZ NOT NULL,
  results_visible BOOLEAN DEFAULT FALSE,   -- admin toggles live results
  is_active     BOOLEAN DEFAULT FALSE      -- master on/off switch
);

-- Enable RLS on all tables
ALTER TABLE voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_settings ENABLE ROW LEVEL SECURITY;

-- Candidates and Positions: Readable by all (anon and authenticated)
CREATE POLICY "Candidates are readable by all" ON candidates FOR SELECT USING (true);
CREATE POLICY "Positions are readable by all" ON positions FOR SELECT USING (true);
CREATE POLICY "Election settings are readable by all" ON election_settings FOR SELECT USING (true);

-- Votes: We only allow insertion via server-side Route Handlers (using service_role which bypasses RLS), 
-- but for live results, we might want to read votes. Wait, live results just counts them.
-- Actually, the spec says: `votes` — insertable by authenticated session only. Never readable by client (admin only).
-- If we use Next.js Route Handlers for everything, we don't strictly need client-side policies for inserts.
-- Just leave RLS enabled with no policies for voters and votes, meaning only service_role can access them.
-- But wait, for live results to work with Supabase Realtime, it might need to subscribe to changes.
-- Let's just create a view for live results if needed, or allow read access to votes if it's safe (it doesn't expose voter_id if we restrict columns? No, better to keep it secure and fetch counts via an Edge Function/RPC, or use a secure policy).
-- We'll just define the tables for now.
