// Bootstraps PostHog (product analytics) and Sentry (error tracking)
// from public env vars baked into the build at compile time.
// Both are no-ops if their key is missing, so local builds without
// these set still run.

import posthog from 'posthog-js';
import * as Sentry from '@sentry/react';

let booted = false;

export function initObservability() {
  if (booted || typeof window === 'undefined') return;
  booted = true;

  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.posthog.com';
  if (posthogKey) {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
    });
  }

  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NEXT_PUBLIC_ENV || 'production',
      tracesSampleRate: 0.1,
      // Automatically capture errors thrown from React error boundaries.
      // Add user context when we know who the user is (see identifyUser).
    });
  }
}

export function identifyUser(userId: string, email?: string | null) {
  if (typeof window === 'undefined') return;
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.identify(userId, email ? { email } : undefined);
  }
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setUser({ id: userId, email: email ?? undefined });
  }
}

export function resetUser() {
  if (typeof window === 'undefined') return;
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) posthog.reset();
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) Sentry.setUser(null);
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.capture(event, properties);
  }
}
