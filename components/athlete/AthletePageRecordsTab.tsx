// AthletePageRecordsTab component
'use client';

import { supabase } from '@/lib/supabase';
import { ChevronDown, ChevronRight, Dumbbell, Flame, Target, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BenchmarkResult {
  id: string;
  benchmark_name: string;
  result: string;
  scaling: 'Rx' | 'Sc1' | 'Sc2' | 'Sc3';
  workout_date: string;
}

interface LiftRecord {
  id: string;
  lift_name: string;
  weight_kg: number;
  rep_max_type: '1RM' | '3RM' | '5RM' | '10RM';
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
  const [expandedSections, setExpandedSections] = useState({
    benchmarks: true,
    forgeBenchmarks: true,
    lifts: true,
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
        .order('workout_date', { ascending: false });

      if (resultsError) throw resultsError;

      // Separate regular benchmarks from forge benchmarks
      const benchmarkData = (allResults || []).filter(r => regularBenchmarkNames.has(r.benchmark_name));
      const forgeData = (allResults || []).filter(r => forgeBenchmarkNames.has(r.benchmark_name));

      // Process regular benchmark PRs with proper scaling hierarchy and best result logic
      const scalingPriority = { 'Rx': 4, 'Sc1': 3, 'Sc2': 2, 'Sc3': 1 };

      const timeToSeconds = (timeStr: string) => {
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
      benchmarkGroups.forEach((results, benchmarkName) => {
        let bestResult: BenchmarkResult | null = null;

        results.forEach(result => {
          if (!bestResult) {
            bestResult = result;
          } else {
            const currentPriority = scalingPriority[result.scaling as keyof typeof scalingPriority] || 0;
            const bestPriority = scalingPriority[bestResult.scaling as keyof typeof scalingPriority] || 0;

            // Prioritize higher scaling level
            if (currentPriority > bestPriority) {
              bestResult = result;
            } else if (currentPriority === bestPriority) {
              // Same scaling - compare results
              const isTimeBased = result.result.includes(':');

              if (isTimeBased) {
                // For time: lower is better
                if (timeToSeconds(result.result) < timeToSeconds(bestResult.result)) {
                  bestResult = result;
                }
              } else {
                // For reps: higher is better
                if (parseInt(result.result) > parseInt(bestResult.result)) {
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
      forgeGroups.forEach((results, benchmarkName) => {
        let bestResult: BenchmarkResult | null = null;

        results.forEach(result => {
          if (!bestResult) {
            bestResult = result;
          } else {
            const currentPriority = scalingPriority[result.scaling as keyof typeof scalingPriority] || 0;
            const bestPriority = scalingPriority[bestResult.scaling as keyof typeof scalingPriority] || 0;

            // Prioritize higher scaling level
            if (currentPriority > bestPriority) {
              bestResult = result;
            } else if (currentPriority === bestPriority) {
              // Same scaling - compare results
              const isTimeBased = result.result.includes(':');

              if (isTimeBased) {
                // For time: lower is better
                if (timeToSeconds(result.result) < timeToSeconds(bestResult.result)) {
                  bestResult = result;
                }
              } else {
                // For reps: higher is better
                if (parseInt(result.result) > parseInt(bestResult.result)) {
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

      // Group by lift name and rep max type, find highest weight for each
      const liftMap = new Map<string, LiftRecord>();
      (liftData || []).forEach(record => {
        const key = `${record.lift_name}-${record.rep_max_type}`;
        const existing = liftMap.get(key);

        if (!existing || record.weight_kg > existing.weight_kg) {
          liftMap.set(key, record);
        }
      });

      // Keep only the best result per lift (prioritize 1RM, then 3RM, then 5RM, then 10RM)
      const finalLiftPRs = new Map<string, LiftRecord>();
      liftMap.forEach((record, key) => {
        const liftName = record.lift_name;
        const existing = finalLiftPRs.get(liftName);

        const repMaxPriority = { '1RM': 4, '3RM': 3, '5RM': 2, '10RM': 1 };
        const currentPriority = repMaxPriority[record.rep_max_type as keyof typeof repMaxPriority] || 0;
        const existingPriority = existing ? repMaxPriority[existing.rep_max_type as keyof typeof repMaxPriority] || 0 : 0;

        if (!existing || currentPriority > existingPriority ||
            (currentPriority === existingPriority && record.weight_kg > existing.weight_kg)) {
          finalLiftPRs.set(liftName, record);
        }
      });

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
      <div className='bg-gray-500 rounded-xl shadow-lg p-8'>
        <h2 className='text-3xl font-extrabold text-gray-50 mb-4'>Personal Records</h2>
        <p className='text-gray-50 mb-8 leading-relaxed'>All your personal bests in one place.</p>

        {/* Info Summary Boxes */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
          {/* Total PRs */}
          <div className='bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4'>
            <div className='flex items-center justify-between mb-2'>
              <h3 className='text-sm font-semibold text-gray-900'>Total PRs</h3>
              <Trophy size={24} className='text-purple-600' />
            </div>
            <p className='text-3xl font-bold text-gray-900'>
              {benchmarkPRs.length + forgeBenchmarkPRs.length + liftPRs.length}
            </p>
          </div>

          {/* Benchmark WODs */}
          <div className='bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-300 rounded-lg p-4'>
            <div className='flex items-center justify-between mb-2'>
              <h3 className='text-sm font-semibold text-gray-900'>Benchmark WODs</h3>
              <Target size={24} className='text-teal-600' />
            </div>
            <p className='text-3xl font-bold text-gray-900'>{benchmarkPRs.length}</p>
          </div>

          {/* Forge Benchmarks */}
          <div className='bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-300 rounded-lg p-4'>
            <div className='flex items-center justify-between mb-2'>
              <h3 className='text-sm font-semibold text-gray-900'>Forge Benchmarks</h3>
              <Flame size={24} className='text-cyan-900' />
            </div>
            <p className='text-3xl font-bold text-gray-900'>{forgeBenchmarkPRs.length}</p>
          </div>

          {/* Barbell Lifts */}
          <div className='bg-gradient-to-br from-sky-50 to-blue-100 border border-sky-300 rounded-lg p-4'>
            <div className='flex items-center justify-between mb-2'>
              <h3 className='text-sm font-semibold text-gray-700'>Barbell Lifts</h3>
              <Dumbbell size={24} className='text-sky-600' />
            </div>
            <p className='text-3xl font-bold text-gray-900'>{liftPRs.length}</p>
          </div>
        </div>

        {/* Benchmark Workouts Section */}
        <div className='mb-8'>
          <button
            onClick={() => setExpandedSections(prev => ({ ...prev, benchmarks: !prev.benchmarks }))}
            className='flex items-center gap-2 text-xl font-semibold text-gray-100 mb-4 hover:text-[#85d6cd] transition'
          >
            {expandedSections.benchmarks ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            Benchmark Workouts ({benchmarkPRs.length})
          </button>

          {expandedSections.benchmarks && (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
              {benchmarkPRs.length > 0 ? (
                benchmarkPRs.map(pr => (
                  <div key={pr.id} className='border border-teal-300 rounded-lg p-4 bg-gradient-to-br from-teal-100 to-teal-200'>
                    <div className='flex items-start justify-between mb-2'>
                      <h4 className='font-bold text-gray-900'>{pr.benchmark_name}</h4>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          pr.scaling === 'Rx'
                            ? 'bg-red-600 text-white'
                            : pr.scaling === 'Sc1'
                            ? 'bg-blue-800 text-white'
                            : pr.scaling === 'Sc2'
                            ? 'bg-blue-500 text-white'
                            : 'bg-blue-400 text-white'
                        }`}
                      >
                        {pr.scaling}
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <p className='text-lg font-bold text-[#208479]'>{pr.result}</p>
                      <span className='text-sm text-gray-600'>
                        {new Date(pr.workout_date).toLocaleDateString('en-US', {
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
        <div className='mb-8'>
          <button
            onClick={() => setExpandedSections(prev => ({ ...prev, forgeBenchmarks: !prev.forgeBenchmarks }))}
            className='flex items-center gap-2 text-xl font-semibold text-gray-100 mb-4 hover:text-[#85d6cd] transition'
          >
            {expandedSections.forgeBenchmarks ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            Forge Benchmarks ({forgeBenchmarkPRs.length})
          </button>

          {expandedSections.forgeBenchmarks && (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
              {forgeBenchmarkPRs.length > 0 ? (
                forgeBenchmarkPRs.map(pr => (
                  <div key={pr.id} className='border border-cyan-300 rounded-lg p-4 bg-gradient-to-br from-cyan-100 to-cyan-200'>
                    <div className='flex items-start justify-between mb-2'>
                      <h4 className='font-bold text-gray-900'>{pr.benchmark_name}</h4>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          pr.scaling === 'Rx'
                            ? 'bg-red-600 text-white'
                            : pr.scaling === 'Sc1'
                            ? 'bg-blue-800 text-white'
                            : pr.scaling === 'Sc2'
                            ? 'bg-blue-500 text-white'
                            : 'bg-blue-400 text-white'
                        }`}
                      >
                        {pr.scaling}
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <p className='text-lg font-bold text-[#208479]'>{pr.result}</p>
                      <span className='text-sm text-gray-600'>
                        {new Date(pr.workout_date).toLocaleDateString('en-US', {
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
            className='flex items-center gap-2 text-xl font-semibold text-gray-100 mb-4 hover:text-[#85d6cd] transition'
          >
            {expandedSections.lifts ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            Barbell Lifts ({liftPRs.length})
          </button>

          {expandedSections.lifts && (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
              {liftPRs.length > 0 ? (
                liftPRs.map(pr => (
                  <div key={pr.id} className='border border-sky-300 rounded-lg p-4 bg-gradient-to-br from-[#1fe2dcff] to-[#81edeaff]'>
                    <div className='flex items-start justify-between mb-2'>
                      <h4 className='font-bold text-gray-900'>{pr.lift_name}</h4>
                      <span className='text-xs px-2 py-1 rounded bg-[#a1f0e8ff] text-gray-700'>
                        {pr.rep_max_type}
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <p className='text-lg font-bold text-[#208479]'>
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
      </div>
    </div>
  );
}
