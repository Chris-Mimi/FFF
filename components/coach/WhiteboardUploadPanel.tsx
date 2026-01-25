'use client';

import { supabase } from '@/lib/supabase';
import { Calendar, Upload, X } from 'lucide-react';
import { useState } from 'react';

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
        alert(`${file.name}: Not an image file, skipping`);
        continue;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name}: File size must be less than 5MB, skipping`);
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
      const label = partNum ? `Week ${weekNum}.${partNum}` : `Week ${weekNum}`;
      return { week, label };
    }
    return null;
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one file');
      return;
    }

    if (!userId) {
      alert('User not authenticated. Please refresh the page.');
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
        const fileLabel = parsed?.label || photoLabel.trim() || `Photo ${i + 1}`;

        // Get display order for this week (fetch once per week)
        if (weekOrders[targetWeek] === undefined) {
          const response = await fetch(`/api/whiteboard-photos?week=${targetWeek}`);
          const existingPhotos = await response.json();
          weekOrders[targetWeek] = existingPhotos.length;
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const storagePath = `${targetWeek}/${fileName}`;

        console.log(`Uploading photo ${i + 1}/${selectedFiles.length}:`, { storagePath, fileLabel, targetWeek });

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
        const dbResponse = await fetch('/api/whiteboard-photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
      alert(`${selectedFiles.length} photo${selectedFiles.length > 1 ? 's' : ''} uploaded successfully!`);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert(`Failed to upload photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className='bg-white rounded-lg shadow-md p-6 space-y-4'>
      <h2 className='text-xl font-bold text-gray-900'>Upload Whiteboard Photo</h2>

      {/* Week Selector */}
      <div>
        <label className='block text-sm font-medium text-gray-700 mb-2'>
          <Calendar size={16} className='inline mr-2' />
          Select Date (Week: {selectedWeek})
        </label>
        <input
          type='date'
          value={selectedDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className='w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500'
        />
      </div>

      {/* Photo Label */}
      <div>
        <label className='block text-sm font-medium text-gray-700 mb-2'>
          Base Label (optional - defaults to &quot;Photo&quot;)
        </label>
        <input
          type='text'
          value={photoLabel}
          onChange={(e) => setPhotoLabel(e.target.value)}
          placeholder='e.g., Workout, WOD, Session'
          className='w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500'
        />
        <p className='text-xs text-gray-500 mt-1'>Multiple files auto-numbered: Label 1, Label 2, etc.</p>
      </div>

      {/* Caption */}
      <div>
        <label className='block text-sm font-medium text-gray-700 mb-2'>Caption (Optional)</label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder='Add a description...'
          rows={2}
          className='w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500'
        />
      </div>

      {/* File Upload */}
      <div>
        <label className='block text-sm font-medium text-gray-700 mb-2'>
          Photo Files <span className='text-red-500'>*</span>
        </label>
        <div className='relative overflow-hidden rounded-lg group'>
          <input
            type='file'
            accept='image/*'
            multiple
            onChange={handleFileSelect}
            className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
            style={{ fontSize: '100px' }}
          />
          <div className='flex items-center justify-center gap-2 w-full px-4 py-3 bg-teal-600 text-white rounded-lg font-medium pointer-events-none group-hover:bg-teal-700 transition'>
            <Upload size={18} />
            {selectedFiles.length > 0
              ? `${selectedFiles.length} photo${selectedFiles.length > 1 ? 's' : ''} selected`
              : 'Choose Photo Files'}
          </div>
        </div>
        <p className='text-xs text-gray-500 mt-1'>Select multiple files. Max 5MB each (JPEG, PNG, HEIC)</p>
      </div>

      {/* Preview Grid */}
      {previewUrls.length > 0 && (
        <div className='relative bg-gray-100 rounded-lg p-4'>
          <button
            onClick={clearSelection}
            className='absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 z-10'
          >
            <X size={16} />
          </button>
          <div className='grid grid-cols-3 gap-2'>
            {previewUrls.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`Preview ${idx + 1}`}
                className='w-full h-24 object-cover rounded-lg'
              />
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={selectedFiles.length === 0 || uploading}
        className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition ${
          uploading || selectedFiles.length === 0
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-teal-600 text-white hover:bg-teal-700'
        }`}
      >
        <Upload size={18} />
        {uploading
          ? `Uploading ${uploadProgress}/${selectedFiles.length}...`
          : selectedFiles.length > 1
            ? `Upload ${selectedFiles.length} Photos`
            : 'Upload Photo'}
      </button>
    </div>
  );
}
