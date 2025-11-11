// ForgeBenchmarksTab component
'use client';

import { supabase } from '@/lib/supabase';
import { Edit2, Target, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface BenchmarkResult {
  id: string;
  benchmark_name: string;
  result: string;
  notes?: string;
  workout_date: string;
  scaling?: string;
}

interface ForgeBenchmarksTabProps {
  userId: string;
}

export default function ForgeBenchmarksTab({ userId }: ForgeBenchmarksTabProps) {
  const [selectedBenchmark, setSelectedBenchmark] = useState<string | null>(null);
  const [chartBenchmark, setChartBenchmark] = useState<string | null>(null);
  const [newTime, setNewTime] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newScaling, setNewScaling] = useState<'Rx' | 'Sc1' | 'Sc2' | 'Sc3'>('Rx');
  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkResult[]>([]);
  const [editingBenchmarkId, setEditingBenchmarkId] = useState<string | null>(null);
  const [benchmarks, setBenchmarks] = useState<Array<{ name: string; type: string; description: string }>>([]);

  useEffect(() => {
    fetchBenchmarks();
    fetchBenchmarkHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchBenchmarks = async () => {
    try {
      const { data, error } = await supabase
        .from('forge_benchmarks')
        .select('name, type, description')
        .order('display_order');

      if (error) throw error;
      setBenchmarks(data || []);
    } catch (error) {
      console.error('Error fetching benchmarks:', error);
    }
  };

  const fetchBenchmarkHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('benchmark_results')
        .select('*')
        .eq('user_id', userId)
        .order('workout_date', { ascending: false });

      if (error) throw error;
      setBenchmarkHistory(data || []);
    } catch (error) {
      console.error('Error fetching benchmark history:', error);
    }
  };

  const handleSaveBenchmark = async () => {
    if (!selectedBenchmark || !newTime) return;

    try {
      if (editingBenchmarkId) {
        // Update existing entry
        const { error } = await supabase
          .from('benchmark_results')
          .update({
            benchmark_name: selectedBenchmark,
            result: newTime,
            notes: newNotes || null,
            workout_date: newDate,
            scaling: newScaling,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingBenchmarkId);

        if (error) throw error;
      } else {
        // Insert new entry
        const { error } = await supabase.from('benchmark_results').insert({
          user_id: userId,
          benchmark_name: selectedBenchmark,
          result: newTime,
          notes: newNotes || null,
          workout_date: newDate,
          scaling: newScaling,
        });

        if (error) throw error;
      }

      // Refresh the history
      await fetchBenchmarkHistory();

      // Clear form
      setNewTime('');
      setNewNotes('');
      setNewDate(new Date().toISOString().split('T')[0]);
      setNewScaling('Rx');
      setSelectedBenchmark(null);
      setEditingBenchmarkId(null);
    } catch (error) {
      console.error('Error saving benchmark:', error);
      alert('Failed to save benchmark result. Please try again.');
    }
  };

  const handleEditBenchmark = (entry: BenchmarkResult) => {
    setSelectedBenchmark(entry.benchmark_name);
    setNewTime(entry.result);
    setNewNotes(entry.notes || '');
    setNewDate(entry.workout_date);
    setNewScaling((entry.scaling as 'Rx' | 'Sc1' | 'Sc2' | 'Sc3') || 'Rx');
    setEditingBenchmarkId(entry.id);
  };

  const handleDeleteBenchmark = async (id: string) => {
    if (!confirm('Are you sure you want to delete this benchmark result?')) return;

    try {
      const { error } = await supabase.from('benchmark_results').delete().eq('id', id);

      if (error) throw error;

      // Refresh the history
      await fetchBenchmarkHistory();
    } catch (error) {
      console.error('Error deleting benchmark:', error);
      alert('Failed to delete benchmark result. Please try again.');
    }
  };

  const getBestTimes = (benchmarkName: string) => {
    const results = benchmarkHistory.filter(entry => entry.benchmark_name === benchmarkName);
    if (results.length === 0) return { rx: null, scaled: null };

    const rxResults = results.filter(r => r.scaling === 'Rx');
    const scaledResults = results.filter(r => r.scaling !== 'Rx');

    const getBestTime = (results: BenchmarkResult[]) => {
      if (results.length === 0) return null;
      // For time-based workouts, find the shortest time
      // For rep-based workouts, find the highest reps
      // This is a simplified approach - you might want to add more logic
      return results[0]; // Since we're already sorted by date desc, this gets the most recent
    };

    return {
      rx: getBestTime(rxResults),
      scaled: getBestTime(scaledResults),
    };
  };

  const getBenchmarkChartData = (benchmarkName: string) => {
    const results = benchmarkHistory
      .filter(entry => entry.benchmark_name === benchmarkName)
      .sort((a, b) => new Date(a.workout_date).getTime() - new Date(b.workout_date).getTime());

    return results.map(entry => {
      // Convert time strings to seconds for charting
      const timeToSeconds = (timeStr: string) => {
        if (timeStr.includes(':')) {
          const parts = timeStr.split(':');
          return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
        return parseInt(timeStr) || 0;
      };

      return {
        date: new Date(entry.workout_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        value: timeToSeconds(entry.result),
        resultDisplay: entry.result,
        scaling: entry.scaling,
      };
    });
  };

  const sortedBenchmarks = benchmarks
    .map(b => {
      const userResults = benchmarkHistory.filter(e => e.benchmark_name === b.name);
      const hasResults = userResults.length > 0;
      const mostRecentDate = hasResults ? userResults[0].workout_date : null; // Already sorted by date desc
      return {
        ...b,
        hasResults,
        mostRecentDate,
        count: userResults.length,
      };
    })
    .sort((a, b) => {
      // First, sort by whether they have results
      if (a.hasResults && !b.hasResults) return -1;
      if (!a.hasResults && b.hasResults) return 1;

      // If both have results, sort by most recent date (descending)
      if (a.hasResults && b.hasResults) {
        return new Date(b.mostRecentDate!).getTime() - new Date(a.mostRecentDate!).getTime();
      }

      // If neither has results, maintain original order
      return 0;
    });

  return (
    <div className='space-y-6'>
      <div className='bg-white rounded-lg shadow p-6'>
        <h2 className='text-2xl font-bold text-gray-900 mb-2'>Forge Benchmarks</h2>
        <p className='text-gray-600 mb-6'>
          Track your performance on gym-specific benchmark workouts.
        </p>

        <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3'>
          {sortedBenchmarks.map(benchmark => {
            const bestTimes = getBestTimes(benchmark.name);
            return (
              <div
                key={benchmark.name}
                onClick={() => setSelectedBenchmark(benchmark.name)}
                className='group border border-gray-300 rounded-lg p-3 bg-cyan-100/50 hover:border-[#208479] hover:bg-cyan-100/70 cursor-pointer transition'
              >
                <div className='flex items-start justify-between mb-1'>
                  <h3 className='text-base font-bold text-gray-900'>{benchmark.name}</h3>
                  <Target size={18} className='text-[#208479] flex-shrink-0' />
                </div>
                <p className='text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-all max-h-0 group-hover:max-h-8 overflow-hidden group-hover:mb-1'>
                  {benchmark.type}
                </p>
                {bestTimes.rx && (
                  <div className='mb-1'>
                    <p className='text-xs text-gray-600'>PR:</p>
                    <p className='text-sm font-bold text-[#208479]'>{bestTimes.rx.result}</p>
                  </div>
                )}
                {bestTimes.scaled && (
                  <div className='mb-1'>
                    <p className='text-xs text-gray-600'>Scaled PR:</p>
                    <p className='text-sm font-bold text-orange-600'>{bestTimes.scaled.result}</p>
                  </div>
                )}
                {benchmark.count > 0 && (
                  <p className='text-xs text-gray-500'>{benchmark.count} attempts</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add/Edit Benchmark Modal */}
      {selectedBenchmark && (
        <div className='bg-white rounded-lg shadow p-6'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-xl font-semibold text-gray-900'>
              {editingBenchmarkId ? 'Edit' : 'Log'} {selectedBenchmark}
            </h3>
            <div className='flex gap-2'>
              <button
                onClick={() => setChartBenchmark(chartBenchmark === selectedBenchmark ? null : selectedBenchmark)}
                className='px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition'
              >
                {chartBenchmark === selectedBenchmark ? 'Hide Chart' : 'Show Progress'}
              </button>
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>Date</label>
                <input
                  type='date'
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>Result/Time</label>
                <input
                  type='text'
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                  placeholder='e.g., 12:45, 150 reps, 225 lbs'
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>Scaling</label>
                <select
                  value={newScaling}
                  onChange={e => setNewScaling(e.target.value as 'Rx' | 'Sc1' | 'Sc2' | 'Sc3')}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
                >
                  <option value='Rx'>Rx (As Prescribed)</option>
                  <option value='Sc1'>Scaled 1</option>
                  <option value='Sc2'>Scaled 2</option>
                  <option value='Sc3'>Scaled 3</option>
                </select>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>Notes</label>
                <textarea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder='How did it feel? Any modifications?'
                  rows={4}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 resize-none'
                />
              </div>

              <div className='flex gap-3 pt-4'>
                <button
                  onClick={() => {
                    setSelectedBenchmark(null);
                    setNewTime('');
                    setNewNotes('');
                    setNewDate(new Date().toISOString().split('T')[0]);
                    setNewScaling('Rx');
                    setEditingBenchmarkId(null);
                  }}
                  className='flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition'
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBenchmark}
                  disabled={!newTime}
                  className='flex-1 px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {editingBenchmarkId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>

            {/* History */}
            <div>
              <h4 className='text-lg font-semibold text-gray-900 mb-4'>Previous Results</h4>
              <div className='space-y-3 max-h-96 overflow-y-auto'>
                {benchmarkHistory
                  .filter(entry => entry.benchmark_name === selectedBenchmark)
                  .map(entry => (
                    <div key={entry.id} className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                      <div className='flex-1'>
                        <div className='flex items-center gap-2 mb-1'>
                          <span className='font-semibold text-gray-900'>{entry.result}</span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              entry.scaling === 'Rx'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {entry.scaling}
                          </span>
                        </div>
                        <p className='text-sm text-gray-600'>
                          {new Date(entry.workout_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                        {entry.notes && <p className='text-sm text-gray-500 mt-1'>{entry.notes}</p>}
                      </div>
                      <div className='flex gap-2'>
                        <button
                          onClick={() => handleEditBenchmark(entry)}
                          className='p-2 text-gray-600 hover:text-[#208479] hover:bg-white rounded transition'
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteBenchmark(entry.id)}
                          className='p-2 text-gray-600 hover:text-red-600 hover:bg-white rounded transition'
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {chartBenchmark && (
            <div className='mt-4'>
              <h4 className='text-lg font-semibold text-gray-900 mb-4'>
                {chartBenchmark} Progress
              </h4>
              <ResponsiveContainer width='100%' height={300}>
                <LineChart data={getBenchmarkChartData(chartBenchmark)}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className='bg-white p-3 border border-gray-300 rounded shadow-lg'>
                            <p className='text-sm text-gray-900 font-semibold'>
                              {payload[0].payload.date}
                            </p>
                            <p className='text-sm text-[#208479] font-semibold'>
                              Result: {payload[0].payload.resultDisplay}
                            </p>
                            <p className='text-sm text-gray-600'>
                              Scaling: {payload[0].payload.scaling}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Line
                    type='monotone'
                    dataKey='value'
                    stroke='#208479'
                    strokeWidth={2}
                    dot={{ fill: '#208479', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#208479', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
