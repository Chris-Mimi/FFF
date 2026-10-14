'use client';

import WhiteboardUploadPanel from '@/components/coach/WhiteboardUploadPanel';
import WhiteboardGallery from '@/components/coach/WhiteboardGallery';
import { getCurrentUser } from '@/lib/auth';
import { authFetch } from '@/lib/auth-fetch';
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
  const [weeksWithPhotos, setWeeksWithPhotos] = useState<{ week: string; count: number }[]>([]);

  useEffect(() => {
    checkAuth();
    fetchWeeksWithPhotos();
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

  const getWeekDateRange = (isoWeek: string): string => {
    const { year, week } = parseIsoWeek(isoWeek);
    // Calculate Monday of ISO week
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const dayOfWeek = jan4.getUTCDay() || 7;
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const formatDate = (d: Date) => `${d.getUTCDate().toString().padStart(2, '0')}.${(d.getUTCMonth() + 1).toString().padStart(2, '0')}`;
    return `${year} ${formatDate(monday)}-${formatDate(sunday)}`;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    // Step from the week's Thursday so 53-week years (e.g. 2026-W53) aren't skipped.
    const { year, week } = parseIsoWeek(selectedWeek);
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const thursday = new Date(jan4);
    thursday.setUTCDate(jan4.getUTCDate() - (jan4.getUTCDay() || 7) + 4 + (week - 1) * 7 + (direction === 'next' ? 7 : -7));
    const target = new Date(thursday.getUTCFullYear(), thursday.getUTCMonth(), thursday.getUTCDate());
    setSelectedWeek(formatIsoWeek(thursday.getUTCFullYear(), getWeekNumber(target)));
  };

  const goToCurrentWeek = () => {
    const now = new Date();
    const weekNumber = getWeekNumber(now);
    setSelectedWeek(formatIsoWeek(now.getFullYear(), weekNumber));
  };

  const fetchPhotos = async () => {
    try {
      const response = await authFetch(`/api/whiteboard-photos?week=${selectedWeek}`);
      if (!response.ok) throw new Error('Failed to fetch photos');
      const data = await response.json();
      setPhotos(data);
    } catch (error) {
      console.error('Error fetching photos:', error);
    }
  };

  const fetchWeeksWithPhotos = async () => {
    try {
      const response = await authFetch('/api/whiteboard-photos?summary=1');
      if (!response.ok) throw new Error('Failed to fetch weeks');
      setWeeksWithPhotos(await response.json());
    } catch (error) {
      console.error('Error fetching whiteboard weeks:', error);
    }
  };

  // Dropdown options: every week with photos, plus the selected week if it has none yet.
  const weekOptions = weeksWithPhotos.some(w => w.week === selectedWeek) || !selectedWeek
    ? weeksWithPhotos
    : [...weeksWithPhotos, { week: selectedWeek, count: 0 }].sort((a, b) => b.week.localeCompare(a.week));

  const handlePhotoUploaded = () => {
    fetchPhotos();
    fetchWeeksWithPhotos();
  };

  const handlePhotoDeleted = () => {
    fetchPhotos();
    fetchWeeksWithPhotos();
  };

  const handlePhotoUpdated = () => {
    fetchPhotos();
    fetchWeeksWithPhotos();
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <p className='text-gray-600'>Loading...</p>
      </div>
    );
  }

  return (
    <div className='h-screen flex flex-col bg-gray-50 overflow-hidden'>
      {/* Header */}
      <header className='bg-[#178da6] text-white p-2 md:p-4 shadow-lg shrink-0'>
        <div className='max-w-7xl mx-auto flex items-center justify-between gap-2 md:gap-4'>
          <div className='flex items-center gap-2 md:gap-4'>
            <button
              onClick={() => router.push('/coach')}
              className='flex items-center gap-1 md:gap-2 hover:bg-teal-800 px-2 md:px-3 py-1.5 md:py-2 rounded-lg transition text-sm md:text-base'
            >
              <ArrowLeft size={16} className='md:w-5 md:h-5' />
              <span className='hidden md:inline'>Back to Dashboard</span>
              <span className='md:hidden'>Back</span>
            </button>
            <h1 className='text-lg md:text-2xl font-bold'>Whiteboard</h1>
          </div>
        </div>
      </header>

      {/* Fixed Controls */}
      <div className='max-w-7xl mx-auto w-full px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 space-y-3 sm:space-y-4 md:space-y-6 shrink-0'>
        {/* Upload Panel */}
        <WhiteboardUploadPanel
          userId={userId!}
          selectedWeek={selectedWeek}
          onWeekChange={setSelectedWeek}
          onPhotoUploaded={handlePhotoUploaded}
        />

        {/* Week Navigation */}
        <div className='bg-white rounded-lg shadow-md p-2 sm:p-4'>
          <div className='flex items-center justify-between gap-1 sm:gap-2'>
            <button
              onClick={() => navigateWeek('prev')}
              className='flex items-center gap-1 p-1.5 sm:px-3 sm:py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition'
              title='Previous Week'
            >
              <ChevronLeft size={20} />
              <span className='hidden sm:inline'>Previous</span>
            </button>
            <div className='flex items-center gap-1 sm:gap-3'>
              <select
                value={selectedWeek}
                onChange={e => setSelectedWeek(e.target.value)}
                title='Jump to a week with board photos'
                className='max-w-[11rem] sm:max-w-none text-xs sm:text-base md:text-lg font-semibold text-gray-900 bg-white border border-gray-300 rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1 cursor-pointer hover:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600'
              >
                {weekOptions.map(({ week, count }) => (
                  <option key={week} value={week}>
                    {`Wk ${parseIsoWeek(week).week} · ${getWeekDateRange(week)}${count ? ` (${count})` : ''}`}
                  </option>
                ))}
              </select>
              <button
                onClick={goToCurrentWeek}
                className='px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition'
              >
                Today
              </button>
            </div>
            <button
              onClick={() => navigateWeek('next')}
              className='flex items-center gap-1 p-1.5 sm:px-3 sm:py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition'
              title='Next Week'
            >
              <span className='hidden sm:inline'>Next</span>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Gallery */}
      <main className='flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6'>
        <div className='max-w-7xl mx-auto'>
          <WhiteboardGallery
            photos={photos}
            selectedWeek={selectedWeek}
            onPhotoDeleted={handlePhotoDeleted}
            onPhotoUpdated={handlePhotoUpdated}
          />
        </div>
      </main>
    </div>
  );
}
