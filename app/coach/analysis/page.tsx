'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit2, Trash2, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Track {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
}

interface WorkoutType {
  id: string;
  name: string;
  description: string | null;
}

interface WODSection {
  id: string;
  type: string;
  content: string;
  duration?: string;
}

interface WOD {
  id: string;
  title: string;
  track_id: string | null;
  workout_type_id: string | null;
  date: string;
  sections: WODSection[];
}

interface Statistics {
  totalWorkouts: number;
  trackBreakdown: { trackId: string; trackName: string; count: number; color: string }[];
  typeBreakdown: { typeId: string; typeName: string; count: number }[];
  exerciseFrequency: { exercise: string; count: number }[];
  totalWODDuration: number;
  averageWODDuration: number;
  durationBreakdown: { range: string; count: number }[];
}

export default function AnalysisPage() {
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [wods, setWods] = useState<WOD[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Track Management Modal State
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [trackFormData, setTrackFormData] = useState({
    name: '',
    description: '',
    color: '#208479'
  });

  useEffect(() => {
    const role = sessionStorage.getItem('userRole');

    if (!role || role !== 'coach') {
      router.push('/');
      return;
    }

    fetchData();
  }, [router]);

  useEffect(() => {
    if (tracks.length > 0 && workoutTypes.length > 0) {
      fetchMonthlyWODs();
    }
  }, [selectedMonth, tracks, workoutTypes]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tracksResult, typesResult] = await Promise.all([
        supabase.from('tracks').select('*').order('name'),
        supabase.from('workout_types').select('*').order('name')
      ]);

      if (tracksResult.error) throw tracksResult.error;
      if (typesResult.error) throw typesResult.error;

      setTracks(tracksResult.data || []);
      setWorkoutTypes(typesResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyWODs = async () => {
    setLoadingStats(true);
    try {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('wods')
        .select('*')
        .gte('date', startDateStr)
        .lte('date', endDateStr);

      if (error) throw error;

      const wods: WOD[] = (data || []).map((wod: any) => ({
        id: wod.id,
        title: wod.title,
        track_id: wod.track_id,
        workout_type_id: wod.workout_type_id,
        date: wod.date,
        sections: wod.sections
      }));

      setWods(wods);
      calculateStatistics(wods);
    } catch (error) {
      console.error('Error fetching monthly WODs:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const calculateStatistics = (wods: WOD[]) => {
    // Total workouts
    const totalWorkouts = wods.length;

    // Track breakdown
    const trackCounts: Record<string, number> = {};
    wods.forEach(wod => {
      if (wod.track_id) {
        trackCounts[wod.track_id] = (trackCounts[wod.track_id] || 0) + 1;
      }
    });

    const trackBreakdown = Object.entries(trackCounts).map(([trackId, count]) => {
      const track = tracks.find(t => t.id === trackId);
      return {
        trackId,
        trackName: track?.name || 'Unknown',
        count,
        color: track?.color || '#208479'
      };
    }).sort((a, b) => b.count - a.count);

    // Workout type breakdown
    const typeCounts: Record<string, number> = {};
    wods.forEach(wod => {
      if (wod.workout_type_id) {
        typeCounts[wod.workout_type_id] = (typeCounts[wod.workout_type_id] || 0) + 1;
      }
    });

    const typeBreakdown = Object.entries(typeCounts).map(([typeId, count]) => {
      const type = workoutTypes.find(t => t.id === typeId);
      return {
        typeId,
        typeName: type?.name || 'Unknown',
        count
      };
    }).sort((a, b) => b.count - a.count);

    // Exercise frequency - extract from section content
    const exercisePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g;
    const exerciseCounts: Record<string, number> = {};

    wods.forEach(wod => {
      wod.sections.forEach(section => {
        const matches = section.content.match(exercisePattern);
        if (matches) {
          matches.forEach(exercise => {
            // Filter out common words that aren't exercises
            const commonWords = ['Time', 'Reps', 'Rounds', 'Minutes', 'Seconds', 'Weight', 'Score', 'Notes'];
            if (!commonWords.includes(exercise) && exercise.length > 2) {
              exerciseCounts[exercise] = (exerciseCounts[exercise] || 0) + 1;
            }
          });
        }
      });
    });

    const exerciseFrequency = Object.entries(exerciseCounts)
      .map(([exercise, count]) => ({ exercise, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 exercises

    // WOD duration - sum all sections with type "WOD" and categorize
    let totalWODDuration = 0;
    let wodCount = 0;
    const durationRanges = {
      '1-8 mins': 0,
      '9-12 mins': 0,
      '13-20 mins': 0,
      '21-30 mins': 0,
      '31-45 mins': 0,
      '45-60 mins': 0,
      '60+ mins': 0
    };

    wods.forEach(wod => {
      const wodSections = wod.sections.filter(s => s.type === 'WOD');
      if (wodSections.length > 0) {
        let wodTotalDuration = 0;
        wodSections.forEach(section => {
          if (section.duration) {
            const duration = parseInt(section.duration);
            if (!isNaN(duration)) {
              wodTotalDuration += duration;
            }
          }
        });

        if (wodTotalDuration > 0) {
          wodCount++;
          totalWODDuration += wodTotalDuration;

          // Categorize by duration range
          if (wodTotalDuration >= 1 && wodTotalDuration <= 8) {
            durationRanges['1-8 mins']++;
          } else if (wodTotalDuration >= 9 && wodTotalDuration <= 12) {
            durationRanges['9-12 mins']++;
          } else if (wodTotalDuration >= 13 && wodTotalDuration <= 20) {
            durationRanges['13-20 mins']++;
          } else if (wodTotalDuration >= 21 && wodTotalDuration <= 30) {
            durationRanges['21-30 mins']++;
          } else if (wodTotalDuration >= 31 && wodTotalDuration <= 45) {
            durationRanges['31-45 mins']++;
          } else if (wodTotalDuration >= 46 && wodTotalDuration <= 60) {
            durationRanges['45-60 mins']++;
          } else if (wodTotalDuration > 60) {
            durationRanges['60+ mins']++;
          }
        }
      }
    });

    const averageWODDuration = wodCount > 0 ? Math.round(totalWODDuration / wodCount) : 0;

    const durationBreakdown = Object.entries(durationRanges).map(([range, count]) => ({
      range,
      count
    }));

    setStatistics({
      totalWorkouts,
      trackBreakdown,
      typeBreakdown,
      exerciseFrequency,
      totalWODDuration,
      averageWODDuration,
      durationBreakdown
    });
  };

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('role');
    router.push('/');
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const openTrackModal = (track?: Track) => {
    if (track) {
      setEditingTrack(track);
      setTrackFormData({
        name: track.name,
        description: track.description || '',
        color: track.color || '#208479'
      });
    } else {
      setEditingTrack(null);
      setTrackFormData({
        name: '',
        description: '',
        color: '#208479'
      });
    }
    setTrackModalOpen(true);
  };

  const handleSaveTrack = async () => {
    try {
      if (editingTrack) {
        // Update existing track
        const { error } = await supabase
          .from('tracks')
          .update({
            name: trackFormData.name,
            description: trackFormData.description || null,
            color: trackFormData.color,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTrack.id);

        if (error) throw error;
      } else {
        // Create new track
        const { error } = await supabase
          .from('tracks')
          .insert([{
            name: trackFormData.name,
            description: trackFormData.description || null,
            color: trackFormData.color
          }]);

        if (error) throw error;
      }

      setTrackModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving track:', error);
      alert('Error saving track. Please try again.');
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm('Are you sure you want to delete this track?')) return;

    try {
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting track:', error);
      alert('Error deleting track. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-200">
      {/* Header */}
      <header className="bg-[#208479] text-white p-4 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/coach')}
              className="hover:bg-[#1a6b62] p-2 rounded transition flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              Back to Dashboard
            </button>
            <div className="flex items-center gap-2">
              <BarChart3 size={24} />
              <h1 className="text-2xl font-bold">Workout Analysis</h1>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white text-[#208479] font-semibold rounded hover:bg-gray-100 transition"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Track Management Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Manage Tracks</h2>
            <button
              onClick={() => openTrackModal()}
              className="px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-semibold rounded-lg flex items-center gap-2 transition"
            >
              <Plus size={18} />
              Add Track
            </button>
          </div>

          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tracks.map(track => (
                <div
                  key={track.id}
                  className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: track.color || '#208479' }}
                      />
                      <h3 className="font-bold text-gray-900">{track.name}</h3>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openTrackModal(track)}
                        className="text-[#208479] hover:text-[#1a6b62] p-1"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteTrack(track.id)}
                        className="text-gray-400 hover:text-red-600 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {track.description && (
                    <p className="text-sm text-gray-600">{track.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Statistics Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Monthly Statistics</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => changeMonth('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ChevronLeft size={20} className="text-gray-700" />
              </button>
              <span className="text-lg font-semibold text-gray-900 min-w-[200px] text-center">
                {formatMonthYear(selectedMonth)}
              </span>
              <button
                onClick={() => changeMonth('next')}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ChevronRight size={20} className="text-gray-700" />
              </button>
            </div>
          </div>

          {loadingStats ? (
            <div className="text-center py-12 text-gray-500">
              <p>Loading statistics...</p>
            </div>
          ) : statistics ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="flex gap-4 items-center">
                <div className="bg-gradient-to-br from-[#208479] to-[#1a6b62] text-white rounded-lg p-4 flex items-center gap-3">
                  <div>
                    <div className="text-xs font-semibold opacity-90">Total Workouts</div>
                    <div className="text-2xl font-bold">{statistics.totalWorkouts}</div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4 flex items-center gap-3">
                  <div>
                    <div className="text-xs font-semibold opacity-90">Avg WOD Duration</div>
                    <div className="text-2xl font-bold">{statistics.averageWODDuration}<span className="text-base ml-1">min</span></div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-lg p-4 flex items-center gap-3">
                  <div>
                    <div className="text-xs font-semibold opacity-90">Total WOD Time</div>
                    <div className="text-2xl font-bold">{statistics.totalWODDuration}<span className="text-base ml-1">min</span></div>
                  </div>
                </div>
              </div>

              {/* WOD Duration Breakdown */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">WOD Duration Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {statistics.durationBreakdown.map((duration, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                      <div className="text-2xl font-bold text-[#208479]">{duration.count}</div>
                      <div className="text-xs text-gray-700 font-medium mt-1">{duration.range}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Track Breakdown */}
              {statistics.trackBreakdown.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Workouts by Track</h3>
                  <div className="space-y-2">
                    {statistics.trackBreakdown.map(track => (
                      <div key={track.trackId} className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: track.color }}
                        />
                        <div className="flex-1 flex items-center gap-3">
                          <span className="text-gray-900 font-medium min-w-[150px]">{track.trackName}</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                            <div
                              className="h-6 rounded-full transition-all"
                              style={{
                                width: `${(track.count / statistics.totalWorkouts) * 100}%`,
                                backgroundColor: track.color
                              }}
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-900">
                              {track.count}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Workout Type Breakdown */}
              {statistics.typeBreakdown.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Workouts by Type</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {statistics.typeBreakdown.map(type => (
                      <div key={type.typeId} className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                        <div className="text-2xl font-bold text-[#208479]">{type.count}</div>
                        <div className="text-sm text-gray-700 font-medium mt-1">{type.typeName}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exercise Frequency */}
              {statistics.exerciseFrequency.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Top Exercises</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {statistics.exerciseFrequency.map((exercise, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="text-lg font-bold text-[#208479]">{exercise.count}</div>
                        <div className="text-xs text-gray-700 font-medium mt-1 truncate" title={exercise.exercise}>
                          {exercise.exercise}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {statistics.totalWorkouts === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <BarChart3 size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">No workouts found for this month</p>
                  <p className="text-sm mt-2">Create some workouts on the dashboard to see statistics here.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <BarChart3 size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Track Modal */}
      {trackModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="bg-[#208479] text-white p-4 rounded-t-lg">
              <h3 className="text-xl font-bold">
                {editingTrack ? 'Edit Track' : 'Add New Track'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">
                  Track Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={trackFormData.name}
                  onChange={(e) => setTrackFormData({ ...trackFormData, name: e.target.value })}
                  placeholder="e.g., Strength Focus"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">
                  Description
                </label>
                <textarea
                  value={trackFormData.description}
                  onChange={(e) => setTrackFormData({ ...trackFormData, description: e.target.value })}
                  placeholder="Brief description of this track..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900">
                  Color
                </label>
                <input
                  type="color"
                  value={trackFormData.color}
                  onChange={(e) => setTrackFormData({ ...trackFormData, color: e.target.value })}
                  className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t">
              <button
                onClick={() => setTrackModalOpen(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTrack}
                disabled={!trackFormData.name.trim()}
                className="flex-1 px-6 py-3 bg-[#208479] hover:bg-[#1a6b62] text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingTrack ? 'Save Changes' : 'Add Track'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
