'use client';

import { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { useSessionDetails } from '@/hooks/coach/useSessionDetails';
import { useSessionEditing } from '@/hooks/coach/useSessionEditing';
import { useBookingManagement } from '@/hooks/coach/useBookingManagement';
import SessionInfoPanel from './SessionInfoPanel';
import ManualBookingPanel from './ManualBookingPanel';
import BookingListItem from './BookingListItem';

interface SessionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  workoutDate: string;
  onSessionUpdated: () => void;
}

export default function SessionManagementModal({
  isOpen,
  onClose,
  sessionId,
  workoutDate,
  onSessionUpdated,
}: SessionManagementModalProps) {
  // Modal drag/resize state
  const [modalPos, setModalPos] = useState({ top: 100, left: 100 });
  const [modalSize, setModalSize] = useState({ width: 600, height: 700 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [resizeCorner, setResizeCorner] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);

  // Use extracted hooks
  const sessionDetails = useSessionDetails(sessionId, isOpen);

  const sessionEditing = useSessionEditing({
    sessionId,
    session: sessionDetails.session,
    bookings: sessionDetails.bookings,
    newCapacity: sessionDetails.newCapacity,
    newTime: sessionDetails.newTime,
    onRefresh: sessionDetails.fetchSessionDetails,
    onSessionUpdated,
  });

  const bookingManagement = useBookingManagement({
    sessionId,
    bookings: sessionDetails.bookings,
    availableMembers: sessionDetails.availableMembers,
    capacity: sessionDetails.session?.capacity || 0,
    onRefresh: sessionDetails.fetchSessionDetails,
    onSessionUpdated,
  });

  // Filter bookings by status
  const confirmedBookings = sessionDetails.bookings.filter(b => b.status === 'confirmed');
  const waitlistBookings = sessionDetails.bookings.filter(b => b.status === 'waitlist');
  const noShowBookings = sessionDetails.bookings.filter(b => b.status === 'no_show');
  const lateCancelBookings = sessionDetails.bookings.filter(b => b.status === 'late_cancel');

  // Modal drag handlers
  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - modalPos.left, y: e.clientY - modalPos.top });
  };

  const handleDragMove = (e: MouseEvent) => {
    if (isDragging) {
      setModalPos({
        left: Math.max(0, e.clientX - dragStart.x),
        top: Math.max(0, e.clientY - dragStart.y),
      });
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Modal resize handlers
  const handleResizeStart = (e: React.MouseEvent, corner: 'nw' | 'ne' | 'sw' | 'se') => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeCorner(corner);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: modalSize.width,
      height: modalSize.height,
    });
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing || !resizeCorner) return;

    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;

    let newWidth = modalSize.width;
    let newHeight = modalSize.height;
    let newLeft = modalPos.left;
    let newTop = modalPos.top;

    if (resizeCorner.includes('e')) {
      newWidth = Math.max(400, resizeStart.width + deltaX);
    }
    if (resizeCorner.includes('w')) {
      const potentialWidth = resizeStart.width - deltaX;
      if (potentialWidth >= 400) {
        newWidth = potentialWidth;
        newLeft = modalPos.left + deltaX;
      }
    }
    if (resizeCorner.includes('s')) {
      newHeight = Math.max(500, resizeStart.height + deltaY);
    }
    if (resizeCorner.includes('n')) {
      const potentialHeight = resizeStart.height - deltaY;
      if (potentialHeight >= 500) {
        newHeight = potentialHeight;
        newTop = modalPos.top + deltaY;
      }
    }

    setModalSize({ width: newWidth, height: newHeight });
    setModalPos({ left: newLeft, top: newTop });
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    setResizeCorner(null);
  };

  // Event listeners for drag/resize
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResizing]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className='fixed inset-0 bg-black/30 z-40' />

      {/* Floating Modal */}
      <div
        className='fixed bg-white rounded-lg shadow-2xl flex flex-col z-50'
        style={{
          left: `${modalPos.left}px`,
          top: `${modalPos.top}px`,
          width: `${modalSize.width}px`,
          height: `${modalSize.height}px`,
        }}
      >
        {/* Resize Handles */}
        <div
          className='resize-handle absolute top-0 left-0 w-4 h-4 cursor-nw-resize'
          onMouseDown={e => handleResizeStart(e, 'nw')}
        />
        <div
          className='resize-handle absolute top-0 right-0 w-4 h-4 cursor-ne-resize'
          onMouseDown={e => handleResizeStart(e, 'ne')}
        />
        <div
          className='resize-handle absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize'
          onMouseDown={e => handleResizeStart(e, 'sw')}
        />
        <div
          className='resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize'
          onMouseDown={e => handleResizeStart(e, 'se')}
        />

        {/* Header */}
        <div
          className='bg-[#178da6] text-white p-3 rounded-t-lg flex justify-between items-center cursor-move'
          onMouseDown={handleDragStart}
        >
          <h2 className='text-lg font-bold'>Session Management</h2>
          <button
            onClick={onClose}
            className='hover:bg-[#14758c] p-1 rounded transition'
            title='Close'
            aria-label='Close'
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-4'>
          {sessionDetails.loading ? (
            <div className='flex items-center justify-center h-full'>
              <div className='text-gray-500'>Loading...</div>
            </div>
          ) : sessionDetails.session ? (
            <div className='space-y-6'>
              {/* Session Info */}
              <SessionInfoPanel
                session={sessionDetails.session}
                workoutDate={workoutDate}
                editingCapacity={sessionEditing.editingCapacity}
                editingTime={sessionEditing.editingTime}
                newCapacity={sessionDetails.newCapacity}
                newTime={sessionDetails.newTime}
                onCapacityEdit={sessionEditing.setEditingCapacity}
                onTimeEdit={sessionEditing.setEditingTime}
                onCapacityChange={sessionDetails.setNewCapacity}
                onTimeChange={sessionDetails.setNewTime}
                onUpdateCapacity={sessionEditing.handleUpdateCapacity}
                onUpdateTime={sessionEditing.handleUpdateTime}
              />

              {/* Manual Booking */}
              <ManualBookingPanel
                availableMembers={sessionDetails.availableMembers}
                selectedMemberId={bookingManagement.selectedMemberId}
                onMemberSelect={bookingManagement.setSelectedMemberId}
                onAddMember={bookingManagement.handleManualBooking}
                isLoading={bookingManagement.addingMember}
                capacity={sessionDetails.session.capacity}
                confirmedCount={confirmedBookings.length}
                isSessionActive={sessionDetails.session.status !== 'cancelled'}
              />

              {/* Confirmed Bookings */}
              <div>
                <h3 className='text-base font-semibold text-gray-800 mb-2'>
                  Confirmed Bookings ({confirmedBookings.length}/{sessionDetails.session.capacity === 0 ? '∞' : sessionDetails.session.capacity})
                </h3>
                {confirmedBookings.length === 0 ? (
                  <p className='text-gray-500 text-xs'>No confirmed bookings yet</p>
                ) : (
                  <div className='space-y-1'>
                    {confirmedBookings.map(booking => (
                      <BookingListItem
                        key={booking.id}
                        booking={booking}
                        status='confirmed'
                        onMarkNoShow={bookingManagement.handleMarkNoShow}
                        onLateCancel={bookingManagement.handleLateCancel}
                        showNoShowBtn={true}
                        showLateCancelBtn={true}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* No-Shows */}
              {noShowBookings.length > 0 && (
                <div>
                  <h3 className='text-base font-semibold text-gray-800 mb-2'>
                    No-Shows ({noShowBookings.length})
                  </h3>
                  <div className='space-y-1'>
                    {noShowBookings.map(booking => (
                      <BookingListItem
                        key={booking.id}
                        booking={booking}
                        status='no_show'
                        onUndoNoShow={bookingManagement.handleUndoNoShow}
                        showUndoBtn={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Late Cancellations */}
              {lateCancelBookings.length > 0 && (
                <div>
                  <h3 className='text-base font-semibold text-gray-800 mb-2'>
                    Late Cancellations ({lateCancelBookings.length})
                  </h3>
                  <div className='space-y-1'>
                    {lateCancelBookings.map(booking => (
                      <BookingListItem
                        key={booking.id}
                        booking={booking}
                        status='late_cancel'
                        onUndoLateCancel={bookingManagement.handleUndoLateCancel}
                        showUndoBtn={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Waitlist */}
              {waitlistBookings.length > 0 && (
                <div>
                  <h3 className='text-base font-semibold text-gray-800 mb-2'>
                    Waitlist ({waitlistBookings.length})
                  </h3>
                  <div className='space-y-1'>
                    {waitlistBookings.map(booking => (
                      <BookingListItem
                        key={booking.id}
                        booking={booking}
                        status='waitlist'
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {sessionDetails.session && (
          <div className='border-t p-3 bg-gray-50 flex justify-between items-center rounded-b-lg'>
            {sessionDetails.session.status !== 'cancelled' && (
              <button
                onClick={sessionEditing.handleCancelSession}
                className='flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition text-sm'
              >
                <Trash2 size={16} />
                Cancel Session
              </button>
            )}
            <button
              onClick={onClose}
              className='px-4 py-1.5 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition text-sm ml-auto'
            >
              Close
            </button>
          </div>
        )}
      </div>
    </>
  );
}
