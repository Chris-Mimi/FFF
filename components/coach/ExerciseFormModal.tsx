'use client';

import { X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Exercise {
  id: string;
  name: string;
  display_name?: string;
  category: string;
  subcategory?: string;
  description: string | null;
  video_url: string | null;
  tags: string[] | null;
  equipment?: string[];
  body_parts?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  is_warmup?: boolean;
  is_stretch?: boolean;
  search_terms?: string;
}

interface ExerciseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (exercise: Omit<Exercise, 'id'> & { id?: string }) => Promise<void>;
  editingExercise: Exercise | null;
}

export default function ExerciseFormModal({
  isOpen,
  onClose,
  onSave,
  editingExercise,
}: ExerciseFormModalProps) {
  const [form, setForm] = useState({
    name: '',
    display_name: '',
    category: '',
    subcategory: '',
    description: '',
    video_url: '',
    tags: '',
    equipment: '',
    body_parts: '',
    difficulty: undefined as 'beginner' | 'intermediate' | 'advanced' | undefined,
    is_warmup: false,
    is_stretch: false,
    search_terms: '',
  });

  useEffect(() => {
    if (editingExercise) {
      setForm({
        name: editingExercise.name,
        display_name: editingExercise.display_name || editingExercise.name,
        category: editingExercise.category,
        subcategory: editingExercise.subcategory || '',
        description: editingExercise.description || '',
        video_url: editingExercise.video_url || '',
        tags: editingExercise.tags?.join(', ') || '',
        equipment: editingExercise.equipment?.join(', ') || '',
        body_parts: editingExercise.body_parts?.join(', ') || '',
        difficulty: editingExercise.difficulty || undefined,
        is_warmup: editingExercise.is_warmup || false,
        is_stretch: editingExercise.is_stretch || false,
        search_terms: editingExercise.search_terms || '',
      });
    } else {
      setForm({
        name: '',
        display_name: '',
        category: '',
        subcategory: '',
        description: '',
        video_url: '',
        tags: '',
        equipment: '',
        body_parts: '',
        difficulty: undefined,
        is_warmup: false,
        is_stretch: false,
        search_terms: '',
      });
    }
  }, [editingExercise, isOpen]);

  const handleSubmit = async () => {
    if (!form.name || !form.category) {
      alert('Name and Category are required');
      return;
    }

    const exerciseData = {
      ...(editingExercise && { id: editingExercise.id }),
      name: form.name,
      display_name: form.display_name || form.name,
      category: form.category,
      subcategory: form.subcategory || null,
      description: form.description || null,
      video_url: form.video_url || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      equipment: form.equipment ? form.equipment.split(',').map(e => e.trim()).filter(Boolean) : [],
      body_parts: form.body_parts ? form.body_parts.split(',').map(b => b.trim()).filter(Boolean) : [],
      difficulty: form.difficulty || undefined,
      is_warmup: form.is_warmup,
      is_stretch: form.is_stretch,
      search_terms: form.search_terms || `${form.name} ${form.category} ${form.tags}`.toLowerCase(),
    };

    await onSave(exerciseData as Omit<Exercise, 'id'> & { id?: string });
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4' onClick={onClose}>
      <div className='bg-gray-500 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl' onClick={(e) => e.stopPropagation()}>
        <div className='flex justify-between items-center mb-4'>
          <h3 className='text-xl font-bold text-gray-100'>
            {editingExercise ? 'Edit Exercise' : 'Add Exercise'}
          </h3>
          <button onClick={onClose} className='p-1 hover:bg-gray-100 rounded'>
            <X size={24} />
          </button>
        </div>

        <div className='space-y-4'>
          {/* Name (Required) */}
          <div>
            <label className='block text-sm font-medium text-gray-100 mb-1'>
              Name <span className='text-red-400'>*</span>
            </label>
            <input
              type='text'
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500'
              placeholder='e.g., Barbell Clean'
            />
          </div>

          {/* Display Name */}
          <div>
            <label className='block text-sm font-medium text-gray-100 mb-1'>
              Display Name <span className='text-gray-400 text-xs'>(optional, defaults to Name)</span>
            </label>
            <input
              type='text'
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500'
              placeholder='e.g., Clean'
            />
          </div>

          {/* Category & Subcategory Row */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-100 mb-1'>
                Category <span className='text-red-400'>*</span>
              </label>
              <input
                type='text'
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500'
                placeholder='e.g., Olympic Lifting'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-100 mb-1'>
                Subcategory <span className='text-gray-400 text-xs'>(optional)</span>
              </label>
              <input
                type='text'
                value={form.subcategory}
                onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500'
                placeholder='e.g., Clean Variations'
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className='block text-sm font-medium text-gray-100 mb-1'>
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500'
              placeholder='Exercise description or cues'
            />
          </div>

          {/* Video/Media URL */}
          <div>
            <label className='block text-sm font-medium text-gray-100 mb-1'>
              Video/Photo URL <span className='text-gray-400 text-xs'>(YouTube, image link, etc.)</span>
            </label>
            <input
              type='text'
              value={form.video_url}
              onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500'
              placeholder='https://youtube.com/...'
            />
          </div>

          {/* Tags (comma-separated) */}
          <div>
            <label className='block text-sm font-medium text-gray-100 mb-1'>
              Tags <span className='text-gray-400 text-xs'>(comma-separated)</span>
            </label>
            <input
              type='text'
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500'
              placeholder='e.g., power, oly, technical'
            />
          </div>

          {/* Equipment (comma-separated) */}
          <div>
            <label className='block text-sm font-medium text-gray-100 mb-1'>
              Equipment <span className='text-gray-400 text-xs'>(comma-separated)</span>
            </label>
            <input
              type='text'
              value={form.equipment}
              onChange={(e) => setForm({ ...form, equipment: e.target.value })}
              className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500'
              placeholder='e.g., barbell, plates'
            />
          </div>

          {/* Body Parts (comma-separated) */}
          <div>
            <label className='block text-sm font-medium text-gray-100 mb-1'>
              Body Parts <span className='text-gray-400 text-xs'>(comma-separated)</span>
            </label>
            <input
              type='text'
              value={form.body_parts}
              onChange={(e) => setForm({ ...form, body_parts: e.target.value })}
              className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500'
              placeholder='e.g., legs, shoulders, core'
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className='block text-sm font-medium text-gray-100 mb-1'>
              Difficulty <span className='text-gray-400 text-xs'>(optional - can add later)</span>
            </label>
            <select
              value={form.difficulty || ''}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value === '' ? undefined : e.target.value as 'beginner' | 'intermediate' | 'advanced' })}
              className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 cursor-pointer'
            >
              <option value=''>Not specified</option>
              <option value='beginner'>Beginner</option>
              <option value='intermediate'>Intermediate</option>
              <option value='advanced'>Advanced</option>
            </select>
          </div>

          {/* Flags */}
          <div className='flex gap-6'>
            <label className='flex items-center gap-2 cursor-pointer'>
              <input
                type='checkbox'
                checked={form.is_warmup}
                onChange={(e) => setForm({ ...form, is_warmup: e.target.checked })}
                className='w-4 h-4 text-teal-500 focus:ring-teal-500 rounded'
              />
              <span className='text-sm text-gray-100'>Warmup Exercise</span>
            </label>
            <label className='flex items-center gap-2 cursor-pointer'>
              <input
                type='checkbox'
                checked={form.is_stretch}
                onChange={(e) => setForm({ ...form, is_stretch: e.target.checked })}
                className='w-4 h-4 text-teal-500 focus:ring-teal-500 rounded'
              />
              <span className='text-sm text-gray-100'>Stretch/Mobility</span>
            </label>
          </div>

          {/* Search Terms */}
          <div>
            <label className='block text-sm font-medium text-gray-100 mb-1'>
              Search Terms <span className='text-gray-400 text-xs'>(auto-generated if empty)</span>
            </label>
            <input
              type='text'
              value={form.search_terms}
              onChange={(e) => setForm({ ...form, search_terms: e.target.value })}
              className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500'
              placeholder='Additional searchable terms'
            />
          </div>

          {/* Action Buttons */}
          <div className='flex gap-3 justify-end pt-4'>
            <button
              onClick={onClose}
              className='px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-semibold transition'
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className='px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition'
            >
              {editingExercise ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
