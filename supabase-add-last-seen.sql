-- Online presence: track the most recent activity per profile.
-- Updated by the client on app open + a 2-minute heartbeat. Shown in the
-- chat header and on swipe cards as "Online" / "Active 5m ago" / etc.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen DESC);
