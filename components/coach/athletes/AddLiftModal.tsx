'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const LIFTS = [
  'Back Squat',
  'Front Squat',
  'Overhead Squat',
  'Deadlift',
  'Sumo Deadlift',
  'Bench Press',
  'Shoulder Press',
  'Push Press',
  'Jerk',
  'Clean',
  'Snatch',
  'Clean & Jerk',
];

const calculate1RM = (weight: number, reps: number) => {
  if (reps === 1) return weight;
  return Math.round(weight * (36 / (37 - reps)));
};

export default function AddLiftModal({
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
  const [liftName, setLiftName] = useState('');
  const [weight, setWeight] = useState('');
  const [repMaxType, setRepMaxType] = useState<'1RM' | '3RM' | '5RM' | '10RM'>('1RM');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSave = async () => {
    if (!athleteId || !liftName || !weight) {
      toast.warning('Please fill in lift name and weight');
      return;
    }

    const weightNum = parseFloat(weight);
    const reps = parseInt(repMaxType.replace('RM', ''));
    const calculated1RM = calculate1RM(weightNum, reps);

    try {
      const { error } = await supabase.from('lift_records').insert({
        user_id: athleteId,
        lift_name: liftName,
        weight_kg: weightNum,
        reps: reps,
        calculated_1rm: calculated1RM,
        rep_max_type: repMaxType,
        notes: notes || null,
        lift_date: date,
      });

      if (error) throw error;
      toast.success('Lift record added successfully!');
      onSave();
    } catch (error) {
      console.error('Error adding lift:', error);
      toast.error('Failed to add lift record. Please try again.');
    }
  };

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50'>
      <div className='bg-white rounded-lg shadow-xl max-w-md w-full p-6'>
        <h3 className='text-xl font-bold text-gray-900 mb-4'>Add Lift Record for {athleteName}</h3>

        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Lift</label>
            <select
              value={liftName}
              onChange={e => setLiftName(e.target.value)}
              className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
            >
              <option value=''>Select lift...</option>
              {LIFTS.map(name => (
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

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Weight (kg)</label>
              <input
                type='number'
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder='100'
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Rep Max Type</label>
              <select
                value={repMaxType}
                onChange={e => setRepMaxType(e.target.value as '1RM' | '3RM' | '5RM' | '10RM')}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900'
              >
                <option value='1RM'>1RM</option>
                <option value='3RM'>3RM</option>
                <option value='5RM'>5RM</option>
                <option value='10RM'>10RM</option>
              </select>
            </div>
          </div>

          {weight && repMaxType !== '1RM' && (
            <div className='bg-gray-50 p-3 rounded-lg'>
              <p className='text-sm text-gray-600'>Estimated 1RM:</p>
              <p className='text-lg font-semibold text-[#208479]'>
                {calculate1RM(parseFloat(weight), parseInt(repMaxType.replace('RM', '')))} kg
              </p>
            </div>
          )}

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
