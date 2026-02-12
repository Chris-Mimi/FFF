'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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

export default function LiftsSection({ athleteId, onAddResult }: { athleteId?: string; onAddResult: () => void }) {
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
        .select('id, lift_name, weight_kg, reps, calculated_1rm, rep_max_type, notes, lift_date')
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
          className='flex items-center gap-2 px-4 py-2 bg-[#178da6] hover:bg-[#14758c] text-white font-medium rounded-lg transition'
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
                <p className='font-semibold text-[#178da6]'>
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
