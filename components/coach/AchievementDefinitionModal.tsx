'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { FocusTrap } from '@/components/ui/FocusTrap';
import type { AchievementDefinition } from '@/types/achievements';
import { ACHIEVEMENT_CATEGORIES } from '@/types/achievements';

interface AchievementDefinitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    category: string;
    branch: string;
    tier: number;
    description: string;
    display_order: number;
  }) => void;
  editing: AchievementDefinition | null;
  existingBranches: string[];
  nextTierForBranch: (branch: string) => number;
  allDefinitions: AchievementDefinition[];
}

export default function AchievementDefinitionModal({
  isOpen,
  onClose,
  onSave,
  editing,
  existingBranches,
  nextTierForBranch,
  allDefinitions,
}: AchievementDefinitionModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [branch, setBranch] = useState('');
  const [tier, setTier] = useState(1);
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [showBranchSuggestions, setShowBranchSuggestions] = useState(false);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  // Template selection
  const [templateSearch, setTemplateSearch] = useState('');
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const templateInputRef = useRef<HTMLInputElement>(null);

  const filteredTemplates = templateSearch.trim()
    ? allDefinitions.filter(d =>
        d.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
        d.branch.toLowerCase().includes(templateSearch.toLowerCase())
      )
    : allDefinitions;

  const handleTemplateSelect = (def: AchievementDefinition) => {
    setSelectedTemplate(def.id);
    setTemplateSearch(`${def.branch} — ${def.name}`);
    setShowTemplateDropdown(false);
    setCategory(def.category);
    setBranch(def.branch);
    setTier(nextTierForBranch(def.branch));
    setDescription(def.description || '');
    setDisplayOrder(def.display_order);
    setName(''); // user must enter new name
  };

  const clearTemplate = () => {
    setSelectedTemplate('');
    setTemplateSearch('');
    setName('');
    setCategory('');
    setBranch('');
    setTier(1);
    setDescription('');
    setDisplayOrder(0);
  };

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setCategory(editing.category);
      setBranch(editing.branch);
      setTier(editing.tier);
      setDescription(editing.description || '');
      setDisplayOrder(editing.display_order);
    } else {
      setName('');
      setCategory('');
      setBranch('');
      setTier(1);
      setDescription('');
      setDisplayOrder(0);
    }
    // Reset template on open/close
    setSelectedTemplate('');
    setTemplateSearch('');
    setShowTemplateDropdown(false);
  }, [editing, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-set tier when branch changes (for new definitions)
  useEffect(() => {
    if (!editing && branch) {
      setTier(nextTierForBranch(branch));
    }
  }, [branch, editing, nextTierForBranch]);

  if (!isOpen) return null;

  const filteredBranches = existingBranches.filter((b) =>
    b.toLowerCase().includes(branch.toLowerCase())
  );

  // Build unique existing categories from definitions + defaults
  const existingCategories = [...new Set([
    ...ACHIEVEMENT_CATEGORIES,
    ...allDefinitions.map(d => d.category),
  ])].sort();
  const filteredCategories = existingCategories.filter((c) =>
    c.toLowerCase().includes(category.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim() || !branch.trim()) return;
    onSave({
      name: name.trim(),
      category,
      branch: branch.trim(),
      tier,
      description: description.trim(),
      display_order: displayOrder,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <FocusTrap>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
          {/* Header */}
          <div className="bg-amber-500 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
            <h3 className="font-bold text-lg">
              {editing ? 'Edit Achievement' : 'Add Achievement'}
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-amber-600 rounded transition"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">

            {/* Template selector (new achievements only) */}
            {!editing && (
              <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Copy from existing achievement <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <input
                    ref={templateInputRef}
                    type="text"
                    value={templateSearch}
                    onChange={(e) => {
                      setTemplateSearch(e.target.value);
                      setShowTemplateDropdown(true);
                      if (!e.target.value) setSelectedTemplate('');
                    }}
                    onFocus={() => setShowTemplateDropdown(true)}
                    onBlur={() => setTimeout(() => setShowTemplateDropdown(false), 200)}
                    placeholder="Search by name or branch…"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                  />
                  {showTemplateDropdown && filteredTemplates.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredTemplates.map((def) => (
                        <button
                          key={def.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleTemplateSelect(def);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-amber-50 text-sm text-gray-700 border-b border-gray-100 last:border-b-0"
                        >
                          <span className="font-medium">{def.name}</span>
                          <span className="text-gray-400 ml-2">({def.branch} · {def.category} · Tier {def.tier})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedTemplate && (
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-amber-700">
                      ✓ Template loaded — category, branch & description copied. Enter a new name.
                    </p>
                    <button
                      type="button"
                      onClick={clearTemplate}
                      className="text-xs text-gray-400 hover:text-gray-600 underline ml-2"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Category (with autocomplete) */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setShowCategorySuggestions(true);
                }}
                onFocus={() => setShowCategorySuggestions(true)}
                onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                placeholder="e.g. Bodyweight, Gymnastics, Strength"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                required
              />
              {showCategorySuggestions && filteredCategories.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {filteredCategories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setCategory(c);
                        setShowCategorySuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-amber-50 text-sm text-gray-700"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Branch (with autocomplete) */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Branch
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => {
                  setBranch(e.target.value);
                  setShowBranchSuggestions(true);
                }}
                onFocus={() => setShowBranchSuggestions(true)}
                onBlur={() => setTimeout(() => setShowBranchSuggestions(false), 200)}
                placeholder="e.g. Push-Up, Muscle-Up, Snatch"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                required
              />
              {showBranchSuggestions && filteredBranches.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {filteredBranches.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        setBranch(b);
                        setShowBranchSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-amber-50 text-sm text-gray-700"
                    >
                      {b}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tier */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Tier
              </label>
              <input
                type="number"
                value={tier}
                onChange={(e) => setTier(parseInt(e.target.value) || 1)}
                min={1}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <span className="ml-2 text-sm text-gray-500">
                {'★'.repeat(tier)}
              </span>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Achievement Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. First Strict Push-Up"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Description <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. 5 unbroken strict push-ups"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition"
              >
                {editing ? 'Update' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      </FocusTrap>
    </div>
  );
}
