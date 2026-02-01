'use client';

interface WhiteboardPhoto {
  id: string;
  workout_week: string;
  photo_label: string;
  photo_url: string;
  caption?: string | null;
  display_order: number;
  created_at: string;
}

interface WhiteboardSectionProps {
  photos: WhiteboardPhoto[];
  loading: boolean;
  weekNumber: number;
  onPhotoClick: (photo: WhiteboardPhoto) => void;
}

export default function WhiteboardSection({
  photos,
  loading,
  weekNumber,
  onPhotoClick,
}: WhiteboardSectionProps) {
  return (
    <div className='mt-8 pt-6 border-t border-gray-200'>
      <h3 className='text-xl font-bold text-gray-900 mb-4'>
        Whiteboard - Week {weekNumber}
      </h3>

      {loading ? (
        <div className='text-center text-gray-500 py-8'>Loading photos...</div>
      ) : photos.length === 0 ? (
        <div className='text-center text-gray-500 py-8'>
          No whiteboard photos for this week
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {photos.map((photo) => (
            <div
              key={photo.id}
              className='border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer'
              onClick={() => onPhotoClick(photo)}
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
      )}
    </div>
  );
}
