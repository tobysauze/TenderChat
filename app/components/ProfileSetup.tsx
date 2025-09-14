'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isDemoMode } from '../../lib/supabase';

interface ProfileSetupProps {
  onComplete: () => void;
}

export default function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Profile data
  const [profileData, setProfileData] = useState({
    name: '',
    role: '',
    experience: '',
    age: 25,
    nationality: '',
    languages: [] as string[],
    certifications: [] as string[],
    interests: [] as string[],
    bio: '',
    availability: '',
  });

  const [newLanguage, setNewLanguage] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [newInterest, setNewInterest] = useState('');

  const addItem = (field: 'languages' | 'certifications' | 'interests', value: string) => {
    if (value.trim()) {
      setProfileData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()]
      }));
    }
  };

  const removeItem = (field: 'languages' | 'certifications' | 'interests', index: number) => {
    setProfileData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      if (isDemoMode) {
        // Demo mode - save to localStorage
        const demoProfile = {
          id: 'demo-profile-' + Date.now(),
          user_id: user.id,
          ...profileData,
          created_at: new Date().toISOString(),
        };
        localStorage.setItem('demo-profile', JSON.stringify(demoProfile));
        onComplete();
        return;
      }

      // Real Supabase mode
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          ...profileData,
        });

      if (profileError) throw profileError;

      onComplete();
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Experience</label>
            <input
              type="text"
              value={profileData.experience}
              onChange={(e) => setProfileData(prev => ({ ...prev, experience: e.target.value }))}
              placeholder="e.g., 5 years"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
            />
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
        <h2 className="text-3xl font-bold text-[var(--tender-navy)] mb-6">Add Your Skills</h2>
        
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

          {/* Certifications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Certifications</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newCertification}
                onChange={(e) => setNewCertification(e.target.value)}
                placeholder="Add a certification"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
                onKeyPress={(e) => e.key === 'Enter' && (addItem('certifications', newCertification), setNewCertification(''))}
              />
              <button
                onClick={() => (addItem('certifications', newCertification), setNewCertification(''))}
                className="px-4 py-2 bg-[var(--tender-blue)] text-white rounded-lg"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {profileData.certifications.map((cert, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-[var(--tender-navy)]/10 text-[var(--tender-navy)] rounded-full text-sm flex items-center gap-1"
                >
                  {cert}
                  <button
                    onClick={() => removeItem('certifications', index)}
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
            placeholder="Tell us about yourself, your experience, and what you're looking for..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
          <input
            type="text"
            value={profileData.availability}
            onChange={(e) => setProfileData(prev => ({ ...prev, availability: e.target.value }))}
            placeholder="e.g., Available immediately, Available from June 2024"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setStep(2)}
            className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-[var(--tender-red)] text-white py-3 rounded-lg font-semibold hover:bg-[var(--tender-red)]/90 disabled:opacity-50"
          >
            {loading ? 'Creating Profile...' : 'Complete Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
