'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isDemoMode } from '../../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: any) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      // Demo mode - check localStorage for demo user
      const demoUser = localStorage.getItem('demo-user');
      if (demoUser) {
        const userData = JSON.parse(demoUser);
        setUser(userData);
        setSession({ user: userData } as Session);
      }
      setLoading(false);
      return;
    }

    // Real Supabase mode
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData: any) => {
    if (isDemoMode) {
      // Demo mode - create fake user
      const demoUser = {
        id: 'demo-user-' + Date.now(),
        email,
        user_metadata: userData,
        created_at: new Date().toISOString(),
        app_metadata: {},
        aud: 'authenticated',
        role: 'authenticated',
        updated_at: new Date().toISOString(),
        phone: '',
        email_confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        identities: [],
        factors: [],
        is_anonymous: false,
      } as User;
      localStorage.setItem('demo-user', JSON.stringify(demoUser));
      setUser(demoUser);
      setSession({ user: demoUser } as Session);
      return { data: { user: demoUser }, error: null };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    if (isDemoMode) {
      // Demo mode - check localStorage
      const demoUser = localStorage.getItem('demo-user');
      if (demoUser) {
        const userData = JSON.parse(demoUser);
        if (userData.email === email) {
          setUser(userData as User);
          setSession({ user: userData } as Session);
          return { data: { user: userData }, error: null };
        }
      }
      return { data: null, error: { message: 'Demo user not found' } };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    if (isDemoMode) {
      localStorage.removeItem('demo-user');
      setUser(null);
      setSession(null);
      return;
    }

    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
