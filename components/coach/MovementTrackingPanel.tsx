'use client';

import type { TrackedExercise } from '@/lib/exercise-storage';
import type { TrackingData } from '@/hooks/coach/useMovementTracking';

interface MovementTrackingPanelProps {
  trackedExercises: TrackedExercise[];
  trackingData: TrackingData;
  loading: boolean;
  selectedMembers: string[];
  members: Array<{ id: string; name: string; booking_count: number }>;
}

export default function MovementTrackingPanel({
  trackedExercises,
  trackingData,
  loading,
  selectedMembers,
  members,
}: MovementTrackingPanelProps) {
  const selectedMembersList = members.filter(m => selectedMembers.includes(m.id));

  if (selectedMembers.length === 0) {
    return (
      <div className='flex items-center justify-center h-full text-gray-400 text-sm p-4 text-center'>
        Select athletes from the sidebar to see movement tracking
      </div>
    );
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full text-gray-400 text-sm'>
        Loading tracking data...
      </div>
    );
  }

  const exerciseNames = trackedExercises.map(e => e.display_name || e.name);

  return (
    <div className='h-full flex flex-col overflow-hidden'>
      <div className='px-3 py-2 border-b bg-gray-50'>
        <h3 className='font-semibold text-sm text-gray-900'>Movement Tracking</h3>
      </div>
      <div className='flex-1 overflow-auto'>
        <table className='w-full text-xs'>
          <thead className='sticky top-0 bg-white z-10'>
            <tr className='border-b'>
              <th className='text-left px-2 py-1.5 font-semibold text-gray-700 min-w-[120px]'>
                Athlete
              </th>
              {exerciseNames.map(name => (
                <th
                  key={name}
                  className='px-2 py-1.5 font-semibold text-gray-700 text-center min-w-[60px]'
                  title={name}
                >
                  <span className='block truncate max-w-[80px]'>{name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {selectedMembersList.map(member => {
              const memberData = trackingData[member.id] || {};
              return (
                <tr key={member.id} className='border-b hover:bg-gray-50'>
                  <td className='px-2 py-1.5 font-medium text-gray-900 truncate max-w-[150px]'>
                    {member.name}
                  </td>
                  {exerciseNames.map(name => {
                    const count = memberData[name] || 0;
                    return (
                      <td key={name} className='px-2 py-1.5 text-center'>
                        <span
                          className={`inline-block min-w-[24px] px-1 py-0.5 rounded text-xs font-medium ${
                            count === 0
                              ? 'text-gray-400 bg-gray-100'
                              : 'text-white bg-[#178da6]'
                          }`}
                        >
                          {count}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
