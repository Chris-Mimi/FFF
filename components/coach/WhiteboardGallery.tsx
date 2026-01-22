'use client';

import { WhiteboardPhoto } from '@/app/coach/whiteboard/page';
import { Edit2, Trash2, X } from 'lucide-react';
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
      const response = await fetch(`/api/whiteboard-photos?id=${photoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
      alert('Failed to update photo. Please try again.');
    }
  };

  const handleDelete = async (photoId: string, photoLabel: string) => {
    if (!confirm(`Delete photo "${photoLabel}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/whiteboard-photos?id=${photoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete photo');

      onPhotoDeleted();
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo. Please try again.');
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
        Photos for Week {selectedWeek} ({photos.length})
      </h2>

      {/* Photo Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {photos.map((photo) => (
          <div key={photo.id} className='border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition'>
            {/* Photo */}
            <div className='relative cursor-pointer' onClick={() => handleViewPhoto(photo)}>
              <img src={photo.photo_url} alt={photo.photo_label} className='w-full h-48 object-cover' />
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
                    className='w-full px-2 py-1 border rounded text-sm'
                    placeholder='Photo label'
                  />
                  <textarea
                    value={editForm.caption}
                    onChange={(e) => setEditForm({ ...editForm, caption: e.target.value })}
                    className='w-full px-2 py-1 border rounded text-sm'
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
        <div className='fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4'>
          <div className='relative max-w-4xl max-h-[90vh] bg-white rounded-lg overflow-hidden'>
            <button
              onClick={handleCloseModal}
              className='absolute top-4 right-4 bg-white text-gray-700 p-2 rounded-full hover:bg-gray-100 z-10'
            >
              <X size={20} />
            </button>
            <img
              src={selectedPhoto.photo_url}
              alt={selectedPhoto.photo_label}
              className='w-full h-full object-contain'
            />
            <div className='absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4'>
              <p className='font-medium'>{selectedPhoto.photo_label}</p>
              {selectedPhoto.caption && <p className='text-sm'>{selectedPhoto.caption}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
