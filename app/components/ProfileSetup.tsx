'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isDemoMode } from '../../lib/supabase';
import PhotoUpload, { Photo } from './PhotoUpload';
import { MARINAS, SEASONS, AVAILABILITY, PROMPTS, ProfilePrompt } from '../../lib/yachting';
import MarinaPicker from './MarinaPicker';

interface ProfileSetupProps {
  onComplete: () => void;
}

export default function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);

  // Profile data
  const [profileData, setProfileData] = useState({
    name: '',
    role: '',
    age: 25,
    nationality: '',
    languages: [] as string[],
    interests: [] as string[],
    bio: '',
    home_port: '',
    season: '',
    availability: '',
    prompts: [] as ProfilePrompt[],
  });

  // Set the prompt/answer for a fixed slot. Empty answers are filtered out at
  // save time (see handleSaveProfile) so slot indices stay stable while editing.
  const setPrompt = (index: number, prompt: string, answer: string) => {
    setProfileData(prev => {
      const next = [...prev.prompts];
      next[index] = { prompt, answer };
      return { ...prev, prompts: next };
    });
  };

  // Drop empty/blank prompt slots and trim answers for persistence.
  const cleanPrompts = (prompts: ProfilePrompt[]): ProfilePrompt[] =>
    prompts.filter(p => p && p.answer && p.answer.trim()).map(p => ({ prompt: p.prompt, answer: p.answer.trim() }));

  const [newLanguage, setNewLanguage] = useState('');
  const [newInterest, setNewInterest] = useState('');

  const addItem = (field: 'languages' | 'interests', value: string) => {
    if (value.trim()) {
      setProfileData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()]
      }));
    }
  };

  const removeItem = (field: 'languages' | 'interests', index: number) => {
    setProfileData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const refreshPhotos = async () => {
    if (!profileId) return;
    const { data } = await supabase
      .from('photos')
      .select('id, url, order')
      .eq('profile_id', profileId)
      .order('order', { ascending: true });
    setPhotos(data || []);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const payload = { ...profileData, prompts: cleanPrompts(profileData.prompts) };

      if (isDemoMode) {
        const demoProfile = {
          id: 'demo-profile-' + Date.now(),
          user_id: user.id,
          ...payload,
          created_at: new Date().toISOString(),
        };
        localStorage.setItem('demo-profile', JSON.stringify(demoProfile));
        setProfileId(demoProfile.id);
        setStep(4);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .upsert({ user_id: user.id, ...payload }, { onConflict: 'user_id' })
        .select('id')
        .single();

      if (error) throw error;
      if (data) setProfileId(data.id);
      setStep(4);
    } catch (error) {
      console.error('Error creating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-3xl font-bold text-[var(--tender-navy)] mb-6">Complete Your Profile</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={profileData.role}
              onChange={(e) => setProfileData(prev => ({ ...prev, role: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
            >
              <option value="">Select your role</option>
              <option value="Captain">Captain</option>
              <option value="First Officer">First Officer</option>
              <option value="Chief Engineer">Chief Engineer</option>
              <option value="2nd Engineer">2nd Engineer</option>
              <option value="3rd Engineer">3rd Engineer</option>
              <option value="Chief Stewardess">Chief Stewardess</option>
              <option value="2nd Stewardess">2nd Stewardess</option>
              <option value="3rd Stewardess">3rd Stewardess</option>
              <option value="Stewardess">Stewardess</option>
              <option value="Chef">Chef</option>
              <option value="Sous Chef">Sous Chef</option>
              <option value="Bosun">Bosun</option>
              <option value="Deckhand">Deckhand</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
            <input
              type="number"
              value={profileData.age}
              onChange={(e) => setProfileData(prev => ({ ...prev, age: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
            <input
              type="text"
              value={profileData.nationality}
              onChange={(e) => setProfileData(prev => ({ ...prev, nationality: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
            />
          </div>

          <div className="pt-2 border-t">
            <p className="text-sm font-semibold text-[var(--tender-navy)] mb-3">Where you are in the season</p>

            <label className="block text-sm font-medium text-gray-700 mb-1">Current marina / port</label>
            <div className="mb-3">
              <MarinaPicker
                value={profileData.home_port}
                onChange={v => setProfileData(prev => ({ ...prev, home_port: v }))}
                placeholder="Search marinas…"
                allowEmpty
                emptyLabel="Pick later"
              />
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">Season</label>
            <select
              value={profileData.season}
              onChange={(e) => setProfileData(prev => ({ ...prev, season: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)] mb-3"
            >
              <option value="">Select your season</option>
              {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
            <select
              value={profileData.availability}
              onChange={(e) => setProfileData(prev => ({ ...prev, availability: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
            >
              <option value="">Select your availability</option>
              {AVAILABILITY.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full bg-[var(--tender-red)] text-white py-3 rounded-lg font-semibold hover:bg-[var(--tender-red)]/90"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-3xl font-bold text-[var(--tender-navy)] mb-6">Languages & Interests</h2>

        <div className="space-y-6">
          {/* Languages */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Languages</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value)}
                placeholder="Add a language"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
                onKeyPress={(e) => e.key === 'Enter' && (addItem('languages', newLanguage), setNewLanguage(''))}
              />
              <button
                onClick={() => (addItem('languages', newLanguage), setNewLanguage(''))}
                className="px-4 py-2 bg-[var(--tender-blue)] text-white rounded-lg"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {profileData.languages.map((lang, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-[var(--tender-blue)]/20 text-[var(--tender-navy)] rounded-full text-sm flex items-center gap-1"
                >
                  {lang}
                  <button
                    onClick={() => removeItem('languages', index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Interests</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newInterest}
                onChange={(e) => setNewInterest(e.target.value)}
                placeholder="Add an interest"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
                onKeyPress={(e) => e.key === 'Enter' && (addItem('interests', newInterest), setNewInterest(''))}
              />
              <button
                onClick={() => (addItem('interests', newInterest), setNewInterest(''))}
                className="px-4 py-2 bg-[var(--tender-blue)] text-white rounded-lg"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {profileData.interests.map((interest, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-[var(--tender-red)]/10 text-[var(--tender-red)] rounded-full text-sm flex items-center gap-1"
                >
                  {interest}
                  <button
                    onClick={() => removeItem('interests', index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(1)}
              className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 bg-[var(--tender-red)] text-white py-3 rounded-lg font-semibold hover:bg-[var(--tender-red)]/90"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <h2 className="text-3xl font-bold text-[var(--tender-navy)] mb-6">Tell Us About Yourself</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={profileData.bio}
              onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
              rows={4}
              placeholder="Tell people about yourself and what you're looking for…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prompts</label>
            <p className="text-xs text-gray-500 mb-3">Answer a few yachtie prompts so people get a feel for you.</p>
            {[0, 1, 2].map(i => (
              <div key={i} className="mb-3 p-3 border border-gray-200 rounded-lg">
                <select
                  value={profileData.prompts[i]?.prompt || PROMPTS[i]}
                  onChange={(e) => setPrompt(i, e.target.value, profileData.prompts[i]?.answer || '')}
                  className="w-full px-2 py-1.5 mb-2 text-sm font-medium text-[var(--tender-navy)] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
                >
                  {PROMPTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <input
                  type="text"
                  value={profileData.prompts[i]?.answer || ''}
                  onChange={(e) => setPrompt(i, profileData.prompts[i]?.prompt || PROMPTS[i], e.target.value)}
                  placeholder="Your answer…"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(2)}
              className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400"
            >
              Back
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={loading}
              className="flex-1 bg-[var(--tender-red)] text-white py-3 rounded-lg font-semibold hover:bg-[var(--tender-red)]/90 disabled:opacity-50"
            >
              {loading ? 'Saving…' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 4: photos
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-[var(--tender-navy)] mb-2">Add Some Photos</h2>
      <p className="text-gray-600 mb-6">Profiles with photos get a lot more matches. Add at least one to finish setup.</p>

      {profileId && user && (
        <PhotoUpload
          userId={user.id}
          profileId={profileId}
          photos={photos}
          onChange={refreshPhotos}
        />
      )}

      <div className="flex gap-4 mt-8">
        <button
          onClick={() => setStep(3)}
          className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400"
        >
          Back
        </button>
        <button
          onClick={onComplete}
          className="flex-1 bg-[var(--tender-red)] text-white py-3 rounded-lg font-semibold hover:bg-[var(--tender-red)]/90"
        >
          {photos.length === 0 ? 'Skip for now' : 'Finish'}
        </button>
      </div>
    </div>
  );
}
