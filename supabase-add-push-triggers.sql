-- Replaces the "Database Webhooks → Supabase Edge Functions" dashboard step.
-- Creates two AFTER INSERT triggers (matches + messages) that fire the push
-- edge function with the same payload shape Supabase webhooks normally send.
--
-- Uses the pg_net extension, which is enabled on Supabase projects by
-- default. If `net.http_post` errors with "schema does not exist", run:
--   CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_push_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://cwdrksilpeppcslwjeqi.supabase.co/functions/v1/push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(NEW),
      'old_record', NULL
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_on_match_insert ON matches;
CREATE TRIGGER push_on_match_insert
AFTER INSERT ON matches
FOR EACH ROW EXECUTE FUNCTION public.notify_push_function();

DROP TRIGGER IF EXISTS push_on_message_insert ON messages;
CREATE TRIGGER push_on_message_insert
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION public.notify_push_function();
