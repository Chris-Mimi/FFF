'use client';

import { WhiteboardPhoto } from '@/app/coach/whiteboard/page';
import { authFetch } from '@/lib/auth-fetch';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Edit2, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

interface WhiteboardGalleryProps {
  photos: WhiteboardPhoto[];
  selectedWeek: string;
  onPhotoDeleted: () => void;
  onPhotoUpdated: () => void;
}

export default function WhiteboardGallery({
  photos,
  selectedWeek,
  onPhotoDeleted,
  onPhotoUpdated,
}: WhiteboardGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<WhiteboardPhoto | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<WhiteboardPhoto | null>(null);
  const [editForm, setEditForm] = useState({ photo_label: '', caption: '' });

  const handleViewPhoto = (photo: WhiteboardPhoto) => {
    setSelectedPhoto(photo);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPhoto(null);
  };

  const handlePreviousPhoto = () => {
    if (!selectedPhoto || photos.length === 0) return;
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
    setSelectedPhoto(photos[prevIndex]);
  };

  const handleNextPhoto = () => {
    if (!selectedPhoto || photos.length === 0) return;
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
    const nextIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
    setSelectedPhoto(photos[nextIndex]);
  };

  const handleEditClick = (photo: WhiteboardPhoto) => {
    setEditingPhoto(photo);
    setEditForm({
      photo_label: photo.photo_label,
      caption: photo.caption || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingPhoto(null);
    setEditForm({ photo_label: '', caption: '' });
  };

  const handleSaveEdit = async (photoId: string) => {
    try {
      const response = await authFetch(`/api/whiteboard-photos?id=${photoId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          photo_label: editForm.photo_label.trim(),
          caption: editForm.caption.trim() || null,
        }),
      });

      if (!response.ok) throw new Error('Failed to update photo');

      handleCancelEdit();
      onPhotoUpdated();
    } catch (error) {
      console.error('Error updating photo:', error);
      toast.error('Failed to update photo. Please try again.');
    }
  };

  const handleDelete = async (photoId: string, photoLabel: string) => {
    if (!confirm(`Delete photo "${photoLabel}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await authFetch(`/api/whiteboard-photos?id=${photoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete photo');

      onPhotoDeleted();
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete photo. Please try again.');
    }
  };

  if (photos.length === 0) {
    return (
      <div className='bg-white rounded-lg shadow-md p-6'>
        <p className='text-center text-gray-500'>No photos uploaded for week {selectedWeek} yet.</p>
      </div>
    );
  }

  return (
    <div className='bg-white rounded-lg shadow-md p-6'>
      <h2 className='text-xl font-bold text-gray-900 mb-4'>
        Whiteboard Week {selectedWeek.split('-W')[1]} ({photos.length})
      </h2>

      {/* Photo Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {photos.map((photo) => (
          <div key={photo.id} className='border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition'>
            {/* Photo - scrollable container */}
            <div
              className='relative h-48 overflow-hidden cursor-pointer'
              onClick={() => handleViewPhoto(photo)}
            >
              <Image src={photo.photo_url} alt={photo.photo_label} fill sizes='(max-width: 768px) 100vw, 50vw' className='object-cover' />
            </div>

            {/* Details */}
            <div className='p-3 space-y-2'>
              {editingPhoto?.id === photo.id ? (
                <>
                  {/* Edit Form */}
                  <input
                    type='text'
                    value={editForm.photo_label}
                    onChange={(e) => setEditForm({ ...editForm, photo_label: e.target.value })}
                    className='w-full px-2 py-1 border rounded text-sm text-gray-900'
                    placeholder='Photo label'
                  />
                  <textarea
                    value={editForm.caption}
                    onChange={(e) => setEditForm({ ...editForm, caption: e.target.value })}
                    className='w-full px-2 py-1 border rounded text-sm text-gray-900'
                    placeholder='Caption (optional)'
                    rows={2}
                  />
                  <div className='flex gap-2'>
                    <button
                      onClick={() => handleSaveEdit(photo.id)}
                      className='flex-1 bg-teal-600 text-white px-3 py-1 rounded text-sm hover:bg-teal-700'
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className='flex-1 bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400'
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Display Mode */}
                  <p className='font-medium text-gray-900'>{photo.photo_label}</p>
                  {photo.caption && <p className='text-sm text-gray-600'>{photo.caption}</p>}
                  <div className='flex gap-2 pt-2'>
                    <button
                      onClick={() => handleEditClick(photo)}
                      className='flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm'
                    >
                      <Edit2 size={14} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(photo.id, photo.photo_label)}
                      className='flex items-center gap-1 text-red-600 hover:text-red-700 text-sm'
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Full-Screen Modal */}
      {showModal && selectedPhoto && (
        <div
          className='fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4 cursor-pointer'
          onClick={handleCloseModal}
        >
          {/* Previous Arrow */}
          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); handlePreviousPhoto(); }}
              className='absolute left-1 md:left-4 top-1/2 -translate-y-1/2 bg-white/70 md:bg-white text-gray-700 p-1.5 md:p-3 rounded-full hover:bg-gray-100 z-10 shadow-lg'
              aria-label='Previous photo'
            >
              <ChevronLeft size={20} className='md:hidden' />
              <ChevronLeft size={28} className='hidden md:block' />
            </button>
          )}

          <div
            className='relative max-w-4xl w-full max-h-[90vh] cursor-default'
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCloseModal}
              className='absolute -top-12 right-0 bg-white text-gray-700 p-2 rounded-full hover:bg-gray-100 z-10 shadow-lg'
              aria-label='Close modal'
            >
              <X size={24} />
            </button>
            <div className='relative w-full' style={{ height: '80vh' }}>
              <Image
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.photo_label}
                fill
                sizes='90vw'
                className='object-contain rounded-lg'
              />
            </div>
            <div className='mt-2 bg-black bg-opacity-70 text-white p-3 rounded-lg'>
              <p className='font-medium'>{selectedPhoto.photo_label}</p>
              {selectedPhoto.caption && <p className='text-sm mt-1'>{selectedPhoto.caption}</p>}
              {photos.length > 1 && (
                <p className='text-xs text-gray-400 mt-1'>
                  {photos.findIndex(p => p.id === selectedPhoto.id) + 1} / {photos.length}
                </p>
              )}
            </div>
          </div>

          {/* Next Arrow */}
          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); handleNextPhoto(); }}
              className='absolute right-1 md:right-4 top-1/2 -translate-y-1/2 bg-white/70 md:bg-white text-gray-700 p-1.5 md:p-3 rounded-full hover:bg-gray-100 z-10 shadow-lg'
              aria-label='Next photo'
            >
              <ChevronRight size={20} className='md:hidden' />
              <ChevronRight size={28} className='hidden md:block' />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
