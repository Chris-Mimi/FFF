'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import type { PatternWithExercises } from '@/types/planner';

interface PatternManagerProps {
  patterns: PatternWithExercises[];
  onCreatePattern: (name: string, color: string) => Promise<void>;
  onUpdatePattern: (id: string, updates: { name?: string; color?: string; staleness_yellow?: number; staleness_red?: number }) => Promise<void>;
  onDeletePattern: (id: string) => Promise<void>;
  onOpenExercisePicker: (patternId: string) => void;
  onRemoveExercise: (patternId: string, exerciseId: string) => Promise<void>;
}

const PATTERN_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
];

export default function PatternManager({
  patterns,
  onCreatePattern,
  onUpdatePattern,
  onDeletePattern,
  onOpenExercisePicker,
  onRemoveExercise,
}: PatternManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PATTERN_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [settingsYellow, setSettingsYellow] = useState(3);
  const [settingsRed, setSettingsRed] = useState(6);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    await onCreatePattern(newName.trim(), newColor);
    setNewName('');
    setNewColor(PATTERN_COLORS[(patterns.length + 1) % PATTERN_COLORS.length]);
    setCreating(false);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await onUpdatePattern(id, { name: editName.trim() });
    setEditingId(null);
  };

  const handleSaveSettings = async (id: string) => {
    await onUpdatePattern(id, {
      staleness_yellow: settingsYellow,
      staleness_red: settingsRed,
    });
    setSettingsId(null);
  };

  return (
    <div className='bg-white rounded-lg shadow-sm border'>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='w-full flex items-center justify-between p-3 md:p-4 hover:bg-gray-50 transition'
      >
        <h3 className='text-sm md:text-base font-semibold text-gray-800'>
          Movement Patterns ({patterns.length})
        </h3>
        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>

      {isOpen && (
        <div className='px-3 pb-3 md:px-4 md:pb-4 space-y-3'>
          {/* Create new pattern */}
          <div className='flex gap-2 items-center'>
            <div
              className='w-6 h-6 rounded-full cursor-pointer border-2 border-gray-300 shrink-0'
              style={{ backgroundColor: newColor }}
              onClick={() => {
                const idx = PATTERN_COLORS.indexOf(newColor);
                setNewColor(PATTERN_COLORS[(idx + 1) % PATTERN_COLORS.length]);
              }}
              title='Click to change color'
            />
            <input
              type='text'
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder='New pattern name...'
              className='flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#178da6] focus:border-transparent'
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
              className='px-3 py-1.5 bg-[#178da6] text-white rounded text-sm font-semibold hover:bg-[#14758c] disabled:opacity-50 transition flex items-center gap-1'
            >
              <Plus size={14} />
              Add
            </button>
          </div>

          {/* Pattern list */}
          {patterns.length === 0 && (
            <p className='text-sm text-gray-500 italic py-2'>
              No patterns yet. Create one above, then add exercises to it.
            </p>
          )}

          <div className='space-y-1'>
            {patterns.map(pattern => (
              <div key={pattern.id} className='border rounded-lg'>
                {/* Pattern header */}
                <div className='flex items-center gap-2 p-2 hover:bg-gray-50'>
                  <button
                    onClick={() => setExpandedPattern(
                      expandedPattern === pattern.id ? null : pattern.id
                    )}
                    className='shrink-0'
                  >
                    {expandedPattern === pattern.id ? (
                      <ChevronDown size={14} className='text-gray-500' />
                    ) : (
                      <ChevronRight size={14} className='text-gray-500' />
                    )}
                  </button>

                  <div
                    className='w-3 h-3 rounded-full shrink-0'
                    style={{ backgroundColor: pattern.color }}
                  />

                  {editingId === pattern.id ? (
                    <input
                      type='text'
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(pattern.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onBlur={() => handleSaveEdit(pattern.id)}
                      autoFocus
                      className='flex-1 px-2 py-0.5 border rounded text-sm'
                    />
                  ) : (
                    <span className='flex-1 text-sm font-medium text-gray-800 truncate'>
                      {pattern.name}
                    </span>
                  )}

                  <span className='text-xs text-gray-400 shrink-0'>
                    {pattern.exercises.length} exercise{pattern.exercises.length !== 1 ? 's' : ''}
                  </span>

                  <button
                    onClick={() => onOpenExercisePicker(pattern.id)}
                    className='p-1 text-[#178da6] hover:bg-[#178da6]/10 rounded transition'
                    title='Add exercises'
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(pattern.id);
                      setEditName(pattern.name);
                    }}
                    className='p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition'
                    title='Rename'
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (settingsId === pattern.id) {
                        setSettingsId(null);
                      } else {
                        setSettingsId(pattern.id);
                        setSettingsYellow(pattern.staleness_yellow);
                        setSettingsRed(pattern.staleness_red);
                      }
                    }}
                    className='p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition'
                    title='Threshold settings'
                  >
                    <Settings size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${pattern.name}"?`)) {
                        onDeletePattern(pattern.id);
                      }
                    }}
                    className='p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition'
                    title='Delete'
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Threshold settings */}
                {settingsId === pattern.id && (
                  <div className='px-8 py-2 bg-gray-50 border-t flex items-center gap-3 text-xs'>
                    <span className='text-gray-600'>Warning at</span>
                    <input
                      type='number'
                      value={settingsYellow}
                      onChange={(e) => setSettingsYellow(parseInt(e.target.value) || 3)}
                      className='w-12 px-1 py-0.5 border rounded text-center'
                      min={1}
                    />
                    <span className='text-yellow-600 font-medium'>weeks</span>
                    <span className='text-gray-400'>|</span>
                    <span className='text-gray-600'>Overdue at</span>
                    <input
                      type='number'
                      value={settingsRed}
                      onChange={(e) => setSettingsRed(parseInt(e.target.value) || 6)}
                      className='w-12 px-1 py-0.5 border rounded text-center'
                      min={1}
                    />
                    <span className='text-red-600 font-medium'>weeks</span>
                    <button
                      onClick={() => handleSaveSettings(pattern.id)}
                      className='ml-auto px-2 py-0.5 bg-[#178da6] text-white rounded text-xs hover:bg-[#14758c] transition'
                    >
                      Save
                    </button>
                  </div>
                )}

                {/* Exercise list */}
                {expandedPattern === pattern.id && (
                  <div className='px-8 py-2 border-t bg-gray-50/50 space-y-1'>
                    {pattern.exercises.length === 0 ? (
                      <p className='text-xs text-gray-400 italic'>
                        No exercises assigned.{' '}
                        <button
                          onClick={() => onOpenExercisePicker(pattern.id)}
                          className='text-[#178da6] hover:underline'
                        >
                          Add some
                        </button>
                      </p>
                    ) : (
                      pattern.exercises.map(ex => (
                        <div key={ex.id} className='flex items-center justify-between text-xs'>
                          <span className='text-gray-700'>
                            {ex.display_name || ex.name}
                          </span>
                          <button
                            onClick={() => onRemoveExercise(pattern.id, ex.id)}
                            className='text-gray-400 hover:text-red-500 p-0.5'
                            title='Remove from pattern'
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
