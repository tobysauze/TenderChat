-- Hard block: blocked user disappears from blocker's discovery and matches,
-- and vice versa. Reporting a user also creates a block row.
CREATE TABLE blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their blocks" ON blocks FOR SELECT USING (
  blocker_id = auth.uid() OR blocked_id = auth.uid()
);
CREATE POLICY "Users can create their blocks" ON blocks FOR INSERT WITH CHECK (
  blocker_id = auth.uid()
);
CREATE POLICY "Users can delete their blocks" ON blocks FOR DELETE USING (
  blocker_id = auth.uid()
);

CREATE INDEX idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked_id ON blocks(blocked_id);

-- Reports: users can submit, but only the reporter can read their own.
-- Admin/moderators read via service-role key in a future moderation tool.
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit reports" ON reports FOR INSERT WITH CHECK (
  reporter_id = auth.uid()
);
CREATE POLICY "Users can view their own reports" ON reports FOR SELECT USING (
  reporter_id = auth.uid()
);

CREATE INDEX idx_reports_reported_id ON reports(reported_id);
CREATE INDEX idx_reports_created_at ON reports(created_at);
