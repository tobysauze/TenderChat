'use client';

import { useEffect, useState } from 'react';
import { XMarkIcon, ArrowUpOnSquareIcon } from '@heroicons/react/24/solid';
import { Capacitor } from '@capacitor/core';

const DISMISS_KEY = 'tender-install-prompt-dismissed';

// iOS Safari has no native PWA install prompt — users have to tap the
// Share button and pick "Add to Home Screen" themselves. This banner
// nudges them once. It's intentionally only shown on iOS Safari (not
// in-app browsers, not Android, not desktop) to avoid noise where it
// either isn't relevant or the browser handles install natively.
export default function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Already a native app (Capacitor) — there's nothing to "add to home screen".
    if (Capacitor.isNativePlatform()) return;

    // Already installed — running from the home screen.
    const standalone =
      // @ts-expect-error iOS Safari adds navigator.standalone
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    if (standalone) return;

    if (localStorage.getItem(DISMISS_KEY)) return;

    const ua = window.navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (!isIOS) return;

    // Defer a moment so it doesn't slam in front of the auth flow.
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setShow(false);
  };

  return (
    <div className="fixed bottom-3 left-3 right-3 z-50 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 flex items-start gap-3">
      <img src="/apple-touch-icon.png" alt="" className="w-12 h-12 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--tender-navy)]">Install Tender</p>
        <p className="text-xs text-gray-600 mt-0.5 leading-snug">
          Tap{' '}
          <ArrowUpOnSquareIcon className="w-3.5 h-3.5 inline-block -mt-0.5 text-[var(--tender-navy)]" />{' '}
          then <span className="font-medium">Add to Home Screen</span> to get the app on your phone.
        </p>
      </div>
      <button
        onClick={dismiss}
        className="p-1 -m-1 text-gray-400 hover:text-gray-600 shrink-0"
        aria-label="Dismiss install prompt"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>
  );
}
