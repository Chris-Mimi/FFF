'use client';

import { Undo2, UserX } from 'lucide-react';
import { Booking } from '@/hooks/coach/useSessionDetails';

interface BookingListItemProps {
  booking: Booking;
  status: 'confirmed' | 'waitlist' | 'no_show' | 'late_cancel';
  onMarkNoShow?: (bookingId: string, name: string) => void;
  onUndoNoShow?: (bookingId: string, name: string) => void;
  onLateCancel?: (bookingId: string, name: string) => void;
  onUndoLateCancel?: (bookingId: string, name: string) => void;
  showNoShowBtn?: boolean;
  showLateCancelBtn?: boolean;
  showUndoBtn?: boolean;
}

export default function BookingListItem({
  booking,
  status,
  onMarkNoShow,
  onUndoNoShow,
  onLateCancel,
  onUndoLateCancel,
  showNoShowBtn = false,
  showLateCancelBtn = false,
  showUndoBtn = false,
}: BookingListItemProps) {
  const memberName = booking.member?.name || 'Unknown Member';

  // Determine background color based on status
  const bgClass =
    status === 'confirmed'
      ? 'bg-white border'
      : status === 'no_show'
        ? 'bg-orange-50 border border-orange-200'
        : status === 'late_cancel'
          ? 'bg-purple-50 border border-purple-200'
          : 'bg-gray-50 border';

  return (
    <div className={`flex items-center justify-between ${bgClass} rounded px-2 py-1.5 text-sm`}>
      <div className='flex items-center gap-2'>
        {status === 'no_show' && <UserX size={14} className='text-orange-600' />}
        <span className='font-medium text-gray-800'>{memberName}</span>
        <span className='text-xs text-gray-400'>
          Booked: {new Date(booking.booked_at).toLocaleDateString('en-GB')}
        </span>
      </div>
      <div className='flex items-center gap-1'>
        {showLateCancelBtn && onLateCancel && (
          <button
            onClick={() => onLateCancel(booking.id, memberName)}
            className='flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 hover:bg-purple-100 text-purple-800 rounded transition'
            title='Mark as late cancellation'
          >
            Late Cancel
          </button>
        )}
        {showNoShowBtn && onMarkNoShow && (
          <button
            onClick={() => onMarkNoShow(booking.id, memberName)}
            className='flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded transition'
            title='Mark as no-show'
          >
            <UserX size={14} />
            No-Show
          </button>
        )}
        {showUndoBtn && status === 'no_show' && onUndoNoShow && (
          <button
            onClick={() => onUndoNoShow(booking.id, memberName)}
            className='flex items-center gap-1 px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition'
            title='Mark as attended (undo no-show)'
          >
            <Undo2 size={14} />
            Undo
          </button>
        )}
        {showUndoBtn && status === 'late_cancel' && onUndoLateCancel && (
          <button
            onClick={() => onUndoLateCancel(booking.id, memberName)}
            className='flex items-center gap-1 px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition'
            title='Mark as attended (undo late cancel)'
          >
            <Undo2 size={14} />
            Undo
          </button>
        )}
      </div>
    </div>
  );
}
