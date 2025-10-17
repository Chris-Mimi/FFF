'use client';

import { useState, useEffect } from 'react';
import { LogOut, Plus, Edit2, Trash2, Calendar, CalendarDays, Copy, BarChart3, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import WODModal, { WODFormData } from '@/components/WODModal';
import { supabase } from '@/lib/supabase';
import { getCurrentUser, signOut } from '@/lib/auth';

type ViewMode = 'weekly' | 'monthly';

export default function CoachDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string; name: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [wods, setWods] = useState<Record<string, WODFormData[]>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date>(new Date());
  const [editingWOD, setEditingWOD] = useState<WODFormData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [draggedWOD, setDraggedWOD] = useState<{ wod: WODFormData; sourceDate: string } | null>(null);
  const [copiedWOD, setCopiedWOD] = useState<WODFormData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        router.push('/login');
        return;
      }

      // Check if user is a coach
      const role = currentUser.user_metadata?.role || 'athlete';
      if (role !== 'coach') {
        router.push('/athlete');
        return;
      }

      setUser({
        role,
        name: currentUser.user_metadata?.full_name || currentUser.email || 'Coach'
      });
      setLoading(false);
      fetchWODs();
    };

    checkAuth();
  }, [router]);

  const fetchWODs = async () => {
    try {
      const { data, error } = await supabase
        .from('wods')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;

      // Group WODs by date
      const grouped: Record<string, WODFormData[]> = {};
      data?.forEach((wod: any) => {
        const dateKey = wod.date;
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push({
          id: wod.id,
          title: wod.title,
          track_id: wod.track_id,
          workout_type_id: wod.workout_type_id,
          classTimes: wod.class_times,
          maxCapacity: wod.max_capacity,
          date: wod.date,
          sections: wod.sections
        });
      });

      setWods(grouped);
    } catch (error) {
      console.error('Error fetching WODs:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get ISO week number
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const getWeekDates = () => {
    const curr = new Date(selectedDate);
    curr.setHours(0, 0, 0, 0); // Reset time to midnight
    const day = curr.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
    curr.setDate(curr.getDate() + diff);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(curr);
      dates.push(date);
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  };

  const getMonthDates = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1, 0, 0, 0, 0);

    // Start from Monday of the week containing the 1st
    const dayOfWeek = firstDay.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() + diff);

    const dates = [];
    const current = new Date(startDate);

    // Get 6 weeks (42 days) to cover full month
    for (let i = 0; i < 42; i++) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  const previousPeriod = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setSelectedDate(newDate);
  };

  const nextPeriod = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'weekly') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

  const openCreateModal = (date: Date) => {
    setModalDate(date);
    setEditingWOD(null);
    setIsModalOpen(true);
  };

  const openEditModal = (wod: WODFormData) => {
    setEditingWOD(wod);
    setModalDate(new Date(wod.date));
    setIsModalOpen(true);
  };

  const handleSaveWOD = async (wodData: WODFormData) => {
    const dateKey = formatDate(modalDate);

    try {
      if (editingWOD && editingWOD.id) {
        // Update existing WOD
        const { error } = await supabase
          .from('wods')
          .update({
            title: wodData.title,
            track_id: wodData.track_id || null,
            workout_type_id: wodData.workout_type_id || null,
            class_times: wodData.classTimes,
            max_capacity: wodData.maxCapacity,
            date: dateKey,
            sections: wodData.sections,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingWOD.id);

        if (error) throw error;
      } else {
        // Create new WOD
        const { error } = await supabase
          .from('wods')
          .insert([{
            title: wodData.title,
            track_id: wodData.track_id || null,
            workout_type_id: wodData.workout_type_id || null,
            class_times: wodData.classTimes,
            max_capacity: wodData.maxCapacity,
            date: dateKey,
            sections: wodData.sections
          }]);

        if (error) throw error;
      }

      // Refresh WODs from database
      await fetchWODs();
    } catch (error) {
      console.error('Error saving WOD:', error);
      alert('Error saving WOD. Please try again.');
    }
  };

  const handleDeleteWOD = async (dateKey: string, wodId: string) => {
    if (!confirm('Are you sure you want to delete this WOD?')) return;

    try {
      const { error } = await supabase
        .from('wods')
        .delete()
        .eq('id', wodId);

      if (error) throw error;

      // Refresh WODs from database
      await fetchWODs();
    } catch (error) {
      console.error('Error deleting WOD:', error);
      alert('Error deleting WOD. Please try again.');
    }
  };

  const handleCopyWOD = async (wod: WODFormData, targetDate: Date) => {
    const dateKey = formatDate(targetDate);

    try {
      const { error } = await supabase
        .from('wods')
        .insert([{
          title: wod.title,
          track_id: wod.track_id || null,
          workout_type_id: wod.workout_type_id || null,
          class_times: wod.classTimes,
          max_capacity: wod.maxCapacity,
          date: dateKey,
          sections: wod.sections
        }]);

      if (error) throw error;

      // Refresh WODs from database
      await fetchWODs();
    } catch (error) {
      console.error('Error copying WOD:', error);
      alert('Error copying WOD. Please try again.');
    }
  };

  const handleDragStart = (e: React.DragEvent, wod: WODFormData, sourceDate: string) => {
    setDraggedWOD({ wod, sourceDate });
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (!draggedWOD) return;

    const targetDateKey = formatDate(targetDate);
    handleCopyWOD(draggedWOD.wod, targetDate);
    setDraggedWOD(null);
  };

  const handleCopyToClipboard = (wod: WODFormData) => {
    setCopiedWOD(wod);
  };

  const handlePasteFromClipboard = (targetDate: Date) => {
    if (!copiedWOD) return;
    handleCopyWOD(copiedWOD, targetDate);
    setCopiedWOD(null); // Clear clipboard after pasting
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#208479] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const displayDates = viewMode === 'weekly' ? getWeekDates() : getMonthDates();
  const weekDates = getWeekDates();

  return (
    <div className="min-h-screen bg-gray-200">
      {/* Header */}
      <header className="bg-[#208479] text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">The Forge - Coach Dashboard</h1>
            <p className="text-teal-100">Welcome, {user.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/coach/athletes')}
              className="flex items-center gap-2 bg-[#1a6b62] hover:bg-teal-800 px-4 py-2 rounded-lg transition"
            >
              <Users size={18} />
              Athletes
            </button>
            <button
              onClick={() => router.push('/coach/analysis')}
              className="flex items-center gap-2 bg-[#1a6b62] hover:bg-teal-800 px-4 py-2 rounded-lg transition"
            >
              <BarChart3 size={18} />
              Analysis
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-[#1a6b62] hover:bg-teal-800 px-4 py-2 rounded-lg transition"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* View Mode Toggle & Navigation */}
      <div className="bg-white border-b p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* View Mode Toggle */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-lg border border-gray-300 p-1 bg-gray-50">
              <button
                onClick={() => setViewMode('weekly')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition ${
                  viewMode === 'weekly'
                    ? 'bg-[#208479] text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <CalendarDays size={18} />
                Weekly
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition ${
                  viewMode === 'monthly'
                    ? 'bg-[#208479] text-white'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <Calendar size={18} />
                Monthly
              </button>
            </div>
          </div>

          {/* Period Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={previousPeriod}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-900 font-medium"
            >
              {viewMode === 'weekly' ? 'Previous Week' : 'Previous Month'}
            </button>
            <h2 className="text-xl font-semibold text-gray-900">
              {viewMode === 'weekly' ? (
                <>
                  Week {getWeekNumber(weekDates[0])} - {weekDates[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </>
              ) : (
                <>
                  {selectedDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </>
              )}
            </h2>
            <button
              onClick={nextPeriod}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-900 font-medium"
            >
              {viewMode === 'weekly' ? 'Next Week' : 'Next Month'}
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className={`${viewMode === 'weekly' ? 'max-w-[1600px]' : 'max-w-7xl'} mx-auto p-4`}>
        {viewMode === 'monthly' && (
          /* Month View with Week Numbers */
          <div>
            {/* Weekday Headers */}
            <div className="grid grid-cols-8 gap-2 mb-2">
              <div className="text-center text-xs font-semibold text-gray-600 py-2">Week</div>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">{day}</div>
              ))}
            </div>

            {/* Month Grid - 6 rows of 7 days */}
            {Array.from({ length: 6 }).map((_, weekIdx) => {
              const weekStart = weekIdx * 7;
              const weekDates = displayDates.slice(weekStart, weekStart + 7);
              const weekNumber = getWeekNumber(weekDates[0]);

              return (
                <div key={weekIdx} className="grid grid-cols-8 gap-2 mb-2">
                  {/* Week Number */}
                  <div className="flex items-center justify-center bg-gray-100 rounded text-xs font-semibold text-gray-700">
                    {weekNumber}
                  </div>

                  {/* Days in week */}
                  {weekDates.map((date, dayIdx) => {
                    const dateKey = formatDate(date);
                    const dayWODs = wods[dateKey] || [];
                    const isToday = formatDate(new Date()) === dateKey;
                    const isCurrentMonth = date.getMonth() === selectedDate.getMonth();

                    return (
                      <div
                        key={dayIdx}
                        className={`bg-white rounded-lg shadow p-2 min-h-[100px] relative ${
                          isToday ? 'ring-2 ring-[#208479]' : ''
                        } ${!isCurrentMonth ? 'opacity-40' : ''}`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, date)}
                      >
                        {/* Day Number and Paste Button */}
                        <div className="flex items-center justify-between mb-1">
                          <div className={`text-sm font-semibold ${isCurrentMonth ? 'text-gray-900' : 'text-gray-500'}`}>
                            {date.getDate()}
                          </div>
                          {copiedWOD && (
                            <button
                              onClick={() => handlePasteFromClipboard(date)}
                              className="text-[10px] px-1 py-0.5 bg-[#208479] text-white rounded hover:bg-[#1a6b62] transition"
                              title="Paste WOD"
                            >
                              Paste
                            </button>
                          )}
                        </div>

                        {/* WODs */}
                        {dayWODs.slice(0, 2).map((wod: WODFormData) => (
                          <div
                            key={wod.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, wod, dateKey)}
                            className="mb-1 p-1 bg-gray-50 rounded text-xs hover:bg-gray-200 cursor-move transition group relative"
                            title="Drag to copy"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <div className="font-semibold text-gray-900 truncate flex-1 cursor-pointer" onClick={() => openEditModal(wod)}>
                                {wod.title}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyToClipboard(wod);
                                }}
                                className="opacity-0 group-hover:opacity-100 text-[#208479] hover:text-[#1a6b62] p-0.5"
                                title="Copy WOD"
                              >
                                <Copy size={10} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {dayWODs.length > 2 && (
                          <div
                            className="text-xs text-gray-600 hover:text-[#208479] cursor-pointer"
                            onClick={() => openEditModal(dayWODs[2])}
                            title="Click to see more WODs"
                          >
                            +{dayWODs.length - 2} more
                          </div>
                        )}

                        {/* Add Button */}
                        <button
                          onClick={() => openCreateModal(date)}
                          className="w-full mt-1 py-1 text-xs text-gray-600 hover:text-[#208479] transition"
                        >
                          <Plus size={12} className="inline" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {viewMode === 'weekly' && (
          /* Week View */
          <div>
            {/* Week Number Banner */}
            <div className="bg-[#208479] text-white px-4 py-2 rounded-t-lg mb-4">
              <div className="text-sm font-semibold">Week {getWeekNumber(displayDates[0])}</div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
              {displayDates.map((date, idx) => {
                const dateKey = formatDate(date);
                const dayWODs = wods[dateKey] || [];
                const isToday = formatDate(new Date()) === dateKey;

                return (
                  <div
                    key={idx}
                    className={`bg-white rounded-lg shadow p-4 flex-1 min-w-[180px] ${isToday ? 'ring-2 ring-[#208479]' : ''}`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, date)}
                  >
                    {/* Day Header */}
                    <div className="mb-3 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-lg text-gray-900">
                          {date.toLocaleDateString('en-GB', { weekday: 'long' })}
                        </div>
                        <div className="text-sm text-gray-700">
                          {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                      {copiedWOD && (
                        <button
                          onClick={() => handlePasteFromClipboard(date)}
                          className="text-xs px-2 py-1 bg-[#208479] text-white rounded hover:bg-[#1a6b62] transition"
                          title="Paste WOD"
                        >
                          Paste
                        </button>
                      )}
                    </div>

                    {/* WODs for this day */}
                    {dayWODs.map((wod: WODFormData) => (
                      <div
                        key={wod.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, wod, dateKey)}
                        className="mb-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-move group relative"
                        title="Drag to copy or click to edit"
                      >
                        <div className="pr-8">
                          <span
                            className="font-bold text-sm text-gray-900 cursor-pointer block mb-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(wod);
                            }}
                          >
                            {wod.title}
                          </span>
                          <div className="text-xs text-gray-700">
                            {wod.classTimes?.join(', ')}
                          </div>
                        </div>
                        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyToClipboard(wod);
                            }}
                            className="text-[#208479] hover:text-[#1a6b62] p-1 bg-white rounded shadow-sm"
                            title="Copy WOD"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWOD(dateKey, wod.id!);
                            }}
                            className="text-gray-500 hover:text-red-600 p-1 bg-white rounded shadow-sm"
                            title="Delete WOD"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add WOD Button */}
                    <button
                      onClick={() => openCreateModal(date)}
                      className="w-full py-2 border-2 border-dashed border-gray-300 hover:border-[#208479] hover:bg-[#208479] hover:text-white rounded-lg text-gray-700 hover:text-white flex items-center justify-center gap-2 transition font-medium"
                    >
                      <Plus size={18} />
                      Add WOD
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* WOD Modal */}
      <WODModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveWOD}
        date={modalDate}
        editingWOD={editingWOD}
      />
    </div>
  );
}