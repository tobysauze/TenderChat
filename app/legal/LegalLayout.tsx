'use client';

// Shared shell for the static legal pages. Centred narrow column,
// readable type, back button. Public — no auth required.

import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

export default function LegalLayout({
  title,
  effective,
  children,
}: {
  title: string;
  effective: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-[100dvh] bg-gray-50 text-[var(--tender-navy)]">
      <div className="max-w-2xl mx-auto px-5 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[var(--tender-red)] mb-6"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Tender
        </Link>
        <h1 className="text-3xl font-bold mb-1">{title}</h1>
        <p className="text-sm text-gray-500 mb-8">Effective {effective}</p>
        <article className="space-y-5 text-[15px] leading-relaxed [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:text-gray-700 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_li]:text-gray-700 [&_a]:text-[var(--tender-red)] [&_a]:underline">
          {children}
        </article>
      </div>
    </main>
  );
}
