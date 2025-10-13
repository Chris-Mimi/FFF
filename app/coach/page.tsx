'use client';

import { useState, useEffect } from 'react';
import { LogOut, Plus, Edit2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import WODModal, { WODFormData } from '@/components/WODModal';

export default function CoachDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string; name: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [wods, setWods] = useState<Record<string, WODFormData[]>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<Date>(new Date());
  const [editingWOD, setEditingWOD] = useState<WODFormData | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const role = sessionStorage.getItem('userRole');
    const name = sessionStorage.getItem('userName');
    
    if (!role || role !== 'coach') {
      router.push('/');
      return;
    }
    
    setUser({ role, name: name || 'Coach' });
  }, [router]);

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/');
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getWeekDates = () => {
    const curr = new Date(selectedDate);
    const first = curr.getDate() - curr.getDay() + 1;
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(curr.setDate(first + i));
      dates.push(date);
    }
    return dates;
  };

  const previousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
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

  const handleSaveWOD = (wodData: WODFormData) => {
    const dateKey = formatDate(modalDate);

    setWods(prev => {
      const dayWODs = prev[dateKey] || [];

      if (editingWOD && editingWOD.id) {
        // Update existing WOD
        return {
          ...prev,
          [dateKey]: dayWODs.map(w => w.id === editingWOD.id ? { ...wodData, id: editingWOD.id } : w)
        };
      } else {
        // Create new WOD
        const newWOD = {
          ...wodData,
          id: Date.now().toString()
        };
        return {
          ...prev,
          [dateKey]: [...dayWODs, newWOD]
        };
      }
    });
  };

  const handleDeleteWOD = (dateKey: string, wodId: string) => {
    if (confirm('Are you sure you want to delete this WOD?')) {
      setWods(prev => ({
        ...prev,
        [dateKey]: prev[dateKey].filter(w => w.id !== wodId)
      }));
    }
  };

  if (!user) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  const weekDates = getWeekDates();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#208479] text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">The Forge - Coach Dashboard</h1>
            <p className="text-teal-100">Welcome, {user.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-[#1a6b62] hover:bg-teal-800 px-4 py-2 rounded-lg transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      {/* Week Navigation */}
      <div className="bg-white border-b p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button
            onClick={previousWeek}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
          >
            Previous Week
          </button>
          <h2 className="text-xl font-semibold">
            Week of {weekDates[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </h2>
          <button
            onClick={nextWeek}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
          >
            Next Week
          </button>
        </div>
      </div>

      {/* Weekly Calendar Grid */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDates.map((date, idx) => {
            const dateKey = formatDate(date);
            const dayWODs = wods[dateKey] || [];
            const isToday = formatDate(new Date()) === dateKey;
            
            return (
              <div
                key={idx}
                className={`bg-white rounded-lg shadow p-4 ${isToday ? 'ring-2 ring-[#208479]' : ''}`}
              >
                {/* Day Header */}
                <div className="mb-3">
                  <div className="font-bold text-lg">
                    {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                  </div>
                  <div className="text-sm text-gray-600">
                    {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
                
                {/* WODs for this day */}
                {dayWODs.map((wod: WODFormData) => (
                  <div key={wod.id} className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-sm">{wod.title}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditModal(wod)}
                          className="text-[#208479] hover:text-[#1a6b62] p-1"
                          title="Edit WOD"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteWOD(dateKey, wod.id!)}
                          className="text-gray-500 hover:text-red-600 p-1"
                          title="Delete WOD"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {wod.classTimes?.join(', ')}
                    </div>
                  </div>
                ))}
                
                {/* Add WOD Button */}
                <button
                  onClick={() => openCreateModal(date)}
                  className="w-full py-2 border-2 border-dashed border-gray-300 hover:border-[#208479] hover:bg-[#208479] hover:text-white rounded-lg text-gray-500 hover:text-white flex items-center justify-center gap-2 transition"
                >
                  <Plus size={18} />
                  Add WOD
                </button>
              </div>
            );
          })}
        </div>
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