'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';

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

  return (
    <div
      className='fixed inset-0 bg-black bg-opacity-90 z-50 overflow-y-auto cursor-pointer'
      onClick={onClose}
    >
      <div className='min-h-full flex items-center justify-center p-4'>
        {/* Previous Arrow */}
        {showNavigation && (
          <button
            onClick={(e) => { e.stopPropagation(); onPrevious(); }}
            className='absolute left-4 top-1/2 -translate-y-1/2 bg-white text-gray-700 p-3 rounded-full hover:bg-gray-100 z-10 shadow-lg'
            aria-label='Previous photo'
          >
            <ChevronLeft size={28} />
          </button>
        )}

        <div
          className='relative cursor-default'
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className='absolute -top-12 right-0 bg-white text-gray-700 p-2 rounded-full hover:bg-gray-100 z-10 shadow-lg'
            aria-label='Close modal'
          >
            <X size={24} />
          </button>
          <Image
            src={photo.photo_url}
            alt={photo.photo_label}
            width={0}
            height={0}
            sizes='90vw'
            className='max-w-[90vw] max-h-[85vh] object-contain rounded-lg w-auto h-auto'
          />
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
            className='absolute right-4 top-1/2 -translate-y-1/2 bg-white text-gray-700 p-3 rounded-full hover:bg-gray-100 z-10 shadow-lg'
            aria-label='Next photo'
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>
    </div>
  );
}
