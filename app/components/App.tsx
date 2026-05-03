'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isDemoMode } from '../../lib/supabase';
import AuthModal from './AuthModal';
import ProfileSetup from './ProfileSetup';
import MainApp from './MainApp';

export default function App() {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [profileComplete, setProfileComplete] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  // Check if user has a complete profile
  useEffect(() => {
    if (user && !loading) {
      checkProfile();
    } else if (!user && !loading) {
      setCheckingProfile(false);
    }
  }, [user, loading]);

  // Online presence heartbeat: bump profiles.last_seen for the current user
  // on mount, on focus, and every 2 minutes while the tab is open.
  useEffect(() => {
    if (!user || isDemoMode) return;

    const ping = () => {
      supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('user_id', user.id)
        .then(() => {});
    };

    ping();
    const interval = setInterval(ping, 2 * 60 * 1000);
    const onFocus = () => ping();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [user]);

  const checkProfile = async () => {
    if (!user) return;
    
    try {
      if (isDemoMode) {
        // Demo mode - check localStorage
        const demoProfile = localStorage.getItem('demo-profile');
        setProfileComplete(!!demoProfile);
        setCheckingProfile(false);
        return;
      }

      // Real Supabase mode
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking profile:', error);
      }

      setProfileComplete(!!data);
    } catch (error) {
      console.error('Error checking profile:', error);
    } finally {
      setCheckingProfile(false);
    }
  };

  if (loading || checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--tender-red)] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page + auth modal if not logged in
  if (!user) {
    const openSignUp = () => { setAuthMode('signup'); setShowAuthModal(true); };
    const openSignIn = () => { setAuthMode('signin'); setShowAuthModal(true); };

    return (
      <main className="min-h-[100dvh] bg-gray-50 text-[var(--tender-navy)]">
        {/* Top bar */}
        <header className="px-5 sm:px-8 py-4 flex items-center justify-between">
          <img src="/tender-logo.svg" alt="Tender" className="h-12" />
          <button
            onClick={openSignIn}
            className="text-sm font-semibold text-[var(--tender-navy)] hover:text-[var(--tender-red)]"
          >
            Sign in
          </button>
        </header>

        {/* Hero */}
        <section className="px-5 sm:px-8 py-12 sm:py-20 max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
            The dating-style app for{' '}
            <span className="text-[var(--tender-red)]">yacht crew</span>.
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-xl mx-auto">
            Swipe, match and chat with crew in the same dock, on the same boat, or heading
            to the same season. Tender is built for the yachting world — not for everyone else.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={openSignUp}
              className="bg-[var(--tender-red)] text-white px-8 py-3 rounded-full font-semibold hover:opacity-90"
            >
              Create your profile
            </button>
            <button
              onClick={openSignIn}
              className="bg-white border border-gray-200 text-[var(--tender-navy)] px-8 py-3 rounded-full font-semibold hover:bg-gray-50"
            >
              I already have an account
            </button>
          </div>
          {isDemoMode && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-6 max-w-md mx-auto text-sm text-yellow-800">
              <strong>Demo Mode:</strong> this build is running without Supabase credentials.
            </div>
          )}
        </section>

        {/* Feature trio */}
        <section className="px-5 sm:px-8 pb-16 max-w-5xl mx-auto grid sm:grid-cols-3 gap-4">
          {[
            {
              title: 'Find your crew',
              body: "Swipe through profiles built for yachting — role, certs, vessel size, availability — not generic dating.",
            },
            {
              title: 'Match and chat',
              body: 'When the like is mutual, you can message instantly. No paywalls.',
            },
            {
              title: 'Built for boats',
              body: "Online status when you have signal, push notifications when you don't, sane on cabin Wi-Fi.",
            },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-[var(--tender-navy)] mb-1">{f.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </section>

        {/* Footer */}
        <footer className="px-5 sm:px-8 py-8 border-t border-gray-200 text-sm text-gray-500 flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center items-center">
          <span>© Tender</span>
          <a href="/legal/privacy/" className="hover:text-[var(--tender-red)]">Privacy</a>
          <a href="/legal/terms/" className="hover:text-[var(--tender-red)]">Terms</a>
          <a href="mailto:hello@tender.ink" className="hover:text-[var(--tender-red)]">Contact</a>
        </footer>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          mode={authMode}
          onModeChange={setAuthMode}
        />
      </main>
    );
  }

  // Show profile setup if logged in but no profile
  if (!profileComplete) {
    return <ProfileSetup onComplete={() => setProfileComplete(true)} />;
  }

  // Show main app if logged in and profile complete
  return <MainApp />;
}
