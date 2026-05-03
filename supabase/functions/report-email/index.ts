// Tender report-email edge function.
//
// Triggered by an INSERT-on-reports database webhook. Looks up reporter
// + reported user details and sends a moderation email to ADMIN_EMAIL
// via Resend.
//
// Deploy:
//   supabase functions deploy report-email --no-verify-jwt
//
// Required secrets:
//   RESEND_API_KEY
//   ADMIN_EMAIL          (where reports go — yours)
//   FROM_EMAIL           (verified Resend sender, e.g. noreply@tender.ink)
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "noreply@tender.ink";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, any>;
  old_record: Record<string, any> | null;
}

async function userInfo(userId: string | null) {
  if (!userId) return { name: "(deleted)", email: "(deleted)" };
  const [{ data: profile }, { data: authUser }] = await Promise.all([
    supabase.from("profiles").select("name").eq("user_id", userId).maybeSingle(),
    supabase.auth.admin.getUserById(userId),
  ]);
  return {
    name: profile?.name ?? "(no profile)",
    email: authUser?.user?.email ?? "(no email)",
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  if (!RESEND_API_KEY || !ADMIN_EMAIL) {
    console.error("report-email not configured");
    return new Response("misconfigured", { status: 500 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }

  if (payload.type !== "INSERT" || payload.table !== "reports") {
    return new Response("ignored", { status: 200 });
  }

  const r = payload.record;
  const [reporter, reported] = await Promise.all([
    userInfo(r.reporter_id),
    userInfo(r.reported_id),
  ]);

  const reason = r.reason ?? "(no reason)";
  const details = r.details ?? "";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1B3B5B; padding: 24px;">
      <h2 style="margin: 0 0 12px 0;">⚠️ New user report</h2>
      <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
        <tr><td style="padding: 6px 12px; color: #6b7a8a;">Reason</td><td style="padding: 6px 12px;"><strong>${escapeHtml(reason)}</strong></td></tr>
        <tr><td style="padding: 6px 12px; color: #6b7a8a;">Reporter</td><td style="padding: 6px 12px;">${escapeHtml(reporter.name)} &lt;${escapeHtml(reporter.email)}&gt;</td></tr>
        <tr><td style="padding: 6px 12px; color: #6b7a8a;">Reported</td><td style="padding: 6px 12px;">${escapeHtml(reported.name)} &lt;${escapeHtml(reported.email)}&gt;</td></tr>
        <tr><td style="padding: 6px 12px; color: #6b7a8a;">Details</td><td style="padding: 6px 12px; white-space: pre-wrap;">${escapeHtml(details) || "<em>(none)</em>"}</td></tr>
        <tr><td style="padding: 6px 12px; color: #6b7a8a;">Filed at</td><td style="padding: 6px 12px;">${escapeHtml(r.created_at ?? "")}</td></tr>
        <tr><td style="padding: 6px 12px; color: #6b7a8a;">Reported user ID</td><td style="padding: 6px 12px; font-family: ui-monospace, monospace; font-size: 12px;">${escapeHtml(r.reported_id ?? "")}</td></tr>
      </table>
      <p style="margin-top: 20px; color: #6b7a8a; font-size: 13px;">
        Review in Supabase → Authentication → Users to suspend or delete the account.
      </p>
    </div>
  `;

  const text = `New user report

Reason: ${reason}
Reporter: ${reporter.name} <${reporter.email}>
Reported: ${reported.name} <${reported.email}>
Details: ${details || "(none)"}
Filed at: ${r.created_at ?? ""}
Reported user ID: ${r.reported_id ?? ""}
`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `Tender Reports <${FROM_EMAIL}>`,
      to: [ADMIN_EMAIL],
      subject: `[Tender] Report: ${reason}`,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Resend send failed", res.status, body);
    return new Response("email failed", { status: 500 });
  }

  return new Response("ok", { status: 200 });
});
