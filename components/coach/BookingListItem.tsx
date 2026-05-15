'use client';

import { ArrowUp, Undo2, UserX, X } from 'lucide-react';
import { Booking } from '@/hooks/coach/useSessionDetails';

interface BookingListItemProps {
  booking: Booking;
  status: 'confirmed' | 'waitlist' | 'no_show' | 'late_cancel' | 'cancelled';
  onMarkNoShow?: (bookingId: string, name: string) => void;
  onUndoNoShow?: (bookingId: string, name: string) => void;
  onLateCancel?: (bookingId: string, name: string) => void;
  onUndoLateCancel?: (bookingId: string, name: string) => void;
  onCancelBooking?: (bookingId: string, name: string, memberId: string) => void;
  onToggleOg?: (bookingId: string, name: string, isOg: boolean) => void;
  onPromote?: (bookingId: string, name: string) => void;
  showNoShowBtn?: boolean;
  showLateCancelBtn?: boolean;
  showUndoBtn?: boolean;
  showCancelBtn?: boolean;
  showOgBtn?: boolean;
  showPromoteBtn?: boolean;
}

export default function BookingListItem({
  booking,
  status,
  onMarkNoShow,
  onUndoNoShow,
  onLateCancel,
  onUndoLateCancel,
  onCancelBooking,
  onToggleOg,
  onPromote,
  showNoShowBtn = false,
  showLateCancelBtn = false,
  showUndoBtn = false,
  showCancelBtn = false,
  showOgBtn = false,
  showPromoteBtn = false,
}: BookingListItemProps) {
  const memberName = booking.member?.name || booking.member?.display_name || 'Unknown Member';
  const isFamilyMember = booking.member?.account_type === 'family_member';

  // 10-card warning tier — only meaningful on confirmed/waitlist (active bookings).
  // overage: negative (over the limit per S347 soft-block); full: exactly 0;
  // last: 1 more bookable; low: 2 more bookable.
  const showCardWarning = status === 'confirmed' || status === 'waitlist';
  const remaining = booking.tenCardRemaining;
  const cardTier: 'overage' | 'full' | 'last' | 'low' | null =
    showCardWarning && remaining !== null && remaining !== undefined
      ? remaining < 0
        ? 'overage'
        : remaining === 0
          ? 'full'
          : remaining === 1
            ? 'last'
            : remaining === 2
              ? 'low'
              : null
      : null;

  // Determine background color based on status, with a 10-card warning tier
  // overriding the confirmed default when relevant.
  const bgClass =
    cardTier === 'overage' || cardTier === 'full' || cardTier === 'last'
      ? 'bg-red-50 border-2 border-red-400'
      : cardTier === 'low'
        ? 'bg-amber-50 border-2 border-amber-400'
        : status === 'confirmed'
          ? 'bg-white border'
          : status === 'waitlist'
            ? 'bg-gray-50 border'
            : status === 'no_show'
              ? 'bg-orange-50 border border-orange-200'
              : status === 'late_cancel'
                ? 'bg-purple-50 border border-purple-200'
                : status === 'cancelled'
                  ? 'bg-gray-100 border border-gray-200'
                  : 'bg-gray-50 border';

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 ${bgClass} rounded px-3 py-2 text-sm`}>
      <div className='flex items-center gap-2 flex-wrap'>
        {status === 'no_show' && <UserX size={14} className='text-orange-600' />}
        <span className={`font-medium ${status === 'cancelled' ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{memberName}</span>
        {booking.is_og && (
          <span className='text-[10px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded'>
            OG
          </span>
        )}
        {booking.is_trial && (
          <span
            className='text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded'
            title='Linked from a trial appearance — does not debit 10-card, does not consume capacity'
          >
            Trial
          </span>
        )}
        {isFamilyMember && (
          <span className='text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded'>
            family
          </span>
        )}
        {cardTier === 'overage' && (
          <span className='text-[10px] font-bold text-white bg-red-600 px-1.5 py-0.5 rounded'>
            ⚠ Over by {Math.abs(remaining ?? 0)}
          </span>
        )}
        {cardTier === 'full' && (
          <span className='text-[10px] font-bold text-white bg-red-600 px-1.5 py-0.5 rounded'>
            ⚠ Card full
          </span>
        )}
        {cardTier === 'last' && (
          <span className='text-[10px] font-bold text-white bg-red-600 px-1.5 py-0.5 rounded'>
            ⚠ 1 left
          </span>
        )}
        {cardTier === 'low' && (
          <span className='text-[10px] font-bold text-amber-900 bg-amber-200 px-1.5 py-0.5 rounded'>
            2 left
          </span>
        )}
        <span className='text-xs text-gray-500'>
          Booked: {formatDateTime(booking.booked_at)}
        </span>
        {(status === 'cancelled' || status === 'late_cancel' || status === 'no_show') && (
          <span className='text-xs text-gray-500'>
            · {status === 'late_cancel' ? 'Late cancel' : status === 'no_show' ? 'Marked' : 'Cancelled'}: {formatDateTime(booking.updated_at)}
          </span>
        )}
      </div>
      <div className='flex items-center gap-1.5'>
        {showPromoteBtn && onPromote && (
          <button
            onClick={() => onPromote(booking.id, memberName)}
            className='flex items-center gap-1 px-3 py-1.5 text-xs bg-green-100 hover:bg-green-200 text-green-800 rounded transition'
            title='Promote to confirmed (slot freed by no-show or cancellation)'
          >
            <ArrowUp size={14} />
            Promote
          </button>
        )}
        {showOgBtn && onToggleOg && (
          <button
            onClick={() => onToggleOg(booking.id, memberName, !booking.is_og)}
            className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded transition ${
              booking.is_og
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
            }`}
            title={booking.is_og ? 'Remove Open Gym flag (counts toward capacity again)' : 'Mark as Open Gym (off-capacity)'}
          >
            OG
          </button>
        )}
        {showCancelBtn && onCancelBooking && (
          <button
            onClick={() => onCancelBooking(booking.id, memberName, booking.member.id)}
            className='flex items-center gap-1 px-2 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition'
            title='Remove booking made in error (refunds 10-card)'
          >
            <X size={13} />
            Remove
          </button>
        )}
        {showLateCancelBtn && onLateCancel && (
          <button
            onClick={() => onLateCancel(booking.id, memberName)}
            className='flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-50 hover:bg-purple-100 text-purple-800 rounded transition'
            title='Mark as late cancellation'
          >
            Late Cancel
          </button>
        )}
        {showNoShowBtn && onMarkNoShow && (
          <button
            onClick={() => onMarkNoShow(booking.id, memberName)}
            className='flex items-center gap-1 px-3 py-1.5 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded transition'
            title='Mark as no-show'
          >
            <UserX size={14} />
            No-Show
          </button>
        )}
        {showUndoBtn && status === 'no_show' && onUndoNoShow && (
          <button
            onClick={() => onUndoNoShow(booking.id, memberName)}
            className='flex items-center gap-1 px-3 py-1.5 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition'
            title='Mark as attended (undo no-show)'
          >
            <Undo2 size={14} />
            Undo
          </button>
        )}
        {showUndoBtn && status === 'late_cancel' && onUndoLateCancel && (
          <button
            onClick={() => onUndoLateCancel(booking.id, memberName)}
            className='flex items-center gap-1 px-3 py-1.5 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition'
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
