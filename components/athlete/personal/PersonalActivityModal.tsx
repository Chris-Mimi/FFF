'use client';

import { useEffect, useState } from 'react';
import { PERSONAL_ACTIVITY_TYPES } from '@/types/personal-activity';
import type { PersonalActivity, PersonalActivityInput } from '@/types/personal-activity';

const OTHER_TYPE = 'Sonstiges';
const isPresetType = (t: string): boolean => (PERSONAL_ACTIVITY_TYPES as readonly string[]).includes(t);

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
  const [activityType, setActivityType] = useState<string>('Laufen');
  const [customName, setCustomName] = useState('');
  const [durationMin, setDurationMin] = useState<string>('');
  const [distanceKm, setDistanceKm] = useState<string>('');
  const [effort, setEffort] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setActivityDate(initial.activity_date);
      // Custom activities (not in the preset list) are stored as the custom
      // name in activity_type. Surface them by selecting "Sonstiges" and
      // pre-filling the custom-name input.
      if (isPresetType(initial.activity_type)) {
        setActivityType(initial.activity_type);
        setCustomName('');
      } else {
        setActivityType(OTHER_TYPE);
        setCustomName(initial.activity_type);
      }
      setDurationMin(initial.duration_min != null ? String(initial.duration_min) : '');
      setDistanceKm(initial.distance_km != null ? String(initial.distance_km) : '');
      setEffort(initial.effort);
      setNotes(initial.notes || '');
    } else {
      setActivityDate(todayStr());
      setActivityType('Laufen');
      setCustomName('');
      setDurationMin('');
      setDistanceKm('');
      setEffort(null);
      setNotes('');
    }
  }, [open, initial]);

  if (!open) return null;

  const handleSubmit = async () => {
    setSaving(true);
    const parsedDuration = durationMin.trim() === '' ? null : parseInt(durationMin, 10);
    const parsedDistance = distanceKm.trim() === '' ? null : parseFloat(distanceKm);
    // If user picked Sonstiges and typed a custom name, save the custom name
    // as activity_type so the list reads "Klettern" instead of "Sonstiges".
    const trimmedCustom = customName.trim();
    const resolvedType = activityType === OTHER_TYPE && trimmedCustom !== ''
      ? trimmedCustom
      : activityType;
    const ok = await onSave({
      activity_date: activityDate,
      activity_type: resolvedType,
      duration_min: Number.isFinite(parsedDuration as number) ? parsedDuration : null,
      distance_km: Number.isFinite(parsedDistance as number) ? parsedDistance : null,
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

          {activityType === OTHER_TYPE && (
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Custom activity</label>
              <input
                type='text'
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder='z. B. Klettern, Tennis, Ski…'
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
              />
            </div>
          )}

          <div className='flex gap-3'>
            <div className='flex-1 min-w-0'>
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
            <div className='flex-1 min-w-0'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Distance (km)</label>
              <input
                type='text'
                inputMode='decimal'
                value={distanceKm.replace('.', ',')}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(',', '.');
                  if (cleaned === '' || /^\d*\.?\d*$/.test(cleaned)) {
                    setDistanceKm(cleaned);
                  }
                }}
                placeholder='Optional'
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#178da6] focus:border-transparent text-gray-900'
              />
            </div>
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
              placeholder='Optional — location, how it felt…'
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
