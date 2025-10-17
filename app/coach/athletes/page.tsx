'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Trophy, Dumbbell, BookOpen, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function CoachAthletesPage() {
  const router = useRouter();
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'benchmarks' | 'lifts' | 'logbook'>('benchmarks');

  // Modal states for adding results
  const [showBenchmarkModal, setShowBenchmarkModal] = useState(false);
  const [showLiftModal, setShowLiftModal] = useState(false);

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const { getCurrentUser } = await import('@/lib/auth');
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
        .select('*')
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
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-4">
            <button
              onClick={handleBackToDashboard}
              className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-700"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Athletes</h1>
              <p className="text-sm text-gray-600">View and manage athlete data</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Athletes List */}
          <div className="col-span-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">All Athletes</h2>

              {loading ? (
                <p className="text-gray-500 text-center py-4">Loading athletes...</p>
              ) : athletes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No athletes found</p>
              ) : (
                <div className="space-y-2">
                  {athletes.map((athlete) => (
                    <button
                      key={athlete.id}
                      onClick={() => setSelectedAthlete(athlete)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition ${
                        selectedAthlete?.id === athlete.id
                          ? 'border-[#208479] bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User size={20} className="text-gray-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {athlete.full_name || 'Unnamed Athlete'}
                          </p>
                          <p className="text-sm text-gray-600">{athlete.email || 'No email'}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Athlete Details */}
          <div className="col-span-8">
            {!selectedAthlete ? (
              <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                <User size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg">Select an athlete to view their data</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Athlete Header */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                      <User size={32} className="text-gray-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {selectedAthlete.full_name || 'Unnamed Athlete'}
                      </h2>
                      <p className="text-gray-600">{selectedAthlete.email || 'No email'}</p>
                    </div>
                  </div>

                  {/* Profile Info */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    {selectedAthlete.date_of_birth && (
                      <div>
                        <p className="text-sm text-gray-600">Date of Birth</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(selectedAthlete.date_of_birth).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {selectedAthlete.phone_number && (
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-semibold text-gray-900">{selectedAthlete.phone_number}</p>
                      </div>
                    )}
                    {selectedAthlete.height_cm && (
                      <div>
                        <p className="text-sm text-gray-600">Height</p>
                        <p className="font-semibold text-gray-900">{selectedAthlete.height_cm} cm</p>
                      </div>
                    )}
                    {selectedAthlete.weight_kg && (
                      <div>
                        <p className="text-sm text-gray-600">Weight</p>
                        <p className="font-semibold text-gray-900">{selectedAthlete.weight_kg} kg</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section Tabs */}
                <div className="bg-white rounded-lg shadow">
                  <div className="border-b border-gray-200">
                    <nav className="flex">
                      <button
                        onClick={() => setActiveSection('benchmarks')}
                        className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition ${
                          activeSection === 'benchmarks'
                            ? 'border-[#208479] text-[#208479]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Trophy size={18} />
                        Benchmarks
                      </button>
                      <button
                        onClick={() => setActiveSection('lifts')}
                        className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition ${
                          activeSection === 'lifts'
                            ? 'border-[#208479] text-[#208479]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Dumbbell size={18} />
                        Lifts
                      </button>
                      <button
                        onClick={() => setActiveSection('logbook')}
                        className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition ${
                          activeSection === 'logbook'
                            ? 'border-[#208479] text-[#208479]'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <BookOpen size={18} />
                        Logbook
                      </button>
                    </nav>
                  </div>

                  {/* Section Content */}
                  <div className="p-6">
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
          athleteName={selectedAthlete.full_name}
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
          athleteName={selectedAthlete.full_name}
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
function BenchmarksSection({ athleteId, onAddResult }: { athleteId: string; onAddResult: () => void }) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [athleteId]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('benchmark_results')
        .select('*')
        .eq('user_id', athleteId)
        .order('workout_date', { ascending: false });

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
    return <p className="text-gray-500 text-center py-8">Loading benchmark results...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Benchmark Results</h3>
        <button
          onClick={onAddResult}
          className="flex items-center gap-2 px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition"
        >
          <Plus size={18} />
          Add Result
        </button>
      </div>

      {results.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No benchmark results recorded yet</p>
      ) : (
        <div className="space-y-3">
          {results.map((result) => (
            <div key={result.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">{result.benchmark_name}</p>
                <p className="text-sm text-gray-600">
                  {new Date(result.workout_date).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[#208479]">{result.result}</p>
                {result.notes && <p className="text-sm text-gray-600">{result.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Lifts Section Component
function LiftsSection({ athleteId, onAddResult }: { athleteId: string; onAddResult: () => void }) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [athleteId]);

  const fetchResults = async () => {
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
    return <p className="text-gray-500 text-center py-8">Loading lift records...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Lift Records</h3>
        <button
          onClick={onAddResult}
          className="flex items-center gap-2 px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition"
        >
          <Plus size={18} />
          Add Record
        </button>
      </div>

      {results.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No lift records recorded yet</p>
      ) : (
        <div className="space-y-3">
          {results.map((result) => (
            <div key={result.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-semibold text-gray-900">{result.lift_name}</p>
                <p className="text-sm text-gray-600">
                  {new Date(result.lift_date).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[#208479]">
                  {result.weight_kg} kg ({result.rep_max_type || `${result.reps} reps`})
                </p>
                {result.reps > 1 && (
                  <p className="text-xs text-gray-600">Est. 1RM: {result.calculated_1rm} kg</p>
                )}
                {result.notes && <p className="text-sm text-gray-600 mt-1">{result.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Logbook Section Component
function LogbookSection({ athleteId }: { athleteId: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [athleteId]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .select(`
          *,
          wods (
            title,
            date
          )
        `)
        .eq('user_id', athleteId)
        .order('workout_date', { ascending: false });

      if (error) {
        console.error('Error fetching workout logs:', error);
        throw error;
      }
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching workout logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p className="text-gray-500 text-center py-8">Loading workout logs...</p>;
  }

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900 mb-4">Workout Logs</h3>

      {logs.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No workout logs recorded yet</p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">
                    {log.wods?.title || 'Workout'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {new Date(log.workout_date).toLocaleDateString()}
                  </p>
                </div>
                {log.result && (
                  <p className="font-semibold text-[#208479]">{log.result}</p>
                )}
              </div>
              {log.notes && (
                <p className="text-sm text-gray-700 mt-2">{log.notes}</p>
              )}
            </div>
          ))}
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
  athleteId: string;
  athleteName: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [benchmarkName, setBenchmarkName] = useState('');
  const [result, setResult] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const benchmarks = [
    'Fran', 'Helen', 'Cindy', 'Grace', 'Isabel', 'Annie',
    'Diane', 'Elizabeth', 'Kelly', 'Nancy', 'Jackie', 'Mary'
  ];

  const handleSave = async () => {
    if (!benchmarkName || !result) {
      alert('Please fill in benchmark name and result');
      return;
    }

    try {
      const { error } = await supabase
        .from('benchmark_results')
        .insert({
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Add Benchmark Result for {athleteName}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Benchmark
            </label>
            <select
              value={benchmarkName}
              onChange={(e) => setBenchmarkName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900"
            >
              <option value="">Select benchmark...</option>
              {benchmarks.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Result
            </label>
            <input
              type="text"
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder="e.g., 5:42, 15 rounds"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition"
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
  athleteId: string;
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
    'Back Squat', 'Front Squat', 'Overhead Squat',
    'Deadlift', 'Sumo Deadlift',
    'Bench Press', 'Shoulder Press', 'Push Press', 'Jerk',
    'Clean', 'Snatch', 'Clean & Jerk'
  ];

  const calculate1RM = (weight: number, reps: number) => {
    if (reps === 1) return weight;
    return Math.round(weight * (36 / (37 - reps)));
  };

  const handleSave = async () => {
    if (!liftName || !weight) {
      alert('Please fill in lift name and weight');
      return;
    }

    const weightNum = parseFloat(weight);
    const reps = parseInt(repMaxType.replace('RM', ''));
    const calculated1RM = calculate1RM(weightNum, reps);

    try {
      const { error } = await supabase
        .from('lift_records')
        .insert({
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Add Lift Record for {athleteName}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lift
            </label>
            <select
              value={liftName}
              onChange={(e) => setLiftName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900"
            >
              <option value="">Select lift...</option>
              {lifts.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight (kg)
              </label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rep Max Type
              </label>
              <select
                value={repMaxType}
                onChange={(e) => setRepMaxType(e.target.value as '1RM' | '3RM' | '5RM' | '10RM')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900"
              >
                <option value="1RM">1RM</option>
                <option value="3RM">3RM</option>
                <option value="5RM">5RM</option>
                <option value="10RM">10RM</option>
              </select>
            </div>
          </div>

          {weight && repMaxType !== '1RM' && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Estimated 1RM:</p>
              <p className="text-lg font-semibold text-[#208479]">
                {calculate1RM(parseFloat(weight), parseInt(repMaxType.replace('RM', '')))} kg
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
