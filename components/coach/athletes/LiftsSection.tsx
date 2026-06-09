'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/auth-fetch';
import { confirm } from '@/lib/confirm';
import { toast } from 'sonner';

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

export default function LiftsSection({
  athleteId,
  onAddResult,
  refreshTrigger,
}: {
  athleteId?: string;
  onAddResult: () => void;
  refreshTrigger?: number;
}) {
  const [results, setResults] = useState<LiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  // name (lowercase) → curated acronym, for the filter chips (e.g. "deadlift" → "DL").
  const [acronymMap, setAcronymMap] = useState<Map<string, string>>(new Map());
  // Active lift filter (matches lift_name); null = show all.
  const [selectedLift, setSelectedLift] = useState<string | null>(null);

  useEffect(() => {
    if (athleteId) {
      fetchResults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId, refreshTrigger]);

  // Acronyms are global library data — fetch once.
  useEffect(() => {
    (async () => {
      const [liftRes, exRes] = await Promise.all([
        supabase.from('barbell_lifts').select('name, acronym'),
        supabase.from('exercises').select('display_name, acronym'),
      ]);
      const map = new Map<string, string>();
      liftRes.data?.forEach(r => {
        if (r.name && r.acronym) map.set(r.name.toLowerCase(), r.acronym);
      });
      // exercises only fill gaps — don't override a curated barbell_lifts acronym.
      exRes.data?.forEach(r => {
        if (r.display_name && r.acronym && !map.has(r.display_name.toLowerCase())) {
          map.set(r.display_name.toLowerCase(), r.acronym);
        }
      });
      setAcronymMap(map);
    })();
  }, []);

  // Short label for a lift: curated acronym, else initials (multi-word) or first
  // 2 letters (single word), uppercased.
  const acronymFor = (name: string): string => {
    const hit = acronymMap.get(name.toLowerCase());
    if (hit) return hit;
    const words = name.trim().split(/\s+/);
    if (words.length > 1) return words.map(w => w[0]).join('').slice(0, 3).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Distinct lifts present in this athlete's records, alphabetical.
  const distinctLifts = useMemo(
    () => Array.from(new Set(results.map(r => r.lift_name))).sort((a, b) => a.localeCompare(b)),
    [results]
  );

  // Clear the filter if the selected lift is no longer present (athlete switch / delete).
  useEffect(() => {
    if (selectedLift && !distinctLifts.includes(selectedLift)) setSelectedLift(null);
  }, [distinctLifts, selectedLift]);

  const visibleResults = selectedLift
    ? results.filter(r => r.lift_name === selectedLift)
    : results;

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

  const handleDelete = async (id: string, liftName: string, liftDate: string) => {
    const ok = await confirm({
      title: 'Delete Lift Record',
      message: `Delete ${liftName} on ${new Date(liftDate).toLocaleDateString()}? This cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    // RLS blocks coach from deleting athlete's row via browser; use service-role endpoint.
    const res = await authFetch('/api/coach/athletes/delete-lift', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error('Error deleting lift record:', body.error);
      toast.error('Failed to delete lift record.');
      return;
    }
    toast.success('Lift record deleted.');
    setResults(prev => prev.filter(r => r.id !== id));
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
        <>
          {/* Filter chips — acronyms for each lift the athlete has logged */}
          {distinctLifts.length > 1 && (
            <div className='flex flex-wrap gap-1.5 mb-4'>
              <button
                onClick={() => setSelectedLift(null)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                  selectedLift === null
                    ? 'bg-[#178da6] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {distinctLifts.map(lift => (
                <button
                  key={lift}
                  onClick={() => setSelectedLift(selectedLift === lift ? null : lift)}
                  title={lift}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                    selectedLift === lift
                      ? 'bg-[#178da6] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {acronymFor(lift)}
                </button>
              ))}
            </div>
          )}
          <div className='space-y-3'>
          {visibleResults.map(result => (
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
              <div className='flex items-center gap-3'>
                <div className='text-right'>
                  <p className='font-semibold text-[#178da6]'>
                    {result.weight_kg} kg ({result.rep_max_type || `${result.reps} reps`})
                  </p>
                  {result.reps > 1 && (
                    <p className='text-xs text-gray-600'>Est. 1RM: {result.calculated_1rm} kg</p>
                  )}
                  {result.notes && <p className='text-sm text-gray-600 mt-1'>{result.notes}</p>}
                </div>
                <button
                  onClick={() => handleDelete(result.id, result.lift_name, result.lift_date)}
                  aria-label={`Delete ${result.lift_name}`}
                  className='p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition'
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          </div>
        </>
      )}
    </div>
  );
}
