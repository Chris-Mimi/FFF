'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Trophy, Dumbbell, BookOpen, CreditCard } from 'lucide-react';
import Image from 'next/image';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import BenchmarksSection from '@/components/coach/athletes/BenchmarksSection';
import LiftsSection from '@/components/coach/athletes/LiftsSection';
import LogbookSection from '@/components/coach/athletes/LogbookSection';
import PaymentsSection from '@/components/coach/athletes/PaymentsSection';
import AddBenchmarkModal from '@/components/coach/athletes/AddBenchmarkModal';
import AddLiftModal from '@/components/coach/athletes/AddLiftModal';

interface AthleteProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  date_of_birth: string | null;
  phone_number: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  avatar_url: string | null;
}

export default function CoachAthletesPage() {
  const router = useRouter();
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'benchmarks' | 'lifts' | 'logbook' | 'payments'>(
    'benchmarks'
  );

  // Modal states for adding results
  const [showBenchmarkModal, setShowBenchmarkModal] = useState(false);
  const [showLiftModal, setShowLiftModal] = useState(false);

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        router.push('/login');
        return;
      }

      const role = currentUser.user_metadata?.role || 'athlete';
      if (role !== 'coach') {
        router.push('/coach');
        return;
      }

      fetchAthletes();
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const fetchAthletes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('athlete_profiles')
        .select('id, user_id, full_name, email, date_of_birth, phone_number, height_cm, weight_kg, avatar_url')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setAthletes(data || []);
    } catch (error) {
      console.error('Error fetching athletes:', error);
      setAthletes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    router.push('/coach');
  };

  return (
    <div className='min-h-screen bg-gray-400'>
      {/* Header */}
      <div className='bg-white shadow'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center gap-2 md:gap-4 py-2 md:py-4'>
            <button
              onClick={handleBackToDashboard}
              className='flex items-center gap-1 p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition text-gray-700 text-sm md:text-base'
            >
              <ArrowLeft size={20} className='md:w-6 md:h-6' />
              <span className='md:hidden'>Back</span>
            </button>
            <div>
              <h1 className='text-xl md:text-3xl font-bold text-gray-900'>Athletes</h1>
              <p className='text-xs md:text-sm text-gray-600 hidden md:block'>View and manage athlete data</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8'>
        <div className='grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6'>
          {/* Athletes List */}
          <div className='md:col-span-4'>
            <div className='bg-white rounded-lg shadow p-3 md:p-6'>
              <h2 className='text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4'>All Athletes</h2>

              {loading ? (
                <p className='text-gray-500 text-center py-4'>Loading athletes...</p>
              ) : athletes.length === 0 ? (
                <p className='text-gray-500 text-center py-4'>No athletes found</p>
              ) : (
                <div className='space-y-1 md:space-y-2 max-h-[200px] md:max-h-none overflow-y-auto'>
                  {athletes.map(athlete => (
                    <button
                      key={athlete.id}
                      onClick={() => setSelectedAthlete(athlete)}
                      className={`w-full text-left p-2 md:p-4 rounded-lg border-2 transition ${
                        selectedAthlete?.id === athlete.id
                          ? 'border-[#178da6] bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className='flex items-center gap-2 md:gap-3'>
                        <div className='relative w-8 h-8 md:w-10 md:h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden'>
                          {athlete.avatar_url ? (
                            <Image src={athlete.avatar_url} alt={athlete.full_name || 'Athlete'} fill className='object-cover' />
                          ) : (
                            <User size={16} className='md:w-5 md:h-5 text-gray-400' />
                          )}
                        </div>
                        <div className='min-w-0'>
                          <p className='font-semibold text-gray-900 text-sm md:text-base truncate'>
                            {athlete.full_name || 'Unnamed Athlete'}
                          </p>
                          <p className='text-xs md:text-sm text-gray-600 truncate'>{athlete.email || 'No email'}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Athlete Details */}
          <div className='md:col-span-8'>
            {!selectedAthlete ? (
              <div className='hidden md:block bg-white rounded-lg shadow p-12 text-center text-gray-500'>
                <User size={48} className='mx-auto mb-4 text-gray-300' />
                <p className='text-lg'>Select an athlete to view their data</p>
              </div>
            ) : (
              <div className='space-y-4 md:space-y-6'>
                {/* Athlete Header */}
                <div className='bg-white rounded-lg shadow p-3 md:p-6'>
                  <div className='flex items-center gap-3 md:gap-4 mb-4 md:mb-6'>
                    <div className='relative w-12 h-12 md:w-20 md:h-20 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden'>
                      {selectedAthlete.avatar_url ? (
                        <Image src={selectedAthlete.avatar_url} alt={selectedAthlete.full_name || 'Athlete'} fill className='object-cover' />
                      ) : (
                        <User size={24} className='md:w-8 md:h-8 text-gray-400' />
                      )}
                    </div>
                    <div className='min-w-0'>
                      <h2 className='text-lg md:text-2xl font-bold text-gray-900 truncate'>
                        {selectedAthlete.full_name || 'Unnamed Athlete'}
                      </h2>
                      <p className='text-sm md:text-base text-gray-600 truncate'>{selectedAthlete.email || 'No email'}</p>
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className='grid grid-cols-2 gap-2 md:gap-4 pt-3 md:pt-4 border-t border-gray-200'>
                    {selectedAthlete.date_of_birth && (
                      <div>
                        <p className='text-sm text-gray-600'>Date of Birth</p>
                        <p className='font-semibold text-gray-900'>
                          {new Date(selectedAthlete.date_of_birth).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {selectedAthlete.phone_number && (
                      <div>
                        <p className='text-sm text-gray-600'>Phone</p>
                        <p className='font-semibold text-gray-900'>
                          {selectedAthlete.phone_number}
                        </p>
                      </div>
                    )}
                    {selectedAthlete.height_cm && (
                      <div>
                        <p className='text-sm text-gray-600'>Height</p>
                        <p className='font-semibold text-gray-900'>
                          {selectedAthlete.height_cm} cm
                        </p>
                      </div>
                    )}
                    {selectedAthlete.weight_kg && (
                      <div>
                        <p className='text-sm text-gray-600'>Weight</p>
                        <p className='font-semibold text-gray-900'>
                          {selectedAthlete.weight_kg} kg
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section Tabs */}
                <div className='bg-white rounded-lg shadow overflow-hidden'>
                  <div className='border-b border-gray-200 overflow-x-auto'>
                    <nav className='flex min-w-max'>
                      <button
                        onClick={() => setActiveSection('benchmarks')}
                        className={`flex items-center gap-1 md:gap-2 px-2.5 md:px-6 py-2.5 md:py-4 border-b-2 font-medium text-xs md:text-sm transition whitespace-nowrap ${
                          activeSection === 'benchmarks'
                            ? 'border-[#178da6] text-[#178da6]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Trophy size={14} className='hidden md:block md:w-[18px] md:h-[18px]' />
                        Bench
                      </button>
                      <button
                        onClick={() => setActiveSection('lifts')}
                        className={`flex items-center gap-1 md:gap-2 px-2.5 md:px-6 py-2.5 md:py-4 border-b-2 font-medium text-xs md:text-sm transition whitespace-nowrap ${
                          activeSection === 'lifts'
                            ? 'border-[#178da6] text-[#178da6]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Dumbbell size={14} className='hidden md:block md:w-[18px] md:h-[18px]' />
                        Lifts
                      </button>
                      <button
                        onClick={() => setActiveSection('logbook')}
                        className={`flex items-center gap-1 md:gap-2 px-2.5 md:px-6 py-2.5 md:py-4 border-b-2 font-medium text-xs md:text-sm transition whitespace-nowrap ${
                          activeSection === 'logbook'
                            ? 'border-[#178da6] text-[#178da6]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <BookOpen size={14} className='hidden md:block md:w-[18px] md:h-[18px]' />
                        Log
                      </button>
                      <button
                        onClick={() => setActiveSection('payments')}
                        className={`flex items-center gap-1 md:gap-2 px-2.5 md:px-6 py-2.5 md:py-4 border-b-2 font-medium text-xs md:text-sm transition whitespace-nowrap ${
                          activeSection === 'payments'
                            ? 'border-[#178da6] text-[#178da6]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <CreditCard size={14} className='hidden md:block md:w-[18px] md:h-[18px]' />
                        Pay
                      </button>
                    </nav>
                  </div>

                  {/* Section Content */}
                  <div className='p-3 md:p-6'>
                    {activeSection === 'benchmarks' && (
                      <BenchmarksSection
                        athleteId={selectedAthlete.user_id}
                        onAddResult={() => setShowBenchmarkModal(true)}
                      />
                    )}
                    {activeSection === 'lifts' && (
                      <LiftsSection
                        athleteId={selectedAthlete.user_id}
                        onAddResult={() => setShowLiftModal(true)}
                      />
                    )}
                    {activeSection === 'logbook' && (
                      <LogbookSection athleteId={selectedAthlete.user_id} />
                    )}
                    {activeSection === 'payments' && (
                      <PaymentsSection memberId={selectedAthlete.user_id} />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Benchmark Modal */}
      {showBenchmarkModal && selectedAthlete && (
        <AddBenchmarkModal
          athleteId={selectedAthlete.user_id}
          athleteName={selectedAthlete.full_name || 'Unknown Athlete'}
          onClose={() => setShowBenchmarkModal(false)}
          onSave={() => {
            setShowBenchmarkModal(false);
            // Refresh the section
          }}
        />
      )}

      {/* Lift Modal */}
      {showLiftModal && selectedAthlete && (
        <AddLiftModal
          athleteId={selectedAthlete.user_id}
          athleteName={selectedAthlete.full_name || 'Unknown Athlete'}
          onClose={() => setShowLiftModal(false)}
          onSave={() => {
            setShowLiftModal(false);
            // Refresh the section
          }}
        />
      )}
    </div>
  );
}
