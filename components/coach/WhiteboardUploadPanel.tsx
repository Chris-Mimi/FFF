'use client';

import { authFetch } from '@/lib/auth-fetch';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Calendar, Upload, X, Info } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

// Browser-compatible UUID v4 generator
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

interface WhiteboardUploadPanelProps {
  userId: string;
  selectedWeek: string;
  onWeekChange: (week: string) => void;
  onPhotoUploaded: () => void;
}

export default function WhiteboardUploadPanel({
  userId,
  selectedWeek,
  onWeekChange,
  onPhotoUploaded,
}: WhiteboardUploadPanelProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [photoLabel, setPhotoLabel] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedDate, setSelectedDate] = useState('');

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  const handleDateChange = (dateStr: string) => {
    setSelectedDate(dateStr);
    const date = new Date(dateStr);
    const weekNumber = getWeekNumber(date);
    const isoWeek = `${date.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
    onWeekChange(isoWeek);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    const urls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.warning(`${file.name}: Not an image file, skipping`);
        continue;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.warning(`${file.name}: File size must be less than 5MB, skipping`);
        continue;
      }

      validFiles.push(file);
      urls.push(URL.createObjectURL(file));
    }

    // Clean up old preview URLs
    previewUrls.forEach(url => URL.revokeObjectURL(url));

    setSelectedFiles(validFiles);
    setPreviewUrls(urls);
  };

  const clearSelection = () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviewUrls([]);
    setPhotoLabel('');
    setCaption('');
    setUploadProgress(0);
  };

  // Parse filename like "2025 week 49.1" to extract week info
  const parseWeekFromFilename = (filename: string): { week: string; label: string } | null => {
    // Pattern: "YYYY week WW.N" or "YYYY week WW"
    const match = filename.match(/(\d{4})\s*week\s*(\d{1,2})(?:\.(\d+))?/i);
    if (match) {
      const year = match[1];
      const weekNum = match[2].padStart(2, '0');
      const partNum = match[3] || '';
      const week = `${year}-W${weekNum}`;
      const label = partNum ? `${year} Week ${match[2]}.${partNum}` : `${year} Week ${match[2]}`;
      return { week, label };
    }
    return null;
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.warning('Please select at least one file');
      return;
    }

    if (!userId) {
      toast.error('User not authenticated. Please refresh the page.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    // Track display orders per week
    const weekOrders: Record<string, number> = {};

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress(i + 1);

        // Try to parse week from filename, fall back to selected week
        const parsed = parseWeekFromFilename(file.name);
        const targetWeek = parsed?.week || selectedWeek;

        // Generate label: parsed from filename > base label + number > Photo N
        let fileLabel: string;
        if (parsed?.label) {
          // Filename was successfully parsed (e.g., "2026 Week 3.1")
          fileLabel = parsed.label;
        } else if (photoLabel.trim()) {
          // User provided base label - auto-number if multiple files
          if (selectedFiles.length > 1) {
            fileLabel = `${photoLabel.trim()}${i + 1}`;
          } else {
            fileLabel = photoLabel.trim();
          }
        } else {
          // Use original filename (without extension) as label, fall back to Photo N
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').trim();
          fileLabel = nameWithoutExt || `Photo ${i + 1}`;
        }

        // Get display order for this week (fetch once per week)
        if (weekOrders[targetWeek] === undefined) {
          const response = await fetch(`/api/whiteboard-photos?week=${targetWeek}`);
          const existingPhotos = await response.json();
          weekOrders[targetWeek] = existingPhotos.length;
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${generateUUID()}.${fileExt}`;
        const storagePath = `${targetWeek}/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('whiteboard-photos')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from('whiteboard-photos').getPublicUrl(storagePath);

        // Save to database with parsed week
        const dbResponse = await authFetch('/api/whiteboard-photos', {
          method: 'POST',
          body: JSON.stringify({
            workout_week: targetWeek,
            photo_label: fileLabel,
            photo_url: publicUrl,
            storage_path: storagePath,
            caption: caption.trim() || null,
            uploaded_by: userId,
            display_order: weekOrders[targetWeek]++,
          }),
        });

        if (!dbResponse.ok) {
          const errorData = await dbResponse.json();
          console.error('Database save error:', errorData);
          throw new Error(`Failed to save photo metadata: ${errorData.error || 'Unknown error'}`);
        }
      }

      // Success
      clearSelection();
      onPhotoUploaded();
      toast.success(`${selectedFiles.length} photo${selectedFiles.length > 1 ? 's' : ''} uploaded successfully!`);
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error(`Failed to upload photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className='bg-white rounded-lg shadow-md p-4 space-y-3'>
      <h2 className='text-lg font-bold text-gray-900'>Upload Whiteboard Photo</h2>

      {/* 2-Column Grid for Inputs */}
      <div className='grid grid-cols-2 gap-3'>
        {/* Week Selector */}
        <div>
          <label className='block text-xs font-medium text-gray-700 mb-1'>
            <Calendar size={14} className='inline mr-1' />
            Date (Week: {selectedWeek})
          </label>
          <input
            type='date'
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className='w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500'
          />
        </div>

        {/* Photo Label */}
        <div>
          <label className='flex items-center gap-1 text-xs font-medium text-gray-700 mb-1'>
            Base Label (optional)
            <div className='relative group'>
              <Info size={12} className='text-gray-400 cursor-help' />
              <div className='absolute right-0 bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10'>
                Multiple files auto-numbered: Label1, Label2, etc.
              </div>
            </div>
          </label>
          <input
            type='text'
            value={photoLabel}
            onChange={(e) => setPhotoLabel(e.target.value)}
            placeholder='e.g., Week 5.'
            className='w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500'
          />
        </div>

        {/* Caption - spans full width */}
        <div className='col-span-2'>
          <label className='block text-xs font-medium text-gray-700 mb-1'>Caption (Optional)</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder='Add a description...'
            rows={2}
            className='w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500'
          />
        </div>
      </div>

      {/* Preview Grid */}
      {previewUrls.length > 0 && (
        <div className='relative bg-gray-100 rounded-lg p-2'>
          <button
            onClick={clearSelection}
            className='absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 z-10'
          >
            <X size={14} />
          </button>
          <div className='grid grid-cols-3 gap-2'>
            {previewUrls.map((url, idx) => (
              <div key={idx} className='text-center'>
                <Image
                  src={url}
                  alt={`Preview ${idx + 1}`}
                  width={0}
                  height={0}
                  sizes='33vw'
                  unoptimized
                  className='w-full h-20 object-cover rounded-lg'
                />
                <p className='text-[9px] text-gray-500 mt-0.5 truncate'>{selectedFiles[idx]?.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons - Side by Side */}
      <div className='flex gap-2'>
        {/* Choose Files Button */}
        <div className='relative overflow-hidden rounded-lg group flex-1'>
          <input
            type='file'
            accept='image/*'
            multiple
            onChange={handleFileSelect}
            className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
            style={{ fontSize: '100px' }}
          />
          <div className='flex items-center justify-center gap-1 w-full px-2 py-1.5 bg-teal-600 text-white text-xs rounded-lg font-medium pointer-events-none group-hover:bg-teal-700 transition'>
            <Upload size={14} />
            {selectedFiles.length > 0
              ? `${selectedFiles.length} photo${selectedFiles.length > 1 ? 's' : ''}`
              : 'Choose Photos'}
          </div>
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || uploading}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 px-2 text-xs rounded-lg font-medium transition ${
            uploading || selectedFiles.length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          <Upload size={14} />
          {uploading
            ? `Uploading ${uploadProgress}/${selectedFiles.length}...`
            : 'Upload'}
        </button>
      </div>
    </div>
  );
}
