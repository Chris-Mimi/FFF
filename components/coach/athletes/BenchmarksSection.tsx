'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface BenchmarkResult {
  id: string;
  benchmark_name: string;
  result_value: string;
  notes?: string;
  result_date: string;
  scaling_level?: string;
}

export default function BenchmarksSection({
  athleteId,
  onAddResult,
}: {
  athleteId?: string;
  onAddResult: () => void;
}) {
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
        .select('id, benchmark_name, result_value, notes, result_date, scaling_level')
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
