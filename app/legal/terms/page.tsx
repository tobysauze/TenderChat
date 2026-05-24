// Starter terms of service. As with the privacy policy, this is a
// reasonable v1 — review with a generator (Termly, iubenda) or a lawyer
// before scaling.

import LegalLayout from '../LegalLayout';

export const metadata = { title: 'Terms of Service — Tender' };

export default function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service" effective="May 2026">
      <p>
        Welcome to Tender. By creating an account or using the service, you agree to these terms.
        If you don't agree, please don't use Tender.
      </p>

      <h2>1. Eligibility</h2>
      <p>You must be at least 18 years old to use Tender. We're a service for adult yacht crew.</p>

      <h2>2. Your account</h2>
      <ul>
        <li>You may only create one account, and only for yourself.</li>
        <li>Information on your profile must be truthful — your name, age and role matter to the people you match with.</li>
        <li>Don't impersonate someone else.</li>
        <li>Keep your password secure. You're responsible for activity on your account.</li>
      </ul>

      <h2>3. Acceptable use</h2>
      <p>While using Tender, you agree not to:</p>
      <ul>
        <li>Harass, threaten, or abuse other users.</li>
        <li>Post nude, sexually explicit, violent, or otherwise inappropriate photos.</li>
        <li>Solicit money, run scams, recruit for unrelated services, or send commercial spam.</li>
        <li>Use the service for anything illegal.</li>
        <li>Attempt to scrape, reverse-engineer, or disrupt Tender or its underlying services.</li>
      </ul>
      <p>
        Tender has <strong>zero tolerance for objectionable content and abusive users</strong>. We
        may suspend or delete accounts at our discretion when these terms are broken — including in
        response to reports from other users.
      </p>

      <h2>4. Your content</h2>
      <p>
        You keep ownership of your photos, profile text, and messages. By uploading them you give
        us a non-exclusive licence to host, display and transmit that content for the purpose of
        running the service (e.g. showing your profile to people you match with).
      </p>

      <h2>5. Reports and moderation</h2>
      <p>
        Anyone can report another user from the chat menu. We review every report and remove
        objectionable content or the users responsible — normally within 24 hours — and may act
        without prior notice. If you believe your account has been suspended in error, email{' '}
        <a href="mailto:hello@tender.ink">hello@tender.ink</a>.
      </p>

      <h2>6. Termination</h2>
      <p>
        You may delete your account at any time from the cog menu. We may terminate accounts that
        breach these terms, are inactive, or where the service is being shut down. On termination,
        your profile, swipes, matches and messages are removed.
      </p>

      <h2>7. No guarantee</h2>
      <p>
        Tender is provided “as is”. We don't guarantee that you'll match with anyone, that anyone
        you match with is who they say they are, or that the service will be uninterrupted. Meet
        people you match with safely — see our safety tips when we publish them.
      </p>

      <h2>8. Liability</h2>
      <p>
        To the extent permitted by law, our liability for the service is limited to the amount you
        paid us in the previous 12 months (which today is £0 — Tender is free).
      </p>

      <h2>9. Governing law</h2>
      <p>
        These terms are governed by the law of England and Wales. Disputes will be resolved in the
        English courts.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about these terms: <a href="mailto:hello@tender.ink">hello@tender.ink</a>.
      </p>
    </LegalLayout>
  );
}
