'use client';

import { useEffect, useState } from 'react';
import { PERSONAL_ACTIVITY_TYPES } from '@/types/personal-activity';
import type { PersonalActivity, PersonalActivityInput } from '@/types/personal-activity';

interface PersonalActivityModalProps {
  open: boolean;
  initial?: PersonalActivity | null;
  onSave: (input: PersonalActivityInput) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
  onClose: () => void;
}

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function PersonalActivityModal({ open, initial, onSave, onDelete, onClose }: PersonalActivityModalProps) {
  const [activityDate, setActivityDate] = useState(todayStr());
  const [activityType, setActivityType] = useState<string>(PERSONAL_ACTIVITY_TYPES[0]);
  const [durationMin, setDurationMin] = useState<string>('');
  const [effort, setEffort] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setActivityDate(initial.activity_date);
      setActivityType(initial.activity_type);
      setDurationMin(initial.duration_min != null ? String(initial.duration_min) : '');
      setEffort(initial.effort);
      setNotes(initial.notes || '');
    } else {
      setActivityDate(todayStr());
      setActivityType(PERSONAL_ACTIVITY_TYPES[0]);
      setDurationMin('');
      setEffort(null);
      setNotes('');
    }
  }, [open, initial]);

  if (!open) return null;

  const handleSubmit = async () => {
    setSaving(true);
    const parsedDuration = durationMin.trim() === '' ? null : parseInt(durationMin, 10);
    const ok = await onSave({
      activity_date: activityDate,
      activity_type: activityType,
      duration_min: Number.isFinite(parsedDuration as number) ? parsedDuration : null,
      effort,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (ok) onClose();
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('Delete this activity?')) return;
    setSaving(true);
    const ok = await onDelete();
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
      <div className='bg-white rounded-lg shadow-xl w-full max-w-md p-6'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>
          {initial ? 'Edit Activity' : 'New Activity'}
        </h3>

        <div className='space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Date</label>
            <input
              type='date'
              value={activityDate}
              onChange={(e) => setActivityDate(e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Activity</label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
            >
              {PERSONAL_ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Duration (min)</label>
            <input
              type='number'
              min='0'
              inputMode='numeric'
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              placeholder='Optional'
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Effort</label>
            <div className='flex gap-2'>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type='button'
                  onClick={() => setEffort(effort === n ? null : n)}
                  className={`w-10 h-10 rounded-full text-sm font-medium transition ${
                    effort === n ? 'bg-[#178da6] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type='button'
                onClick={() => setEffort(null)}
                className='ml-auto text-xs text-gray-500 underline'
              >
                Clear
              </button>
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder='Optional — distance, location, how it felt…'
              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900 resize-none'
            />
          </div>
        </div>

        <div className='mt-6 flex items-center justify-between gap-2'>
          {initial && onDelete ? (
            <button
              onClick={handleDelete}
              disabled={saving}
              className='px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50'
            >
              Delete
            </button>
          ) : <div />}
          <div className='flex gap-2'>
            <button
              onClick={onClose}
              disabled={saving}
              className='px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50'
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className='px-4 py-2 text-sm bg-[#178da6] text-white rounded-lg hover:bg-[#14758c] disabled:opacity-50'
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
