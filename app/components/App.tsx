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

  // Show auth modal if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <img src="/tender-logo.svg" alt="Tender" className="h-16 mx-auto mb-8" />
          <h1 className="text-4xl font-bold text-[var(--tender-navy)] mb-4">
            Welcome to Tender
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Find your perfect yacht crew match
          </p>
          {isDemoMode && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 max-w-md mx-auto">
              <p className="text-yellow-800 text-sm">
                <strong>Demo Mode:</strong> This is a preview version. Sign up to test the interface!
              </p>
            </div>
          )}
          <div className="space-x-4">
            <button
              onClick={() => {
                setAuthMode('signin');
                setShowAuthModal(true);
              }}
              className="bg-[var(--tender-red)] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[var(--tender-red)]/90"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthMode('signup');
                setShowAuthModal(true);
              }}
              className="bg-[var(--tender-blue)] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[var(--tender-blue)]/90"
            >
              Sign Up
            </button>
          </div>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          mode={authMode}
          onModeChange={setAuthMode}
        />
      </div>
    );
  }

  // Show profile setup if logged in but no profile
  if (!profileComplete) {
    return <ProfileSetup onComplete={() => setProfileComplete(true)} />;
  }

  // Show main app if logged in and profile complete
  return <MainApp />;
}
