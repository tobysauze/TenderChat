'use client';

import { useState } from 'react';
import { XMarkIcon, CheckBadgeIcon } from '@heroicons/react/24/solid';
import { departmentForRole, ProfilePrompt } from '../../lib/yachting';

export interface ViewableProfile {
  name: string;
  age?: number;
  role: string;
  nationality?: string;
  bio?: string;
  languages?: string[];
  interests?: string[];
  home_port?: string | null;
  season?: string | null;
  availability?: string | null;
  prompts?: ProfilePrompt[] | null;
  verified?: boolean | null;
  photos: { url: string; order: number }[];
}

interface ProfileViewProps {
  profile: ViewableProfile;
  onClose: () => void;
  previewBanner?: boolean;
}

export default function ProfileView({ profile, onClose, previewBanner }: ProfileViewProps) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const sortedPhotos = [...profile.photos].sort((a, b) => a.order - b.order);
  const total = Math.max(sortedPhotos.length, 1);

  const advance = () => setPhotoIdx(i => (i + 1) % total);
  const back = () => setPhotoIdx(i => (i - 1 + total) % total);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-3xl overflow-hidden h-[100dvh] sm:h-auto sm:max-h-[90vh] relative flex flex-col">
        {/* Floating controls — sit above the scroll container so they're always visible */}
        <button
          onClick={onClose}
          style={{ top: 'calc(0.75rem + env(safe-area-inset-top))' }}
          className="absolute right-3 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 z-30"
          aria-label="Close"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
        {previewBanner && (
          <div
            style={{ top: 'calc(0.75rem + env(safe-area-inset-top))' }}
            className="absolute left-3 z-30 px-3 py-1 rounded-full bg-[var(--tender-red)] text-white text-xs font-semibold tracking-wide uppercase"
          >
            Preview
          </div>
        )}

        {/* Single scroll region — photo + body scroll together */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Photo */}
          <div className="relative aspect-[3/4] bg-gray-100 select-none">
            {sortedPhotos[photoIdx]?.url ? (
              <img
                src={sortedPhotos[photoIdx].url}
                alt={profile.name}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[var(--tender-blue)]/30 to-[var(--tender-navy)]/30 flex items-center justify-center">
                <span className="text-7xl font-bold text-[var(--tender-navy)]/40">
                  {profile.name?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}

            {/* Photo segments */}
            {sortedPhotos.length > 1 && (
              <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
                {sortedPhotos.map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-1 rounded-full ${
                      i === photoIdx ? 'bg-white' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Tap zones (don't block vertical scroll — buttons only fire on tap, not drag) */}
            {sortedPhotos.length > 1 && (
              <>
                <button
                  onClick={back}
                  className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
                  aria-label="Previous photo"
                />
                <button
                  onClick={advance}
                  className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
                  aria-label="Next photo"
                />
              </>
            )}

            {/* Name overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[var(--tender-navy)]/95 via-[var(--tender-navy)]/40 to-transparent text-white pointer-events-none">
              <h2 className="text-3xl font-bold flex items-center gap-2">
                <span>{profile.name || 'Unnamed'}{profile.age ? `, ${profile.age}` : ''}</span>
                {profile.verified && (
                  <CheckBadgeIcon className="w-6 h-6 text-[var(--tender-blue)]" aria-label="Verified crew" />
                )}
              </h2>
              <p className="text-lg opacity-90">
                {profile.role || '—'}
                {departmentForRole(profile.role) && (
                  <span className="opacity-70"> · {departmentForRole(profile.role)}</span>
                )}
              </p>
              {(profile.home_port || profile.season) && (
                <p className="text-sm opacity-90 mt-1">
                  {[profile.home_port, profile.season].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5">
            {(profile.home_port || profile.season || profile.availability) && (
              <Section title="On the water">
                <div className="flex flex-wrap gap-2">
                  {profile.home_port && <InfoChip label={profile.home_port} />}
                  {profile.season && <InfoChip label={profile.season} />}
                  {profile.availability && <InfoChip label={profile.availability} />}
                </div>
              </Section>
            )}
            {profile.prompts && profile.prompts.length > 0 && (
              <Section title="Prompts">
                <div className="space-y-3">
                  {profile.prompts.map((p, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-[var(--tender-navy)] uppercase tracking-wide mb-1">{p.prompt}</p>
                      <p className="text-gray-800">{p.answer}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}
            {profile.nationality && (
              <Section title="Nationality">
                <p className="text-gray-700">{profile.nationality}</p>
              </Section>
            )}
            {profile.bio && (
              <Section title="About">
                <p className="text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
              </Section>
            )}
            {profile.languages && profile.languages.length > 0 && (
              <Section title="Languages">
                <ChipRow items={profile.languages} className="bg-[var(--tender-blue)]/20 text-[var(--tender-navy)]" />
              </Section>
            )}
            {profile.interests && profile.interests.length > 0 && (
              <Section title="Interests">
                <ChipRow items={profile.interests} className="bg-[var(--tender-red)]/10 text-[var(--tender-red)]" />
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-[var(--tender-navy)] uppercase tracking-wide mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoChip({ label }: { label: string }) {
  return (
    <span className="px-3 py-1 rounded-full text-sm bg-[var(--tender-blue)]/20 text-[var(--tender-navy)] font-medium">
      {label}
    </span>
  );
}

function ChipRow({ items, className }: { items: string[]; className: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => (
        <span key={item} className={`px-3 py-1 rounded-full text-sm ${className}`}>
          {item}
        </span>
      ))}
    </div>
  );
}
