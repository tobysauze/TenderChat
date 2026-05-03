'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';

// Lands here from the password-reset email. Supabase puts the recovery
// token in the URL hash (#access_token=…&type=recovery) and the JS client
// picks it up automatically, signing the user in to a recovery session.
// We just need to wait for that session, then let them set a new password.

type Status = 'checking' | 'ready' | 'updating' | 'done' | 'no-token' | 'error';

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // If the user already has a session (recovery token consumed), we're good.
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (mounted) setStatus('ready');
        return;
      }

      // Otherwise wait for onAuthStateChange to fire with the recovery event.
      const { data: sub } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
          if (mounted) setStatus('ready');
        }
      });

      // Hash should be #access_token=…&type=recovery&… If the page was opened
      // without a token (e.g. someone navigated here directly), give up after
      // a moment and show a helpful message.
      const timeout = setTimeout(() => {
        const hasHash =
          typeof window !== 'undefined' && window.location.hash.includes('access_token');
        if (mounted && !hasHash) setStatus('no-token');
      }, 1500);

      return () => {
        sub.subscription.unsubscribe();
        clearTimeout(timeout);
      };
    };

    const cleanup = init();
    return () => {
      mounted = false;
      Promise.resolve(cleanup).then((fn) => fn && fn());
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setStatus('updating');
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) {
      setError(updateErr.message);
      setStatus('ready');
      return;
    }
    setStatus('done');
    // Redirect home after a moment so the user lands signed in.
    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
  };

  return (
    <main className="min-h-[100dvh] bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <img src="/tender-logo.svg" alt="Tender" className="h-14 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-[var(--tender-navy)] text-center mb-1">
          Reset password
        </h1>

        {status === 'checking' && (
          <p className="text-center text-gray-500 text-sm mt-4">Verifying reset link…</p>
        )}

        {status === 'no-token' && (
          <>
            <p className="text-center text-gray-600 text-sm mt-4">
              This page only works when you arrive via the link in your reset email.
              Open the link from the email on this device.
            </p>
            <a
              href="/"
              className="block mt-6 text-center bg-[var(--tender-red)] text-white py-3 rounded-lg font-semibold hover:bg-[var(--tender-red)]/90"
            >
              Back to Tender
            </a>
          </>
        )}

        {(status === 'ready' || status === 'updating') && (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <p className="text-sm text-gray-600 text-center">
              Choose a new password for your account.
            </p>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
                required
                minLength={6}
                style={{ fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
                required
                minLength={6}
                style={{ fontSize: '16px' }}
              />
            </div>
            <button
              type="submit"
              disabled={status === 'updating'}
              className="w-full bg-[var(--tender-red)] text-white py-3 rounded-lg font-semibold hover:bg-[var(--tender-red)]/90 disabled:opacity-50"
            >
              {status === 'updating' ? 'Updating…' : 'Set new password'}
            </button>
          </form>
        )}

        {status === 'done' && (
          <p className="text-center text-[var(--tender-navy)] mt-4">
            Password updated. Taking you back to Tender…
          </p>
        )}

        {status === 'error' && (
          <p className="text-center text-red-600 text-sm mt-4">{error}</p>
        )}
      </div>
    </main>
  );
}
