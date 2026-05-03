'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { track } from '../../lib/observability';
import { XMarkIcon } from '@heroicons/react/24/solid';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'signin' | 'signup';
  onModeChange: (mode: 'signin' | 'signup') => void;
}

type View = 'auth' | 'reset-request' | 'reset-sent';

export default function AuthModal({ isOpen, onClose, mode, onModeChange }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [view, setView] = useState<View>('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'signup') {
        if (!ageConfirmed) {
          throw new Error('You need to confirm you are 18 or older to sign up.');
        }
        const { error } = await signUp(email, password, {
          name,
          role,
          age_confirmed_at: new Date().toISOString(),
        });
        if (error) throw error;
        track('signup_submitted', { role });
        // Profile will be created after email confirmation
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        track('sign_in');
      }
      onClose();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset/`,
      });
      if (error) throw error;
      setView('reset-sent');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const goToAuth = () => {
    setView('auth');
    setError('');
  };

  if (!isOpen) return null;

  const headerTitle =
    view === 'reset-request' || view === 'reset-sent'
      ? 'Reset password'
      : mode === 'signup'
      ? 'Join Tender'
      : 'Welcome Back';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[var(--tender-navy)]">{headerTitle}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {view === 'reset-sent' && (
          <>
            <p className="text-[var(--tender-navy)] mb-2">Check your inbox</p>
            <p className="text-sm text-gray-600 mb-6">
              We sent a password-reset link to <strong>{email}</strong>. Open it on the same
              device you want to sign in on.
            </p>
            <button
              type="button"
              onClick={goToAuth}
              className="w-full bg-[var(--tender-red)] text-white py-3 rounded-lg font-semibold hover:bg-[var(--tender-red)]/90"
            >
              Back to sign in
            </button>
          </>
        )}

        {view === 'reset-request' && (
          <form onSubmit={handlePasswordResetRequest} className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter your email and we'll send a link to reset your password.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--tender-red)] text-white py-3 rounded-lg font-semibold hover:bg-[var(--tender-red)]/90 disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <button
              type="button"
              onClick={goToAuth}
              className="w-full text-[var(--tender-blue)] hover:underline text-sm"
            >
              Back to sign in
            </button>
          </form>
        )}

        {view === 'auth' && (
        <>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
                  required
                >
                  <option value="">Select your role</option>
                  <option value="Captain">Captain</option>
                  <option value="First Officer">First Officer</option>
                  <option value="Chief Engineer">Chief Engineer</option>
                  <option value="2nd Engineer">2nd Engineer</option>
                  <option value="3rd Engineer">3rd Engineer</option>
                  <option value="Chief Stewardess">Chief Stewardess</option>
                  <option value="2nd Stewardess">2nd Stewardess</option>
                  <option value="3rd Stewardess">3rd Stewardess</option>
                  <option value="Stewardess">Stewardess</option>
                  <option value="Chef">Chef</option>
                  <option value="Sous Chef">Sous Chef</option>
                  <option value="Bosun">Bosun</option>
                  <option value="Deckhand">Deckhand</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
              required
            />
          </div>

          {mode === 'signup' && (
            <label className="flex items-start gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                className="mt-0.5 accent-[var(--tender-red)]"
                required
              />
              <span>
                I'm 18 or older and I agree to Tender's{' '}
                <a href="/legal/terms/" target="_blank" rel="noreferrer" className="text-[var(--tender-red)] underline">
                  Terms
                </a>{' '}
                and{' '}
                <a href="/legal/privacy/" target="_blank" rel="noreferrer" className="text-[var(--tender-red)] underline">
                  Privacy Policy
                </a>.
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'signup' && !ageConfirmed)}
            className="w-full bg-[var(--tender-red)] text-white py-3 rounded-lg font-semibold hover:bg-[var(--tender-red)]/90 disabled:opacity-50"
          >
            {loading ? 'Loading...' : (mode === 'signup' ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        {mode === 'signin' && (
          <div className="mt-3 text-center">
            <button
              onClick={() => { setView('reset-request'); setError(''); }}
              className="text-sm text-gray-500 hover:underline"
            >
              Forgot password?
            </button>
          </div>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={() => onModeChange(mode === 'signin' ? 'signup' : 'signin')}
            className="text-[var(--tender-blue)] hover:underline"
          >
            {mode === 'signin'
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"
            }
          </button>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
