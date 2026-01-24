'use client';

import WhiteboardUploadPanel from '@/components/coach/WhiteboardUploadPanel';
import WhiteboardGallery from '@/components/coach/WhiteboardGallery';
import { getCurrentUser } from '@/lib/auth';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export interface WhiteboardPhoto {
  id: string;
  workout_week: string;
  photo_label: string;
  photo_url: string;
  storage_path: string;
  caption?: string | null;
  uploaded_by?: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export default function WhiteboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<WhiteboardPhoto[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>('');

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedWeek) {
      fetchPhotos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek]);

  const checkAuth = async () => {
    const user = await getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const userMetadata = user.user_metadata;
    if (userMetadata?.role !== 'coach') {
      router.push('/athlete');
      return;
    }

    setUserId(user.id);

    // Initialize with current week
    const now = new Date();
    const weekNumber = getWeekNumber(now);
    const isoWeek = `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
    setSelectedWeek(isoWeek);

    setLoading(false);
  };

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  const parseIsoWeek = (isoWeek: string): { year: number; week: number } => {
    const match = isoWeek.match(/(\d{4})-W(\d{2})/);
    if (!match) return { year: new Date().getFullYear(), week: 1 };
    return { year: parseInt(match[1]), week: parseInt(match[2]) };
  };

  const formatIsoWeek = (year: number, week: number): string => {
    return `${year}-W${week.toString().padStart(2, '0')}`;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const { year, week } = parseIsoWeek(selectedWeek);
    let newYear = year;
    let newWeek = week + (direction === 'next' ? 1 : -1);

    // Handle year boundaries (approximately 52-53 weeks per year)
    if (newWeek < 1) {
      newYear--;
      newWeek = 52; // Simplified - most years have 52 weeks
    } else if (newWeek > 52) {
      newYear++;
      newWeek = 1;
    }

    setSelectedWeek(formatIsoWeek(newYear, newWeek));
  };

  const goToCurrentWeek = () => {
    const now = new Date();
    const weekNumber = getWeekNumber(now);
    setSelectedWeek(formatIsoWeek(now.getFullYear(), weekNumber));
  };

  const fetchPhotos = async () => {
    try {
      const response = await fetch(`/api/whiteboard-photos?week=${selectedWeek}`);
      if (!response.ok) throw new Error('Failed to fetch photos');
      const data = await response.json();
      setPhotos(data);
    } catch (error) {
      console.error('Error fetching photos:', error);
    }
  };

  const handlePhotoUploaded = () => {
    fetchPhotos();
  };

  const handlePhotoDeleted = () => {
    fetchPhotos();
  };

  const handlePhotoUpdated = () => {
    fetchPhotos();
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <p className='text-gray-600'>Loading...</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <header className='bg-[#208479] text-white p-4 shadow-lg sticky top-0 z-50'>
        <div className='max-w-7xl mx-auto flex items-center gap-4'>
          <button
            onClick={() => router.push('/coach')}
            className='flex items-center gap-2 hover:bg-teal-800 px-3 py-2 rounded-lg transition'
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
          <h1 className='text-2xl font-bold'>Whiteboard Photos</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className='max-w-7xl mx-auto p-6 space-y-6'>
        {/* Upload Panel */}
        <WhiteboardUploadPanel
          userId={userId!}
          selectedWeek={selectedWeek}
          onWeekChange={setSelectedWeek}
          onPhotoUploaded={handlePhotoUploaded}
        />

        {/* Week Navigation */}
        <div className='bg-white rounded-lg shadow-md p-4'>
          <div className='flex items-center justify-between'>
            <button
              onClick={() => navigateWeek('prev')}
              className='flex items-center gap-1 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition'
            >
              <ChevronLeft size={20} />
              Previous
            </button>
            <div className='flex items-center gap-3'>
              <span className='text-lg font-semibold text-gray-900'>{selectedWeek}</span>
              <button
                onClick={goToCurrentWeek}
                className='px-3 py-1 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition'
              >
                Today
              </button>
            </div>
            <button
              onClick={() => navigateWeek('next')}
              className='flex items-center gap-1 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition'
            >
              Next
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Gallery */}
        <WhiteboardGallery
          photos={photos}
          selectedWeek={selectedWeek}
          onPhotoDeleted={handlePhotoDeleted}
          onPhotoUpdated={handlePhotoUpdated}
        />
      </main>
    </div>
  );
}
