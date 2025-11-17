'use client';

import { supabase } from '@/lib/supabase';
import { Calendar, Clock, Edit2, Trash2, Undo2, Users, UserX, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SessionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  workoutDate: string;
  onSessionUpdated: () => void;
}

interface Booking {
  id: string;
  status: 'confirmed' | 'waitlist' | 'cancelled' | 'no_show' | 'late_cancel';
  booked_at: string;
  member: {
    id: string;
    name: string;
    email: string;
  };
}

interface SessionDetails {
  id: string;
  date: string;
  time: string;
  capacity: number;
  status: string;
  workout_id: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  membership_types: string[];
  ten_card_sessions_used: number;
}

export default function SessionManagementModal({
  isOpen,
  onClose,
  sessionId,
  workoutDate,
  onSessionUpdated,
}: SessionManagementModalProps) {
  const [session, setSession] = useState<SessionDetails | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCapacity, setEditingCapacity] = useState(false);
  const [newCapacity, setNewCapacity] = useState(0);
  const [editingTime, setEditingTime] = useState(false);
  const [newTime, setNewTime] = useState('12:00');
  const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [modalPos, setModalPos] = useState({ top: 100, left: 100 });
  const [modalSize, setModalSize] = useState({ width: 600, height: 700 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [resizeCorner, setResizeCorner] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);

  // Helper function to ensure time is zero-padded for select dropdown
  const padTime = (time: string): string => {
    if (!time) return '12:00';
    const [hours, minutes] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchSessionDetails();
    }
  }, [isOpen, sessionId]);

  const fetchSessionDetails = async () => {
    setLoading(true);
    try {
      // Fetch session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('weekly_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      setSession(sessionData);
      setNewCapacity(sessionData.capacity);
      setNewTime(padTime(sessionData.time));

      // Fetch bookings with member details
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          booked_at,
          members!bookings_member_id_fkey (
            id,
            name,
            email
          )
        `)
        .eq('session_id', sessionId)
        .order('booked_at', { ascending: true });

      if (bookingsError) throw bookingsError;

      // Transform data to rename members to member for consistency
      const transformedBookings = (bookingsData || []).map(booking => ({
        id: booking.id,
        status: booking.status,
        booked_at: booking.booked_at,
        member: booking.members // Rename members field to member
      }));

      setBookings(transformedBookings);

      // Fetch all active members for manual booking
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('id, name, email, membership_types, ten_card_sessions_used')
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (membersError) throw membersError;

      // Filter out members who already have active bookings
      const bookedMemberIds = transformedBookings
        .filter((b: any) => b.status !== 'cancelled')
        .map((b: any) => b.member.id);

      const available = (membersData || []).filter(
        (m: Member) => !bookedMemberIds.includes(m.id)
      );

      setAvailableMembers(available);
      setSelectedMemberId('');
    } catch (error) {
      console.error('Error fetching session details:', error);
      alert('Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSession = async () => {
    if (!confirm('Cancel this session? All bookings will be cancelled and members should be notified.')) {
      return;
    }

    try {
      // Update session status to cancelled
      const { error } = await supabase
        .from('weekly_sessions')
        .update({ status: 'cancelled' })
        .eq('id', sessionId);

      if (error) throw error;

      // Cancel all bookings
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('session_id', sessionId);

      alert('Session cancelled successfully');
      onSessionUpdated();
      onClose();
    } catch (error) {
      console.error('Error cancelling session:', error);
      alert('Failed to cancel session');
    }
  };

  const handleUpdateCapacity = async () => {
    if (newCapacity < 1) {
      alert('Capacity must be at least 1');
      return;
    }

    const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
    if (newCapacity < confirmedCount) {
      alert(`Cannot reduce capacity below confirmed bookings (${confirmedCount})`);
      return;
    }

    try {
      const { error } = await supabase
        .from('weekly_sessions')
        .update({ capacity: newCapacity })
        .eq('id', sessionId);

      if (error) throw error;

      // Also update the WOD's max_capacity if it exists
      if (session?.workout_id) {
        await supabase
          .from('wods')
          .update({ max_capacity: newCapacity })
          .eq('id', session.workout_id);
      }

      setEditingCapacity(false);
      await fetchSessionDetails();
      onSessionUpdated();
      alert('Capacity updated successfully');
    } catch (error) {
      console.error('Error updating capacity:', error);
      alert('Failed to update capacity');
    }
  };

  const handleUpdateTime = async () => {
    if (!newTime) {
      alert('Please enter a valid time');
      return;
    }

    try {
      const { error } = await supabase
        .from('weekly_sessions')
        .update({ time: newTime })
        .eq('id', sessionId);

      if (error) throw error;

      // Update the WOD's class_times array and publish_time
      if (session?.workout_id) {
        const { data: allSessions } = await supabase
          .from('weekly_sessions')
          .select('time')
          .eq('workout_id', session.workout_id)
          .order('time', { ascending: true });

        if (allSessions) {
          const classTimes = allSessions.map(s => s.time);
          await supabase
            .from('wods')
            .update({
              class_times: classTimes,
              publish_time: newTime  // Update publish_time for Athlete page
            })
            .eq('id', session.workout_id);
        }
      }

      setEditingTime(false);
      await fetchSessionDetails();
      onSessionUpdated();
    } catch (error) {
      console.error('Error updating time:', error);
      alert('Failed to update time');
    }
  };

  const handleMarkNoShow = async (bookingId: string, memberName: string) => {
    if (!confirm(`Mark ${memberName} as no-show?\n\nIf they have a 10-card, this will still count toward their usage. They won't count toward attendance statistics.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'no_show' })
        .eq('id', bookingId);

      if (error) throw error;

      await fetchSessionDetails();
      onSessionUpdated();
    } catch (error) {
      console.error('Error marking no-show:', error);
      alert('Failed to mark as no-show');
    }
  };

  const handleUndoNoShow = async (bookingId: string, memberName: string) => {
    if (!confirm(`Mark ${memberName} as attended (undo no-show)?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);

      if (error) throw error;

      await fetchSessionDetails();
      onSessionUpdated();
    } catch (error) {
      console.error('Error undoing no-show:', error);
      alert('Failed to undo no-show');
    }
  };

  const handleLateCancel = async (bookingId: string, memberName: string) => {
    if (!confirm(`Mark ${memberName} as late cancellation?\n\nThis will count toward their 10-card usage but NOT toward attendance statistics.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'late_cancel' })
        .eq('id', bookingId);

      if (error) throw error;

      await fetchSessionDetails();
      onSessionUpdated();
    } catch (error) {
      console.error('Error marking late cancellation:', error);
      alert('Failed to mark as late cancellation');
    }
  };

  const handleUndoLateCancel = async (bookingId: string, memberName: string) => {
    if (!confirm(`Mark ${memberName} as attended (undo late cancellation)?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);

      if (error) throw error;

      await fetchSessionDetails();
      onSessionUpdated();
    } catch (error) {
      console.error('Error undoing late cancellation:', error);
      alert('Failed to undo late cancellation');
    }
  };

  const handleManualBooking = async () => {
    if (!selectedMemberId) {
      alert('Please select a member');
      return;
    }

    setAddingMember(true);
    try {
      const selectedMember = availableMembers.find(m => m.id === selectedMemberId);
      if (!selectedMember) {
        throw new Error('Member not found');
      }

      // Determine booking status based on capacity
      const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
      const bookingStatus = confirmedCount < (session?.capacity || 0) ? 'confirmed' : 'waitlist';

      // Create booking
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          session_id: sessionId,
          member_id: selectedMemberId,
          status: bookingStatus,
          booked_at: new Date().toISOString()
        });

      if (bookingError) throw bookingError;

      // Increment 10-card sessions used if member has 10-card and booking is confirmed
      if (bookingStatus === 'confirmed' && selectedMember.membership_types?.includes('ten_card')) {
        const { error: updateError } = await supabase
          .from('members')
          .update({
            ten_card_sessions_used: selectedMember.ten_card_sessions_used + 1
          })
          .eq('id', selectedMemberId);

        if (updateError) {
          console.error('Failed to increment 10-card sessions:', updateError);
          // Don't fail the booking for this
        }
      }

      await fetchSessionDetails();
      onSessionUpdated();

      const statusMessage = bookingStatus === 'confirmed'
        ? `${selectedMember.name} booked successfully`
        : `${selectedMember.name} added to waitlist (session full)`;
      alert(statusMessage);
    } catch (error) {
      console.error('Error booking member:', error);
      alert('Failed to book member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.resize-handle')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - modalPos.left, y: e.clientY - modalPos.top });
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const newTop = Math.max(50, e.clientY - dragStart.y); // Prevent dragging above header
    setModalPos({
      left: e.clientX - dragStart.x,
      top: newTop,
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleResizeStart = (e: React.MouseEvent, corner: 'nw' | 'ne' | 'sw' | 'se') => {
    e.preventDefault();
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

    const dx = e.clientX - resizeStart.x;
    const dy = e.clientY - resizeStart.y;

    let newWidth = resizeStart.width;
    let newHeight = resizeStart.height;
    let newLeft = modalPos.left;
    let newTop = modalPos.top;

    if (resizeCorner.includes('e')) newWidth = Math.max(500, resizeStart.width + dx);
    if (resizeCorner.includes('w')) {
      newWidth = Math.max(500, resizeStart.width - dx);
      newLeft = modalPos.left + dx;
    }
    if (resizeCorner.includes('s')) newHeight = Math.max(200, resizeStart.height + dy);
    if (resizeCorner.includes('n')) {
      newHeight = Math.max(200, resizeStart.height - dy);
      newTop = modalPos.top + dy;
    }

    setModalSize({ width: newWidth, height: newHeight });
    setModalPos({ left: newLeft, top: newTop });
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    setResizeCorner(null);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
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
  }, [isResizing]);

  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const waitlistBookings = bookings.filter(b => b.status === 'waitlist');
  const noShowBookings = bookings.filter(b => b.status === 'no_show');
  const lateCancelBookings = bookings.filter(b => b.status === 'late_cancel');

  if (!isOpen) return null;

  return (
    <>
      {/* Floating Modal */}
      <div
        className="fixed bg-white rounded-lg shadow-2xl flex flex-col z-50"
        style={{
          left: `${modalPos.left}px`,
          top: `${modalPos.top}px`,
          width: `${modalSize.width}px`,
          height: `${modalSize.height}px`,
          maxWidth: '90vw'
        }}
      >
        {/* Resize Handles - Small corner indicators */}
        {/* Bottom-right */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50"
          onMouseDown={(e) => handleResizeStart(e, 'se')}
          title="Drag to resize"
        >
          <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[16px] border-l-transparent border-b-[16px] border-b-[#208479] hover:border-b-[#1a6b62] transition"></div>
        </div>
        {/* Top-right */}
        <div
          className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize z-50"
          onMouseDown={(e) => handleResizeStart(e, 'ne')}
          title="Drag to resize"
        >
          <div className="absolute top-0 right-0 w-0 h-0 border-l-[16px] border-l-transparent border-t-[16px] border-t-[#208479] hover:border-t-[#1a6b62] transition"></div>
        </div>
        {/* Bottom-left */}
        <div
          className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-50"
          onMouseDown={(e) => handleResizeStart(e, 'sw')}
          title="Drag to resize"
        >
          <div className="absolute bottom-0 left-0 w-0 h-0 border-r-[16px] border-r-transparent border-b-[16px] border-b-[#208479] hover:border-b-[#1a6b62] transition"></div>
        </div>
        {/* Top-left */}
        <div
          className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-50"
          onMouseDown={(e) => handleResizeStart(e, 'nw')}
          title="Drag to resize"
        >
          <div className="absolute top-0 left-0 w-0 h-0 border-r-[16px] border-r-transparent border-t-[16px] border-t-[#208479] hover:border-t-[#1a6b62] transition"></div>
        </div>

        {/* Header */}
        <div
          className="bg-[#208479] text-white p-6 rounded-t-lg flex justify-between items-start flex-shrink-0 cursor-move"
          onMouseDown={handleDragStart}
        >
          <div>
            <h2 className="text-2xl font-bold">Manage Session</h2>
            <p className="text-sm opacity-90">
              {workoutDate ? new Date(workoutDate).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }) : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-[#1a6b62] p-2 rounded transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#208479] mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading session details...</p>
            </div>
          ) : session ? (
            <div className="space-y-6">
              {/* Session Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Row 1: Date and Time */}
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar size={18} />
                    <span className="font-medium">Date:</span>
                    <span className="text-sm">{new Date(workoutDate).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock size={18} />
                    <span className="font-medium">Time:</span>
                    {editingTime ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={newTime}
                          onChange={(e) => setNewTime(e.target.value)}
                          className="px-2 py-1 border rounded bg-white text-gray-900 text-sm"
                        >
                          {/* Generate time options in 15-minute increments */}
                          {Array.from({ length: 24 }, (_, hour) =>
                            [0, 15, 30, 45].map(minute => {
                              const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                              return (
                                <option key={timeString} value={timeString}>
                                  {timeString}
                                </option>
                              );
                            })
                          ).flat()}
                        </select>
                        <button
                          onClick={handleUpdateTime}
                          className="px-3 py-1 bg-[#208479] text-white rounded hover:bg-[#1a6b62] text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingTime(false);
                            setNewTime(padTime(session.time));
                          }}
                          className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <span>{session.time}</span>
                        <button
                          onClick={() => {
                            setNewTime(padTime(session.time));
                            setEditingTime(true);
                          }}
                          className="p-1 text-gray-500 hover:text-[#208479]"
                          title="Change time"
                        >
                          <Edit2 size={16} />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Row 2: Capacity and Status */}
                  <div className="flex items-center gap-2 text-gray-700">
                    <Users size={18} />
                    <span className="font-medium">Capacity:</span>
                    {editingCapacity ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={newCapacity}
                          onChange={(e) => setNewCapacity(parseInt(e.target.value))}
                          className="w-20 px-2 py-1 border rounded text-sm"
                        />
                        <button
                          onClick={handleUpdateCapacity}
                          className="px-3 py-1 bg-[#208479] text-white rounded hover:bg-[#1a6b62] text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingCapacity(false);
                            setNewCapacity(session.capacity);
                          }}
                          className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <span>{session.capacity} spots</span>
                        <button
                          onClick={() => setEditingCapacity(true)}
                          className="p-1 text-gray-500 hover:text-[#208479]"
                          title="Change capacity"
                        >
                          <Edit2 size={16} />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="font-medium">Status:</span>
                    <span className={`px-2 py-1 rounded text-sm ${
                      session.status === 'published' ? 'bg-green-100 text-green-800' :
                      session.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-200 text-gray-700'
                    }`}>
                      {session.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Manual Booking */}
              {session.status !== 'cancelled' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-gray-800 mb-3">Add Member Manually</h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                      disabled={addingMember || availableMembers.length === 0}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#208479] focus:border-transparent text-gray-900 disabled:bg-gray-100"
                    >
                      <option value="">
                        {availableMembers.length === 0 ? 'No available members' : 'Select a member...'}
                      </option>
                      {availableMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleManualBooking}
                      disabled={!selectedMemberId || addingMember}
                      className="px-4 py-2 bg-[#208479] hover:bg-[#1a6b62] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition whitespace-nowrap"
                    >
                      {addingMember ? 'Adding...' : 'Add Member'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    {confirmedBookings.length >= (session?.capacity || 0)
                      ? '⚠️ Session is full - member will be added to waitlist'
                      : `${(session?.capacity || 0) - confirmedBookings.length} spot(s) available`}
                  </p>
                </div>
              )}

              {/* Confirmed Bookings */}
              <div>
                <h3 className="text-base font-semibold text-gray-800 mb-2">
                  Confirmed Bookings ({confirmedBookings.length}/{session.capacity})
                </h3>
                {confirmedBookings.length === 0 ? (
                  <p className="text-gray-500 text-xs">No confirmed bookings yet</p>
                ) : (
                  <div className="space-y-1">
                    {confirmedBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between bg-white border rounded px-2 py-1.5 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">{booking.member?.name || 'Unknown Member'}</span>
                          <span className="text-xs text-gray-400">
                            Booked: {new Date(booking.booked_at).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleLateCancel(booking.id, booking.member?.name || 'Unknown Member')}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 hover:bg-purple-100 text-purple-800 rounded transition"
                            title="Mark as late cancellation"
                          >
                            Late Cancel
                          </button>
                          <button
                            onClick={() => handleMarkNoShow(booking.id, booking.member?.name || 'Unknown Member')}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded transition"
                            title="Mark as no-show"
                          >
                            <UserX size={14} />
                            No-Show
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* No-Shows */}
              {noShowBookings.length > 0 && (
                <div>
                  <h3 className="text-base font-semibold text-gray-800 mb-2">
                    No-Shows ({noShowBookings.length})
                  </h3>
                  <div className="space-y-1">
                    {noShowBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded px-2 py-1.5 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <UserX size={14} className="text-orange-600" />
                          <span className="font-medium text-gray-800">{booking.member?.name || 'Unknown Member'}</span>
                          <span className="text-xs text-gray-400">
                            Booked: {new Date(booking.booked_at).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                        <button
                          onClick={() => handleUndoNoShow(booking.id, booking.member?.name || 'Unknown Member')}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition"
                          title="Mark as attended (undo no-show)"
                        >
                          <Undo2 size={14} />
                          Undo
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Late Cancellations */}
              {lateCancelBookings.length > 0 && (
                <div>
                  <h3 className="text-base font-semibold text-gray-800 mb-2">
                    Late Cancellations ({lateCancelBookings.length})
                  </h3>
                  <div className="space-y-1">
                    {lateCancelBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between bg-purple-50 border-2 border-purple-300 rounded px-2 py-1.5 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <X size={14} className="text-purple-600 font-bold" />
                          <span className="font-medium text-gray-800">{booking.member?.name || 'Unknown Member'}</span>
                          <span className="text-xs text-gray-400">
                            Booked: {new Date(booking.booked_at).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                        <button
                          onClick={() => handleUndoLateCancel(booking.id, booking.member?.name || 'Unknown Member')}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition"
                          title="Mark as attended (undo late cancellation)"
                        >
                          <Undo2 size={14} />
                          Undo
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Waitlist */}
              {waitlistBookings.length > 0 && (
                <div>
                  <h3 className="text-base font-semibold text-gray-800 mb-2">
                    Waitlist ({waitlistBookings.length})
                  </h3>
                  <div className="space-y-1">
                    {waitlistBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded px-2 py-1.5 text-sm"
                      >
                        <span className="font-medium text-gray-800">{booking.member?.name || 'Unknown Member'}</span>
                        <span className="text-xs text-gray-400">
                          Booked: {new Date(booking.booked_at).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cancel Session Button */}
              {session.status !== 'cancelled' && (
                <div className="pt-2 border-t">
                  <button
                    onClick={handleCancelSession}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition"
                  >
                    <Trash2 size={16} />
                    Cancel This Session
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    This will cancel all bookings and mark the session as cancelled.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-500">Session not found</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-3 bg-gray-50 rounded-b-lg flex justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100 text-gray-700 font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
