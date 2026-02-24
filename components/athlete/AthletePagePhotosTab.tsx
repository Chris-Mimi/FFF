'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { FocusTrap } from '@/components/ui/FocusTrap';
import { authFetch } from '@/lib/auth-fetch';

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

  const getWeekDateRange = (isoWeek: string): string => {
    const [year, week] = isoWeek.split('-W').map(Number);
    // Calculate Monday of ISO week
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const dayOfWeek = jan4.getUTCDay() || 7;
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${formatDate(monday)} - ${formatDate(sunday)} ${year}`;
  };

  const getWeekLabel = (isoWeek: string): string => {
    const [year, week] = isoWeek.split('-W');
    return `${year} Week ${parseInt(week, 10)}`;
  };

  const fetchPhotos = async () => {
    setLoading(true);
    try {
      const response = await authFetch(`/api/whiteboard-photos?week=${selectedWeek}`);
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

  return (
    <div className='space-y-4'>
      {/* Week Navigation */}
      <div className='flex items-center justify-between bg-white rounded-lg shadow-sm p-4'>
        <button
          onClick={() => navigateWeek('prev')}
          className='p-2 hover:bg-gray-100 rounded-full transition text-gray-900'
          title='Previous Week'
          aria-label='Previous week'
        >
          <ChevronLeft size={24} />
        </button>
        <div className='flex items-center gap-2 md:gap-3'>
          <span className='text-sm md:text-lg font-semibold text-gray-900'>{getWeekDateRange(selectedWeek)}</span>
          <button
            onClick={() => navigateWeek('today')}
            className='px-2 md:px-3 py-1 bg-[#178da6] hover:bg-[#14758c] text-white text-xs md:text-sm rounded-lg font-medium transition'
          >
            Today
          </button>
        </div>
        <button
          onClick={() => navigateWeek('next')}
          className='p-2 hover:bg-gray-100 rounded-full transition text-gray-900'
          title='Next Week'
          aria-label='Next week'
        >
          <ChevronRight size={24} />
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
            <p className='text-lg font-medium'>No photos for {getWeekLabel(selectedWeek)}</p>
            <p className='text-sm'>Check back later for whiteboard photos from your coaches!</p>
          </div>
        ) : (
          <>
            <h2 className='text-xl font-bold text-gray-900 mb-4'>
              {getWeekLabel(selectedWeek)} ({photos.length})
            </h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className='border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer'
                  onClick={() => handleViewPhoto(photo)}
                >
                  <div className='h-48 overflow-y-auto'>
                    <Image
                      src={photo.photo_url}
                      alt={photo.photo_label}
                      width={0}
                      height={0}
                      sizes='100vw'
                      className='w-full h-auto'
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
        <FocusTrap>
        <div
          className='fixed inset-0 bg-black bg-opacity-90 z-50 overflow-y-auto cursor-pointer'
          onClick={handleCloseModal}
        >
          <div className='min-h-full flex items-center justify-center p-4'>
            {/* Previous Arrow */}
            {photos.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); handlePreviousPhoto(); }}
                className='absolute left-1 md:left-4 top-1/2 -translate-y-1/2 bg-white/70 md:bg-white text-gray-700 p-3 rounded-full hover:bg-gray-100 z-10 shadow-lg'
                aria-label='Previous photo'
              >
                <ChevronLeft size={20} className='md:hidden' />
                <ChevronLeft size={28} className='hidden md:block' />
              </button>
            )}

            <div
              className='relative cursor-default'
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleCloseModal}
                className='absolute top-2 right-2 bg-white text-gray-700 p-2.5 rounded-full hover:bg-gray-100 z-10 shadow-lg'
                aria-label='Close modal'
              >
                <X size={24} />
              </button>
              <div className='relative w-[90vw] h-[85vh]'>
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
                  <p className='text-xs text-gray-500 mt-1'>
                    {photos.findIndex(p => p.id === selectedPhoto.id) + 1} / {photos.length}
                  </p>
                )}
              </div>
            </div>

            {/* Next Arrow */}
            {photos.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); handleNextPhoto(); }}
                className='absolute right-1 md:right-4 top-1/2 -translate-y-1/2 bg-white/70 md:bg-white text-gray-700 p-3 rounded-full hover:bg-gray-100 z-10 shadow-lg'
                aria-label='Next photo'
              >
                <ChevronRight size={20} className='md:hidden' />
                <ChevronRight size={28} className='hidden md:block' />
              </button>
            )}
          </div>
        </div>
        </FocusTrap>
      )}
    </div>
  );
}
