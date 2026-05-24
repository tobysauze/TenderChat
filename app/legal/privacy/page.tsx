// Starter privacy policy for Tender. Worth reviewing with a tool like
// Termly or iubenda, or with a lawyer, before scaling beyond a friends-
// and-crew launch — this is a reasonable v1, not a substitute for proper
// legal advice.

import LegalLayout from '../LegalLayout';

export const metadata = { title: 'Privacy Policy — Tender' };

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" effective="May 2026">
      <p>
        This policy explains how Tender (“we”, “us”) handles personal information when you use the
        app at <a href="https://tender.ink">tender.ink</a> or its installed PWA.
      </p>

      <h2>1. Who we are</h2>
      <p>
        Tender is operated by Toby Sauzé (UK). For privacy questions, contact{' '}
        <a href="mailto:hello@tender.ink">hello@tender.ink</a>.
      </p>

      <h2>2. What we collect</h2>
      <ul>
        <li>Account data: email address, password (hashed by Supabase Auth).</li>
        <li>Profile data: name, age, role, languages, interests, bio, photos.</li>
        <li>Activity: who you swipe on, who you match with, your messages, your last-seen timestamp.</li>
        <li>Device/usage: user agent (for push notifications), IP address (transient, processed by our hosts).</li>
      </ul>

      <h2>3. How we use it</h2>
      <ul>
        <li>To show you to other users on the swipe deck so they can match with you, and vice versa.</li>
        <li>To deliver messages between matched users.</li>
        <li>To send transactional emails (sign-up confirmation, password reset).</li>
        <li>To send push notifications, if you enable them, when you receive a match or a message.</li>
        <li>To detect abuse and respond to safety reports.</li>
      </ul>
      <p>
        Your messages are private to you and the person you matched with — no other user can see
        them. They are <strong>not end-to-end encrypted</strong>: we do not monitor private
        conversations as a matter of routine, but we are able to access message content where it is
        necessary to investigate a report, prevent abuse, or comply with a legal obligation.
      </p>

      <h2>4. Legal basis (UK / EU GDPR)</h2>
      <p>
        We rely on <strong>contract</strong> (running the matching service you signed up for),
        <strong> legitimate interest</strong> (preventing abuse, securing the service), and your
        <strong> consent</strong> (for push notifications, which you can withdraw at any time in the
        cog menu).
      </p>

      <h2>5. Who we share data with</h2>
      <ul>
        <li><strong>Supabase</strong> (Frankfurt, EU) — hosts our database, storage and authentication.</li>
        <li><strong>Resend</strong> — sends transactional emails on our behalf.</li>
        <li><strong>Netlify</strong> — hosts the front-end and serves your photos.</li>
        <li>Web push providers (Apple, Google, Mozilla) — deliver notifications you enable.</li>
      </ul>
      <p>We do not sell or rent your data, and we do not run third-party advertising.</p>

      <h2>6. Where data is stored</h2>
      <p>
        Primary storage is in Supabase's EU-West region. Photos are served via the public Supabase
        storage CDN.
      </p>

      <h2>7. Retention</h2>
      <p>
        We keep your account data while your account exists. Deleting your account from the cog
        menu removes your profile, photos, swipes, matches and messages. Reports filed against
        another user are retained for moderation purposes even if either party leaves.
      </p>

      <h2>8. Your rights</h2>
      <p>You can:</p>
      <ul>
        <li>Access or correct your data — edit your profile in the app.</li>
        <li>Delete your account — cog menu → Delete account.</li>
        <li>Withdraw push consent — cog menu → Notifications.</li>
        <li>Request a data export, restrict processing, object to processing, or complain to the UK ICO.</li>
      </ul>
      <p>
        To exercise the rights not directly available in the app, email{' '}
        <a href="mailto:hello@tender.ink">hello@tender.ink</a> and we'll respond within 30 days.
      </p>

      <h2>9. Cookies and similar</h2>
      <p>
        We only use storage that's strictly necessary to keep you signed in and remember which
        chats you've already opened. We do not run analytics, marketing or advertising trackers.
      </p>

      <h2>10. Children</h2>
      <p>
        Tender is for adults only. You confirm you are 18 or older when you sign up. If you become
        aware that a minor has created an account, please email us.
      </p>

      <h2>11. Changes</h2>
      <p>
        If we make material changes, we'll surface a notice in the app. The date at the top of this
        page reflects the most recent revision.
      </p>
    </LegalLayout>
  );
}
