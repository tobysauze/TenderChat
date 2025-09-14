'use client';

import { useState, useEffect, useRef } from 'react';
import { HeartIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import ChatInterface from './ChatInterface';

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
  imageUrl: string; // Add this for compatibility with CrewProfile
}

export default function MainApp() {
  const { user, signOut } = useAuth();
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<Profile[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Profile | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [showMatchAlert, setShowMatchAlert] = useState(false);
  const [matchAlertProfile, setMatchAlertProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Touch/swipe state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Load profiles and matches
  useEffect(() => {
    if (user) {
      loadProfiles();
      loadMatches();
    }
  }, [user]);

  const loadProfiles = async () => {
    if (!user) return;
    
    try {
      // Get all profiles except current user's
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          photos (url, order)
        `)
        .neq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include photos
      const profilesWithPhotos = data?.map(profile => ({
        ...profile,
        photos: profile.photos?.sort((a: any, b: any) => a.order - b.order) || [],
        imageUrl: profile.photos?.[0]?.url || '/default-profile.jpg' // Use first photo or default
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
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          profile1:profiles!matches_user1_id_fkey(*, photos (url, order)),
          profile2:profiles!matches_user2_id_fkey(*, photos (url, order))
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (error) throw error;

      // Extract matched profiles
      const matchedProfiles = data?.map(match => {
        const matchedProfile = match.user1_id === user.id ? match.profile2 : match.profile1;
        return {
          ...matchedProfile,
          photos: matchedProfile.photos?.sort((a: any, b: any) => a.order - b.order) || []
        };
      }) || [];

      setMatches(matchedProfiles);
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (swipeDirection !== null || !user) return;
    
    setSwipeDirection(direction);
    const currentProfile = profiles[currentProfileIndex];
    
    setTimeout(async () => {
      if (direction === 'right' && currentProfile) {
        // Check if it's a match
        const isMatch = Math.random() < 0.3; // 30% match rate for demo
        
        if (isMatch) {
          // Create match
          const { error } = await supabase
            .from('matches')
            .insert({
              user1_id: user.id,
              user2_id: currentProfile.user_id,
            });

          if (!error) {
            setMatches(prev => [...prev, currentProfile]);
            setMatchAlertProfile(currentProfile);
            setShowMatchAlert(true);
            setTimeout(() => setShowMatchAlert(false), 2000);
          }
        }
      }

      setCurrentProfileIndex(prev => prev + 1);
      setSwipeDirection(null);
    }, 500);
  };

  // Touch/swipe handlers (same as before)
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
      const direction = x > 0 ? 'right' : 'left';
      handleSwipe(direction);
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

  return (
    <main className="min-h-screen">
      {/* Top Bar */}
      <div className="h-16 bg-white flex items-center justify-between px-6 border-b">
        <img src={`${process.env.NODE_ENV === 'production' ? '/TenderChat' : ''}/tender-logo.svg`} alt="Tender" className="h-12" />
        <button
          onClick={signOut}
          className="text-[var(--tender-navy)] hover:text-[var(--tender-red)] font-medium"
        >
          Sign Out
        </button>
      </div>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Sidebar - Matches */}
        <div className="w-[380px] bg-white border-r overflow-y-auto">
          <div className="p-4">
            <h2 className="text-2xl font-bold text-[var(--tender-navy)] mb-4">
              Your Matches
            </h2>
            <div className="matches-grid">
              {matches.map(match => (
                <div 
                  key={match.id}
                  className="match-card group"
                  onClick={() => setSelectedMatch(match)}
                >
                  <div className="match-image">
                    <img 
                      src={match.photos[0]?.url || 'https://randomuser.me/api/portraits/men/1.jpg'}
                      alt={match.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="match-info">
                    <p className="text-sm font-semibold truncate">{match.name}</p>
                    <p className="text-xs truncate">{match.role}</p>
                  </div>
                </div>
              ))}
              {matches.length === 0 && (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  <p>No matches yet</p>
                  <p className="text-sm mt-2">Start swiping to find your crew!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Swipeable Cards */}
        <div className="flex-1 p-8 flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full">
            {currentProfile && (
              <>
                <div className="card-container">
                  {/* Third Profile (bottom of stack) */}
                  {thirdProfile && (
                    <div className="card card-third">
                      <img 
                        src={thirdProfile.photos[0]?.url || 'https://randomuser.me/api/portraits/men/1.jpg'} 
                        alt={thirdProfile.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[var(--tender-navy)]/90 via-[var(--tender-navy)]/50 to-transparent text-white">
                        <h2 className="text-3xl font-bold">{thirdProfile.name}, {thirdProfile.age}</h2>
                        <p className="text-xl opacity-90 mt-1">{thirdProfile.role}</p>
                        <p className="text-lg opacity-80 mt-1">{thirdProfile.experience} experience</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {thirdProfile.certifications?.slice(0, 3).map((cert, index) => (
                            <span 
                              key={index}
                              className="px-3 py-1 bg-[var(--tender-blue)]/30 rounded-full text-sm backdrop-blur-sm"
                            >
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Next Profile (static underneath) */}
                  {nextProfile && (
                    <div className="card card-next">
                      <img 
                        src={nextProfile.photos[0]?.url || 'https://randomuser.me/api/portraits/men/1.jpg'} 
                        alt={nextProfile.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[var(--tender-navy)]/90 via-[var(--tender-navy)]/50 to-transparent text-white">
                        <h2 className="text-3xl font-bold">{nextProfile.name}, {nextProfile.age}</h2>
                        <p className="text-xl opacity-90 mt-1">{nextProfile.role}</p>
                        <p className="text-lg opacity-80 mt-1">{nextProfile.experience} experience</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {nextProfile.certifications?.slice(0, 3).map((cert, index) => (
                            <span 
                              key={index}
                              className="px-3 py-1 bg-[var(--tender-blue)]/30 rounded-full text-sm backdrop-blur-sm"
                            >
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Current Profile (animated on top) */}
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
                      userSelect: 'none'
                    }}
                  >
                    {/* Like/Dislike Indicators */}
                    <div className="like-indicator">LIKE</div>
                    <div className="dislike-indicator">NOPE</div>
                    <img 
                      src={currentProfile.photos[0]?.url || 'https://randomuser.me/api/portraits/men/1.jpg'} 
                      alt={currentProfile.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[var(--tender-navy)]/90 via-[var(--tender-navy)]/50 to-transparent text-white">
                      <h2 className="text-3xl font-bold">{currentProfile.name}, {currentProfile.age}</h2>
                      <p className="text-xl opacity-90 mt-1">{currentProfile.role}</p>
                      <p className="text-lg opacity-80 mt-1">{currentProfile.experience} experience</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {currentProfile.certifications?.slice(0, 3).map((cert, index) => (
                          <span 
                            key={index}
                            className="px-3 py-1 bg-[var(--tender-blue)]/30 rounded-full text-sm backdrop-blur-sm"
                          >
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="action-buttons">
                  <button 
                    onClick={() => handleSwipe('left')}
                    className="action-button bg-white"
                    disabled={swipeDirection !== null}
                  >
                    <XMarkIcon className="w-8 h-8 text-[var(--tender-navy)]" />
                  </button>
                  <button 
                    onClick={() => handleSwipe('right')}
                    className="action-button-large bg-[var(--tender-red)]"
                    disabled={swipeDirection !== null}
                  >
                    <HeartIcon className="w-10 h-10 text-white" />
                  </button>
                </div>
              </>
            )}
            
            {currentProfileIndex >= profiles.length - 1 && (
              <div className="text-center mt-8 bg-white rounded-2xl p-8 shadow-xl">
                <h3 className="text-2xl font-bold mb-4 text-[var(--tender-navy)]">No more profiles to show!</h3>
                <p className="text-gray-500 mb-6">Check back later for new crew members</p>
                <button 
                  onClick={() => setCurrentProfileIndex(0)}
                  className="btn-primary"
                >
                  Start Over
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      {selectedMatch && (
        <ChatInterface
          matchedProfile={selectedMatch}
          currentUser={user}
          onClose={() => setSelectedMatch(null)}
        />
      )}

      {/* Match Alert */}
      {showMatchAlert && matchAlertProfile && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl transform transition-all duration-300 scale-100 opacity-100">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-[var(--tender-red)]">
                <img 
                  src={matchAlertProfile.photos[0]?.url || 'https://randomuser.me/api/portraits/men/1.jpg'} 
                  alt={matchAlertProfile.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-2xl font-bold text-[var(--tender-navy)] mb-2">It's a Match!</h3>
              <p className="text-[var(--tender-navy)]/80">
                {matchAlertProfile.name} liked you too!
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
