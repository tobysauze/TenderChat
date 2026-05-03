'use client';

import { useState, useEffect, useRef } from 'react';
import { HeartIcon, XMarkIcon, Cog6ToothIcon, ChatBubbleLeftRightIcon, FireIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import ChatInterface from './ChatInterface';
import ProfileSettings from './ProfileSettings';
import ProfileView from './ProfileView';
import { computeCompletion } from '../../lib/profileCompletion';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  role: string;
  experience: string;
  age: number;
  nationality: string;
  languages: string[];
  certifications: string[];
  interests: string[];
  bio: string;
  availability: string;
  photos: { url: string; order: number }[];
  imageUrl: string;
}

const PLACEHOLDER_AVATAR = '/tender-logo.svg';

type Tab = 'discover' | 'matches';

export default function MainApp() {
  const { user, signOut, deleteAccount } = useAuth();

  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<Profile[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Profile | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [showMatchAlert, setShowMatchAlert] = useState(false);
  const [matchAlertProfile, setMatchAlertProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('discover');
  const [viewingProfile, setViewingProfile] = useState<Profile | null>(null);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);

  const [myCompletion, setMyCompletion] = useState<{ percent: number; missing: string[] } | null>(null);

  // Touch/swipe state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadProfiles();
      loadMatches();
      loadMyCompletion();
    }
  }, [user]);

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
    }
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*, photos (url, order)')
        .neq('user_id', user.id)
        .order('created_at', { ascending: false });

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

      const matchedProfiles = profilesData?.map(profile => ({
        ...profile,
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
      .single();
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking for existing match:', checkError);
    }

    const formatMatch = () => ({
      ...target,
      imageUrl: target.photos?.[0]?.url || PLACEHOLDER_AVATAR,
      photos: target.photos?.sort((a: any, b: any) => a.order - b.order) || [],
    });

    if (existingMatch) {
      const formatted = formatMatch();
      setMatches(prev => [...prev, formatted]);
      setMatchAlertProfile(formatted);
      setShowMatchAlert(true);
      setTimeout(() => setShowMatchAlert(false), 2000);
      return;
    }

    const { data: existingLike, error: likeError } = await supabase
      .from('likes')
      .select('*')
      .eq('liker_id', target.user_id)
      .eq('liked_id', user.id)
      .single();
    if (likeError && likeError.code !== 'PGRST116') {
      console.error('Error checking for existing like:', likeError);
    }

    if (existingLike) {
      const { error: matchError } = await supabase
        .from('matches')
        .insert({ user1_id: user.id, user2_id: target.user_id });
      if (!matchError) {
        const formatted = formatMatch();
        setMatches(prev => [...prev, formatted]);
        setMatchAlertProfile(formatted);
        setShowMatchAlert(true);
        setTimeout(() => setShowMatchAlert(false), 2000);
      }
    } else {
      await supabase.from('likes').insert({ liker_id: user.id, liked_id: target.user_id });
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (swipeDirection !== null || !user) return;

    setSwipeDirection(direction);
    const currentProfile = profiles[currentProfileIndex];

    // Run DB work in the background so the UI doesn't wait on the network.
    if (direction === 'right' && currentProfile) {
      void recordLikeAndMaybeMatch(currentProfile);
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

  const currentProfile = profiles[currentProfileIndex];
  const nextProfile = profiles[currentProfileIndex + 1];
  const thirdProfile = profiles[currentProfileIndex + 2];
  const noMoreProfiles = !loading && currentProfileIndex >= profiles.length;

  const currentPhotos = currentProfile
    ? currentProfile.photos.slice().sort((a, b) => a.order - b.order)
    : [];
  const totalCurrentPhotos = currentPhotos.length;

  // Reset to first photo whenever the visible profile changes.
  useEffect(() => {
    setCurrentPhotoIdx(0);
  }, [currentProfile?.id]);

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
            action={{ label: 'Start swiping', onClick: () => setTab('discover') }}
          />
        ) : (
          <div className="matches-grid">
            {matches.map(match => (
              <div
                key={match.id}
                className="match-card group"
                onClick={() => setSelectedMatch(match)}
              >
                <div className="match-image">
                  {match.photos[0]?.url ? (
                    <img src={match.photos[0].url} alt={match.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[var(--tender-blue)]/20 flex items-center justify-center text-[var(--tender-navy)] font-semibold text-2xl">
                      {match.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="match-info">
                  <p className="text-sm font-semibold truncate">{match.name}</p>
                  <p className="text-xs truncate">{match.role}</p>
                </div>
              </div>
            ))}
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

          {noMoreProfiles && (
            <div className="md:mt-0 m-auto">
              <EmptyState
                icon={<FireIcon className="w-10 h-10 text-[var(--tender-red)]" />}
                title="You're all caught up"
                body="You've seen everyone available right now. Check back later — new crew sign up every day."
                action={profiles.length > 0 ? { label: 'Swipe again', onClick: () => setCurrentProfileIndex(0) } : undefined}
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

  return (
    <main className="h-[100dvh] flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-16 sm:h-20 bg-white flex items-center justify-between px-4 sm:px-6 border-b shrink-0">
        <img src="/tender-logo.svg" alt="Tender" className="h-12 sm:h-16" />

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

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Desktop sidebar */}
        <div className="hidden md:block w-[380px] border-r">
          {matchesPanel}
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Mobile: show selected tab panel */}
          <div className="flex-1 md:hidden min-h-0">
            {tab === 'discover' ? discoverPanel : matchesPanel}
          </div>
          {/* Desktop: always discover */}
          <div className="hidden md:flex flex-1 min-h-0">
            {discoverPanel}
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden bg-white border-t flex items-center justify-around h-16 shrink-0">
        <TabButton
          active={tab === 'discover'}
          onClick={() => setTab('discover')}
          icon={<FireIcon className="w-6 h-6" />}
          label="Discover"
        />
        <TabButton
          active={tab === 'matches'}
          onClick={() => setTab('matches')}
          icon={<ChatBubbleLeftRightIcon className="w-6 h-6" />}
          label="Matches"
          badge={matches.length}
        />
      </nav>

      {/* Chat */}
      {selectedMatch && (
        <ChatInterface
          matchedProfile={selectedMatch}
          currentUser={user}
          onClose={() => setSelectedMatch(null)}
        />
      )}

      {/* Full profile view */}
      {viewingProfile && (
        <ProfileView
          profile={viewingProfile}
          onClose={() => setViewingProfile(null)}
        />
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
    <div className="w-full h-full bg-gradient-to-br from-[var(--tender-blue)]/30 to-[var(--tender-navy)]/30 flex items-center justify-center">
      <span className="text-7xl font-bold text-[var(--tender-navy)]/40">
        {profile.name?.[0]?.toUpperCase() || '?'}
      </span>
    </div>
  );
}

function ProfileOverlay({ profile, onInfo }: { profile: Profile; onInfo?: () => void }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[var(--tender-navy)]/90 via-[var(--tender-navy)]/50 to-transparent text-white">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-3xl font-bold">{profile.name}{profile.age ? `, ${profile.age}` : ''}</h2>
          <p className="text-xl opacity-90 mt-1">{profile.role}</p>
          {profile.experience && (
            <p className="text-lg opacity-80 mt-1">{profile.experience} experience</p>
          )}
          {profile.certifications?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.certifications.slice(0, 3).map((cert, i) => (
                <span key={i} className="px-3 py-1 bg-[var(--tender-blue)]/30 rounded-full text-sm backdrop-blur-sm">
                  {cert}
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
