'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface WhiteboardPhoto {
  id: string;
  workout_week: string;
  photo_label: string;
  photo_url: string;
  caption?: string | null;
  display_order: number;
  created_at: string;
}

export default function AthletePagePhotosTab() {
  const [photos, setPhotos] = useState<WhiteboardPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<string>('');
  const [selectedPhoto, setSelectedPhoto] = useState<WhiteboardPhoto | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Initialize with current week
    const now = new Date();
    const weekNumber = getWeekNumber(now);
    const isoWeek = `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
    setSelectedWeek(isoWeek);
  }, []);

  useEffect(() => {
    if (selectedWeek) {
      fetchPhotos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek]);

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/whiteboard-photos?week=${selectedWeek}`);
      if (!response.ok) throw new Error('Failed to fetch photos');
      const data = await response.json();
      setPhotos(data);
    } catch (error) {
      console.error('Error fetching photos:', error);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      const now = new Date();
      const weekNumber = getWeekNumber(now);
      const isoWeek = `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
      setSelectedWeek(isoWeek);
      return;
    }

    const [year, week] = selectedWeek.split('-W').map(Number);
    let newYear = year;
    let newWeek = direction === 'next' ? week + 1 : week - 1;

    if (newWeek > 52) {
      newWeek = 1;
      newYear += 1;
    } else if (newWeek < 1) {
      newWeek = 52;
      newYear -= 1;
    }

    const isoWeek = `${newYear}-W${newWeek.toString().padStart(2, '0')}`;
    setSelectedWeek(isoWeek);
  };

  const handleViewPhoto = (photo: WhiteboardPhoto) => {
    setSelectedPhoto(photo);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPhoto(null);
  };

  return (
    <div className='space-y-4'>
      {/* Week Navigation */}
      <div className='flex items-center justify-between bg-white rounded-lg shadow-sm p-4'>
        <button
          onClick={() => navigateWeek('prev')}
          className='flex items-center gap-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-800 transition'
        >
          <ChevronLeft size={18} />
          Previous
        </button>
        <div className='flex items-center gap-3'>
          <span className='text-lg font-semibold text-gray-900'>Week {selectedWeek}</span>
          <button
            onClick={() => navigateWeek('today')}
            className='px-3 py-1 bg-teal-100 hover:bg-teal-200 text-teal-700 rounded-lg text-sm transition'
          >
            Today
          </button>
        </div>
        <button
          onClick={() => navigateWeek('next')}
          className='flex items-center gap-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-800 transition'
        >
          Next
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Photo Grid */}
      <div className='bg-white rounded-lg shadow-sm p-6'>
        {loading ? (
          <div className='flex items-center justify-center py-12'>
            <p className='text-gray-500'>Loading photos...</p>
          </div>
        ) : photos.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-gray-500'>
            <p className='text-lg font-medium'>No photos for week {selectedWeek}</p>
            <p className='text-sm'>Check back later for whiteboard photos from your coaches!</p>
          </div>
        ) : (
          <>
            <h2 className='text-xl font-bold text-gray-900 mb-4'>
              Whiteboard Photos ({photos.length})
            </h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className='border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer'
                  onClick={() => handleViewPhoto(photo)}
                >
                  <div className='h-48 overflow-y-auto'>
                    <img
                      src={photo.photo_url}
                      alt={photo.photo_label}
                      className='w-full'
                    />
                  </div>
                  <div className='p-3 space-y-1'>
                    <p className='font-medium text-gray-900'>{photo.photo_label}</p>
                    {photo.caption && <p className='text-sm text-gray-600'>{photo.caption}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Full-Screen Modal */}
      {showModal && selectedPhoto && (
        <div
          className='fixed inset-0 bg-black bg-opacity-90 z-50 overflow-y-auto cursor-pointer'
          onClick={handleCloseModal}
        >
          <div className='min-h-full flex items-center justify-center p-4'>
            <div
              className='relative cursor-default'
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleCloseModal}
                className='absolute -top-12 right-0 bg-white text-gray-700 p-2 rounded-full hover:bg-gray-100 z-10 shadow-lg'
              >
                <X size={24} />
              </button>
              <img
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.photo_label}
                className='max-w-[90vw] max-h-[85vh] object-contain rounded-lg'
              />
              <div className='mt-2 bg-black bg-opacity-70 text-white p-3 rounded-lg'>
                <p className='font-medium'>{selectedPhoto.photo_label}</p>
                {selectedPhoto.caption && <p className='text-sm mt-1'>{selectedPhoto.caption}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
