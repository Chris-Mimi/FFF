// AthletePageRecordsTab component
'use client';

import { supabase } from '@/lib/supabase';
import { Award, ChevronDown, ChevronRight } from 'lucide-react';
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

      // Process regular benchmark PRs
      const benchmarkMap = new Map<string, BenchmarkResult>();
      benchmarkData.forEach(result => {
        const key = `${result.benchmark_name}-${result.scaling}`;
        const existing = benchmarkMap.get(key);

        if (!existing || new Date(result.workout_date) > new Date(existing.workout_date)) {
          benchmarkMap.set(key, result);
        }
      });

      const finalBenchmarkPRs = new Map<string, BenchmarkResult>();
      benchmarkMap.forEach((result, key) => {
        const benchmarkName = result.benchmark_name;
        const existing = finalBenchmarkPRs.get(benchmarkName);

        if (!existing || (result.scaling === 'Rx' && existing.scaling !== 'Rx')) {
          finalBenchmarkPRs.set(benchmarkName, result);
        }
      });

      setBenchmarkPRs(Array.from(finalBenchmarkPRs.values()));

      // Process forge benchmark PRs
      const forgeMap = new Map<string, BenchmarkResult>();
      forgeData.forEach(result => {
        const key = `${result.benchmark_name}-${result.scaling}`;
        const existing = forgeMap.get(key);

        if (!existing || new Date(result.workout_date) > new Date(existing.workout_date)) {
          forgeMap.set(key, result);
        }
      });

      const finalForgePRs = new Map<string, BenchmarkResult>();
      forgeMap.forEach((result, key) => {
        const benchmarkName = result.benchmark_name;
        const existing = finalForgePRs.get(benchmarkName);

        if (!existing || (result.scaling === 'Rx' && existing.scaling !== 'Rx')) {
          finalForgePRs.set(benchmarkName, result);
        }
      });

      setForgeBenchmarkPRs(Array.from(finalForgePRs.values()));

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
      <div className='bg-white rounded-lg shadow p-6'>
        <h2 className='text-2xl font-bold text-gray-900 mb-2'>Personal Records</h2>
        <p className='text-gray-600 mb-6'>All your personal bests in one place.</p>

        {/* Benchmark Workouts Section */}
        <div className='mb-8'>
          <button
            onClick={() => setExpandedSections(prev => ({ ...prev, benchmarks: !prev.benchmarks }))}
            className='flex items-center gap-2 text-xl font-semibold text-gray-900 mb-4 hover:text-[#208479] transition'
          >
            {expandedSections.benchmarks ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            Benchmark Workouts ({benchmarkPRs.length})
          </button>

          {expandedSections.benchmarks && (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6'>
              {benchmarkPRs.length > 0 ? (
                benchmarkPRs.map(pr => (
                  <div key={pr.id} className='border border-gray-300 rounded-lg p-4 bg-gradient-to-br from-yellow-50 to-orange-50'>
                    <div className='flex items-start justify-between mb-2'>
                      <h4 className='font-bold text-gray-900'>{pr.benchmark_name}</h4>
                      <Award size={18} className='text-yellow-600 flex-shrink-0' />
                    </div>
                    <div className='space-y-1'>
                      <p className='text-lg font-bold text-[#208479]'>{pr.result}</p>
                      <div className='flex items-center gap-2'>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            pr.scaling === 'Rx'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {pr.scaling}
                        </span>
                        <span className='text-sm text-gray-600'>
                          {new Date(pr.workout_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
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
            className='flex items-center gap-2 text-xl font-semibold text-gray-900 mb-4 hover:text-[#208479] transition'
          >
            {expandedSections.forgeBenchmarks ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            Forge Benchmarks ({forgeBenchmarkPRs.length})
          </button>

          {expandedSections.forgeBenchmarks && (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6'>
              {forgeBenchmarkPRs.length > 0 ? (
                forgeBenchmarkPRs.map(pr => (
                  <div key={pr.id} className='border border-gray-300 rounded-lg p-4 bg-gradient-to-br from-cyan-50 to-blue-50'>
                    <div className='flex items-start justify-between mb-2'>
                      <h4 className='font-bold text-gray-900'>{pr.benchmark_name}</h4>
                      <Award size={18} className='text-cyan-600 flex-shrink-0' />
                    </div>
                    <div className='space-y-1'>
                      <p className='text-lg font-bold text-[#208479]'>{pr.result}</p>
                      <div className='flex items-center gap-2'>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            pr.scaling === 'Rx'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {pr.scaling}
                        </span>
                        <span className='text-sm text-gray-600'>
                          {new Date(pr.workout_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
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
            className='flex items-center gap-2 text-xl font-semibold text-gray-900 mb-4 hover:text-[#208479] transition'
          >
            {expandedSections.lifts ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            Barbell Lifts ({liftPRs.length})
          </button>

          {expandedSections.lifts && (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {liftPRs.length > 0 ? (
                liftPRs.map(pr => (
                  <div key={pr.id} className='border border-gray-300 rounded-lg p-4 bg-gradient-to-br from-gray-50 to-slate-50'>
                    <div className='flex items-start justify-between mb-2'>
                      <h4 className='font-bold text-gray-900'>{pr.lift_name}</h4>
                      <Award size={18} className='text-gray-600 flex-shrink-0' />
                    </div>
                    <div className='space-y-1'>
                      <p className='text-lg font-bold text-[#208479]'>{pr.weight_kg}kg</p>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm text-gray-600'>({pr.rep_max_type})</span>
                        {pr.calculated_1rm && pr.rep_max_type !== '1RM' && (
                          <span className='text-sm text-gray-500'>Est. 1RM: {pr.calculated_1rm}kg</span>
                        )}
                      </div>
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
