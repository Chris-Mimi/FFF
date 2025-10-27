'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Users, Calendar, Clock, Trash2, Edit2 } from 'lucide-react';

interface SessionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  workoutDate: string;
  onSessionUpdated: () => void;
}

interface Booking {
  id: string;
  status: 'confirmed' | 'waitlist' | 'cancelled';
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
  const [newTime, setNewTime] = useState('');

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
      setNewTime(sessionData.time);

      // Fetch bookings with member details
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          booked_at,
          member:members (
            id,
            name,
            email
          )
        `)
        .eq('session_id', sessionId)
        .order('booked_at', { ascending: true });

      if (bookingsError) throw bookingsError;

      setBookings(bookingsData || []);
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

      // Update the WOD's class_times array with all session times
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
            .update({ class_times: classTimes })
            .eq('id', session.workout_id);
        }
      }

      setEditingTime(false);
      await fetchSessionDetails();
      onSessionUpdated();
      alert('Time updated successfully');
    } catch (error) {
      console.error('Error updating time:', error);
      alert('Failed to update time');
    }
  };

  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const waitlistBookings = bookings.filter(b => b.status === 'waitlist');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#208479] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={24} />
            <h2 className="text-xl font-bold">Manage Session</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition"
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
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar size={18} />
                  <span className="font-medium">Date:</span>
                  <span>{new Date(workoutDate).toLocaleDateString('en-GB', {
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
                      <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="px-2 py-1 border rounded"
                      />
                      <button
                        onClick={handleUpdateTime}
                        className="px-3 py-1 bg-[#208479] text-white rounded hover:bg-[#1a6b62] text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingTime(false);
                          setNewTime(session.time);
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
                        onClick={() => setEditingTime(true)}
                        className="p-1 text-gray-500 hover:text-[#208479]"
                        title="Change time"
                      >
                        <Edit2 size={16} />
                      </button>
                    </>
                  )}
                </div>

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
                        className="w-20 px-2 py-1 border rounded"
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
                        <span className="font-medium text-gray-800">{booking.member.name}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(booking.booked_at).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
                        <span className="font-medium text-gray-800">{booking.member.name}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(booking.booked_at).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cancel Session Button */}
              {session.status !== 'cancelled' && (
                <div className="pt-4 border-t">
                  <button
                    onClick={handleCancelSession}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                  >
                    <Trash2 size={18} />
                    Cancel This Session
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
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
        <div className="border-t p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
