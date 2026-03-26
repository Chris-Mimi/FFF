// AthletePageRecordsTab component
'use client';

import { supabase } from '@/lib/supabase';
import { ChevronDown, ChevronRight, Dumbbell, Flame, Target, Trophy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ShareButton from './ShareButton';
import AthletePageAchievementsTab from './AthletePageAchievementsTab';

interface BenchmarkResult {
  id: string;
  benchmark_name: string;
  result_value: string;
  scaling_level: 'Rx' | 'Sc1' | 'Sc2' | 'Sc3';
  result_date: string;
}

interface LiftRecord {
  id: string;
  lift_name: string;
  weight_kg: number;
  rep_max_type: '1RM' | '3RM' | '5RM' | '10RM' | null;
  rep_scheme?: string | null;
  calculated_1rm?: number;
  lift_date: string;
}

interface AthletePageRecordsTabProps {
  userId: string;
}

export default function AthletePageRecordsTab({ userId }: AthletePageRecordsTabProps) {
  const [benchmarkPRs, setBenchmarkPRs] = useState<BenchmarkResult[]>([]);
  const [forgeBenchmarkPRs, setForgeBenchmarkPRs] = useState<BenchmarkResult[]>([]);
  const [liftPRs, setLiftPRs] = useState<LiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const achievementsRef = useRef<HTMLDivElement>(null);
  const [expandedSections, setExpandedSections] = useState({
    benchmarks: true,
    forgeBenchmarks: true,
    lifts: true,
    achievements: true,
  });

  useEffect(() => {
    fetchPersonalRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchPersonalRecords = async () => {
    setLoading(true);
    try {
      // Get list of regular benchmark names
      const { data: benchmarkNames } = await supabase
        .from('benchmark_workouts')
        .select('name');

      const regularBenchmarkNames = new Set((benchmarkNames || []).map(b => b.name));

      // Get list of forge benchmark names
      const { data: forgeNames } = await supabase
        .from('forge_benchmarks')
        .select('name');

      const forgeBenchmarkNames = new Set((forgeNames || []).map(b => b.name));

      // Fetch all benchmark results
      const { data: allResults, error: resultsError } = await supabase
        .from('benchmark_results')
        .select('*')
        .eq('user_id', userId)
        .order('result_date', { ascending: false });

      if (resultsError) throw resultsError;

      // Separate regular benchmarks from forge benchmarks
      const benchmarkData = (allResults || []).filter(r => regularBenchmarkNames.has(r.benchmark_name));
      const forgeData = (allResults || []).filter(r => forgeBenchmarkNames.has(r.benchmark_name));

      // Process regular benchmark PRs with proper scaling hierarchy and best result logic
      const scalingPriority = { 'Rx': 4, 'Sc1': 3, 'Sc2': 2, 'Sc3': 1 };

      const timeToSeconds = (timeStr: string | null | undefined) => {
        if (!timeStr) return 0;
        if (timeStr.includes(':')) {
          const parts = timeStr.split(':');
          return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        }
        return parseInt(timeStr) || 0;
      };

      // Group all results by benchmark name first
      const benchmarkGroups = new Map<string, BenchmarkResult[]>();
      benchmarkData.forEach(result => {
        const group = benchmarkGroups.get(result.benchmark_name) || [];
        group.push(result);
        benchmarkGroups.set(result.benchmark_name, group);
      });

      // For each benchmark, find the best result
      const finalBenchmarkPRs: BenchmarkResult[] = [];
      benchmarkGroups.forEach((results, _benchmarkName) => {
        let bestResult: BenchmarkResult | null = null;

        results.forEach(result => {
          if (!bestResult) {
            bestResult = result;
          } else {
            const currentPriority = scalingPriority[result.scaling_level as keyof typeof scalingPriority] || 0;
            const bestPriority = scalingPriority[bestResult.scaling_level as keyof typeof scalingPriority] || 0;

            // Prioritize higher scaling level
            if (currentPriority > bestPriority) {
              bestResult = result;
            } else if (currentPriority === bestPriority) {
              // Same scaling - compare results
              if (!result.result_value || !bestResult.result_value) {
                // Skip comparison if either value is null
                return;
              }
              const isTimeBased = result.result_value.includes(':');

              if (isTimeBased) {
                // For time: lower is better
                if (timeToSeconds(result.result_value) < timeToSeconds(bestResult.result_value)) {
                  bestResult = result;
                }
              } else {
                // For reps: higher is better
                if (parseInt(result.result_value) > parseInt(bestResult.result_value)) {
                  bestResult = result;
                }
              }
            }
          }
        });

        if (bestResult) {
          finalBenchmarkPRs.push(bestResult);
        }
      });

      setBenchmarkPRs(finalBenchmarkPRs);

      // Process forge benchmark PRs with proper scaling hierarchy and best result logic
      const forgeGroups = new Map<string, BenchmarkResult[]>();
      forgeData.forEach(result => {
        const group = forgeGroups.get(result.benchmark_name) || [];
        group.push(result);
        forgeGroups.set(result.benchmark_name, group);
      });

      const finalForgePRs: BenchmarkResult[] = [];
      forgeGroups.forEach((results, _benchmarkName) => {
        let bestResult: BenchmarkResult | null = null;

        results.forEach(result => {
          if (!bestResult) {
            bestResult = result;
          } else {
            const currentPriority = scalingPriority[result.scaling_level as keyof typeof scalingPriority] || 0;
            const bestPriority = scalingPriority[bestResult.scaling_level as keyof typeof scalingPriority] || 0;

            // Prioritize higher scaling level
            if (currentPriority > bestPriority) {
              bestResult = result;
            } else if (currentPriority === bestPriority) {
              // Same scaling - compare results
              if (!result.result_value || !bestResult.result_value) {
                // Skip comparison if either value is null
                return;
              }
              const isTimeBased = result.result_value.includes(':');

              if (isTimeBased) {
                // For time: lower is better
                if (timeToSeconds(result.result_value) < timeToSeconds(bestResult.result_value)) {
                  bestResult = result;
                }
              } else {
                // For reps: higher is better
                if (parseInt(result.result_value) > parseInt(bestResult.result_value)) {
                  bestResult = result;
                }
              }
            }
          }
        });

        if (bestResult) {
          finalForgePRs.push(bestResult);
        }
      });

      setForgeBenchmarkPRs(finalForgePRs);

      // Fetch lift PRs
      const { data: liftData, error: liftError } = await supabase
        .from('lift_records')
        .select('*')
        .eq('user_id', userId)
        .order('lift_date', { ascending: false });

      if (liftError) throw liftError;

      // Group by lift name and rep type (rep_max_type or rep_scheme), find highest weight for each
      const liftMap = new Map<string, LiftRecord>();
      (liftData || []).forEach(record => {
        const repKey = record.rep_max_type || record.rep_scheme || 'unknown';
        const key = `${record.lift_name}-${repKey}`;
        const existing = liftMap.get(key);

        if (!existing || record.weight_kg > existing.weight_kg) {
          liftMap.set(key, record);
        }
      });

      // Note: We show ALL grouped records (per lift+rep_type combo), not just one per lift name

      setLiftPRs(Array.from(liftMap.values()));
    } catch (error) {
      console.error('Error fetching personal records:', error);
      setBenchmarkPRs([]);
      setForgeBenchmarkPRs([]);
      setLiftPRs([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className='bg-white rounded-lg shadow p-6 text-center text-gray-500'>
        Loading personal records...
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='bg-gray-500 rounded-xl shadow-lg px-3 py-4 sm:p-8'>
        <h2 className='text-2xl sm:text-3xl font-extrabold text-gray-50 mb-2 sm:mb-4'>Personal Records</h2>
        <div className='flex items-center justify-between mb-4 sm:mb-8'>
          <p className='text-gray-50 leading-relaxed text-sm sm:text-base'>All your personal bests in one place.</p>
          <div className='flex items-center gap-1'>
            <button
              onClick={() => {
                const allExpanded = Object.values(expandedSections).every(Boolean);
                setExpandedSections({
                  benchmarks: !allExpanded,
                  forgeBenchmarks: !allExpanded,
                  lifts: !allExpanded,
                  achievements: !allExpanded,
                });
              }}
              className='p-2 text-gray-200 hover:text-white hover:bg-gray-400/30 rounded-lg transition'
              title={Object.values(expandedSections).every(Boolean) ? 'Collapse all' : 'Expand all'}
              aria-label='Toggle collapse all sections'
            >
              {Object.values(expandedSections).every(Boolean) ? <ChevronRight size={22} /> : <ChevronDown size={22} />}
            </button>
            <button
              onClick={() => {
                achievementsRef.current?.scrollIntoView({ behavior: 'smooth' });
                setExpandedSections(prev => ({ ...prev, achievements: true }));
              }}
              className='flex items-center gap-1 text-amber-400 hover:text-amber-300 transition'
              aria-label='Jump to achievements'
            >
              <Trophy size={18} />
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        {/* Info Summary Boxes */}
        <div className='grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8'>
          {/* Total PRs */}
          <div className='bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-2.5 sm:p-4'>
            <div className='flex items-center justify-between mb-1 sm:mb-2'>
              <h3 className='text-xs sm:text-sm font-semibold text-gray-900'>Total PRs</h3>
              <Trophy size={20} className='text-purple-600 sm:w-6 sm:h-6' />
            </div>
            <p className='text-2xl sm:text-3xl font-bold text-gray-900'>
              {benchmarkPRs.length + forgeBenchmarkPRs.length + liftPRs.length}
            </p>
          </div>

          {/* Benchmark WODs */}
          <div className='bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-300 rounded-lg p-2.5 sm:p-4'>
            <div className='flex items-center justify-between mb-1 sm:mb-2'>
              <h3 className='text-xs sm:text-sm font-semibold text-gray-900'>Benchmarks</h3>
              <Target size={20} className='text-teal-600 sm:w-6 sm:h-6' />
            </div>
            <p className='text-2xl sm:text-3xl font-bold text-gray-900'>{benchmarkPRs.length}</p>
          </div>

          {/* Forge Benchmarks */}
          <div className='bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-300 rounded-lg p-2.5 sm:p-4'>
            <div className='flex items-center justify-between mb-1 sm:mb-2'>
              <h3 className='text-xs sm:text-sm font-semibold text-gray-900'>Forge</h3>
              <Flame size={20} className='text-cyan-900 sm:w-6 sm:h-6' />
            </div>
            <p className='text-2xl sm:text-3xl font-bold text-gray-900'>{forgeBenchmarkPRs.length}</p>
          </div>

          {/* Barbell Lifts */}
          <div className='bg-gradient-to-br from-sky-50 to-blue-100 border border-sky-300 rounded-lg p-2.5 sm:p-4'>
            <div className='flex items-center justify-between mb-1 sm:mb-2'>
              <h3 className='text-xs sm:text-sm font-semibold text-gray-700'>Lifts</h3>
              <Dumbbell size={20} className='text-sky-600 sm:w-6 sm:h-6' />
            </div>
            <p className='text-2xl sm:text-3xl font-bold text-gray-900'>{liftPRs.length}</p>
          </div>
        </div>

        {/* Benchmark Workouts Section */}
        <div className='mb-4 sm:mb-8'>
          <button
            onClick={() => setExpandedSections(prev => ({ ...prev, benchmarks: !prev.benchmarks }))}
            className='flex items-center gap-2 text-lg sm:text-xl font-semibold text-gray-100 mb-3 sm:mb-4 hover:text-[#85d6cd] transition'
          >
            {expandedSections.benchmarks ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            Benchmark Workouts ({benchmarkPRs.length})
          </button>

          {expandedSections.benchmarks && (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6'>
              {benchmarkPRs.length > 0 ? (
                benchmarkPRs.map(pr => (
                  <div key={pr.id} className='border border-teal-300 rounded-lg p-2.5 sm:p-4 bg-gradient-to-br from-teal-100 to-teal-200'>
                    <div className='flex items-start justify-between mb-2'>
                      <h4 className='font-bold text-gray-900'>{pr.benchmark_name}</h4>
                      <div className='flex items-center gap-1'>
                        <ShareButton
                          data={{
                            type: 'benchmark',
                            date: pr.result_date,
                            resultLabel: pr.benchmark_name,
                            resultValue: pr.result_value,
                            isPR: true,
                            scalingLevel: pr.scaling_level,
                          }}
                        />
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            pr.scaling_level === 'Rx'
                              ? 'bg-red-600 text-white'
                              : pr.scaling_level === 'Sc1'
                              ? 'bg-blue-800 text-white'
                              : pr.scaling_level === 'Sc2'
                              ? 'bg-blue-500 text-white'
                              : 'bg-blue-400 text-white'
                          }`}
                        >
                          {pr.scaling_level}
                        </span>
                      </div>
                    </div>
                    <div className='flex items-center justify-between'>
                      <p className='text-lg font-bold text-[#178da6]'>{pr.result_value}</p>
                      <span className='text-sm text-gray-600'>
                        {new Date(pr.result_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className='text-gray-500 col-span-full text-center py-8'>No benchmark records yet</p>
              )}
            </div>
          )}
        </div>

        {/* Forge Benchmarks Section */}
        <div className='mb-4 sm:mb-8'>
          <button
            onClick={() => setExpandedSections(prev => ({ ...prev, forgeBenchmarks: !prev.forgeBenchmarks }))}
            className='flex items-center gap-2 text-lg sm:text-xl font-semibold text-gray-100 mb-3 sm:mb-4 hover:text-[#85d6cd] transition'
          >
            {expandedSections.forgeBenchmarks ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            Forge Benchmarks ({forgeBenchmarkPRs.length})
          </button>

          {expandedSections.forgeBenchmarks && (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6'>
              {forgeBenchmarkPRs.length > 0 ? (
                forgeBenchmarkPRs.map(pr => (
                  <div key={pr.id} className='border border-cyan-300 rounded-lg p-2.5 sm:p-4 bg-gradient-to-br from-cyan-100 to-cyan-200'>
                    <div className='flex items-start justify-between mb-2'>
                      <h4 className='font-bold text-gray-900'>{pr.benchmark_name}</h4>
                      <div className='flex items-center gap-1'>
                        <ShareButton
                          data={{
                            type: 'benchmark',
                            date: pr.result_date,
                            resultLabel: pr.benchmark_name,
                            resultValue: pr.result_value,
                            isPR: true,
                            scalingLevel: pr.scaling_level,
                          }}
                        />
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            pr.scaling_level === 'Rx'
                              ? 'bg-red-600 text-white'
                              : pr.scaling_level === 'Sc1'
                              ? 'bg-blue-800 text-white'
                              : pr.scaling_level === 'Sc2'
                              ? 'bg-blue-500 text-white'
                              : 'bg-blue-400 text-white'
                          }`}
                        >
                          {pr.scaling_level}
                        </span>
                      </div>
                    </div>
                    <div className='flex items-center justify-between'>
                      <p className='text-lg font-bold text-[#178da6]'>{pr.result_value}</p>
                      <span className='text-sm text-gray-600'>
                        {new Date(pr.result_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className='text-gray-500 col-span-full text-center py-8'>No forge benchmark records yet</p>
              )}
            </div>
          )}
        </div>

        {/* Barbell Lifts Section */}
        <div>
          <button
            onClick={() => setExpandedSections(prev => ({ ...prev, lifts: !prev.lifts }))}
            className='flex items-center gap-2 text-lg sm:text-xl font-semibold text-gray-100 mb-3 sm:mb-4 hover:text-[#85d6cd] transition'
          >
            {expandedSections.lifts ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            Barbell Lifts ({liftPRs.length})
          </button>

          {expandedSections.lifts && (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4'>
              {liftPRs.length > 0 ? (
                liftPRs.map(pr => (
                  <div key={pr.id} className='border border-sky-300 rounded-lg p-2.5 sm:p-4 bg-gradient-to-br from-[#1fe2dcff] to-[#81edeaff]'>
                    <div className='flex items-start justify-between mb-2'>
                      <h4 className='font-bold text-gray-900'>{pr.lift_name}</h4>
                      <div className='flex items-center gap-1'>
                        <ShareButton
                          data={{
                            type: 'lift',
                            date: pr.lift_date,
                            resultLabel: pr.lift_name,
                            resultValue: `${pr.weight_kg}kg`,
                            resultSubLabel: pr.rep_max_type || pr.rep_scheme || undefined,
                            isPR: true,
                          }}
                        />
                        <span className='text-xs px-2 py-1 rounded bg-[#a1f0e8ff] text-gray-700'>
                          {pr.rep_max_type || pr.rep_scheme || '—'}
                        </span>
                      </div>
                    </div>
                    <div className='flex items-center justify-between'>
                      <p className='text-lg font-bold text-[#178da6]'>
                        {pr.weight_kg}kg
                        {pr.calculated_1rm && pr.rep_max_type !== '1RM' && (
                          <span className='text-sm text-gray-500 font-normal ml-2'>(Est. 1RM: {pr.calculated_1rm}kg)</span>
                        )}
                      </p>
                      <span className='text-sm text-gray-600'>
                        {new Date(pr.lift_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className='text-gray-500 col-span-full text-center py-8'>No lift records yet</p>
              )}
            </div>
          )}
        </div>

        {/* Achievements Section */}
        <div ref={achievementsRef} className='mt-4 sm:mt-8'>
          <button
            onClick={() => setExpandedSections(prev => ({ ...prev, achievements: !prev.achievements }))}
            className='flex items-center gap-2 text-lg sm:text-xl font-semibold text-gray-100 mb-3 sm:mb-4 hover:text-[#85d6cd] transition'
          >
            {expandedSections.achievements ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            Achievements
          </button>

          {expandedSections.achievements && (
            <AthletePageAchievementsTab userId={userId} />
          )}
        </div>
      </div>
    </div>
  );
}
