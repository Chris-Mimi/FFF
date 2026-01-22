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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoLabel, setPhotoLabel] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
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
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPEG, PNG, HEIC)');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPhotoLabel('');
    setCaption('');
  };

  const handleUpload = async () => {
    if (!selectedFile || !photoLabel.trim()) {
      alert('Please select a file and provide a label');
      return;
    }

    if (!userId) {
      alert('User not authenticated. Please refresh the page.');
      return;
    }

    setUploading(true);
    try {
      // Generate unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const storagePath = `${selectedWeek}/${fileName}`;

      console.log('Uploading photo:', { storagePath, userId, selectedWeek, photoLabel: photoLabel.trim() });

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('whiteboard-photos')
        .upload(storagePath, selectedFile, {
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

      console.log('Photo uploaded to storage, public URL:', publicUrl);

      // Get next display order
      const response = await fetch(`/api/whiteboard-photos?week=${selectedWeek}`);
      const existingPhotos = await response.json();
      const nextOrder = existingPhotos.length;

      console.log('Saving to database with uploaded_by:', userId);

      // Save to database
      const dbResponse = await fetch('/api/whiteboard-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout_week: selectedWeek,
          photo_label: photoLabel.trim(),
          photo_url: publicUrl,
          storage_path: storagePath,
          caption: caption.trim() || null,
          uploaded_by: userId,
          display_order: nextOrder,
        }),
      });

      if (!dbResponse.ok) {
        const errorData = await dbResponse.json();
        console.error('Database save error:', errorData);
        throw new Error(`Failed to save photo metadata: ${errorData.error || 'Unknown error'}`);
      }

      const savedPhoto = await dbResponse.json();
      console.log('Photo saved successfully:', savedPhoto);

      // Success
      clearSelection();
      onPhotoUploaded();
      alert('Photo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert(`Failed to upload photo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
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
          Photo Label <span className='text-red-500'>*</span>
        </label>
        <input
          type='text'
          value={photoLabel}
          onChange={(e) => setPhotoLabel(e.target.value)}
          placeholder='e.g., 2026 week 4.1'
          className='w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500'
        />
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
          Photo File <span className='text-red-500'>*</span>
        </label>
        <div className='relative'>
          <input
            type='file'
            accept='image/*'
            onChange={handleFileSelect}
            className='hidden'
            id='photo-file-input'
          />
          <label
            htmlFor='photo-file-input'
            className='flex items-center justify-center gap-2 w-full px-4 py-3 bg-teal-600 text-white rounded-lg font-medium cursor-pointer hover:bg-teal-700 transition'
          >
            <Upload size={18} />
            {selectedFile ? selectedFile.name : 'Choose Photo File'}
          </label>
        </div>
        <p className='text-xs text-gray-500 mt-1'>Max file size: 5MB (JPEG, PNG, HEIC)</p>
      </div>

      {/* Preview */}
      {previewUrl && (
        <div className='relative bg-gray-100 rounded-lg p-4'>
          <button
            onClick={clearSelection}
            className='absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 z-10'
          >
            <X size={16} />
          </button>
          <div className='flex justify-center items-center'>
            <img src={previewUrl} alt='Preview' className='max-w-full max-h-96 object-contain rounded-lg' />
          </div>
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={!selectedFile || !photoLabel.trim() || uploading}
        className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition ${
          uploading || !selectedFile || !photoLabel.trim()
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-teal-600 text-white hover:bg-teal-700'
        }`}
      >
        <Upload size={18} />
        {uploading ? 'Uploading...' : 'Upload Photo'}
      </button>
    </div>
  );
}
