'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const BENCHMARKS = [
  'Fran',
  'Helen',
  'Cindy',
  'Grace',
  'Isabel',
  'Annie',
  'Diane',
  'Elizabeth',
  'Kelly',
  'Nancy',
  'Jackie',
  'Mary',
];

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
  const [benchmarkName, setBenchmarkName] = useState('');
  const [result, setResult] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSave = async () => {
    if (!athleteId || !benchmarkName || !result) {
      alert('Please fill in benchmark name and result');
      return;
    }

    try {
      const { error } = await supabase.from('benchmark_results').insert({
        user_id: athleteId,
        benchmark_name: benchmarkName,
        result: result,
        notes: notes || null,
        workout_date: date,
      });

      if (error) throw error;
      alert('Benchmark result added successfully!');
      onSave();
    } catch (error) {
      console.error('Error adding benchmark:', error);
      alert('Failed to add benchmark result. Please try again.');
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50'>
      <div className='bg-white rounded-lg shadow-xl max-w-md w-full p-6'>
        <h3 className='text-xl font-bold text-gray-900 mb-4'>
          Add Benchmark Result for {athleteName}
        </h3>

        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Benchmark</label>
            <select
              value={benchmarkName}
              onChange={e => setBenchmarkName(e.target.value)}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
            >
              <option value=''>Select benchmark...</option>
              {BENCHMARKS.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Date</label>
            <input
              type='date'
              value={date}
              onChange={e => setDate(e.target.value)}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Result</label>
            <input
              type='text'
              value={result}
              onChange={e => setResult(e.target.value)}
              placeholder='e.g., 5:42, 15 rounds'
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder='Any additional notes...'
              rows={3}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 resize-none'
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
              className='flex-1 px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] text-white font-medium rounded-lg transition'
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
