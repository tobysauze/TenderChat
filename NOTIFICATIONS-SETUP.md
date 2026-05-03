# Push notifications — setup steps

The code is in place; this is a one-off configuration walkthrough. Do these in order.

---

## 1. Run the SQL migration

In Supabase → SQL Editor, paste and run:

```sql
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
```

(Same as `supabase-add-push-subscriptions.sql`.)

---

## 2. Generate VAPID keys

In your shell, from this repo:

```sh
node scripts/generate-vapid-keys.mjs
```

It prints a public key and a private key. **Save both somewhere safe — they're effectively your push-API password.**

---

## 3. Set the public key in Netlify

Netlify → your site → **Site configuration → Environment variables** → Add variable:

- Key: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- Value: the public key from step 2
- Scope: All deploys

Save, then trigger a redeploy (Deploys → Trigger deploy → Deploy site) so the new env var gets baked into the build.

---

## 4. Install the Supabase CLI (if you haven't)

```sh
brew install supabase/tap/supabase
```

Then link this project (one-off):

```sh
supabase login
supabase link --project-ref cwdrksilpeppcslwjeqi
```

(Project ref is in your Supabase URL — already visible in the email logs we saw earlier.)

---

## 5. Set the secrets the edge function needs

```sh
supabase secrets set VAPID_PUBLIC_KEY="<public key>"
supabase secrets set VAPID_PRIVATE_KEY="<private key>"
supabase secrets set VAPID_SUBJECT="mailto:hello@tender.ink"
```

---

## 6. Deploy the edge function

```sh
supabase functions deploy push --no-verify-jwt
```

`--no-verify-jwt` is important — Database Webhooks don't send a JWT, and this function is only invoked by webhooks.

---

## 7. Set up the two database webhooks

Supabase dashboard → **Database → Webhooks → Create a new webhook**.

### Webhook A: matches → push

- Name: `push-on-match`
- Table: `matches`
- Events: ✅ Insert (only)
- Type: **Supabase Edge Functions**
- Edge Function: `push`
- HTTP Method: POST
- Save

### Webhook B: messages → push

- Name: `push-on-message`
- Table: `messages`
- Events: ✅ Insert (only)
- Type: **Supabase Edge Functions**
- Edge Function: `push`
- HTTP Method: POST
- Save

---

## 8. Test

1. Open `https://tender.ink` on your phone (Safari on iPhone, Chrome on Android).
2. **iPhone only:** install via Share → Add to Home Screen, then open the app from the home-screen icon. Push doesn't work in iOS Safari unless installed.
3. Sign in.
4. Cog menu → **Notifications** → toggle to **On** → grant permission when prompted.
5. From a second account on another device, like you back. You should get a "It's a match!" notification.
6. Send a message from that other account. You should get a notification with the sender's name and message preview.

If it doesn't fire, check **Supabase → Edge Functions → push → Logs**. Common issues:
- VAPID secret missing → 500 with "misconfigured"
- Subscription expired → row will be auto-deleted next attempt
- No `push_subscriptions` row for the user → silent (means they didn't toggle it on)
