'use client';

import { Fragment } from 'react';
import type { TrackedExercise } from '@/lib/exercise-storage';
import type { TrackingData, LastPerformedData, GlobalLastProgrammedData } from '@/hooks/coach/useMovementTracking';

interface MovementTrackingPanelProps {
  trackedExercises: TrackedExercise[];
  trackingData: TrackingData;
  lastPerformedData: LastPerformedData;
  globalLastProgrammed: GlobalLastProgrammedData;
  loading: boolean;
  selectedMembers: string[];
  members: Array<{ id: string; name: string; booking_count: number; date_of_birth: string | null }>;
}

export default function MovementTrackingPanel({
  trackedExercises,
  trackingData,
  lastPerformedData,
  globalLastProgrammed,
  loading,
  selectedMembers,
  members,
}: MovementTrackingPanelProps) {
  const selectedMembersList = members.filter(m => selectedMembers.includes(m.id));

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full text-gray-400 text-sm'>
        Loading tracking data...
      </div>
    );
  }

  const exerciseNames = trackedExercises.map(e => e.display_name || e.name);

  const getCode = (name: string): string => {
    const words = name.split(/[\s-]+/).filter(w => /^[a-zA-Z]/.test(w));
    if (words.length >= 3) return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
    if (words.length === 2) return (words[0].slice(0, 2) + words[1][0]).toUpperCase();
    return name.slice(0, 3).charAt(0).toUpperCase() + name.slice(1, 3).toLowerCase();
  };

  return (
    <div className='h-full flex flex-col lg:overflow-hidden'>
      <div className='px-3 py-2 border-b bg-gray-50 hidden lg:block'>
        <h3 className='font-semibold text-sm text-gray-900'>Movement Tracking</h3>
      </div>
      <div className='flex-1 lg:overflow-auto'>
        <table className='text-xs table-fixed min-w-max'>
          <thead className='sticky top-0 bg-white z-10'>
            <tr className='border-b-2 border-gray-500'>
              <th className='text-left px-2 py-1.5 font-semibold text-gray-700 w-[120px]'>
                Athlete
              </th>
              {exerciseNames.map((name, i) => (
                <th
                  key={name}
                  className='py-1.5 px-0.5 font-semibold text-gray-700 text-center w-[30px]'
                  title={name}
                >
                  <span className='block truncate text-[10px]'>{getCode(name)}</span>
                </th>
              ))}
            </tr>
            <tr className='border-b-2 border-gray-500 bg-gray-100'>
              <td className='px-2 py-0.5 text-[9px] text-gray-600 italic w-[120px] relative group cursor-help'>
                <span className='truncate block'>last programmed</span>
                <div className='absolute left-0 top-full mt-1 hidden group-hover:block bg-gray-800 text-white text-[10px] rounded px-2 py-1.5 whitespace-nowrap z-50 shadow-lg'>
                  <span className='text-green-400'>Green: ≤14 days</span>
                  <span className='mx-1'>|</span>
                  <span className='text-yellow-400'>Yellow: 15–28 days</span>
                  <span className='mx-1'>|</span>
                  <span className='text-orange-400'>Orange: 29–60 days</span>
                  <span className='mx-1'>|</span>
                  <span className='text-red-400'>Red: 60+ days</span>
                </div>
              </td>
              {exerciseNames.map(name => {
                const date = globalLastProgrammed[name];
                const formatted = date
                  ? new Date(date + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
                  : '—';
                let colorClass = 'text-gray-400';
                if (date) {
                  const days = Math.floor((Date.now() - new Date(date + 'T00:00:00').getTime()) / 86400000);
                  if (days <= 14) colorClass = 'text-green-700 font-semibold';
                  else if (days <= 28) colorClass = 'text-yellow-500 font-semibold';
                  else if (days <= 60) colorClass = 'text-orange-600 font-semibold';
                  else colorClass = 'text-red-700 font-semibold';
                }
                return (
                  <td key={name} className='py-0.5 px-0.5 text-center'>
                    <span className={`text-[9px] ${colorClass}`}>
                      {formatted}
                    </span>
                  </td>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {selectedMembersList.map(member => {
              const memberData = trackingData[member.id] || {};
              const memberDates = lastPerformedData[member.id] || {};
              return (
                <Fragment key={member.id}>
                  <tr className='border-b border-gray-400 hover:bg-gray-300'>
                    <td className='px-2 py-1.5 font-medium text-gray-900 truncate w-[120px]'>
                      {member.name}
                    </td>
                    {exerciseNames.map(name => {
                      const count = memberData[name] || 0;
                      return (
                        <td key={name} className='py-1 px-0.5 text-center'>
                          <span
                            className={`inline-block min-w-[20px] px-0.5 py-0.5 rounded text-xs font-medium ${
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
                  <tr className='border-b border-gray-400 bg-gray-100'>
                    <td className='px-2 py-0.5 text-[9px] text-gray-600 italic truncate w-[120px]'>
                      last
                    </td>
                    {exerciseNames.map(name => {
                      const date = memberDates[name];
                      const formatted = date
                        ? new Date(date + 'T00:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
                        : '—';
                      let colorClass = 'text-gray-400';
                      if (date) {
                        const days = Math.floor((Date.now() - new Date(date + 'T00:00:00').getTime()) / 86400000);
                        if (days <= 14) colorClass = 'text-green-700 font-semibold';
                        else if (days <= 28) colorClass = 'text-yellow-500 font-semibold';
                        else if (days <= 60) colorClass = 'text-orange-600 font-semibold';
                        else colorClass = 'text-red-700 font-semibold';
                      }
                      return (
                        <td key={name} className='py-0.5 px-0.5 text-center'>
                          <span className={`text-[9px] ${colorClass}`}>
                            {formatted}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
