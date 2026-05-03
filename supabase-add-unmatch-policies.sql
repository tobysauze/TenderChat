-- Allow users to delete a match they're part of.
-- Messages cascade-delete via the existing FK on messages.match_id.
CREATE POLICY "Users can delete their matches" ON matches FOR DELETE USING (
  user1_id = auth.uid() OR user2_id = auth.uid()
);

-- Allow users to delete like rows where they're either side of the like,
-- so unmatch can clear the underlying mutual likes (otherwise they would
-- auto-rematch the next time either swipes right).
CREATE POLICY "Users can delete their likes" ON likes FOR DELETE USING (
  liker_id = auth.uid() OR liked_id = auth.uid()
);
