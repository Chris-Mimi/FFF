'use client';

import { X } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { FocusTrap } from '@/components/ui/FocusTrap';

// Predefined category order
const EXERCISE_CATEGORY_ORDER = [
  'Pre-Workout',
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
}

interface ExerciseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (exercise: Omit<Exercise, 'id'> & { id?: string }) => Promise<void>;
  editingExercise: Exercise | null;
}

// Autocomplete Input Component (moved outside parent to prevent recreation)
const AutocompleteInput = ({
  value,
  onChange,
  suggestions,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder: string;
  label: string;
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get the current word being typed (after last comma)
  const getCurrentWord = () => {
    const parts = value.split(',');
    const currentPart = parts[parts.length - 1].trim();
    return currentPart;
  };

  // Calculate filtered suggestions dynamically (no state needed)
  const getFilteredSuggestions = () => {
    const currentWord = getCurrentWord();
    if (currentWord.length > 0) {
      return suggestions.filter(
        (s) =>
          s.toLowerCase().includes(currentWord.toLowerCase()) &&
          !value.split(',').map(v => v.trim()).includes(s)
      );
    }
    return [];
  };

  const filteredSuggestions = getFilteredSuggestions();

  const handleSuggestionClick = (suggestion: string) => {
    const parts = value.split(',').map(v => v.trim()).filter(Boolean);
    parts.pop(); // Remove the incomplete current word
    parts.push(suggestion);
    onChange(parts.join(', ') + ', ');
    setShowSuggestions(false);
    // Refocus input after selection
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Calculate if we should show suggestions based on new value
    const parts = newValue.split(',');
    const currentWord = parts[parts.length - 1].trim();

    if (currentWord.length > 0) {
      const hasMatches = suggestions.some(s =>
        s.toLowerCase().includes(currentWord.toLowerCase()) &&
        !newValue.split(',').map(v => v.trim()).includes(s)
      );
      setShowSuggestions(hasMatches);
    } else {
      setShowSuggestions(false);
    }
  };

  return (
    <div className='relative'>
      <label className='block text-sm font-medium text-gray-100 mb-1'>
        {label} <span className='text-gray-400 text-xs'>(comma-separated)</span>
      </label>
      <input
        ref={inputRef}
        type='text'
        value={value}
        onChange={handleInputChange}
        onFocus={() => {
          const currentWord = getCurrentWord();
          if (currentWord.length > 0 && filteredSuggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500'
        placeholder={placeholder}
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className='absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto'>
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type='button'
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur
                handleSuggestionClick(suggestion);
              }}
              className='w-full text-left px-3 py-2 hover:bg-teal-50 text-gray-900 text-sm border-b border-gray-200 last:border-b-0'
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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
  });

  // State for categories and subcategories mapping
  const [categorySubcategoryMap, setCategorySubcategoryMap] = useState<Record<string, string[]>>({});
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState('');
  const [customSubcategory, setCustomSubcategory] = useState('');

  // State for template selection
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templateSearchQuery, setTemplateSearchQuery] = useState<string>('');
  const [showTemplateDropdown, setShowTemplateDropdown] = useState<boolean>(false);
  const templateInputRef = useRef<HTMLInputElement>(null);

  // State for autocomplete suggestions
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<string[]>([]);
  const [availableBodyParts, setAvailableBodyParts] = useState<string[]>([]);

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

  // Fetch all exercises for template selection AND autocomplete suggestions
  useEffect(() => {
    const fetchAllExercises = async () => {
      const { data: exercises } = await supabase
        .from('exercises')
        .select('*')
        .order('name');

      if (exercises) {
        setAllExercises(exercises as Exercise[]);

        // Extract distinct values for autocomplete
        const tagsSet = new Set<string>();
        const equipmentSet = new Set<string>();
        const bodyPartsSet = new Set<string>();

        exercises.forEach((ex) => {
          if (ex.tags) ex.tags.forEach((tag: string) => tagsSet.add(tag));
          if (ex.equipment) ex.equipment.forEach((eq: string) => equipmentSet.add(eq));
          if (ex.body_parts) ex.body_parts.forEach((bp: string) => bodyPartsSet.add(bp));
        });

        setAvailableTags(Array.from(tagsSet).sort());
        setAvailableEquipment(Array.from(equipmentSet).sort());
        setAvailableBodyParts(Array.from(bodyPartsSet).sort());
      }
    };

    if (isOpen) {
      fetchAllExercises();
    }
  }, [isOpen]);

  // Get filtered exercises based on search query
  const getFilteredExercises = () => {
    if (!templateSearchQuery.trim()) {
      return allExercises;
    }
    const query = templateSearchQuery.toLowerCase();
    return allExercises.filter((exercise) => {
      const name = (exercise.display_name || exercise.name).toLowerCase();
      return name.includes(query);
    });
  };

  // Handler for template selection
  const handleTemplateSelect = (exerciseId: string, exerciseName?: string) => {
    setSelectedTemplate(exerciseId);
    setTemplateSearchQuery(exerciseName || '');
    setShowTemplateDropdown(false);

    if (!exerciseId) {
      // Clear form if "None" selected
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
      });
      return;
    }

    const template = allExercises.find(ex => ex.id === exerciseId);
    if (template) {
      setForm({
        name: '', // Keep name empty so user must enter new name
        display_name: '',
        category: template.category,
        subcategory: template.subcategory || '',
        description: template.description || '',
        video_url: template.video_url || '',
        tags: template.tags?.join(', ') || '',
        equipment: template.equipment?.join(', ') || '',
        body_parts: template.body_parts?.join(', ') || '',
        difficulty: template.difficulty || undefined,
        is_warmup: template.is_warmup || false,
        is_stretch: template.is_stretch || false,
      });
    }
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
      });
      setCustomCategory('');
      setCustomSubcategory('');
      setSelectedTemplate('');
      setTemplateSearchQuery('');
      setShowTemplateDropdown(false);
    }
  }, [editingExercise, isOpen, availableCategories, categorySubcategoryMap]);

  // Memoized onChange handlers to prevent AutocompleteInput recreation
  const handleTagsChange = useCallback((value: string) => {
    setForm(prev => ({ ...prev, tags: value }));
  }, []);

  const handleEquipmentChange = useCallback((value: string) => {
    setForm(prev => ({ ...prev, equipment: value }));
  }, []);

  const handleBodyPartsChange = useCallback((value: string) => {
    setForm(prev => ({ ...prev, body_parts: value }));
  }, []);

  const handleSubmit = async () => {
    // Use custom values if "Other" is selected
    const finalCategory = form.category === '__custom__' ? customCategory : form.category;
    const finalSubcategory = form.subcategory === '__custom__' ? customSubcategory : form.subcategory;

    if (!form.name || !finalCategory) {
      toast.warning('Name and Category are required');
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
    };

    await onSave(exerciseData as Omit<Exercise, 'id'> & { id?: string });
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <FocusTrap>
    <div className='fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4'>
      <div className='bg-gray-500 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl'>
        <div className='flex justify-between items-center mb-4'>
          <h3 className='text-xl font-bold text-gray-100'>
            {editingExercise ? 'Edit Exercise' : 'Add Exercise'}
          </h3>
          <button onClick={onClose} className='p-1 hover:bg-gray-100 rounded' aria-label='Close modal'>
            <X size={24} />
          </button>
        </div>

        <div className='space-y-4'>
          {/* Template Selector (only for new exercises) */}
          {!editingExercise && (
            <div className='bg-gray-600 rounded-lg p-4 border-2 border-teal-500'>
              <label className='block text-sm font-semibold text-gray-100 mb-2'>
                Start from template (optional)
              </label>
              <div className='relative'>
                <input
                  ref={templateInputRef}
                  type='text'
                  value={templateSearchQuery}
                  onChange={(e) => {
                    setTemplateSearchQuery(e.target.value);
                    setShowTemplateDropdown(true);
                  }}
                  onFocus={() => setShowTemplateDropdown(true)}
                  onBlur={() => setTimeout(() => setShowTemplateDropdown(false), 200)}
                  placeholder='Search for an exercise template...'
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500'
                />
                {showTemplateDropdown && (
                  <div className='absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto'>
                    <button
                      type='button'
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleTemplateSelect('', '');
                      }}
                      className='w-full text-left px-3 py-2 hover:bg-teal-50 text-gray-600 text-sm border-b border-gray-200 italic'
                    >
                      None - Start from scratch
                    </button>
                    {getFilteredExercises().map((exercise) => (
                      <button
                        key={exercise.id}
                        type='button'
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleTemplateSelect(exercise.id, exercise.display_name || exercise.name);
                        }}
                        className='w-full text-left px-3 py-2 hover:bg-teal-50 text-gray-900 text-sm border-b border-gray-200 last:border-b-0'
                      >
                        {exercise.display_name || exercise.name}
                      </button>
                    ))}
                    {getFilteredExercises().length === 0 && templateSearchQuery && (
                      <div className='px-3 py-2 text-gray-500 text-sm italic'>
                        No exercises found matching &quot;{templateSearchQuery}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedTemplate && (
                <p className='text-xs text-gray-500 mt-2'>
                  ✓ Template loaded. All fields copied except name. Enter a new name to create your exercise.
                </p>
              )}
            </div>
          )}

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
              required
              maxLength={100}
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
              maxLength={100}
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
              maxLength={1000}
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
              type='url'
              value={form.video_url}
              onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500'
              placeholder='https://youtube.com/...'
              maxLength={500}
            />
          </div>

          {/* Tags (comma-separated with autocomplete) */}
          <AutocompleteInput
            value={form.tags}
            onChange={handleTagsChange}
            suggestions={availableTags}
            placeholder='e.g., power, oly, technical'
            label='Tags'
          />

          {/* Equipment (comma-separated with autocomplete) */}
          <AutocompleteInput
            value={form.equipment}
            onChange={handleEquipmentChange}
            suggestions={availableEquipment}
            placeholder='e.g., barbell, plates'
            label='Equipment'
          />

          {/* Body Parts (comma-separated with autocomplete) */}
          <AutocompleteInput
            value={form.body_parts}
            onChange={handleBodyPartsChange}
            suggestions={availableBodyParts}
            placeholder='e.g., legs, shoulders, core'
            label='Body Parts'
          />

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
    </FocusTrap>
  );
}
