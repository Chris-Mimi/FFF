'use client';

import { signOut } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Calendar, Edit2, LogOut, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface SessionTemplate {
  id: string;
  day_of_week: number;
  time: string;
  workout_type: string;
  default_capacity: number;
  active: boolean;
  created_at: string;
}

interface WorkoutTitle {
  id: string;
  name: string;
  display_order: number;
  active: boolean;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' }
];

export default function CoachSchedulePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [workoutTitles, setWorkoutTitles] = useState<WorkoutTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SessionTemplate | null>(null);
  const [formData, setFormData] = useState({
    day_of_week: 1,
    time: '18:00',
    workout_type: '',
    default_capacity: 12,
    active: true
  });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<string | null>(null);

  // Workout Title Modal State
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [editingTitle, setEditingTitle] = useState<WorkoutTitle | null>(null);
  const [titleFormData, setTitleFormData] = useState({
    name: '',
    display_order: 1,
    active: true
  });
  const [savingTitle, setSavingTitle] = useState(false);

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      }
    };
    checkAuth();
    fetchTemplates();
    fetchWorkoutTitles();
  }, [router]);

  const fetchWorkoutTitles = async () => {
    try {
      const { data, error } = await supabase
        .from('workout_titles')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setWorkoutTitles(data || []);
    } catch (error) {
      console.error('Error fetching workout titles:', error);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('session_templates')
        .select('*')
        .order('day_of_week', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (template?: SessionTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        day_of_week: template.day_of_week,
        time: template.time,
        workout_type: template.workout_type,
        default_capacity: template.default_capacity,
        active: template.active
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        day_of_week: 1,
        time: '18:00',
        workout_type: workoutTitles.length > 0 ? workoutTitles[0].name : 'WOD',
        default_capacity: 12,
        active: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingTemplate) {
        // Update existing template
        const { error } = await supabase
          .from('session_templates')
          .update({
            day_of_week: formData.day_of_week,
            time: formData.time,
            workout_type: formData.workout_type,
            default_capacity: formData.default_capacity,
            active: formData.active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTemplate.id);

        if (error) throw error;
      } else {
        // Create new template
        const { error } = await supabase
          .from('session_templates')
          .insert({
            day_of_week: formData.day_of_week,
            time: formData.time,
            workout_type: formData.workout_type,
            default_capacity: formData.default_capacity,
            active: formData.active
          });

        if (error) throw error;
      }

      await fetchTemplates();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('session_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template. Please try again.');
    }
  };

  const handleToggleActive = async (template: SessionTemplate) => {
    try {
      const { error } = await supabase
        .from('session_templates')
        .update({
          active: !template.active,
          updated_at: new Date().toISOString()
        })
        .eq('id', template.id);

      if (error) throw error;
      await fetchTemplates();
    } catch (error) {
      console.error('Error toggling template:', error);
      alert('Failed to update template. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleGenerateWeek = async () => {
    if (templates.filter(t => t.active).length === 0) {
      alert('No active templates found. Please create and activate at least one template first.');
      return;
    }

    setGenerating(true);
    setGenerationResult(null);

    try {
      const response = await fetch('/api/sessions/generate-weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Uses default (next Monday)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate sessions');
      }

      setGenerationResult(data.message);
      setTimeout(() => setGenerationResult(null), 5000);
    } catch (error) {
      console.error('Error generating weekly sessions:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate sessions. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const getDayLabel = (dayNumber: number) => {
    return DAYS_OF_WEEK.find(d => d.value === dayNumber)?.label || 'Unknown';
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5); // Convert HH:MM:SS to HH:MM
  };

  // Workout Title CRUD Operations
  const handleOpenTitleModal = (title?: WorkoutTitle) => {
    if (title) {
      setEditingTitle(title);
      setTitleFormData({
        name: title.name,
        display_order: title.display_order,
        active: title.active
      });
    } else {
      setEditingTitle(null);
      const maxOrder = workoutTitles.length > 0
        ? Math.max(...workoutTitles.map(t => t.display_order))
        : 0;
      setTitleFormData({
        name: '',
        display_order: maxOrder + 1,
        active: true
      });
    }
    setShowTitleModal(true);
  };

  const handleCloseTitleModal = () => {
    setShowTitleModal(false);
    setEditingTitle(null);
  };

  const handleSaveTitle = async () => {
    if (!titleFormData.name.trim()) {
      alert('Please enter a workout title name.');
      return;
    }

    setSavingTitle(true);
    try {
      if (editingTitle) {
        // Update existing title
        const { error } = await supabase
          .from('workout_titles')
          .update({
            name: titleFormData.name.trim(),
            display_order: titleFormData.display_order,
            active: titleFormData.active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTitle.id);

        if (error) throw error;
      } else {
        // Create new title
        const { error } = await supabase
          .from('workout_titles')
          .insert({
            name: titleFormData.name.trim(),
            display_order: titleFormData.display_order,
            active: titleFormData.active
          });

        if (error) throw error;
      }

      await fetchWorkoutTitles();
      handleCloseTitleModal();
    } catch (error) {
      console.error('Error saving workout title:', error);
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        alert('A workout title with this name already exists.');
      } else {
        alert('Failed to save workout title. Please try again.');
      }
    } finally {
      setSavingTitle(false);
    }
  };

  const handleDeleteTitle = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workout title? This may affect existing session templates.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('workout_titles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchWorkoutTitles();
    } catch (error) {
      console.error('Error deleting workout title:', error);
      alert('Failed to delete workout title. Please try again.');
    }
  };

  const handleToggleTitleActive = async (title: WorkoutTitle) => {
    try {
      const { error } = await supabase
        .from('workout_titles')
        .update({
          active: !title.active,
          updated_at: new Date().toISOString()
        })
        .eq('id', title.id);

      if (error) throw error;
      await fetchWorkoutTitles();
    } catch (error) {
      console.error('Error toggling workout title:', error);
      alert('Failed to update workout title. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Weekly Schedule Templates</h1>
              <p className="text-gray-400 text-sm mt-1">Define your recurring weekly class schedule</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleOpenModal()}
                className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors duration-200"
              >
                <Plus size={18} />
                Add Template
              </button>
              <button
                onClick={handleGenerateWeek}
                disabled={generating || templates.filter(t => t.active).length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
                title="Generate sessions for next week from active templates"
              >
                <Calendar size={18} />
                {generating ? 'Generating...' : 'Generate Next Week'}
              </button>
              <button
                onClick={() => router.push('/coach')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
              >
                Back to Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
          {generationResult && (
            <div className="mt-3 px-4 py-2 bg-teal-500/20 border border-teal-500 text-teal-300 rounded-lg text-sm inline-block">
              {generationResult}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 pb-12">

        {/* Templates List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-500 border-r-transparent"></div>
            <p className="text-gray-400 mt-4">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
            <Calendar size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg mb-2">No schedule templates yet</p>
            <p className="text-gray-500 text-sm">Create your first template to define your weekly class schedule</p>
          </div>
        ) : (
          <div className="space-y-6">
            {DAYS_OF_WEEK.map((day) => {
              const dayTemplates = templates.filter(t => t.day_of_week === day.value);
              if (dayTemplates.length === 0) return null;

              return (
                <div key={day.value}>
                  {/* Day Header */}
                  <h2 className="text-lg font-bold text-teal-400 mb-3">{day.label}</h2>

                  {/* Templates Grid - 5 columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {dayTemplates.map((template) => (
                      <div
                        key={template.id}
                        className={`bg-gray-800 rounded-lg p-4 border ${
                          template.active ? 'border-gray-700' : 'border-gray-800 opacity-60'
                        } hover:border-gray-600 transition-colors duration-200`}
                      >
                        <div className="flex gap-3">
                          {/* Left side - Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold text-white">
                                {formatTime(template.time)} <span className="text-sm text-gray-200">({template.default_capacity})</span>
                              </h3>
                              {!template.active && (
                                <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded-full">
                                  Inactive
                                </span>
                              )}
                            </div>

                            <div className="space-y-1 text-sm">
                              <div>
                                <span className="text-white font-medium">{template.workout_type}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right side - Actions */}
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handleToggleActive(template)}
                              className={`w-14 h-7 rounded-full transition-colors duration-200 flex items-center px-1 ${
                                template.active
                                  ? 'bg-teal-500/20 hover:bg-teal-500/30 justify-end'
                                  : 'bg-gray-700 hover:bg-gray-600 justify-start'
                              }`}
                              title={template.active ? 'Deactivate' : 'Activate'}
                            >
                              <div className={`w-5 h-5 rounded-full transition-colors duration-200 ${
                                template.active ? 'bg-teal-500' : 'bg-gray-400'
                              }`} />
                            </button>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleOpenModal(template)}
                                className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors duration-200"
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(template.id)}
                                className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors duration-200"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Workout Titles Section */}
        <div className="mt-12 border-t border-gray-700 pt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Workout Titles</h2>
              <p className="text-gray-400 text-sm mt-1">Manage available workout title options for session templates</p>
            </div>
            <button
              onClick={() => handleOpenTitleModal()}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors duration-200"
            >
              <Plus size={18} />
              Add Title
            </button>
          </div>

          {workoutTitles.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
              <p className="text-gray-400 text-lg mb-2">No workout titles yet</p>
              <p className="text-gray-500 text-sm">Create your first workout title to use in session templates</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {workoutTitles.map((title) => (
                <div
                  key={title.id}
                  className={`bg-gray-800 rounded-lg p-4 border ${
                    title.active ? 'border-gray-700' : 'border-gray-800 opacity-60'
                  } hover:border-gray-600 transition-colors duration-200`}
                >
                  <div className="flex gap-3">
                    {/* Left side - Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white">
                          {title.name}
                        </h3>
                        {!title.active && (
                          <span className="px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400">
                        Order: {title.display_order}
                      </div>
                    </div>

                    {/* Right side - Actions */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleToggleTitleActive(title)}
                        className={`w-14 h-7 rounded-full transition-colors duration-200 flex items-center px-1 ${
                          title.active
                            ? 'bg-teal-500/20 hover:bg-teal-500/30 justify-end'
                            : 'bg-gray-700 hover:bg-gray-600 justify-start'
                        }`}
                        title={title.active ? 'Deactivate' : 'Activate'}
                      >
                        <div className={`w-5 h-5 rounded-full transition-colors duration-200 ${
                          title.active ? 'bg-teal-500' : 'bg-gray-400'
                        }`} />
                      </button>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenTitleModal(title)}
                          className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors duration-200"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteTitle(title.id)}
                          className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors duration-200"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Session Template Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Day of Week */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Day of Week
                </label>
                <select
                  value={formData.day_of_week}
                  onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Workout Type */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Workout Type
                </label>
                <select
                  value={formData.workout_type}
                  onChange={(e) => setFormData({ ...formData, workout_type: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {workoutTitles.filter(wt => wt.active).map((wt) => (
                    <option key={wt.id} value={wt.name}>
                      {wt.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Default Capacity */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Default Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.default_capacity}
                  onChange={(e) => setFormData({ ...formData, default_capacity: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-teal-500 bg-gray-700 border-gray-600 rounded focus:ring-teal-500"
                />
                <label htmlFor="active" className="text-sm font-medium text-gray-300">
                  Active (include in weekly generation)
                </label>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-700">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
              >
                {saving ? 'Saving...' : editingTemplate ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workout Title Modal */}
      {showTitleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">
                {editingTitle ? 'Edit Workout Title' : 'Create Workout Title'}
              </h2>
              <button
                onClick={handleCloseTitleModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title Name
                </label>
                <input
                  type="text"
                  value={titleFormData.name}
                  onChange={(e) => setTitleFormData({ ...titleFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g., WOD, Foundations, Kids"
                />
              </div>

              {/* Display Order */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  min="1"
                  value={titleFormData.display_order}
                  onChange={(e) => setTitleFormData({ ...titleFormData, display_order: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="titleActive"
                  checked={titleFormData.active}
                  onChange={(e) => setTitleFormData({ ...titleFormData, active: e.target.checked })}
                  className="w-4 h-4 text-teal-500 bg-gray-700 border-gray-600 rounded focus:ring-teal-500"
                />
                <label htmlFor="titleActive" className="text-sm font-medium text-gray-300">
                  Active (available for use in session templates)
                </label>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-700">
              <button
                onClick={handleCloseTitleModal}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTitle}
                disabled={savingTitle}
                className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
              >
                {savingTitle ? 'Saving...' : editingTitle ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
