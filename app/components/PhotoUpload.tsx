'use client';

import { useState } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/solid';
import imageCompression from 'browser-image-compression';
import { supabase } from '../../lib/supabase';

export interface Photo {
  id: string;
  url: string;
  order: number;
}

interface PhotoUploadProps {
  userId: string;
  profileId: string;
  photos: Photo[];
  onChange: () => void | Promise<void>;
  maxPhotos?: number;
}

const BUCKET = 'profile-photos';

export default function PhotoUpload({ userId, profileId, photos, onChange, maxPhotos = 6 }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedPhotos = [...photos].sort((a, b) => a.order - b.order);
  const slots = Array.from({ length: maxPhotos }, (_, i) => sortedPhotos[i]);

  const handleFile = async (file: File, slotIndex: number) => {
    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    // Allow generous originals (up to ~20 MB) since we're going to compress
    // them client-side before upload anyway. iPhone HEIC/JPEG originals are
    // routinely 4–8 MB.
    if (file.size > 20 * 1024 * 1024) {
      setError('Image must be under 20 MB.');
      return;
    }

    setUploading(true);
    try {
      // Compress to a max 1600px edge / ~600 KB target so swipe-deck loads
      // stay snappy on cabin Wi-Fi and Supabase storage stays cheap.
      let toUpload: File | Blob = file;
      try {
        toUpload = await imageCompression(file, {
          maxSizeMB: 0.6,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
          fileType: 'image/jpeg',
          initialQuality: 0.82,
        });
      } catch (compressionErr) {
        console.warn('Image compression failed, uploading original:', compressionErr);
      }

      const path = `${userId}/${crypto.randomUUID()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, toUpload, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg',
        });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const order = slotIndex;
      const { error: insertError } = await supabase
        .from('photos')
        .insert({ profile_id: profileId, url: urlData.publicUrl, order });
      if (insertError) throw insertError;

      await onChange();
    } catch (e: any) {
      console.error('Photo upload failed:', e);
      setError(e?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo: Photo) => {
    setError(null);
    try {
      const { error: deleteRowError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photo.id);
      if (deleteRowError) throw deleteRowError;

      const path = extractStoragePath(photo.url);
      if (path) {
        await supabase.storage.from(BUCKET).remove([path]);
      }

      await onChange();
    } catch (e: any) {
      console.error('Photo delete failed:', e);
      setError(e?.message || 'Could not remove photo.');
    }
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {slots.map((photo, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
            {photo ? (
              <>
                <img src={photo.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleDelete(photo)}
                  className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-[var(--tender-red)]"
                  aria-label="Remove photo"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 px-2 py-0.5 rounded-full bg-[var(--tender-navy)] text-white text-[10px] font-semibold tracking-wide">
                    MAIN
                  </span>
                )}
              </>
            ) : (
              <label className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:text-[var(--tender-navy)] hover:bg-gray-50">
                <PlusIcon className="w-8 h-8" />
                <span className="text-xs mt-1">Add photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file, i);
                    e.target.value = '';
                  }}
                />
              </label>
            )}
          </div>
        ))}
      </div>
      {uploading && <p className="mt-3 text-sm text-gray-500">Uploading…</p>}
      {error && <p className="mt-3 text-sm text-[var(--tender-red)]">{error}</p>}
      <p className="mt-3 text-xs text-gray-500">First photo is your main. We'll compress big images for you.</p>
    </div>
  );
}

function extractStoragePath(publicUrl: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}
