// One-off VAPID keypair generator for Web Push.
// Run:  npx web-push generate-vapid-keys --json
// or:   node scripts/generate-vapid-keys.mjs
//
// Public key  -> Netlify env var NEXT_PUBLIC_VAPID_PUBLIC_KEY
// Private key -> Supabase function secret VAPID_PRIVATE_KEY
//
// Both also need: VAPID_SUBJECT (a mailto: URL or HTTPS site URL).

import { execSync } from 'child_process';

try {
  // web-push CLI ships with the `web-push` package. We don't depend on it
  // at runtime — install temporarily just to generate keys.
  const out = execSync('npx --yes web-push generate-vapid-keys --json', { encoding: 'utf8' });
  const keys = JSON.parse(out);
  console.log('VAPID keys generated.\n');
  console.log('Add these to the right places — DO NOT commit them.\n');
  console.log('  Netlify env (Site → Environment variables):');
  console.log(`    NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}\n`);
  console.log('  Supabase Edge Function secrets (run in your shell after `supabase link`):');
  console.log(`    supabase secrets set VAPID_PUBLIC_KEY=${keys.publicKey}`);
  console.log(`    supabase secrets set VAPID_PRIVATE_KEY=${keys.privateKey}`);
  console.log(`    supabase secrets set VAPID_SUBJECT=mailto:hello@tender.ink`);
} catch (e) {
  console.error('Failed to generate VAPID keys:', e.message);
  process.exit(1);
}
