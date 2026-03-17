// AthletePageForgeBenchmarksTab component
'use client';

import { authFetch } from '@/lib/auth-fetch';
import { confirm } from '@/lib/confirm';
import { supabase } from '@/lib/supabase';
import { ChevronDown, ChevronRight, Edit2, Target, Timer, Trash2 } from 'lucide-react';
import WorkoutTimer from './WorkoutTimer';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FocusTrap } from '@/components/ui/FocusTrap';
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
  time_result?: string;
  reps_result?: number;
  weight_result?: number;
  result_value?: string; // Legacy field for backward compatibility
  notes?: string;
  result_date: string;
  scaling_level?: string;
}

interface AthletePageForgeBenchmarksTabProps {
  userId: string;
}

// Helper function to get display value from result fields
function getResultDisplayValue(result: BenchmarkResult): string {
  // Try new fields first
  if (result.time_result) return result.time_result;
  if (result.reps_result) return result.reps_result.toString();
  if (result.weight_result) return `${result.weight_result}kg`;
  // Fall back to legacy field
  return result.result_value || '';
}

export default function AthletePageForgeBenchmarksTab({ userId }: AthletePageForgeBenchmarksTabProps) {
  const [selectedBenchmark, setSelectedBenchmark] = useState<string | null>(null);
  const [chartBenchmark, setChartBenchmark] = useState<string | null>(null);
  const [newTime, setNewTime] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newScaling, setNewScaling] = useState<'Rx' | 'Sc1' | 'Sc2' | 'Sc3'>('Rx');
  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkResult[]>([]);
  const [recentBenchmarks, setRecentBenchmarks] = useState<BenchmarkResult[]>([]);
  const [editingBenchmarkId, setEditingBenchmarkId] = useState<string | null>(null);
  const [benchmarks, setBenchmarks] = useState<Array<{ name: string; type: string; description: string }>>([]);
  const [expandedSections, setExpandedSections] = useState({
    recent: true,
    charts: true,
  });
  const [showTimer, setShowTimer] = useState(false);

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
      // Get list of forge benchmark names
      const { data: forgeNames } = await supabase
        .from('forge_benchmarks')
        .select('name');

      const forgeBenchmarkNames = new Set((forgeNames || []).map(b => b.name));

      const { data, error } = await supabase
        .from('benchmark_results')
        .select('*')
        .eq('user_id', userId)
        .order('result_date', { ascending: false });

      if (error) throw error;

      // Filter to only forge benchmarks
      const forgeResults = (data || []).filter(r => forgeBenchmarkNames.has(r.benchmark_name));
      setBenchmarkHistory(forgeResults);
      setRecentBenchmarks(forgeResults.slice(0, 10));
    } catch (error) {
      console.error('Error fetching benchmark history:', error);
    }
  };

  const handleSaveBenchmark = async () => {
    if (!selectedBenchmark || !newTime) {
      toast.warning('Please enter a result/time value');
      return;
    }

    try {
      // Fetch forge benchmark details to get ID and type
      const { data: forgeBenchmark, error: fetchError } = await supabase
        .from('forge_benchmarks')
        .select('id, type')
        .eq('name', selectedBenchmark)
        .single();

      if (fetchError || !forgeBenchmark) {
        throw new Error('Forge benchmark not found');
      }

      const benchmarkType = forgeBenchmark.type;
      const typeLower = benchmarkType.toLowerCase();

      // Map single value to typed fields based on benchmark type
      const timeResult = typeLower.includes('time') ? newTime : '';
      const repsResult = (typeLower.includes('rep') || typeLower.includes('amrap')) ? newTime : '';
      const weightResult = (typeLower.includes('load') || typeLower.includes('weight')) ? newTime : '';

      const response = await authFetch('/api/benchmark-results', {
        method: 'POST',
        body: JSON.stringify({
          id: editingBenchmarkId || undefined,
          userId,
          forgeBenchmarkId: forgeBenchmark.id,
          benchmarkName: selectedBenchmark,
          benchmarkType,
          timeResult,
          repsResult,
          weightResult,
          scalingLevel: newScaling,
          notes: newNotes || null,
          resultDate: newDate,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save benchmark result');

      if (data.isPR) {
        toast.success(`New PR for ${selectedBenchmark}!`);
      } else {
        toast.success(`Successfully ${editingBenchmarkId ? 'updated' : 'saved'} benchmark result!`);
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
    } catch (error: unknown) {
      console.error('Error saving benchmark:', error);
      toast.error(`Failed to save benchmark result: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEditBenchmark = (entry: BenchmarkResult) => {
    setSelectedBenchmark(entry.benchmark_name);
    setNewTime(getResultDisplayValue(entry));
    setNewNotes(entry.notes || '');
    setNewDate(entry.result_date);
    setNewScaling((entry.scaling_level as 'Rx' | 'Sc1' | 'Sc2' | 'Sc3') || 'Rx');
    setEditingBenchmarkId(entry.id);
  };

  const handleDeleteBenchmark = async (id: string) => {
    if (!(await confirm({ title: 'Delete Result', message: 'Are you sure you want to delete this benchmark result?', confirmText: 'Delete', variant: 'danger' }))) return;

    try {
      const { error } = await supabase.from('benchmark_results').delete().eq('id', id);

      if (error) throw error;

      // Refresh the history
      await fetchBenchmarkHistory();
    } catch (error) {
      console.error('Error deleting benchmark:', error);
      toast.error('Failed to delete benchmark result. Please try again.');
    }
  };

  const getBestTimes = (benchmarkName: string) => {
    const results = benchmarkHistory.filter(entry => entry.benchmark_name === benchmarkName);
    if (results.length === 0) return { rx: null, scaled: null };

    const rxResults = results.filter(r => r.scaling_level === 'Rx');
    const scaledResults = results.filter(r => r.scaling_level !== 'Rx');

    const timeToSeconds = (timeStr: string) => {
      if (timeStr.includes(':')) {
        const parts = timeStr.split(':');
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      }
      return parseInt(timeStr) || 0;
    };

    // Check if this is a "hold for time" benchmark (higher is better)
    const isHoldBenchmark = benchmarkName.toLowerCase().includes('hold') ||
                           benchmarkName.toLowerCase().includes('hang');

    const getBestTime = (results: BenchmarkResult[]) => {
      if (results.length === 0) return null;

      // Determine if time-based (contains colon) or rep-based
      const firstResultValue = getResultDisplayValue(results[0]);
      const isTimeBased = firstResultValue.includes(':');

      if (isTimeBased) {
        if (isHoldBenchmark) {
          // For hold benchmarks: find HIGHEST time (best)
          return results.reduce((best, current) => {
            const bestSeconds = timeToSeconds(getResultDisplayValue(best));
            const currentSeconds = timeToSeconds(getResultDisplayValue(current));
            return currentSeconds > bestSeconds ? current : best;
          });
        } else {
          // For regular time benchmarks: find LOWEST time (best)
          return results.reduce((best, current) => {
            const bestSeconds = timeToSeconds(getResultDisplayValue(best));
            const currentSeconds = timeToSeconds(getResultDisplayValue(current));
            return currentSeconds < bestSeconds ? current : best;
          });
        }
      } else {
        // For rep-based: find HIGHEST reps (best)
        return results.reduce((best, current) => {
          const bestReps = parseInt(getResultDisplayValue(best)) || 0;
          const currentReps = parseInt(getResultDisplayValue(current)) || 0;
          return currentReps > bestReps ? current : best;
        });
      }
    };

    return {
      rx: getBestTime(rxResults),
      scaled: getBestTime(scaledResults),
    };
  };

  const getBenchmarkChartData = (benchmarkName: string) => {
    const results = benchmarkHistory
      .filter(entry => entry.benchmark_name === benchmarkName)
      .sort((a, b) => new Date(a.result_date).getTime() - new Date(b.result_date).getTime());

    const timeToSeconds = (timeStr: string) => {
      if (timeStr.includes(':')) {
        const parts = timeStr.split(':');
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      }
      return parseInt(timeStr) || 0;
    };

    // Check if this is a "hold for time" benchmark (higher is better)
    const isHoldBenchmark = benchmarkName.toLowerCase().includes('hold') ||
                           benchmarkName.toLowerCase().includes('hang');

    // Find best result for each scaling level to mark as PR
    const prsByScaling = new Map<string, BenchmarkResult>();
    results.forEach(result => {
      const scalingKey = result.scaling_level || 'Rx'; // Default to Rx for consistency
      const existing = prsByScaling.get(scalingKey);

      if (!existing) {
        prsByScaling.set(scalingKey, result);
      } else {
        // Determine if time-based or rep-based
        const resultValue = getResultDisplayValue(result);
        const isTimeBased = resultValue.includes(':');

        if (isTimeBased) {
          // For time-based: check if hold/hang (higher is better) or regular (lower is better)
          const existingSeconds = timeToSeconds(getResultDisplayValue(existing));
          const currentSeconds = timeToSeconds(resultValue);
          if (isHoldBenchmark) {
            // Hold benchmarks: higher time is better
            if (currentSeconds > existingSeconds) {
              prsByScaling.set(scalingKey, result);
            }
          } else {
            // Regular time benchmarks: lower time is better
            if (currentSeconds < existingSeconds) {
              prsByScaling.set(scalingKey, result);
            }
          }
        } else {
          // For rep-based: higher is better
          const existingReps = parseInt(getResultDisplayValue(existing)) || 0;
          const currentReps = parseInt(resultValue) || 0;
          if (currentReps > existingReps) {
            prsByScaling.set(scalingKey, result);
          }
        }
      }
    });

    // Find overall best result (considering scaling hierarchy)
    const scalingPriority = { 'Rx': 4, 'Sc1': 3, 'Sc2': 2, 'Sc3': 1 };
    let overallBest: BenchmarkResult | null = null;

    Array.from(prsByScaling.values()).forEach(pr => {
      if (!overallBest) {
        overallBest = pr;
      } else {
        const currentPriority = scalingPriority[pr.scaling_level as keyof typeof scalingPriority] || 0;
        const bestPriority = scalingPriority[overallBest.scaling_level as keyof typeof scalingPriority] || 0;

        if (currentPriority > bestPriority) {
          overallBest = pr;
        } else if (currentPriority === bestPriority) {
          const prValue = getResultDisplayValue(pr);
          const isTimeBased = prValue.includes(':');
          if (isTimeBased) {
            if (isHoldBenchmark) {
              // Hold benchmarks: higher time is better
              if (timeToSeconds(prValue) > timeToSeconds(getResultDisplayValue(overallBest))) {
                overallBest = pr;
              }
            } else {
              // Regular time benchmarks: lower time is better
              if (timeToSeconds(prValue) < timeToSeconds(getResultDisplayValue(overallBest))) {
                overallBest = pr;
              }
            }
          } else {
            if (parseInt(prValue) > parseInt(getResultDisplayValue(overallBest))) {
              overallBest = pr;
            }
          }
        }
      }
    });

    return results.map(entry => {
      // Convert time strings to seconds for charting
      const timeToSeconds = (timeStr: string) => {
        if (timeStr.includes(':')) {
          const parts = timeStr.split(':');
          return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
        return parseInt(timeStr) || 0;
      };

      const isPR = prsByScaling.get(entry.scaling_level || 'Rx')?.id === entry.id;
      const isOverallBest = overallBest?.id === entry.id;
      const displayValue = getResultDisplayValue(entry);

      return {
        date: new Date(entry.result_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        value: timeToSeconds(displayValue),
        result_valueDisplay: displayValue,
        scaling_level: entry.scaling_level,
        isPR: isPR,
        isOverallBest: isOverallBest,
      };
    });
  };

  // Custom dot component to render PR badges with scaling-based colors
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.isPR) {
      let badgeColor = '#dc2626'; // Red for Rx (default)

      if (payload.scaling_level === 'Sc1') {
        badgeColor = '#050df5ff'; // Blue for Sc1
      } else if (payload.scaling_level === 'Sc2') {
        badgeColor = '#7076f2ff'; // Medium blue for Sc2
      } else if (payload.scaling_level === 'Sc3') {
        badgeColor = '#a8abf5ff'; // Light blue for Sc3
      }

      return (
        <g>
          <circle cx={cx} cy={cy} r={6} fill='#178da6' stroke='#fff' strokeWidth={2} />
          <circle cx={cx} cy={cy} r={10} fill={badgeColor} opacity={0.8} />
          <text x={cx} y={cy + 4} textAnchor='middle' fill='white' fontSize={10} fontWeight='bold'>
            PR
          </text>
        </g>
      );
    }
    return <circle cx={cx} cy={cy} r={4} fill='#178da6' stroke='#fff' strokeWidth={2} />;
  };

  const sortedBenchmarks = benchmarks
    .map(b => {
      const userResults = benchmarkHistory.filter(e => e.benchmark_name === b.name);
      const hasResults = userResults.length > 0;
      const mostRecentDate = hasResults ? userResults[0].result_date : null; // Already sorted by date desc
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
    <div className='space-y-4 sm:space-y-6 bg-gray-500 p-3 sm:p-6 rounded-lg'>
      <div className='bg-white rounded-xl shadow-lg p-4 sm:p-8'>
        <div className='flex items-center justify-between mb-2 sm:mb-4'>
          <h2 className='text-2xl sm:text-3xl font-extrabold text-gray-800'>Forge Benchmarks</h2>
          <div className='flex items-center gap-1'>
            <button
              onClick={() => {
                const allExpanded = Object.values(expandedSections).every(Boolean);
                setExpandedSections({ recent: !allExpanded, charts: !allExpanded });
              }}
              className='p-2 text-gray-600 hover:text-[#178da6] hover:bg-gray-100 rounded-lg transition'
              title={Object.values(expandedSections).every(Boolean) ? 'Collapse all' : 'Expand all'}
              aria-label='Toggle collapse all sections'
            >
              {Object.values(expandedSections).every(Boolean) ? <ChevronRight size={22} /> : <ChevronDown size={22} />}
            </button>
            <button
              onClick={() => setShowTimer(!showTimer)}
              className={`p-2 rounded-lg transition ${
                showTimer
                  ? 'text-white bg-[#178da6]'
                  : 'text-gray-600 hover:text-[#178da6] hover:bg-gray-100'
              }`}
              title='Workout Timer'
              aria-label='Open workout timer'
            >
              <Timer size={22} />
            </button>
          </div>
        </div>
        {showTimer && (
          <div className='mb-4 border border-gray-200 rounded-lg p-4'>
            <WorkoutTimer onClose={() => setShowTimer(false)} />
          </div>
        )}
        <p className='text-sm sm:text-base text-gray-700 mb-4 sm:mb-8 leading-relaxed'>
          Track your performance on gym-specific benchmark workouts.
        </p>

        <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3'>
          {sortedBenchmarks.map(benchmark => {
            const bestTimes = getBestTimes(benchmark.name);
            const bestResult = bestTimes.rx || bestTimes.scaled;
            return (
              <div
                key={benchmark.name}
                onClick={() => setSelectedBenchmark(benchmark.name)}
                className='group border border-cyan-300 rounded-lg p-2 sm:p-3 bg-cyan-100/50 hover:border-cyan-400 hover:bg-cyan-200/70 cursor-pointer transition min-h-[60px]'
              >
                <div className='flex items-start justify-between mb-1'>
                  <h3 className='text-sm sm:text-base font-bold text-gray-900'>{benchmark.name}</h3>
                  <Target size={18} className='text-[#178da6] flex-shrink-0' />
                </div>
                <p className='text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-all max-h-0 group-hover:max-h-8 overflow-hidden group-hover:mb-1'>
                  {benchmark.type}
                </p>
                {bestResult && (
                  <div className='flex items-end justify-between'>
                    <div>
                      <p className='text-xs text-gray-600'>PR:</p>
                      <p className='text-sm font-bold text-[#178da6]'>{getResultDisplayValue(bestResult)}</p>
                    </div>
                    {benchmark.count > 0 && (
                      <p className='text-xs text-gray-500'>{benchmark.count}x</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Forge Benchmarks Section */}
      <div className='bg-white rounded-xl shadow p-3 sm:p-6'>
        <button
          onClick={() => setExpandedSections(prev => ({ ...prev, recent: !prev.recent }))}
          className='flex items-center gap-2 text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 hover:text-[#178da6] transition'
        >
          {expandedSections.recent ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          Recent Forge Benchmarks
        </button>

        {expandedSections.recent && (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4'>
            {recentBenchmarks.length > 0 ? (
              recentBenchmarks.map(result => (
                <div key={result.id} className='group flex flex-col p-3 bg-gradient-to-r from-cyan-100 to-cyan-200 border border-cyan-300 rounded-lg'>
                  <div className='relative flex items-center gap-2 mb-2'>
                    <h4 className='font-bold text-gray-900'>{result.benchmark_name}</h4>
                    <div className='ml-auto flex items-center gap-1'>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          (result.scaling_level || 'Rx') === 'Rx'
                            ? 'bg-red-600 text-white'
                            : result.scaling_level === 'Sc1'
                            ? 'bg-blue-800 text-white'
                            : result.scaling_level === 'Sc2'
                            ? 'bg-blue-500 text-white'
                            : 'bg-blue-400 text-white'
                        }`}
                      >
                        {result.scaling_level || 'Rx'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBenchmark(result.id);
                        }}
                        className='p-1 text-gray-600 hover:text-red-600 hover:bg-white/50 rounded transition opacity-0 group-hover:opacity-100'
                        title='Delete benchmark record'
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className='flex items-center justify-between'>
                    <p className='text-lg font-bold text-[#178da6]'>{getResultDisplayValue(result)}</p>
                    <p className='text-sm text-gray-600'>
                      {new Date(result.result_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className='text-gray-500 text-center py-8'>No recent forge benchmark results</p>
            )}
          </div>
        )}
      </div>

      {/* Progress Charts Section */}
      <div className='bg-white rounded-xl shadow p-3 sm:p-6'>
        <button
          onClick={() => setExpandedSections(prev => ({ ...prev, charts: !prev.charts }))}
          className='flex items-center gap-2 text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 hover:text-[#178da6] transition'
        >
          {expandedSections.charts ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          Progress Charts
        </button>

        {expandedSections.charts && (
          <div>
            <p className='text-sm sm:text-base text-gray-600 mb-4 sm:mb-6'>Visualize your improvements over time.</p>
            <div className='grid grid-cols-1 gap-4 sm:gap-6'>
              {benchmarks.map(benchmark => {
                const chartData = getBenchmarkChartData(benchmark.name);
                if (chartData.length < 2) return null; // Only show charts with 2+ data points
                return (
                  <div key={benchmark.name} className='border border-cyan-300 rounded-lg p-2 sm:p-4 bg-gradient-to-br from-cyan-200 to-cyan-300'>
                    <h4 className='font-bold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base'>{benchmark.name}</h4>
                    <ResponsiveContainer width='100%' height={200} className='[&_svg]:outline-none'>
                      <LineChart data={chartData} margin={{ left: 0, right: 5, top: 5, bottom: 15 }}>
                        <CartesianGrid strokeDasharray='3 3' stroke='white' />
                        <XAxis dataKey='date' tick={({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
                          const parts = payload.value.replace(',', '').split(' ');
                          const line1 = `${parts[0]} ${parts[1]}`;
                          const line2 = parts[2];
                          return (
                            <g transform={`translate(${x},${y})`}>
                              <text x={0} y={0} dy={10} textAnchor='middle' fontSize={10}>{line1}</text>
                              <text x={0} y={0} dy={22} textAnchor='middle' fontSize={10} fill='#999'>{line2}</text>
                            </g>
                          );
                        }} padding={{ left: 20, right: 20 }} interval={0} />
                        <YAxis hide domain={[(min: number) => Math.floor(min * 0.9), (max: number) => Math.ceil(max * 1.05)]} />
                        <Tooltip
                          isAnimationActive={false}
                          cursor={{ stroke: '#aaa', strokeWidth: 1.5 }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className='bg-white p-2 border border-gray-300 rounded shadow-lg'>
                                  <p className='text-xs text-gray-900 font-semibold'>
                                    {payload[0].payload.date}
                                  </p>
                                  <p className='text-xs text-[#178da6] font-semibold'>
                                    {payload[0].payload.result_valueDisplay}
                                  </p>
                                  <p className='text-xs text-gray-600'>
                                    {payload[0].payload.scaling_level}
                                  </p>
                                  {payload[0].payload.isPR && (
                                    <p className='text-xs text-red-600 font-bold'>PR!</p>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line
                          type='monotone'
                          dataKey='value'
                          stroke='#178da6'
                          strokeWidth={2}
                          dot={<CustomDot />}
                          activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Benchmark Modal */}
      {selectedBenchmark && (
        <FocusTrap>
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50' onClick={() => {
          setSelectedBenchmark(null);
          setEditingBenchmarkId(null);
          setNewTime('');
          setNewNotes('');
          setNewDate(new Date().toISOString().split('T')[0]);
          setNewScaling('Rx');
        }}>
          <div className='bg-gray-700 rounded-lg shadow-xl p-4 sm:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto' onClick={(e) => e.stopPropagation()}>
            <div className='flex items-center justify-between mb-3 sm:mb-4'>
              <h3 className='text-lg sm:text-xl font-semibold text-gray-50'>
                {editingBenchmarkId ? 'Edit' : 'Log'} {selectedBenchmark}
              </h3>
              <div className='flex gap-2'>
                <button
                  onClick={() => setChartBenchmark(chartBenchmark === selectedBenchmark ? null : selectedBenchmark)}
                  className='px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition'
                >
                  {chartBenchmark === selectedBenchmark ? 'Hide Chart' : 'Show Progress'}
                </button>
                <button
                  onClick={() => {
                    setSelectedBenchmark(null);
                    setEditingBenchmarkId(null);
                    setNewTime('');
                    setNewNotes('');
                    setNewDate(new Date().toISOString().split('T')[0]);
                    setNewScaling('Rx');
                  }}
                  className='px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-900 rounded transition'
                >
                  ✕
                </button>
              </div>
            </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-100 mb-2'>Date</label>
                <input
                  type='date'
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-100 date-input-calendar'
                  style={{
                    colorScheme: 'dark'
                  }}
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-100 mb-2'>Result/Time</label>
                <input
                  type='text'
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                  placeholder='e.g., 12:45, 150 reps, 225 lbs'
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-100'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-100 mb-2'>Scaling</label>
                <select
                  value={newScaling}
                  onChange={e => setNewScaling(e.target.value as 'Rx' | 'Sc1' | 'Sc2' | 'Sc3')}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-100'
                >
                  <option value='Rx'>Rx (As Prescribed)</option>
                  <option value='Sc1'>Scaled 1</option>
                  <option value='Sc2'>Scaled 2</option>
                  <option value='Sc3'>Scaled 3</option>
                </select>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-100 mb-2'>Notes</label>
                <textarea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder='How did it feel? Any modifications?'
                  rows={4}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-100 resize-none'
                />
              </div>

              <div className='flex gap-3 pt-3 sm:pt-4'>
                <button
                  onClick={() => {
                    setSelectedBenchmark(null);
                    setNewTime('');
                    setNewNotes('');
                    setNewDate(new Date().toISOString().split('T')[0]);
                    setNewScaling('Rx');
                    setEditingBenchmarkId(null);
                  }}
                  className='flex-1 px-4 py-2 min-h-[44px] bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition'
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBenchmark}
                  disabled={!newTime}
                  className='flex-1 px-4 py-2 min-h-[44px] bg-[#178da6] hover:bg-[#14758c] text-white font-medium rounded-lg transition disabled:bg-gray-500 disabled:cursor-not-allowed'
                >
                  {editingBenchmarkId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>

            {/* History */}
            <div>
              <h4 className='text-lg font-semibold text-gray-50 mb-4'>Previous Results</h4>
              <div className='space-y-3 max-h-96 overflow-y-auto'>
                {benchmarkHistory
                  .filter(entry => entry.benchmark_name === selectedBenchmark)
                  .map(entry => (
                    <div key={entry.id} className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                      <div className='flex-1'>
                        <div className='flex items-center gap-2 mb-1'>
                          <span className='font-semibold text-gray-900'>{getResultDisplayValue(entry)}</span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              entry.scaling_level === 'Rx'
                                ? 'bg-red-600 text-white'
                                : entry.scaling_level === 'Sc1'
                                ? 'bg-blue-800 text-white'
                                : entry.scaling_level === 'Sc2'
                                ? 'bg-blue-500 text-white'
                                : 'bg-blue-400 text-white'
                            }`}
                          >
                            {entry.scaling_level}
                          </span>
                        </div>
                        <p className='text-sm text-gray-600'>
                          {new Date(entry.result_date).toLocaleDateString('en-US', {
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
                          className='p-2 text-gray-600 hover:text-[#178da6] hover:bg-white rounded transition'
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
            <div className='mt-3 sm:mt-4'>
              <h4 className='text-base sm:text-lg font-semibold text-gray-100 mb-3 sm:mb-4'>
                {chartBenchmark} Progress
              </h4>
              <ResponsiveContainer width='100%' height={250} className='[&_svg]:outline-none'>
                <LineChart data={getBenchmarkChartData(chartBenchmark)} margin={{ left: -10, right: 5, top: 5, bottom: 15 }}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' tick={({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => {
                    const parts = payload.value.replace(',', '').split(' ');
                    const line1 = `${parts[0]} ${parts[1]}`;
                    const line2 = parts[2];
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text x={0} y={0} dy={10} textAnchor='middle' fontSize={10} fill='#f3f4f6'>{line1}</text>
                        <text x={0} y={0} dy={22} textAnchor='middle' fontSize={10} fill='#999'>{line2}</text>
                      </g>
                    );
                  }} padding={{ left: 20, right: 20 }} interval={0} />
                  <YAxis tick={{ fill: '#f3f4f6', fontSize: 10 }} width={35} domain={[(min: number) => Math.floor(min * 0.9), (max: number) => Math.ceil(max * 1.05)]} />
                  <Tooltip
                    isAnimationActive={false}
                    cursor={{ stroke: '#999', strokeWidth: 1.5 }}
                    allowEscapeViewBox={{ x: false, y: true }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className='bg-gray-800 p-2 sm:p-3 border border-gray-600 rounded shadow-lg max-w-[200px]'>
                            <p className='text-xs sm:text-sm text-gray-100 font-semibold'>
                              {payload[0].payload.date}
                            </p>
                            <p className='text-xs sm:text-sm text-[#178da6] font-semibold'>
                              Result: {payload[0].payload.result_valueDisplay}
                            </p>
                            <p className='text-xs sm:text-sm text-gray-100'>
                              Scaling: {payload[0].payload.scaling_level}
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
                    stroke='#178da6'
                    strokeWidth={2}
                    dot={<CustomDot />}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          </div>
        </div>
        </FocusTrap>
      )}
    </div>
  );
}
