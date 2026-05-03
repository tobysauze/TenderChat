-- Fire the report-email edge function on every new report.
-- Mirrors the push-notification trigger pattern (uses pg_net to POST
-- the same webhook payload shape Database Webhooks send).

CREATE OR REPLACE FUNCTION public.notify_report_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://cwdrksilpeppcslwjeqi.supabase.co/functions/v1/report-email',
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

DROP TRIGGER IF EXISTS report_email_on_insert ON reports;
CREATE TRIGGER report_email_on_insert
AFTER INSERT ON reports
FOR EACH ROW EXECUTE FUNCTION public.notify_report_email();
