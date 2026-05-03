'use client';

import { useEffect, useState } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import PhotoUpload, { Photo } from './PhotoUpload';
import { computeCompletion } from '../../lib/profileCompletion';

interface ProfileSettingsProps {
  onClose: () => void;
}

const ROLES = [
  'Captain', 'First Officer', 'Chief Engineer', '2nd Engineer', '3rd Engineer',
  'Chief Stewardess', '2nd Stewardess', '3rd Stewardess', 'Stewardess',
  'Chef', 'Sous Chef', 'Bosun', 'Deckhand',
];

export default function ProfileSettings({ onClose }: ProfileSettingsProps) {
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [data, setData] = useState({
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

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, role, experience, age, nationality, languages, certifications, interests, bio, availability')
        .eq('user_id', user.id)
        .single();
      if (profile) {
        setProfileId(profile.id);
        setData({
          name: profile.name || '',
          role: profile.role || '',
          experience: profile.experience || '',
          age: profile.age || 25,
          nationality: profile.nationality || '',
          languages: profile.languages || [],
          certifications: profile.certifications || [],
          interests: profile.interests || [],
          bio: profile.bio || '',
          availability: profile.availability || '',
        });
        await refreshPhotos(profile.id);
      }
      setLoading(false);
    })();
  }, [user]);

  const refreshPhotos = async (id?: string) => {
    const targetId = id || profileId;
    if (!targetId) return;
    const { data: rows } = await supabase
      .from('photos')
      .select('id, url, order')
      .eq('profile_id', targetId)
      .order('order', { ascending: true });
    setPhotos(rows || []);
  };

  const addItem = (field: 'languages' | 'certifications' | 'interests', value: string) => {
    if (value.trim()) {
      setData(prev => ({ ...prev, [field]: [...prev[field], value.trim()] }));
    }
  };

  const removeItem = (field: 'languages' | 'certifications' | 'interests', index: number) => {
    setData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (error) throw error;
      setSavedAt(Date.now());
    } catch (e) {
      console.error('Save failed:', e);
      alert('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const completion = computeCompletion({ ...data, photoCount: photos.length });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--tender-red)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-[var(--tender-navy)] hover:text-[var(--tender-red)] font-medium"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-xl font-bold text-[var(--tender-navy)]">Settings</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-[var(--tender-red)] text-white rounded-full font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Completion meter */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-lg font-semibold text-[var(--tender-navy)]">Profile completion</h2>
            <span className="text-2xl font-bold text-[var(--tender-red)]">{completion.percent}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--tender-red)] transition-all"
              style={{ width: `${completion.percent}%` }}
            />
          </div>
          {completion.missing.length > 0 && (
            <div className="mt-3 text-sm text-gray-600">
              <p className="mb-1">Add to boost matches:</p>
              <ul className="list-disc list-inside text-gray-500">
                {completion.missing.slice(0, 4).map(m => <li key={m}>{m}</li>)}
              </ul>
            </div>
          )}
          {savedAt && Date.now() - savedAt < 4000 && (
            <p className="mt-3 text-sm text-green-600">Saved.</p>
          )}
        </div>

        {/* Photos */}
        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--tender-navy)] mb-4">Photos</h2>
          {profileId && user && (
            <PhotoUpload
              userId={user.id}
              profileId={profileId}
              photos={photos}
              onChange={() => refreshPhotos()}
            />
          )}
        </section>

        {/* Basics */}
        <section className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-[var(--tender-navy)]">About you</h2>

          <Field label="Name">
            <input
              type="text"
              value={data.name}
              onChange={e => setData(p => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
            />
          </Field>

          <Field label="Role">
            <select
              value={data.role}
              onChange={e => setData(p => ({ ...p, role: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
            >
              <option value="">Select your role</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Experience">
              <input
                type="text"
                value={data.experience}
                onChange={e => setData(p => ({ ...p, experience: e.target.value }))}
                placeholder="e.g., 5 years"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
              />
            </Field>
            <Field label="Age">
              <input
                type="number"
                value={data.age}
                onChange={e => setData(p => ({ ...p, age: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
              />
            </Field>
          </div>

          <Field label="Nationality">
            <input
              type="text"
              value={data.nationality}
              onChange={e => setData(p => ({ ...p, nationality: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
            />
          </Field>

          <Field label="Bio">
            <textarea
              value={data.bio}
              onChange={e => setData(p => ({ ...p, bio: e.target.value }))}
              rows={4}
              placeholder="Tell us about yourself, your experience, and what you're looking for..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
            />
          </Field>

          <Field label="Availability">
            <input
              type="text"
              value={data.availability}
              onChange={e => setData(p => ({ ...p, availability: e.target.value }))}
              placeholder="e.g., Available immediately, Available from June 2024"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
            />
          </Field>
        </section>

        {/* Skills */}
        <section className="bg-white rounded-2xl p-5 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-[var(--tender-navy)]">Skills</h2>

          <ChipInput
            label="Languages"
            chipClass="bg-[var(--tender-blue)]/20 text-[var(--tender-navy)]"
            value={newLanguage}
            onChangeValue={setNewLanguage}
            items={data.languages}
            onAdd={() => { addItem('languages', newLanguage); setNewLanguage(''); }}
            onRemove={i => removeItem('languages', i)}
            placeholder="Add a language"
          />

          <ChipInput
            label="Certifications"
            chipClass="bg-[var(--tender-navy)]/10 text-[var(--tender-navy)]"
            value={newCertification}
            onChangeValue={setNewCertification}
            items={data.certifications}
            onAdd={() => { addItem('certifications', newCertification); setNewCertification(''); }}
            onRemove={i => removeItem('certifications', i)}
            placeholder="Add a certification"
          />

          <ChipInput
            label="Interests"
            chipClass="bg-[var(--tender-red)]/10 text-[var(--tender-red)]"
            value={newInterest}
            onChangeValue={setNewInterest}
            items={data.interests}
            onAdd={() => { addItem('interests', newInterest); setNewInterest(''); }}
            onRemove={i => removeItem('interests', i)}
            placeholder="Add an interest"
          />
        </section>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-[var(--tender-red)] text-white py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ChipInput({
  label, value, onChangeValue, items, onAdd, onRemove, placeholder, chipClass,
}: {
  label: string;
  value: string;
  onChangeValue: (v: string) => void;
  items: string[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  placeholder: string;
  chipClass: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={value}
          onChange={e => onChangeValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--tender-blue)]"
          onKeyPress={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
        />
        <button onClick={onAdd} className="px-4 py-2 bg-[var(--tender-blue)] text-white rounded-lg">
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span key={i} className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${chipClass}`}>
            {item}
            <button onClick={() => onRemove(i)} className="text-red-500 hover:text-red-700">×</button>
          </span>
        ))}
      </div>
    </div>
  );
}
