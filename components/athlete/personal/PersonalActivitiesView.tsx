'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { usePersonalActivities } from '@/hooks/athlete/usePersonalActivities';
import type { PersonalActivity } from '@/types/personal-activity';
import PersonalActivityModal from './PersonalActivityModal';

interface PersonalActivitiesViewProps {
  userId: string;
}

const formatDateLabel = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

export default function PersonalActivitiesView({ userId }: PersonalActivitiesViewProps) {
  const { activities, loading, createActivity, updateActivity, deleteActivity } = usePersonalActivities(userId);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PersonalActivity | null>(null);

  const handleAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (activity: PersonalActivity) => {
    setEditing(activity);
    setModalOpen(true);
  };

  return (
    <div>
      <div className='flex items-center justify-between mb-4'>
        <p className='text-sm text-gray-600'>
          Log your own workouts — swims, runs, holiday gym sessions, anything.
        </p>
        <button
          onClick={handleAdd}
          className='flex items-center gap-2 px-4 py-2 bg-[#178da6] text-white rounded-lg hover:bg-[#14758c] text-sm font-medium'
        >
          <Plus className='w-4 h-4' />
          Add Activity
        </button>
      </div>

      {loading ? (
        <div className='text-center text-gray-500 py-8'>Loading…</div>
      ) : activities.length === 0 ? (
        <div className='text-center text-gray-500 py-12 border border-dashed border-gray-300 rounded-lg'>
          <p className='mb-2'>No activities logged yet.</p>
          <p className='text-sm'>Tap <span className='font-medium'>Add Activity</span> to record your first one.</p>
        </div>
      ) : (
        <div className='space-y-2'>
          {activities.map((a) => (
            <button
              key={a.id}
              onClick={() => handleEdit(a)}
              className='w-full text-left border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition'
            >
              <div className='flex items-center justify-between gap-3 flex-wrap'>
                <div className='flex items-center gap-3 flex-wrap'>
                  <span className='text-sm font-semibold text-gray-900'>{a.activity_type}</span>
                  <span className='text-xs text-gray-500'>{formatDateLabel(a.activity_date)}</span>
                  {a.distance_km != null && (
                    <span className='text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded'>
                      {String(a.distance_km).replace('.', ',')} km
                    </span>
                  )}
                  {a.duration_min != null && (
                    <span className='text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded'>
                      {a.duration_min} min
                    </span>
                  )}
                  {a.effort != null && (
                    <span className='text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded'>
                      Effort {a.effort}/5
                    </span>
                  )}
                </div>
              </div>
              {a.notes && (
                <p className='text-sm text-gray-700 mt-2 whitespace-pre-wrap'>{a.notes}</p>
              )}
            </button>
          ))}
        </div>
      )}

      <PersonalActivityModal
        open={modalOpen}
        initial={editing}
        onSave={editing
          ? (input) => updateActivity(editing.id, input)
          : (input) => createActivity(input)
        }
        onDelete={editing ? () => deleteActivity(editing.id) : undefined}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
