-- Track left-swipes so the discover deck excludes profiles the user
-- has already passed on. The 30-day reset is enforced client-side by
-- filtering on created_at; older rows are kept for analytics but
-- ignored by loadProfiles.
CREATE TABLE passes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  passer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  passed_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(passer_id, passed_id)
);

ALTER TABLE passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their passes" ON passes FOR SELECT USING (
  passer_id = auth.uid() OR passed_id = auth.uid()
);

CREATE POLICY "Users can create passes" ON passes FOR INSERT WITH CHECK (
  passer_id = auth.uid()
);

CREATE POLICY "Users can delete their passes" ON passes FOR DELETE USING (
  passer_id = auth.uid() OR passed_id = auth.uid()
);

CREATE INDEX idx_passes_passer_id ON passes(passer_id);
CREATE INDEX idx_passes_passed_id ON passes(passed_id);
CREATE INDEX idx_passes_created_at ON passes(created_at);
