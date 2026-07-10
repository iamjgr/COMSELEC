-- 1. Create Elections Table
CREATE TABLE elections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    year TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, active, completed
    voting_start TIMESTAMPTZ,
    voting_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Courses Table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Insert Initial Data
-- Port over existing election settings to the new elections table
INSERT INTO elections (name, year, status, voting_start, voting_end)
SELECT 
    'Narra Campus Election 2025', 
    '2025', 
    CASE WHEN is_active THEN 'active' ELSE 'pending' END, 
    voting_start, 
    voting_end
FROM election_settings
LIMIT 1;

-- Seed default courses
INSERT INTO courses (code) VALUES ('BSIT'), ('BSCS'), ('BSBA'), ('BSEd');

-- 4. Add election_id to existing tables
-- Voters
ALTER TABLE voters ADD COLUMN election_id UUID REFERENCES elections(id);
UPDATE voters SET election_id = (SELECT id FROM elections LIMIT 1);
ALTER TABLE voters ALTER COLUMN election_id SET NOT NULL;

-- Candidates
ALTER TABLE candidates ADD COLUMN election_id UUID REFERENCES elections(id);
UPDATE candidates SET election_id = (SELECT id FROM elections LIMIT 1);
ALTER TABLE candidates ALTER COLUMN election_id SET NOT NULL;

-- Positions
ALTER TABLE positions ADD COLUMN election_id UUID REFERENCES elections(id);
UPDATE positions SET election_id = (SELECT id FROM elections LIMIT 1);
ALTER TABLE positions ALTER COLUMN election_id SET NOT NULL;

-- Partylists
ALTER TABLE partylists ADD COLUMN election_id UUID REFERENCES elections(id);
UPDATE partylists SET election_id = (SELECT id FROM elections LIMIT 1);
ALTER TABLE partylists ALTER COLUMN election_id SET NOT NULL;

-- Votes
ALTER TABLE votes ADD COLUMN election_id UUID REFERENCES elections(id);
UPDATE votes SET election_id = (SELECT id FROM elections LIMIT 1);
ALTER TABLE votes ALTER COLUMN election_id SET NOT NULL;
