-- Stores Web Push subscriptions per device. A user can have multiple rows
-- (e.g. iPhone PWA + Android Chrome). The endpoint is unique per device,
-- so we key on it.
CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users manage only their own subscriptions. The edge function reads via
-- service role and bypasses RLS.
CREATE POLICY "Users can view their subscriptions" ON push_subscriptions FOR SELECT USING (
  user_id = auth.uid()
);
CREATE POLICY "Users can create their subscriptions" ON push_subscriptions FOR INSERT WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY "Users can delete their subscriptions" ON push_subscriptions FOR DELETE USING (
  user_id = auth.uid()
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
