'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { FocusTrap } from '@/components/ui/FocusTrap';

type BenchmarkOption = {
  id: string;
  name: string;
  type: string;
  kind: 'classic' | 'forge';
};

export default function AddBenchmarkModal({
  athleteId,
  athleteName,
  onClose,
  onSave,
}: {
  athleteId?: string;
  athleteName: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [benchmarks, setBenchmarks] = useState<BenchmarkOption[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [result, setResult] = useState('');
  const [scalingLevel, setScalingLevel] = useState<'Rx' | 'Rx(M)' | 'Sc1' | 'Sc2' | 'Sc3'>('Rx');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Source of truth: benchmark_workouts + forge_benchmarks tables (same as the Coach Toolkit).
  useEffect(() => {
    const fetchBenchmarks = async () => {
      const [classicRes, forgeRes] = await Promise.all([
        supabase.from('benchmark_workouts').select('id, name, type').order('display_order'),
        supabase.from('forge_benchmarks').select('id, name, type').order('display_order'),
      ]);
      if (classicRes.error) console.error('Error loading benchmark_workouts:', classicRes.error);
      if (forgeRes.error) console.error('Error loading forge_benchmarks:', forgeRes.error);
      const combined: BenchmarkOption[] = [
        ...(classicRes.data || []).map(b => ({ ...b, kind: 'classic' as const })),
        ...(forgeRes.data || []).map(b => ({ ...b, kind: 'forge' as const })),
      ];
      setBenchmarks(combined);
    };
    fetchBenchmarks();
  }, []);

  const selected = benchmarks.find(b => `${b.kind}:${b.id}` === selectedId);

  const handleSave = async () => {
    if (!athleteId || !selected || !result) {
      toast.warning('Please select a benchmark and enter a result');
      return;
    }

    const typeLower = selected.type.toLowerCase();
    const timeResult = typeLower.includes('time') ? result : null;
    const repsResult =
      typeLower.includes('rep') || typeLower.includes('amrap') ? parseInt(result) || null : null;
    const weightResult = typeLower.includes('load') || typeLower.includes('weight') ? result : null;

    try {
      // Server endpoint required: RLS on benchmark_results blocks the coach
      // from inserting rows owned by the athlete. The endpoint uses
      // service-role behind a requireCoach gate.
      const res = await fetch('/api/coach/athletes/add-benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId,
          benchmark_id: selected.kind === 'classic' ? selected.id : null,
          forge_benchmark_id: selected.kind === 'forge' ? selected.id : null,
          benchmark_name: selected.name,
          benchmark_type: selected.type,
          result_value: result,
          time_result: timeResult,
          reps_result: repsResult,
          weight_result: weightResult,
          scaling_level: scalingLevel,
          notes: notes || null,
          result_date: date,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      toast.success('Benchmark result added successfully!');
      onSave();
    } catch (error) {
      console.error('Error adding benchmark:', error);
      toast.error('Failed to add benchmark result. Please try again.');
    }
  };

  const classicBenchmarks = benchmarks.filter(b => b.kind === 'classic');
  const forgeBenchmarks = benchmarks.filter(b => b.kind === 'forge');

  return (
    <FocusTrap>
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50'>
      <div className='bg-white rounded-lg shadow-xl max-w-md w-full p-6'>
        <h3 className='text-xl font-bold text-gray-900 mb-4'>
          Add Benchmark Result for {athleteName}
        </h3>

        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Benchmark</label>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
            >
              <option value=''>Select benchmark...</option>
              {classicBenchmarks.length > 0 && (
                <optgroup label='Classic Benchmarks'>
                  {classicBenchmarks.map(b => (
                    <option key={`classic:${b.id}`} value={`classic:${b.id}`}>
                      {b.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {forgeBenchmarks.length > 0 && (
                <optgroup label='Forge Benchmarks'>
                  {forgeBenchmarks.map(b => (
                    <option key={`forge:${b.id}`} value={`forge:${b.id}`}>
                      {b.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Date</label>
            <input
              type='date'
              value={date}
              onChange={e => setDate(e.target.value)}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Result</label>
              <input
                type='text'
                value={result}
                onChange={e => setResult(e.target.value)}
                placeholder='e.g., 5:42, 120'
                required
                maxLength={50}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Scaling</label>
              <select
                value={scalingLevel}
                onChange={e => setScalingLevel(e.target.value as 'Rx' | 'Rx(M)' | 'Sc1' | 'Sc2' | 'Sc3')}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
              >
                <option value='Rx'>Rx</option>
                <option value='Rx(M)'>Rx(M)</option>
                <option value='Sc1'>Sc1</option>
                <option value='Sc2'>Sc2</option>
                <option value='Sc3'>Sc3</option>
              </select>
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder='Any additional notes...'
              rows={3}
              maxLength={500}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900 resize-none'
            />
          </div>

          <div className='flex gap-3 pt-4'>
            <button
              onClick={onClose}
              className='flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition'
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className='flex-1 px-4 py-2 bg-[#178da6] hover:bg-[#14758c] text-white font-medium rounded-lg transition'
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
    </FocusTrap>
  );
}
