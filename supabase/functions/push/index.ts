// Tender push-notification edge function.
//
// Triggered by two Supabase Database Webhooks:
//   1. INSERT on matches    → notify both users
//   2. INSERT on messages   → notify the recipient (not the sender)
//
// Deploy:
//   supabase functions deploy push --no-verify-jwt
//
// Required secrets (supabase secrets set ...):
//   VAPID_PUBLIC_KEY   (also exposed to client as NEXT_PUBLIC_VAPID_PUBLIC_KEY)
//   VAPID_PRIVATE_KEY
//   VAPID_SUBJECT      (e.g. mailto:hello@tender.ink)
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@tender.ink";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, any>;
  old_record: Record<string, any> | null;
}

interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

async function buildJobs(payload: WebhookPayload): Promise<{ recipients: string[]; push: PushPayload } | null> {
  if (payload.type !== "INSERT") return null;

  if (payload.table === "matches") {
    const r = payload.record;
    return {
      recipients: [r.user1_id, r.user2_id].filter(Boolean),
      push: {
        title: "It's a match! ⚓",
        body: "You've matched with someone new on Tender. Say hello.",
        url: "/",
        tag: `match-${r.id}`,
      },
    };
  }

  if (payload.table === "messages") {
    const r = payload.record;
    const { data: match } = await supabase
      .from("matches")
      .select("user1_id, user2_id")
      .eq("id", r.match_id)
      .single();
    if (!match) return null;

    const otherUserId = match.user1_id === r.sender_id ? match.user2_id : match.user1_id;
    if (!otherUserId) return null;

    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", r.sender_id)
      .single();

    const senderName = senderProfile?.name || "Someone";
    return {
      recipients: [otherUserId],
      push: {
        title: senderName,
        body: String(r.content || "").slice(0, 140),
        url: "/",
        tag: `chat-${r.match_id}`,
      },
    };
  }

  return null;
}

async function sendToUser(userId: string, payload: PushPayload) {
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (error || !subs || subs.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
        );
      } catch (err: any) {
        // 404/410 = subscription expired or unsubscribed; clean it up.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        } else {
          console.error("push send failed", err.statusCode, err.body);
        }
      }
    }),
  );
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.error("VAPID keys not configured");
    return new Response("misconfigured", { status: 500 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("bad json", { status: 400 });
  }

  const job = await buildJobs(payload);
  if (!job) return new Response("ignored", { status: 200 });

  await Promise.all(job.recipients.map((uid) => sendToUser(uid, job.push)));
  return new Response("ok", { status: 200 });
});
