'use client';

import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { FocusTrap } from '@/components/ui/FocusTrap';

interface WhiteboardPhoto {
  id: string;
  workout_week: string;
  photo_label: string;
  photo_url: string;
  caption?: string | null;
  display_order: number;
  created_at: string;
}

interface PhotoModalProps {
  photo: WhiteboardPhoto;
  photos: WhiteboardPhoto[];
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

export default function PhotoModal({
  photo,
  photos,
  onClose,
  onPrevious,
  onNext,
}: PhotoModalProps) {
  const currentIndex = photos.findIndex(p => p.id === photo.id);
  const showNavigation = photos.length > 1;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <FocusTrap>
    <div
      className='fixed inset-0 bg-black bg-opacity-90 z-50 overflow-y-auto cursor-pointer'
      onClick={onClose}
    >
      <div className='min-h-full flex items-center justify-center p-4'>
        {/* Previous Arrow */}
        {showNavigation && (
          <button
            onClick={(e) => { e.stopPropagation(); onPrevious(); }}
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
            onClick={onClose}
            className='absolute top-2 right-2 bg-white text-gray-700 p-2.5 rounded-full hover:bg-gray-100 z-10 shadow-lg'
            aria-label='Close modal'
          >
            <X size={24} />
          </button>
          <div className='relative w-[90vw] h-[85vh]'>
            <Image
              src={photo.photo_url}
              alt={photo.photo_label}
              fill
              sizes='90vw'
              className='object-contain rounded-lg'
            />
          </div>
          <div className='mt-2 bg-black bg-opacity-70 text-white p-3 rounded-lg'>
            <p className='font-medium'>{photo.photo_label}</p>
            {photo.caption && <p className='text-sm mt-1'>{photo.caption}</p>}
            {showNavigation && (
              <p className='text-xs text-gray-400 mt-1'>
                {currentIndex + 1} / {photos.length}
              </p>
            )}
          </div>
        </div>

        {/* Next Arrow */}
        {showNavigation && (
          <button
            onClick={(e) => { e.stopPropagation(); onNext(); }}
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
  );
}
