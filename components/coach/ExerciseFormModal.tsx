'use client';

import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Predefined category order
const EXERCISE_CATEGORY_ORDER = [
  'Warm-up & Mobility',
  'Olympic Lifting & Barbell Movements',
  'Compound Exercises',
  'Gymnastics & Bodyweight',
  'Core, Abs & Isometric Holds',
  'Cardio & Conditioning',
  'Specialty',
  'Recovery & Stretching',
];

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

  // State for categories and subcategories mapping
  const [categorySubcategoryMap, setCategorySubcategoryMap] = useState<Record<string, string[]>>({});
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState('');
  const [customSubcategory, setCustomSubcategory] = useState('');

  // Add custom subcategory to dropdown
  const addCustomSubcategory = () => {
    if (!customSubcategory.trim() || !form.category || form.category === '__custom__') return;

    const trimmedSubcat = customSubcategory.trim();

    // Add to the category's subcategory list
    const updatedMap = {
      ...categorySubcategoryMap,
      [form.category]: [...(categorySubcategoryMap[form.category] || []), trimmedSubcat].sort(),
    };
    setCategorySubcategoryMap(updatedMap);

    // Persist custom subcategories to localStorage (load existing, add new, save)
    try {
      const stored = localStorage.getItem('exercise-custom-subcategories');
      const customSubcats: Record<string, string[]> = stored ? JSON.parse(stored) : {};

      // Add the new subcategory to custom list
      if (!customSubcats[form.category]) {
        customSubcats[form.category] = [];
      }
      if (!customSubcats[form.category].includes(trimmedSubcat)) {
        customSubcats[form.category].push(trimmedSubcat);
        customSubcats[form.category].sort();
      }

      localStorage.setItem('exercise-custom-subcategories', JSON.stringify(customSubcats));
    } catch (e) {
      console.error('Failed to save custom subcategories to localStorage', e);
    }

    // Set the form to use this new subcategory
    setForm({ ...form, subcategory: trimmedSubcat });
    setCustomSubcategory('');
  };

  // Fetch categories and subcategories from exercises
  useEffect(() => {
    const fetchCategoriesAndSubcategories = async () => {
      const { data: exercises } = await supabase
        .from('exercises')
        .select('category, subcategory');

      if (exercises) {
        // Build category -> subcategories mapping
        const map: Record<string, Set<string>> = {};

        exercises.forEach((ex) => {
          if (ex.category) {
            if (!map[ex.category]) {
              map[ex.category] = new Set();
            }
            if (ex.subcategory) {
              map[ex.category].add(ex.subcategory);
            }
          }
        });

        // Load custom subcategories from localStorage
        let customSubcats: Record<string, string[]> = {};
        try {
          const stored = localStorage.getItem('exercise-custom-subcategories');
          if (stored) {
            customSubcats = JSON.parse(stored);
          }
        } catch (e) {
          console.error('Failed to load custom subcategories from localStorage', e);
        }

        // Merge custom subcategories with database subcategories
        Object.keys(customSubcats).forEach((cat) => {
          if (!map[cat]) {
            map[cat] = new Set();
          }
          customSubcats[cat].forEach((subcat) => {
            map[cat].add(subcat);
          });
        });

        // Convert Sets to sorted arrays
        const finalMap: Record<string, string[]> = {};
        Object.keys(map).forEach((cat) => {
          finalMap[cat] = Array.from(map[cat]).sort();
        });

        setCategorySubcategoryMap(finalMap);

        // Sort categories by predefined order
        const allCategories = Object.keys(finalMap);
        const sortedCategories = [
          ...EXERCISE_CATEGORY_ORDER.filter(cat => allCategories.includes(cat)),
          ...allCategories.filter(cat => !EXERCISE_CATEGORY_ORDER.includes(cat)).sort()
        ];
        setAvailableCategories(sortedCategories);
      }
    };

    if (isOpen) {
      fetchCategoriesAndSubcategories();
    }
  }, [isOpen]);

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
      // Check if category/subcategory are custom (not in lists)
      if (editingExercise.category && !availableCategories.includes(editingExercise.category)) {
        setCustomCategory(editingExercise.category);
      }
      if (editingExercise.subcategory && categorySubcategoryMap[editingExercise.category]?.length > 0 && !categorySubcategoryMap[editingExercise.category].includes(editingExercise.subcategory)) {
        setCustomSubcategory(editingExercise.subcategory);
      }
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
      setCustomCategory('');
      setCustomSubcategory('');
    }
  }, [editingExercise, isOpen, availableCategories, categorySubcategoryMap]);

  const handleSubmit = async () => {
    // Use custom values if "Other" is selected
    const finalCategory = form.category === '__custom__' ? customCategory : form.category;
    const finalSubcategory = form.subcategory === '__custom__' ? customSubcategory : form.subcategory;

    if (!form.name || !finalCategory) {
      alert('Name and Category are required');
      return;
    }

    const exerciseData = {
      ...(editingExercise && { id: editingExercise.id }),
      name: form.name,
      display_name: form.display_name || form.name,
      category: finalCategory,
      subcategory: finalSubcategory || null,
      description: form.description || null,
      video_url: form.video_url || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      equipment: form.equipment ? form.equipment.split(',').map(e => e.trim()).filter(Boolean) : [],
      body_parts: form.body_parts ? form.body_parts.split(',').map(b => b.trim()).filter(Boolean) : [],
      difficulty: form.difficulty || undefined,
      is_warmup: form.is_warmup,
      is_stretch: form.is_stretch,
      search_terms: form.search_terms || `${form.name} ${finalCategory} ${form.tags}`.toLowerCase(),
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
              <select
                value={form.category}
                onChange={(e) => {
                  setForm({ ...form, category: e.target.value, subcategory: '' });
                  if (e.target.value !== '__custom__') {
                    setCustomCategory('');
                  }
                }}
                className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 cursor-pointer'
              >
                <option value=''>Select a category...</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value='__custom__'>Other (custom)</option>
              </select>
              {form.category === '__custom__' && (
                <input
                  type='text'
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 mt-2'
                  placeholder='Enter custom category'
                />
              )}
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-100 mb-1'>
                Subcategory <span className='text-gray-400 text-xs'>(optional)</span>
              </label>
              <select
                value={form.subcategory}
                onChange={(e) => {
                  setForm({ ...form, subcategory: e.target.value });
                  if (e.target.value !== '__custom__') {
                    setCustomSubcategory('');
                  }
                }}
                className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 cursor-pointer'
                disabled={!form.category || form.category === '__custom__'}
              >
                <option value=''>None</option>
                {form.category && form.category !== '__custom__' && categorySubcategoryMap[form.category]?.map((subcat) => (
                  <option key={subcat} value={subcat}>
                    {subcat}
                  </option>
                ))}
                {form.category && form.category !== '__custom__' && (
                  <option value='__custom__'>Other (custom)</option>
                )}
              </select>
              {form.subcategory === '__custom__' && (
                <div className='flex gap-2 mt-2'>
                  <input
                    type='text'
                    value={customSubcategory}
                    onChange={(e) => setCustomSubcategory(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomSubcategory();
                      }
                    }}
                    className='flex-1 px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500'
                    placeholder='Enter custom subcategory'
                  />
                  <button
                    type='button'
                    onClick={addCustomSubcategory}
                    className='px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition'
                  >
                    Add
                  </button>
                </div>
              )}
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
