-- Enable Postgres logical replication for the messages table so the
-- ChatInterface real-time subscription actually delivers INSERTs to
-- both clients. Without this the subscribe() callback registers but
-- never fires, and new messages only appear after a manual reload.
--
-- Idempotent: if the table is already in the publication this is a
-- no-op.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;
