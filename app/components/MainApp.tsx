'use client';

import { useState, useEffect, useRef } from 'react';
import { HeartIcon, XMarkIcon, Cog6ToothIcon, ChatBubbleLeftRightIcon, FireIcon, InformationCircleIcon, CheckBadgeIcon, AdjustmentsHorizontalIcon, UserGroupIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import ChatInterface from './ChatInterface';
import ProfileSettings from './ProfileSettings';
import ProfileView from './ProfileView';
import CrewDirectory from './CrewDirectory';
import MarinaChat from './MarinaChat';
import { computeCompletion } from '../../lib/profileCompletion';
import { formatLastSeen, isOnline } from '../../lib/lastSeen';
import { isPushSupported, getCurrentSubscription, subscribePush, unsubscribePush } from '../../lib/push';
import { track } from '../../lib/observability';
import { departmentForRole, ProfilePrompt, MARINAS, SEASONS, AVAILABILITY, DEPARTMENTS } from '../../lib/yachting';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  role: string;
  age: number;
  nationality: string;
  languages: string[];
  interests: string[];
  bio: string;
  home_port?: string | null;
  season?: string | null;
  availability?: string | null;
  prompts?: ProfilePrompt[] | null;
  verified?: boolean | null;
  photos: { url: string; order: number }[];
  imageUrl: string;
  last_seen?: string | null;
  match_id?: string;
}

interface LatestMessage {
  ts: string;
  senderId: string;
}

const PLACEHOLDER_AVATAR = '/tender-logo.svg';

// "Crew" is the marina-based directory (primary discovery); "Marina" is the
// per-marina open chat room; "Matches" is the existing matches/chat list.
type Tab = 'crew' | 'marina' | 'matches';

export default function MainApp() {
  const { user, signOut, deleteAccount } = useAuth();

  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<Profile[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Profile | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [showMatchAlert, setShowMatchAlert] = useState(false);
  const [matchAlertProfile, setMatchAlertProfile] = useState<Profile | null>(null);
  // The directory and marina-chat components own their own loading UI; this
  // top-level `loading` only gated the (now-removed) swipe deck.
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('crew');
  // The current user's marina (used as the default for the directory + chat room).
  const [myHomePort, setMyHomePort] = useState<string>('');
  // User IDs the user has blocked (or has been blocked by) — excluded from the directory.
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [viewingProfile, setViewingProfile] = useState<Profile | null>(null);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);

  // Deck filters — the yacht-specific discovery controls (marina / season /
  // department / availability / verified). Applied client-side to the loaded deck.
  const emptyFilters = { home_port: '', season: '', department: '', availability: '', verifiedOnly: false };
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(emptyFilters);

  const [myCompletion, setMyCompletion] = useState<{ percent: number; missing: string[] } | null>(null);

  // Push notifications: 'unsupported' | 'off' | 'on' | 'busy'
  const [pushState, setPushState] = useState<'unsupported' | 'off' | 'on' | 'busy'>('unsupported');

  // Per-match latest-message info, used to show "new message" indicators
  // on the matches grid. Keyed by match_id.
  const [latestMessages, setLatestMessages] = useState<Record<string, LatestMessage>>({});
  // Per-match "last opened" timestamps, persisted to localStorage so unread
  // state survives reloads. Keyed by match_id, value is an ISO string.
  const [readState, setReadState] = useState<Record<string, string>>({});

  // Touch/swipe state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadMatches();
      loadMyCompletion();
      loadBlocks();
      refreshPushState();
    }
  }, [user]);

  // Hydrate read-state from localStorage on user change.
  useEffect(() => {
    if (!user) { setReadState({}); return; }
    try {
      const raw = localStorage.getItem(`chat-read:${user.id}`);
      setReadState(raw ? JSON.parse(raw) : {});
    } catch {
      setReadState({});
    }
  }, [user]);

  // Mark a match as read (call when its chat opens).
  const markRead = (matchId: string) => {
    if (!user || !matchId) return;
    setReadState(prev => {
      const next = { ...prev, [matchId]: new Date().toISOString() };
      try {
        localStorage.setItem(`chat-read:${user.id}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // When the user opens a chat, reset its unread state.
  useEffect(() => {
    if (selectedMatch?.match_id) markRead(selectedMatch.match_id);
  }, [selectedMatch?.match_id]);

  // Fetch latest message per match, plus subscribe to new INSERTs so the
  // unread indicator updates live. Polling is the safety net while
  // realtime configuration shakes out (mirrors ChatInterface).
  useEffect(() => {
    if (!user || matches.length === 0) {
      setLatestMessages({});
      return;
    }
    const matchIds = matches.map(m => m.match_id).filter(Boolean) as string[];
    if (matchIds.length === 0) return;

    let cancelled = false;

    const fetchLatest = async () => {
      const { data } = await supabase
        .from('messages')
        .select('match_id, created_at, sender_id')
        .in('match_id', matchIds)
        .order('created_at', { ascending: false });
      if (cancelled || !data) return;
      const next: Record<string, LatestMessage> = {};
      for (const m of data as any[]) {
        if (!next[m.match_id]) {
          next[m.match_id] = { ts: m.created_at, senderId: m.sender_id };
        }
      }
      setLatestMessages(next);
    };

    fetchLatest();
    const onFocus = () => fetchLatest();
    window.addEventListener('focus', onFocus);
    const poll = setInterval(fetchLatest, 15000);

    const channel = supabase
      .channel(`user-messages:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload: any) => {
        const row = payload.new;
        if (!row || !matchIds.includes(row.match_id)) return;
        setLatestMessages(prev => ({
          ...prev,
          [row.match_id]: { ts: row.created_at, senderId: row.sender_id },
        }));
      })
      .subscribe();

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      clearInterval(poll);
      channel.unsubscribe();
    };
  }, [user, matches.map(m => m.match_id).filter(Boolean).join(',')]);

  const isUnread = (matchId?: string): boolean => {
    if (!matchId || !user) return false;
    const latest = latestMessages[matchId];
    if (!latest) return false;
    if (latest.senderId === user.id) return false;
    const readAt = readState[matchId];
    if (!readAt) return true;
    return new Date(latest.ts).getTime() > new Date(readAt).getTime();
  };

  const unreadCount = matches.filter(m => isUnread(m.match_id)).length;

  const refreshPushState = async () => {
    if (!isPushSupported()) {
      setPushState('unsupported');
      return;
    }
    const sub = await getCurrentSubscription();
    setPushState(sub && Notification.permission === 'granted' ? 'on' : 'off');
  };

  const handleTogglePush = async () => {
    if (!user) return;
    setPushState('busy');
    if (await getCurrentSubscription()) {
      await unsubscribePush();
      setPushState('off');
    } else {
      const result = await subscribePush(user.id);
      if (!result.ok) {
        setPushState('off');
        if (result.reason === 'permission-denied') {
          alert('Notifications are blocked. Enable them for tender.ink in your browser/system settings, then try again.');
        } else if (result.reason === 'missing-vapid-key') {
          alert('Notifications are not configured on this build yet.');
        } else if (result.reason !== 'unsupported') {
          alert('Could not enable notifications: ' + result.reason);
        }
        return;
      }
      setPushState('on');
    }
  };

  const loadMyCompletion = async () => {
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, photos(id)')
      .eq('user_id', user.id)
      .single();
    if (profile) {
      const result = computeCompletion({
        ...profile,
        photoCount: profile.photos?.length || 0,
      });
      setMyCompletion(result);
      setMyHomePort(profile.home_port || '');
    }
  };

  // Blocks (both directions) — used to exclude users from the directory.
  const loadBlocks = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
    const ids = new Set<string>(
      (data || []).map((r: any) => (r.blocker_id === user.id ? r.blocked_id : r.blocker_id))
    );
    setBlockedIds(ids);
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This will permanently remove your profile, photos, matches, and messages. This cannot be undone.'
    );
    if (!confirmed) return;
    const { error } = await deleteAccount();
    if (error) alert('Could not delete account: ' + error.message);
  };

  const loadProfiles = async () => {
    if (!user) return;
    try {
      // Profiles swiped on within the last 30 days are excluded — anything
      // older falls back into the deck (the "reset"). Blocks and existing
      // matches (in either direction) are excluded permanently. Matches are
      // included explicitly because the user who *received* the like and
      // closed the loop never inserts their own like row, so liking alone
      // isn't enough to keep matched users out of their deck.
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [likedRes, passedRes, blocksRes, matchesRes] = await Promise.all([
        supabase.from('likes').select('liked_id').eq('liker_id', user.id).gte('created_at', cutoff),
        supabase.from('passes').select('passed_id').eq('passer_id', user.id).gte('created_at', cutoff),
        supabase.from('blocks').select('blocker_id, blocked_id').or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
        supabase.from('matches').select('user1_id, user2_id').or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
      ]);

      const excludedIds = new Set<string>([
        ...((likedRes.data || []).map((r: any) => r.liked_id)),
        ...((passedRes.data || []).map((r: any) => r.passed_id)),
        ...((blocksRes.data || []).map((r: any) =>
          r.blocker_id === user.id ? r.blocked_id : r.blocker_id
        )),
        ...((matchesRes.data || []).map((r: any) =>
          r.user1_id === user.id ? r.user2_id : r.user1_id
        )),
      ]);

      let query = supabase
        .from('profiles')
        .select('*, photos (url, order)')
        .neq('user_id', user.id);

      if (excludedIds.size > 0) {
        query = query.not('user_id', 'in', `(${Array.from(excludedIds).join(',')})`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const profilesWithPhotos = data?.map(profile => ({
        ...profile,
        photos: profile.photos?.sort((a: any, b: any) => a.order - b.order) || [],
        imageUrl: profile.photos?.[0]?.url || PLACEHOLDER_AVATAR,
      })) || [];

      setProfiles(profilesWithPhotos);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMatches = async () => {
    if (!user) return;
    try {
      const { data: matchRows, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      if (matchesError) throw matchesError;
      if (!matchRows || matchRows.length === 0) {
        setMatches([]);
        return;
      }

      const matchedUserIds = matchRows.map(m => (m.user1_id === user.id ? m.user2_id : m.user1_id));
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*, photos (url, order)')
        .in('user_id', matchedUserIds);
      if (profilesError) throw profilesError;

      // Map other-user-id → match_id so each profile carries its own match_id.
      const matchByUserId: Record<string, string> = {};
      matchRows.forEach(m => {
        const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id;
        matchByUserId[otherId] = m.id;
      });

      const matchedProfiles = profilesData?.map(profile => ({
        ...profile,
        match_id: matchByUserId[profile.user_id],
        imageUrl: profile.photos?.[0]?.url || PLACEHOLDER_AVATAR,
        photos: profile.photos?.sort((a: any, b: any) => a.order - b.order) || [],
      })) || [];
      setMatches(matchedProfiles);
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  const recordLikeAndMaybeMatch = async (target: Profile) => {
    if (!user) return;

    const { data: existingMatch, error: checkError } = await supabase
      .from('matches')
      .select('*')
      .or(`and(user1_id.eq.${target.user_id},user2_id.eq.${user.id}),and(user1_id.eq.${user.id},user2_id.eq.${target.user_id})`)
      .limit(1)
      .maybeSingle();
    if (checkError) {
      console.error('Error checking for existing match:', checkError);
    }

    const formatMatch = () => ({
      ...target,
      imageUrl: target.photos?.[0]?.url || PLACEHOLDER_AVATAR,
      photos: target.photos?.sort((a: any, b: any) => a.order - b.order) || [],
    });

    if (existingMatch) {
      // Re-swiping on someone we're already matched with. Don't duplicate
      // the row in matches state — they're already there from loadMatches.
      const formatted = formatMatch();
      setMatches(prev =>
        prev.some(m => m.user_id === target.user_id) ? prev : [...prev, formatted]
      );
      setMatchAlertProfile(formatted);
      setShowMatchAlert(true);
      setTimeout(() => setShowMatchAlert(false), 1000);
      return;
    }

    const { data: existingLike, error: likeError } = await supabase
      .from('likes')
      .select('*')
      .eq('liker_id', target.user_id)
      .eq('liked_id', user.id)
      .limit(1)
      .maybeSingle();
    if (likeError) {
      console.error('Error checking for existing like:', likeError);
    }

    if (existingLike) {
      const { error: matchError } = await supabase
        .from('matches')
        .insert({ user1_id: user.id, user2_id: target.user_id });
      if (!matchError) {
        track('match_created', { target_role: target.role });
        // Insert our own like row so this user is excluded from our deck
        // by the standard likes filter on next reload (they wouldn't be
        // otherwise — only the *first* liker has a likes row).
        await supabase
          .from('likes')
          .insert({ liker_id: user.id, liked_id: target.user_id });

        const formatted = formatMatch();
        setMatches(prev =>
          prev.some(m => m.user_id === target.user_id) ? prev : [...prev, formatted]
        );
        setMatchAlertProfile(formatted);
        setShowMatchAlert(true);
        setTimeout(() => setShowMatchAlert(false), 1000);
      }
    } else {
      await supabase.from('likes').insert({ liker_id: user.id, liked_id: target.user_id });
    }
  };

  const recordPass = async (target: Profile) => {
    if (!user) return;
    // upsert on the (passer_id, passed_id) unique key — if the user already
    // passed before, refresh created_at so the 30-day window restarts.
    await supabase
      .from('passes')
      .upsert(
        { passer_id: user.id, passed_id: target.user_id, created_at: new Date().toISOString() },
        { onConflict: 'passer_id,passed_id' }
      );
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (swipeDirection !== null || !user) return;

    setSwipeDirection(direction);
    const currentProfile = filteredProfiles[currentProfileIndex];

    if (currentProfile) {
      track('swipe', { direction, target_role: currentProfile.role });
    }

    // Run DB work in the background so the UI doesn't wait on the network.
    if (direction === 'right' && currentProfile) {
      void recordLikeAndMaybeMatch(currentProfile);
    } else if (direction === 'left' && currentProfile) {
      void recordPass(currentProfile);
    }

    // After the CSS swipe animation finishes, advance to the next card and
    // reset all drag state so the new card doesn't inherit leftover offsets.
    setTimeout(() => {
      setCurrentProfileIndex(prev => prev + 1);
      setSwipeDirection(null);
      setDragOffset({ x: 0, y: 0 });
      setRotation(0);
      setIsDragging(false);
    }, 500);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (swipeDirection !== null) return;
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX, y: touch.clientY });
    setDragOffset({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || swipeDirection !== null) return;
    e.preventDefault();
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStart.x;
    const deltaY = touch.clientY - dragStart.y;
    setDragOffset({ x: deltaX, y: deltaY });
    setRotation(deltaX * 0.1);
  };

  const handleTouchEnd = () => {
    if (!isDragging || swipeDirection !== null) return;
    setIsDragging(false);
    const threshold = 100;
    const { x } = dragOffset;
    if (Math.abs(x) > threshold) {
      handleSwipe(x > 0 ? 'right' : 'left');
    } else {
      setDragOffset({ x: 0, y: 0 });
      setRotation(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (swipeDirection !== null) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragOffset({ x: 0, y: 0 });
    setRotation(0);
  };

  const activeFilterCount =
    [filters.home_port, filters.season, filters.department, filters.availability].filter(Boolean).length +
    (filters.verifiedOnly ? 1 : 0);

  const filteredProfiles = profiles.filter(p => {
    if (filters.home_port && p.home_port !== filters.home_port) return false;
    if (filters.season && p.season !== filters.season) return false;
    if (filters.availability && p.availability !== filters.availability) return false;
    if (filters.department && departmentForRole(p.role) !== filters.department) return false;
    if (filters.verifiedOnly && !p.verified) return false;
    return true;
  });

  const currentProfile = filteredProfiles[currentProfileIndex];
  const nextProfile = filteredProfiles[currentProfileIndex + 1];
  const thirdProfile = filteredProfiles[currentProfileIndex + 2];
  const noMoreProfiles = !loading && currentProfileIndex >= filteredProfiles.length;
  const noMatchesForFilters = !loading && filteredProfiles.length === 0 && profiles.length > 0 && activeFilterCount > 0;

  const currentPhotos = currentProfile
    ? currentProfile.photos.slice().sort((a, b) => a.order - b.order)
    : [];
  const totalCurrentPhotos = currentPhotos.length;

  // Reset to first photo whenever the visible profile changes.
  useEffect(() => {
    setCurrentPhotoIdx(0);
  }, [currentProfile?.id]);

  // Reset to the top of the deck whenever the filters change.
  useEffect(() => {
    setCurrentProfileIndex(0);
  }, [filters]);

  const goPrevPhoto = () => setCurrentPhotoIdx(i => Math.max(0, i - 1));
  const goNextPhoto = () => setCurrentPhotoIdx(i => Math.min(totalCurrentPhotos - 1, i + 1));

  if (showSettings) {
    return (
      <ProfileSettings
        onClose={() => {
          setShowSettings(false);
          loadMyCompletion();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--tender-red)] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profiles...</p>
        </div>
      </div>
    );
  }

  const matchesPanel = (
    <div className="bg-white h-full overflow-y-auto">
      <div className="p-4">
        <h2 className="text-2xl font-bold text-[var(--tender-navy)] mb-4">Your Matches</h2>
        {matches.length === 0 ? (
          <EmptyState
            icon={<HeartIcon className="w-10 h-10 text-[var(--tender-red)]" />}
            title="No matches yet"
            body="Start swiping to find your crew. When someone you've liked likes you back, they'll show up here."
            action={{ label: 'Browse crew', onClick: () => setTab('crew') }}
          />
        ) : (
          <div className="matches-grid">
            {matches.map(match => {
              const unread = isUnread(match.match_id);
              return (
                <div
                  key={match.id}
                  className="match-card group"
                  onClick={() => setSelectedMatch(match)}
                >
                  <div className="match-image relative">
                    {match.photos[0]?.url ? (
                      <img src={match.photos[0].url} alt={match.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[var(--tender-blue)]/20 flex items-center justify-center text-[var(--tender-navy)] font-semibold text-2xl">
                        {match.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    {unread && (
                      <span
                        className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-[var(--tender-red)] ring-2 ring-white shadow"
                        aria-label="Unread message"
                      />
                    )}
                  </div>
                  <div className="match-info">
                    <p className={`text-sm truncate ${unread ? 'font-bold' : 'font-semibold'}`}>
                      {match.name}
                    </p>
                    <p className="text-xs truncate">{match.role}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const swipeActionRow = (
    <div className="flex justify-center items-center gap-4">
      <button
        onClick={() => handleSwipe('left')}
        className="action-button bg-white"
        disabled={swipeDirection !== null}
        aria-label="Pass"
      >
        <XMarkIcon className="w-8 h-8 text-[var(--tender-navy)]" />
      </button>
      <button
        onClick={() => handleSwipe('right')}
        className="action-button-large bg-[var(--tender-red)]"
        disabled={swipeDirection !== null}
        aria-label="Like"
      >
        <HeartIcon className="w-10 h-10 text-white" />
      </button>
    </div>
  );

  const cardStack = currentProfile && !noMoreProfiles ? (
    <div className="card-container">
      {thirdProfile && (
        <div className="card card-third">
          <ProfilePhoto profile={thirdProfile} />
          <ProfileOverlay profile={thirdProfile} />
        </div>
      )}
      {nextProfile && (
        <div className="card card-next">
          <ProfilePhoto profile={nextProfile} />
          <ProfileOverlay profile={nextProfile} />
        </div>
      )}
      <div
        ref={cardRef}
        className={`card card-current ${swipeDirection ? `swipe-${swipeDirection}` : ''} ${isDragging ? 'dragging' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        style={{
          transform: swipeDirection
            ? undefined
            : `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`,
          transition: swipeDirection ? 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        <div className="like-indicator">LIKE</div>
        <div className="dislike-indicator">NOPE</div>
        <ProfilePhoto profile={currentProfile} photoIdx={currentPhotoIdx} />

        {/* Photo progress segments */}
        {totalCurrentPhotos > 1 && (
          <div className="absolute top-2 left-2 right-2 flex gap-1 z-20 pointer-events-none">
            {currentPhotos.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full ${i === currentPhotoIdx ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        )}

        {/* Tap zones for cycling photos. Cover the upper 2/3 of the card so
            the bottom info area + (i) button stay clickable. We don't stop
            propagation on touch-/mouse-start so swipe-drag still works when
            the user drags rather than taps. */}
        {totalCurrentPhotos > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goPrevPhoto(); }}
              className="absolute left-0 top-0 bottom-1/3 w-1/2 z-10"
              aria-label="Previous photo"
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goNextPhoto(); }}
              className="absolute right-0 top-0 bottom-1/3 w-1/2 z-10"
              aria-label="Next photo"
            />
          </>
        )}

        <ProfileOverlay
          profile={currentProfile}
          onInfo={() => setViewingProfile(currentProfile)}
        />
      </div>
    </div>
  ) : null;

  const discoverPanel = (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
      {/* Card area — fills available space on mobile, centered max-width on desktop */}
      <div className="flex-1 flex md:items-center md:justify-center md:p-8 min-h-0">
        <div className="w-full h-full md:h-auto md:max-w-md flex flex-col px-3 pt-3 md:p-0 min-h-0">
          {cardStack && (
            <>
              {/* On mobile the card stretches; on desktop it's a fixed 600px tall */}
              <div className="flex-1 md:flex-initial md:h-[600px] min-h-0">
                {cardStack}
              </div>
              {/* Desktop: action buttons live just under the card */}
              <div className="hidden md:block mt-6">
                {swipeActionRow}
              </div>
            </>
          )}

          {noMatchesForFilters && (
            <div className="m-auto">
              <EmptyState
                icon={<AdjustmentsHorizontalIcon className="w-10 h-10 text-[var(--tender-red)]" />}
                title="No crew match your filters"
                body="Try widening your marina, season or department filters to see more people."
                action={{ label: 'Clear filters', onClick: () => setFilters(emptyFilters) }}
              />
            </div>
          )}

          {noMoreProfiles && !noMatchesForFilters && profiles.length > 0 && (
            <div className="md:mt-0 m-auto">
              <EmptyState
                icon={<FireIcon className="w-10 h-10 text-[var(--tender-red)]" />}
                title="You're all caught up"
                body="You've seen everyone available right now. Check back later — new crew sign up every day."
                action={filteredProfiles.length > 0 ? { label: 'Swipe again', onClick: () => setCurrentProfileIndex(0) } : undefined}
              />
            </div>
          )}

          {!loading && profiles.length === 0 && (
            <div className="m-auto">
              <EmptyState
                icon={<FireIcon className="w-10 h-10 text-[var(--tender-red)]" />}
                title="No crew to show yet"
                body="You're early! Invite some friends in yachting and they'll show up here when they sign up."
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile: action buttons fixed in the bottom of the discover area,
          just above the Discover/Matches tab bar — Tinder-style. */}
      {cardStack && (
        <div className="md:hidden shrink-0 px-4 pt-2 pb-3 bg-gray-50">
          {swipeActionRow}
        </div>
      )}
    </div>
  );

  // Anyone the user has blocked or already matched with is hidden from the
  // crew directory — matches are already in the Matches tab.
  const excludedUserIds = new Set<string>([
    user?.id ?? '',
    ...Array.from(blockedIds),
    ...matches.map(m => m.user_id),
  ]);

  const crewPanel = user ? (
    <CrewDirectory
      userId={user.id}
      defaultMarina={myHomePort}
      excludedUserIds={excludedUserIds}
      onViewProfile={p => setViewingProfile(p as unknown as Profile)}
    />
  ) : null;

  const marinaPanel = user ? (
    <MarinaChat userId={user.id} defaultMarina={myHomePort} />
  ) : null;

  return (
    <main className="h-[100dvh] flex flex-col overflow-hidden">
      {/* Top Bar — outer wrapper handles iOS PWA safe-area-inset-top so the
          logo/cog sit below the status bar when installed to the home screen. */}
      <div
        className="bg-white border-b shrink-0"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
      <div className="h-16 sm:h-20 flex items-center justify-between px-4 sm:px-6">
        <img src="/tender-logo.svg" alt="Tender" className="h-12 sm:h-16" />

        <div className="flex items-center gap-1">
        <button
          onClick={() => setShowFilters(true)}
          className="relative p-2 hover:bg-gray-100 rounded-full"
          aria-label="Filters"
        >
          <AdjustmentsHorizontalIcon className="w-6 h-6 text-[var(--tender-navy)]" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--tender-red)] text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        <div className="relative">
          <button
            onClick={() => setAccountMenuOpen(o => !o)}
            className="p-2 hover:bg-gray-100 rounded-full"
            aria-label="Account menu"
          >
            <Cog6ToothIcon className="w-6 h-6 text-[var(--tender-navy)]" />
          </button>
          {accountMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setAccountMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border z-20 overflow-hidden">
                {myCompletion && (
                  <div className="px-4 py-3 border-b">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Profile</span>
                      <span className="text-sm font-bold text-[var(--tender-red)]">{myCompletion.percent}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--tender-red)]" style={{ width: `${myCompletion.percent}%` }} />
                    </div>
                  </div>
                )}
                <button
                  onClick={() => { setAccountMenuOpen(false); setShowSettings(true); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 text-[var(--tender-navy)] font-medium"
                >
                  Edit profile
                </button>
                {pushState !== 'unsupported' && (
                  <button
                    onClick={handleTogglePush}
                    disabled={pushState === 'busy'}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 text-[var(--tender-navy)] font-medium border-t flex items-center justify-between disabled:opacity-50"
                  >
                    <span>Notifications</span>
                    <span className={`text-xs font-semibold ${pushState === 'on' ? 'text-green-600' : 'text-gray-400'}`}>
                      {pushState === 'on' ? 'On' : pushState === 'busy' ? '…' : 'Off'}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => { setAccountMenuOpen(false); signOut(); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 text-[var(--tender-navy)] font-medium border-t"
                >
                  Sign out
                </button>
                <button
                  onClick={() => { setAccountMenuOpen(false); handleDeleteAccount(); }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 text-[var(--tender-red)] text-sm border-t"
                >
                  Delete account
                </button>
              </div>
            </>
          )}
        </div>
        </div>
      </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Desktop sidebar */}
        <div className="hidden md:block w-[380px] border-r">
          {matchesPanel}
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Desktop: small tab toggle at top of main, between Crew and Marina.
              Matches stays visible in the left sidebar. */}
          <div className="hidden md:flex shrink-0 border-b bg-white">
            <DesktopTab active={tab === 'crew'} onClick={() => setTab('crew')} icon={<UserGroupIcon className="w-5 h-5" />} label="Crew" />
            <DesktopTab active={tab === 'marina'} onClick={() => setTab('marina')} icon={<ChatBubbleLeftEllipsisIcon className="w-5 h-5" />} label="Marina chat" />
          </div>

          {/* Mobile + desktop: show the selected panel */}
          <div className="flex-1 min-h-0 flex flex-col">
            {tab === 'crew' && crewPanel}
            {tab === 'marina' && marinaPanel}
            {tab === 'matches' && <div className="flex-1 md:hidden">{matchesPanel}</div>}
            {/* On desktop, "matches" tab isn't applicable to the main area (matches
                live in the sidebar); fall back to the crew directory. */}
            {tab === 'matches' && <div className="hidden md:block flex-1">{crewPanel}</div>}
          </div>
        </div>
      </div>

      {/* Mobile bottom nav — Crew / Marina / Matches. Outer wrapper handles iOS
          PWA safe-area-inset-bottom so tab labels don't overlap the home indicator. */}
      <nav
        className="md:hidden bg-white border-t shrink-0"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around h-16">
          <TabButton
            active={tab === 'crew'}
            onClick={() => setTab('crew')}
            icon={<UserGroupIcon className="w-6 h-6" />}
            label="Crew"
          />
          <TabButton
            active={tab === 'marina'}
            onClick={() => setTab('marina')}
            icon={<ChatBubbleLeftEllipsisIcon className="w-6 h-6" />}
            label="Marina"
          />
          <TabButton
            active={tab === 'matches'}
            onClick={() => setTab('matches')}
            icon={<ChatBubbleLeftRightIcon className="w-6 h-6" />}
            label="Matches"
            badge={unreadCount}
          />
        </div>
      </nav>

      {/* Chat */}
      {selectedMatch && (
        <ChatInterface
          matchedProfile={selectedMatch}
          currentUser={user}
          onClose={() => setSelectedMatch(null)}
          onUnmatch={(userId) =>
            setMatches(prev => prev.filter(m => m.user_id !== userId))
          }
        />
      )}

      {/* Full profile view (with Like — the directory's primary action). */}
      {viewingProfile && (
        <ProfileView
          profile={viewingProfile}
          onClose={() => setViewingProfile(null)}
          onLike={() => {
            const target = viewingProfile;
            setViewingProfile(null);
            void recordLikeAndMaybeMatch(target);
          }}
        />
      )}

      {/* Deck filters */}
      {showFilters && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
          onClick={() => setShowFilters(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold text-[var(--tender-navy)]">Filter crew</h2>
              <button
                onClick={() => setShowFilters(false)}
                aria-label="Close"
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <XMarkIcon className="w-5 h-5 text-[var(--tender-navy)]" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Find crew in your marina, season or department.</p>

            <FilterSelect label="Marina / port" value={filters.home_port} options={MARINAS} anyLabel="Any marina" onChange={v => setFilters(f => ({ ...f, home_port: v }))} />
            <FilterSelect label="Season" value={filters.season} options={SEASONS} anyLabel="Any season" onChange={v => setFilters(f => ({ ...f, season: v }))} />
            <FilterSelect label="Department" value={filters.department} options={[...DEPARTMENTS]} anyLabel="Any department" onChange={v => setFilters(f => ({ ...f, department: v }))} />
            <FilterSelect label="Availability" value={filters.availability} options={AVAILABILITY} anyLabel="Any availability" onChange={v => setFilters(f => ({ ...f, availability: v }))} />

            <label className="flex items-center justify-between py-3 border-t mt-2 cursor-pointer">
              <span className="font-medium text-[var(--tender-navy)]">Verified crew only</span>
              <input
                type="checkbox"
                checked={filters.verifiedOnly}
                onChange={e => setFilters(f => ({ ...f, verifiedOnly: e.target.checked }))}
                className="w-5 h-5 accent-[var(--tender-red)]"
              />
            </label>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setFilters(emptyFilters)}
                className="flex-1 py-3 rounded-full border border-gray-300 font-semibold text-[var(--tender-navy)] hover:bg-gray-50"
              >
                Clear all
              </button>
              <button
                onClick={() => setShowFilters(false)}
                className="flex-1 py-3 rounded-full bg-[var(--tender-red)] text-white font-semibold"
              >
                Show {filteredProfiles.length} crew
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match alert */}
      {showMatchAlert && matchAlertProfile && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-[var(--tender-red)]">
                {matchAlertProfile.photos[0]?.url ? (
                  <img src={matchAlertProfile.photos[0].url} alt={matchAlertProfile.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[var(--tender-blue)]/20 flex items-center justify-center text-[var(--tender-navy)] font-bold text-3xl">
                    {matchAlertProfile.name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-bold text-[var(--tender-navy)] mb-2">It's a Match!</h3>
              <p className="text-[var(--tender-navy)]/80">{matchAlertProfile.name} liked you too!</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ProfilePhoto({ profile, photoIdx = 0 }: { profile: Profile; photoIdx?: number }) {
  const sorted = profile.photos.slice().sort((a, b) => a.order - b.order);
  const url = sorted[photoIdx]?.url || sorted[0]?.url;
  if (url) {
    return <img src={url} alt={profile.name} className="w-full h-full object-cover" draggable={false} />;
  }
  return (
    <div className="w-full h-full bg-gradient-to-br from-[var(--tender-blue)] to-[var(--tender-navy)] flex items-center justify-center">
      <span className="text-7xl font-bold text-white">
        {profile.name?.[0]?.toUpperCase() || '?'}
      </span>
    </div>
  );
}

function ProfileOverlay({ profile, onInfo }: { profile: Profile; onInfo?: () => void }) {
  const status = formatLastSeen(profile.last_seen);
  const online = isOnline(profile.last_seen);
  return (
    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[var(--tender-navy)]/90 via-[var(--tender-navy)]/50 to-transparent text-white">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <span className="truncate">{profile.name}{profile.age ? `, ${profile.age}` : ''}</span>
            {profile.verified && (
              <CheckBadgeIcon className="w-6 h-6 shrink-0 text-[var(--tender-blue)]" aria-label="Verified crew" />
            )}
          </h2>
          {status && (
            <p className="text-sm opacity-90 mt-1 flex items-center gap-1.5">
              {online && <span className="inline-block w-2 h-2 rounded-full bg-green-400" />}
              {status}
            </p>
          )}
          <p className="text-xl opacity-90 mt-1">{profile.role}</p>
          {(profile.home_port || profile.season) && (
            <p className="text-sm opacity-90 mt-1">
              ⚓ {[profile.home_port, profile.season].filter(Boolean).join(' · ')}
            </p>
          )}
          {profile.interests?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.interests.slice(0, 3).map((interest, i) => (
                <span key={i} className="px-3 py-1 bg-[var(--tender-blue)]/30 rounded-full text-sm backdrop-blur-sm">
                  {interest}
                </span>
              ))}
            </div>
          )}
        </div>
        {onInfo && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onInfo(); }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="shrink-0 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 ring-1 ring-white/30"
            aria-label="View full profile"
          >
            <InformationCircleIcon className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon, title, body, action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="text-center bg-white rounded-2xl p-8 shadow-sm">
      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--tender-red)]/10 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-[var(--tender-navy)] mb-2">{title}</h3>
      <p className="text-gray-500 mb-6">{body}</p>
      {action && (
        <button onClick={action.onClick} className="btn-primary">
          {action.label}
        </button>
      )}
    </div>
  );
}

function DesktopTab({
  active, onClick, icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
        active
          ? 'border-[var(--tender-red)] text-[var(--tender-red)]'
          : 'border-transparent text-gray-500 hover:text-[var(--tender-navy)]'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function FilterSelect({
  label, value, options, anyLabel, onChange,
}: {
  label: string;
  value: string;
  options: string[];
  anyLabel: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
      >
        <option value="">{anyLabel}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function TabButton({
  active, onClick, icon, label, badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 h-full flex flex-col items-center justify-center gap-1 relative ${
        active ? 'text-[var(--tender-red)]' : 'text-gray-400'
      }`}
    >
      <div className="relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--tender-red)] text-white text-[10px] font-bold flex items-center justify-center">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
