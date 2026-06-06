'use client';

// The directory replaces Tender's swipe deck as the primary discovery surface.
// Crew are browsed in a grid filtered by marina + department — the way people
// actually meet in the industry, not a Tinder-style swipe stack.

import { useEffect, useState } from 'react';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
import { supabase } from '../../lib/supabase';
import { MARINAS, DEPARTMENTS, departmentForRole, type Department, type ProfilePrompt } from '../../lib/yachting';

const PLACEHOLDER_AVATAR = '/tender-logo.svg';

export interface DirectoryProfile {
  id: string;
  user_id: string;
  name: string;
  role: string;
  age: number;
  nationality?: string | null;
  bio?: string | null;
  languages?: string[] | null;
  interests?: string[] | null;
  home_port?: string | null;
  season?: string | null;
  availability?: string | null;
  prompts?: ProfilePrompt[] | null;
  verified?: boolean | null;
  last_seen?: string | null;
  photos: { url: string; order: number }[];
}

interface CrewDirectoryProps {
  userId: string;
  defaultMarina: string;
  excludedUserIds: Set<string>;
  onViewProfile: (p: DirectoryProfile) => void;
}

export default function CrewDirectory({
  userId,
  defaultMarina,
  excludedUserIds,
  onViewProfile,
}: CrewDirectoryProps) {
  const [marina, setMarina] = useState(defaultMarina || MARINAS[0]);
  const [department, setDepartment] = useState<Department | ''>('');
  const [crew, setCrew] = useState<DirectoryProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, user_id, name, role, age, nationality, bio, languages, interests, home_port, season, availability, prompts, verified, last_seen, photos(url, order)')
        .neq('user_id', userId)
        .eq('home_port', marina)
        .order('verified', { ascending: false })
        .order('last_seen', { ascending: false, nullsFirst: false });

      if (cancelled) return;
      const rows = ((data as any[]) || [])
        .filter(p => !excludedUserIds.has(p.user_id))
        .map(p => ({
          ...p,
          photos: (p.photos || []).slice().sort((a: any, b: any) => a.order - b.order),
        })) as DirectoryProfile[];
      setCrew(rows);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [marina, userId, excludedUserIds]);

  const visible = department ? crew.filter(p => departmentForRole(p.role) === department) : crew;

  return (
    <div className="flex flex-col h-full bg-gray-50 min-h-0">
      {/* Marina + department picker */}
      <div className="bg-white border-b shrink-0 p-4 space-y-3">
        <div>
          <label className="block text-xs font-semibold text-[var(--tender-navy)] uppercase tracking-wide mb-1">Marina</label>
          <select
            value={marina}
            onChange={e => setMarina(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
          >
            {MARINAS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          <DeptChip label="All" active={department === ''} onClick={() => setDepartment('')} />
          {DEPARTMENTS.map(d => (
            <DeptChip key={d} label={d} active={department === d} onClick={() => setDepartment(d)} />
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center text-gray-500 py-12">Loading crew…</div>
        ) : visible.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-semibold text-[var(--tender-navy)] mb-1">
              No crew in {marina}
              {department ? ` (${department})` : ''}
            </p>
            <p className="text-sm text-gray-500">Try another marina or department.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-3">{visible.length} crew in {marina}{department ? ` · ${department}` : ''}</p>
            <div className="grid grid-cols-2 gap-3">
              {visible.map(p => <CrewCard key={p.id} profile={p} onTap={() => onViewProfile(p)} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DeptChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active
          ? 'bg-[var(--tender-red)] text-white'
          : 'bg-gray-100 text-[var(--tender-navy)] hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

function CrewCard({ profile, onTap }: { profile: DirectoryProfile; onTap: () => void }) {
  const photo = profile.photos[0]?.url || PLACEHOLDER_AVATAR;
  return (
    <button onClick={onTap} className="w-full text-left bg-white rounded-2xl overflow-hidden shadow-sm relative aspect-[3/4] focus:outline-none focus:ring-2 focus:ring-[var(--tender-red)]">
      <img src={photo} alt={profile.name} className="w-full h-full object-cover" draggable={false} />
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent text-white">
        <p className="font-bold text-base flex items-center gap-1.5">
          <span className="truncate">
            {profile.name}{profile.age ? `, ${profile.age}` : ''}
          </span>
          {profile.verified && <CheckBadgeIcon className="w-4 h-4 shrink-0 text-[var(--tender-blue)]" aria-label="Verified" />}
        </p>
        <p className="text-xs opacity-90 truncate">{profile.role}</p>
        {profile.season && <p className="text-[11px] opacity-80 truncate">⚓ {profile.season}</p>}
      </div>
    </button>
  );
}
