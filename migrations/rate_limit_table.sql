-- Rate limiting table for admin login attempts
-- Tracks failed attempts per IP address with automatic expiry

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip          TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on IP + time for fast lookups
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip_time
  ON admin_login_attempts (ip, attempted_at);

-- No RLS needed — only accessed via service_role from server-side routes
