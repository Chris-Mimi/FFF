'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Trophy, Dumbbell, BookOpen, Plus, CreditCard } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

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

interface WOD {
  id: string;
  title: string | null;
  date: string | null;
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
                          ? 'border-[#208479] bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className='flex items-center gap-2 md:gap-3'>
                        <div className='w-8 h-8 md:w-10 md:h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden'>
                          {athlete.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={athlete.avatar_url} alt={athlete.full_name || 'Athlete'} className='w-full h-full object-cover' />
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
                    <div className='w-12 h-12 md:w-20 md:h-20 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden'>
                      {selectedAthlete.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={selectedAthlete.avatar_url} alt={selectedAthlete.full_name || 'Athlete'} className='w-full h-full object-cover' />
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
                            ? 'border-[#208479] text-[#208479]'
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
                            ? 'border-[#208479] text-[#208479]'
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
                            ? 'border-[#208479] text-[#208479]'
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
                            ? 'border-[#208479] text-[#208479]'
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

// Benchmarks Section Component
function BenchmarksSection({
  athleteId,
  onAddResult,
}: {
  athleteId?: string;
  onAddResult: () => void;
}) {
  interface BenchmarkResult {
    id: string;
    benchmark_name: string;
    result_value: string;
    notes?: string;
    result_date: string;
    scaling_level?: string;
  }

  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (athleteId) {
      fetchResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  const fetchResults = async () => {
    if (!athleteId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('benchmark_results')
        .select('*')
        .eq('user_id', athleteId)
        .order('result_date', { ascending: false });

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error fetching benchmark results:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className='text-gray-500 text-center py-8'>Loading benchmark results...</p>;
  }

  return (
    <div>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-lg font-bold text-gray-900'>Benchmark Results</h3>
        <button
          onClick={onAddResult}
          className='flex items-center gap-2 px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition'
        >
          <Plus size={18} />
          Add Result
        </button>
      </div>

      {results.length === 0 ? (
        <p className='text-gray-500 text-center py-8'>No benchmark results recorded yet</p>
      ) : (
        <div className='space-y-3'>
          {results.map(result => (
            <div
              key={result.id}
              className='flex items-center justify-between p-4 bg-gray-50 rounded-lg'
            >
              <div>
                <p className='font-semibold text-gray-900'>{result.benchmark_name}</p>
                <p className='text-sm text-gray-600'>
                  {new Date(result.result_date).toLocaleDateString()}
                </p>
              </div>
              <div className='text-right'>
                <p className='font-semibold text-[#208479]'>{result.result_value}</p>
                {result.notes && <p className='text-sm text-gray-600'>{result.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Lifts Section Component
function LiftsSection({ athleteId, onAddResult }: { athleteId?: string; onAddResult: () => void }) {
  interface LiftRecord {
    id: string;
    lift_name: string;
    weight_kg: number;
    reps: number;
    calculated_1rm?: number;
    rep_max_type?: string;
    notes?: string;
    lift_date: string;
  }

  const [results, setResults] = useState<LiftRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (athleteId) {
      fetchResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  const fetchResults = async () => {
    if (!athleteId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lift_records')
        .select('*')
        .eq('user_id', athleteId)
        .order('lift_date', { ascending: false });

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error fetching lift records:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className='text-gray-500 text-center py-8'>Loading lift records...</p>;
  }

  return (
    <div>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-lg font-bold text-gray-900'>Lift Records</h3>
        <button
          onClick={onAddResult}
          className='flex items-center gap-2 px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition'
        >
          <Plus size={18} />
          Add Record
        </button>
      </div>

      {results.length === 0 ? (
        <p className='text-gray-500 text-center py-8'>No lift records recorded yet</p>
      ) : (
        <div className='space-y-3'>
          {results.map(result => (
            <div
              key={result.id}
              className='flex items-center justify-between p-4 bg-gray-50 rounded-lg'
            >
              <div>
                <p className='font-semibold text-gray-900'>{result.lift_name}</p>
                <p className='text-sm text-gray-600'>
                  {new Date(result.lift_date).toLocaleDateString()}
                </p>
              </div>
              <div className='text-right'>
                <p className='font-semibold text-[#208479]'>
                  {result.weight_kg} kg ({result.rep_max_type || `${result.reps} reps`})
                </p>
                {result.reps > 1 && (
                  <p className='text-xs text-gray-600'>Est. 1RM: {result.calculated_1rm} kg</p>
                )}
                {result.notes && <p className='text-sm text-gray-600 mt-1'>{result.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Logbook Section Component
function LogbookSection({ athleteId }: { athleteId?: string }) {
  interface WorkoutLog {
    id: string;
    wod_id?: string;
    workout_date: string;
    result?: string;
    notes?: string;
    workout?: {
      title: string;
      date: string;
    } | null;
  }

  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (athleteId) {
      fetchLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  const fetchLogs = async () => {
    if (!athleteId) return;
    setLoading(true);
    try {
      // Fetch workout logs
      const { data: logsData, error: logsError } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', athleteId)
        .order('workout_date', { ascending: false });

      if (logsError) {
        console.error('Error fetching workout logs:', logsError);
        throw logsError;
      }

      // Get unique workout IDs (excluding nulls)
      const workoutIds = [...new Set(logsData?.map(log => log.wod_id).filter(Boolean) || [])];

      // Fetch workout details if we have IDs
      let workoutsMap: Record<string, WOD> = {};
      if (workoutIds.length > 0) {
        const { data: workoutsData } = await supabase
          .from('wods')
          .select('id, title, date')
          .in('id', workoutIds);

        workoutsMap = (workoutsData || []).reduce((acc: Record<string, WOD>, wod: WOD) => {
          acc[wod.id] = wod;
          return acc;
        }, {});
      }

      // Attach workout data to logs and filter out orphaned logs
      const enrichedLogs = (logsData || []).map(log => ({
        ...log,
        workout: log.wod_id ? workoutsMap[log.wod_id] : null
      }));

      // Identify orphaned logs (no matching workout)
      const orphanedLogIds = enrichedLogs
        .filter(log => log.wod_id && !log.workout)
        .map(log => log.id);

      // Delete orphaned logs from database
      if (orphanedLogIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('workout_logs')
          .delete()
          .in('id', orphanedLogIds);

        if (deleteError) {
          console.error('Error deleting orphaned logs:', deleteError);
        } else {
          console.log(`Deleted ${orphanedLogIds.length} orphaned workout logs`);
        }
      }

      // Only show logs with valid workouts
      const validLogs = enrichedLogs.filter(log => log.workout);
      setLogs(validLogs);
    } catch (error) {
      console.error('Error fetching workout logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className='text-gray-500 text-center py-8'>Loading workout logs...</p>;
  }

  return (
    <div>
      <h3 className='text-lg font-bold text-gray-900 mb-4'>Workout Logs</h3>

      {logs.length === 0 ? (
        <p className='text-gray-500 text-center py-8'>No workout logs recorded yet</p>
      ) : (
        <div className='space-y-3'>
          {logs.map(log => (
            <div key={log.id} className='p-4 bg-gray-50 rounded-lg'>
              <div className='flex items-start justify-between mb-2'>
                <div>
                  <p className='font-semibold text-gray-900'>
                    {log.workout?.title || <span className='text-gray-400 italic'>Deleted Workout</span>}
                  </p>
                  <p className='text-sm text-gray-600'>
                    {new Date(log.workout_date).toLocaleDateString()}
                  </p>
                </div>
                {log.result && <p className='font-semibold text-[#208479]'>{log.result}</p>}
              </div>
              {log.notes && <p className='text-sm text-gray-700 mt-2'>{log.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Payments Section Component
function PaymentsSection({ memberId }: { memberId?: string }) {
  interface MemberData {
    id: string;
    email: string;
    stripe_customer_id: string | null;
    ten_card_sessions_used: number | null;
    ten_card_total: number | null;
    ten_card_expiry_date: string | null;
    membership_types: string[] | null;
  }

  interface Subscription {
    id: string;
    stripe_subscription_id: string | null;
    plan_type: 'monthly' | 'yearly' | null;
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  }

  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actualMemberId, setActualMemberId] = useState<string | null>(null);

  // 10-card form state
  const [tenCardTotal, setTenCardTotal] = useState('10');
  const [tenCardUsed, setTenCardUsed] = useState('0');
  const [tenCardExpiry, setTenCardExpiry] = useState('');

  useEffect(() => {
    if (memberId) {
      fetchPaymentData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  const fetchPaymentData = async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      console.log('[Payment] Starting fetch for user_id:', memberId);

      // First try to get member data directly by ID (works for family members who have no email)
      let member = null;
      const { data: memberById, error: memberByIdError } = await supabase
        .from('members')
        .select('id, email, stripe_customer_id, ten_card_sessions_used, ten_card_total, ten_card_expiry_date, membership_types')
        .eq('id', memberId)
        .single();

      console.log('[Payment] Member by ID query result:', { memberById, error: memberByIdError });

      if (memberById) {
        member = memberById;
      } else {
        // Fall back to email lookup for cases where athlete_profiles.user_id ≠ members.id
        const { data: athlete, error: athleteError } = await supabase
          .from('athlete_profiles')
          .select('email')
          .eq('user_id', memberId)
          .single();

        console.log('[Payment] Athlete query result:', { athlete, error: athleteError });

        if (athleteError || !athlete?.email) {
          console.log('[Payment] No member found by ID or email');
          setLoading(false);
          return;
        }

        const { data: memberByEmail, error: memberByEmailError } = await supabase
          .from('members')
          .select('id, email, stripe_customer_id, ten_card_sessions_used, ten_card_total, ten_card_expiry_date, membership_types')
          .eq('email', athlete.email)
          .single();

        console.log('[Payment] Member by email query result:', { memberByEmail, error: memberByEmailError });

        if (memberByEmailError) throw memberByEmailError;
        member = memberByEmail;
      }

      console.log('[Payment] Final member result:', { member });

      if (!member) return;
      setMemberData(member);
      setActualMemberId(member.id); // Store actual member ID for updates

      // Set form values
      if (member) {
        setTenCardTotal(String(member.ten_card_total || 10));
        setTenCardUsed(String(member.ten_card_sessions_used || 0));
        setTenCardExpiry(member.ten_card_expiry_date ? member.ten_card_expiry_date.split('T')[0] : '');
      }

      // Fetch subscriptions using actual member.id
      console.log('[Payment] Querying subscriptions for member_id:', member.id);
      const { data: subs, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('member_id', member.id)
        .order('created_at', { ascending: false });

      console.log('[Payment] Subscriptions query result:', { subs, error: subsError });

      if (subsError) throw subsError;
      setSubscriptions(subs || []);
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave10Card = async () => {
    if (!actualMemberId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('members')
        .update({
          ten_card_total: parseInt(tenCardTotal) || 10,
          ten_card_sessions_used: parseInt(tenCardUsed) || 0,
          ten_card_expiry_date: tenCardExpiry || null,
        })
        .eq('id', actualMemberId);

      if (error) throw error;
      alert('10-card updated successfully!');
      fetchPaymentData();
    } catch (error) {
      console.error('Error updating 10-card:', error);
      alert('Failed to update 10-card. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset10Card = async () => {
    if (!actualMemberId) return;
    if (!confirm('Reset 10-card to 0 sessions used?')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('members')
        .update({
          ten_card_sessions_used: 0,
        })
        .eq('id', actualMemberId);

      if (error) throw error;
      alert('10-card reset successfully!');
      fetchPaymentData();
    } catch (error) {
      console.error('Error resetting 10-card:', error);
      alert('Failed to reset 10-card. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Cancel this subscription? It will remain active until the end of the current period.')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancel_at_period_end: true,
        })
        .eq('id', subscriptionId);

      if (error) throw error;
      alert('Subscription cancelled successfully!');
      fetchPaymentData();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className='text-gray-500 text-center py-8'>Loading payment data...</p>;
  }

  const sessionsRemaining = (memberData?.ten_card_total || 10) - (memberData?.ten_card_sessions_used || 0);
  const isExpired = memberData?.ten_card_expiry_date && new Date(memberData.ten_card_expiry_date) < new Date();

  return (
    <div className='space-y-4 md:space-y-6'>
      <h3 className='text-base md:text-lg font-bold text-gray-900'>Payment Management</h3>

      {/* Subscriptions */}
      <div className='bg-gray-50 rounded-lg p-3 md:p-4'>
        <h4 className='font-semibold text-gray-900 mb-2 md:mb-3 text-sm md:text-base'>Subscriptions</h4>
        {subscriptions.length === 0 ? (
          <p className='text-xs md:text-sm text-gray-600'>No active subscriptions</p>
        ) : (
          <div className='space-y-2 md:space-y-3'>
            {subscriptions.map(sub => (
              <div key={sub.id} className='bg-white rounded-lg p-2.5 md:p-3 border border-gray-200'>
                <div className='flex items-start justify-between gap-2 mb-2'>
                  <div className='min-w-0'>
                    <p className={`font-semibold capitalize text-sm md:text-base ${
                      sub.plan_type === 'monthly' ? 'text-blue-600' :
                      sub.plan_type === 'yearly' ? 'text-green-600' :
                      'text-gray-900'
                    }`}>
                      {sub.plan_type || 'Unknown'} Plan
                    </p>
                    <p className='text-xs md:text-sm text-gray-600'>Status: {sub.status}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded flex-shrink-0 ${
                      sub.status === 'active' && sub.plan_type === 'monthly'
                        ? 'bg-blue-100 text-blue-700'
                        : sub.status === 'active' && sub.plan_type === 'yearly'
                        ? 'bg-green-100 text-green-700'
                        : sub.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : sub.status === 'cancelled'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {sub.status}
                  </span>
                </div>
                {sub.current_period_end && (
                  <p className='text-xs text-gray-600 mb-2'>
                    Ends: {new Date(sub.current_period_end).toLocaleDateString()}
                  </p>
                )}
                {sub.status === 'active' && !sub.cancel_at_period_end && (
                  <button
                    onClick={() => handleCancelSubscription(sub.id)}
                    disabled={saving}
                    className='w-full md:w-auto px-3 py-2 md:py-1.5 text-xs md:text-sm text-red-600 hover:text-white hover:bg-red-600 font-medium border border-red-600 rounded transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-red-600'
                  >
                    Cancel
                  </button>
                )}
                {sub.cancel_at_period_end && (
                  <p className='text-xs text-amber-600'>Will cancel at period end</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 10-Card Management - Only show if member has ten_card membership */}
      {memberData?.membership_types?.includes('ten_card') && (
        <div className='bg-gray-50 rounded-lg p-3 md:p-4'>
          <h4 className='font-semibold text-purple-600 mb-2 md:mb-3 text-sm md:text-base'>10-Card Sessions</h4>

          {/* Current Status */}
          <div className='bg-white rounded-lg p-2.5 md:p-3 border border-gray-200 mb-3 md:mb-4'>
            <div className='flex items-center justify-between mb-1 md:mb-2'>
              <p className='text-xs md:text-sm text-gray-600'>Sessions Remaining</p>
              <p className={`text-xl md:text-2xl font-bold ${sessionsRemaining <= 2 ? 'text-red-600' : 'text-purple-600'}`}>
                {sessionsRemaining} / {memberData?.ten_card_total || 10}
              </p>
            </div>
            {memberData?.ten_card_expiry_date && (
              <p className={`text-xs ${isExpired ? 'text-red-600' : 'text-gray-600'}`}>
                {isExpired ? 'Expired: ' : 'Expires: '}
                {new Date(memberData.ten_card_expiry_date).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Edit Form */}
          <div className='space-y-2 md:space-y-3'>
            <div className='grid grid-cols-2 gap-2 md:gap-3'>
              <div>
                <label className='block text-xs md:text-sm font-medium text-gray-700 mb-1'>Total</label>
                <input
                  type='number'
                  value={tenCardTotal}
                  onChange={e => setTenCardTotal(e.target.value)}
                  className='w-full px-2 md:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 text-sm md:text-base'
                />
              </div>
              <div>
                <label className='block text-xs md:text-sm font-medium text-gray-700 mb-1'>Used</label>
                <input
                  type='number'
                  value={tenCardUsed}
                  onChange={e => setTenCardUsed(e.target.value)}
                  className='w-full px-2 md:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 text-sm md:text-base'
                />
              </div>
            </div>

            <div>
              <label className='block text-xs md:text-sm font-medium text-gray-700 mb-1'>Expiry (optional)</label>
              <input
                type='date'
                value={tenCardExpiry}
                onChange={e => setTenCardExpiry(e.target.value)}
                className='w-full px-2 md:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 text-sm md:text-base'
              />
            </div>

            <div className='flex gap-2'>
              <button
                onClick={handleSave10Card}
                disabled={saving}
                className='flex-1 px-3 md:px-4 py-2.5 md:py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition disabled:opacity-50 text-sm md:text-base'
              >
                Save
              </button>
              <button
                onClick={handleReset10Card}
                disabled={saving}
                className='px-3 md:px-4 py-2.5 md:py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition disabled:opacity-50 text-sm md:text-base'
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Customer Info */}
      {memberData?.stripe_customer_id && (
        <div className='bg-gray-50 rounded-lg p-3 md:p-4'>
          <h4 className='font-semibold text-gray-900 mb-1 md:mb-2 text-sm md:text-base'>Stripe Info</h4>
          <p className='text-xs text-gray-600 font-mono break-all'>{memberData.stripe_customer_id}</p>
        </div>
      )}
    </div>
  );
}

// Add Benchmark Modal Component
function AddBenchmarkModal({
  athleteId,
  athleteName,
  onClose,
  onSave,
}: {
  athleteId?: string;
  athleteName: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [benchmarkName, setBenchmarkName] = useState('');
  const [result, setResult] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const benchmarks = [
    'Fran',
    'Helen',
    'Cindy',
    'Grace',
    'Isabel',
    'Annie',
    'Diane',
    'Elizabeth',
    'Kelly',
    'Nancy',
    'Jackie',
    'Mary',
  ];

  const handleSave = async () => {
    if (!athleteId || !benchmarkName || !result) {
      alert('Please fill in benchmark name and result');
      return;
    }

    try {
      const { error } = await supabase.from('benchmark_results').insert({
        user_id: athleteId,
        benchmark_name: benchmarkName,
        result: result,
        notes: notes || null,
        workout_date: date,
      });

      if (error) throw error;
      alert('Benchmark result added successfully!');
      onSave();
    } catch (error) {
      console.error('Error adding benchmark:', error);
      alert('Failed to add benchmark result. Please try again.');
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50'>
      <div className='bg-white rounded-lg shadow-xl max-w-md w-full p-6'>
        <h3 className='text-xl font-bold text-gray-900 mb-4'>
          Add Benchmark Result for {athleteName}
        </h3>

        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Benchmark</label>
            <select
              value={benchmarkName}
              onChange={e => setBenchmarkName(e.target.value)}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
            >
              <option value=''>Select benchmark...</option>
              {benchmarks.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Date</label>
            <input
              type='date'
              value={date}
              onChange={e => setDate(e.target.value)}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Result</label>
            <input
              type='text'
              value={result}
              onChange={e => setResult(e.target.value)}
              placeholder='e.g., 5:42, 15 rounds'
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder='Any additional notes...'
              rows={3}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 resize-none'
            />
          </div>

          <div className='flex gap-3 pt-4'>
            <button
              onClick={onClose}
              className='flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition'
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className='flex-1 px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition'
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add Lift Modal Component
function AddLiftModal({
  athleteId,
  athleteName,
  onClose,
  onSave,
}: {
  athleteId?: string;
  athleteName: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [liftName, setLiftName] = useState('');
  const [weight, setWeight] = useState('');
  const [repMaxType, setRepMaxType] = useState<'1RM' | '3RM' | '5RM' | '10RM'>('1RM');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const lifts = [
    'Back Squat',
    'Front Squat',
    'Overhead Squat',
    'Deadlift',
    'Sumo Deadlift',
    'Bench Press',
    'Shoulder Press',
    'Push Press',
    'Jerk',
    'Clean',
    'Snatch',
    'Clean & Jerk',
  ];

  const calculate1RM = (weight: number, reps: number) => {
    if (reps === 1) return weight;
    return Math.round(weight * (36 / (37 - reps)));
  };

  const handleSave = async () => {
    if (!athleteId || !liftName || !weight) {
      alert('Please fill in lift name and weight');
      return;
    }

    const weightNum = parseFloat(weight);
    const reps = parseInt(repMaxType.replace('RM', ''));
    const calculated1RM = calculate1RM(weightNum, reps);

    try {
      const { error } = await supabase.from('lift_records').insert({
        user_id: athleteId,
        lift_name: liftName,
        weight_kg: weightNum,
        reps: reps,
        calculated_1rm: calculated1RM,
        rep_max_type: repMaxType,
        notes: notes || null,
        lift_date: date,
      });

      if (error) throw error;
      alert('Lift record added successfully!');
      onSave();
    } catch (error) {
      console.error('Error adding lift:', error);
      alert('Failed to add lift record. Please try again.');
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50'>
      <div className='bg-white rounded-lg shadow-xl max-w-md w-full p-6'>
        <h3 className='text-xl font-bold text-gray-900 mb-4'>Add Lift Record for {athleteName}</h3>

        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Lift</label>
            <select
              value={liftName}
              onChange={e => setLiftName(e.target.value)}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
            >
              <option value=''>Select lift...</option>
              {lifts.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Date</label>
            <input
              type='date'
              value={date}
              onChange={e => setDate(e.target.value)}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Weight (kg)</label>
              <input
                type='number'
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder='100'
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Rep Max Type</label>
              <select
                value={repMaxType}
                onChange={e => setRepMaxType(e.target.value as '1RM' | '3RM' | '5RM' | '10RM')}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
              >
                <option value='1RM'>1RM</option>
                <option value='3RM'>3RM</option>
                <option value='5RM'>5RM</option>
                <option value='10RM'>10RM</option>
              </select>
            </div>
          </div>

          {weight && repMaxType !== '1RM' && (
            <div className='bg-gray-50 p-3 rounded-lg'>
              <p className='text-sm text-gray-600'>Estimated 1RM:</p>
              <p className='text-lg font-semibold text-[#208479]'>
                {calculate1RM(parseFloat(weight), parseInt(repMaxType.replace('RM', '')))} kg
              </p>
            </div>
          )}

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder='Any additional notes...'
              rows={3}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 resize-none'
            />
          </div>

          <div className='flex gap-3 pt-4'>
            <button
              onClick={onClose}
              className='flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition'
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className='flex-1 px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition'
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
