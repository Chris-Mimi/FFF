'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Trophy, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { confirm } from '@/lib/confirm';
import AchievementDefinitionModal from './AchievementDefinitionModal';
import AwardAchievementModal from './AwardAchievementModal';
import type { AchievementDefinition, AchievementDifficulty } from '@/types/achievements';

interface BranchGroup {
  branch: string;
  tiers: AchievementDefinition[];
}

interface CategoryGroup {
  category: string;
  branches: BranchGroup[];
}

const DIFFICULTY_FILTERS: { value: AchievementDifficulty; label: string; bg: string; border: string; text: string; activeBg: string }[] = [
  { value: 'bronze', label: 'Bronze', bg: 'bg-amber-700/30', border: 'border-amber-600', text: 'text-amber-400', activeBg: 'bg-amber-700/60' },
  { value: 'silver', label: 'Silver', bg: 'bg-gray-500/20', border: 'border-gray-400', text: 'text-gray-300', activeBg: 'bg-gray-500/40' },
  { value: 'gold', label: 'Gold', bg: 'bg-yellow-600/20', border: 'border-yellow-500', text: 'text-yellow-400', activeBg: 'bg-yellow-600/40' },
  { value: 'platinum', label: 'Platinum', bg: 'bg-cyan-600/20', border: 'border-cyan-400', text: 'text-cyan-300', activeBg: 'bg-cyan-600/40' },
];

export default function AchievementsTab() {
  const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AchievementDefinition | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<AchievementDifficulty>>(new Set());

  const fetchDefinitions = useCallback(async () => {
    const { data, error } = await supabase
      .from('achievement_definitions')
      .select('*')
      .order('category')
      .order('branch')
      .order('tier');

    if (error) {
      toast.error('Failed to load achievements');
      console.error(error);
      return;
    }
    setDefinitions(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDefinitions();
  }, [fetchDefinitions]);

  // Group definitions by category → branch → tiers
  const grouped: CategoryGroup[] = (() => {
    const categoryMap = new Map<string, Map<string, AchievementDefinition[]>>();

    for (const def of definitions) {
      if (!categoryMap.has(def.category)) {
        categoryMap.set(def.category, new Map());
      }
      const branchMap = categoryMap.get(def.category)!;
      if (!branchMap.has(def.branch)) {
        branchMap.set(def.branch, []);
      }
      branchMap.get(def.branch)!.push(def);
    }

    const result: CategoryGroup[] = [];
    for (const [category, branchMap] of categoryMap) {
      const branches: BranchGroup[] = [];
      for (const [branch, tiers] of branchMap) {
        branches.push({ branch, tiers: tiers.sort((a, b) => a.tier - b.tier) });
      }
      result.push({ category, branches });
    }
    return result;
  })();

  // Apply difficulty filter to grouped data
  const filteredGrouped = selectedDifficulties.size === 0
    ? grouped
    : grouped
        .map(({ category, branches }) => ({
          category,
          branches: branches
            .map(({ branch, tiers }) => ({
              branch,
              tiers: tiers.filter((t) => selectedDifficulties.has(t.difficulty)),
            }))
            .filter(({ tiers }) => tiers.length > 0),
        }))
        .filter(({ branches }) => branches.length > 0);

  const toggleDifficulty = (d: AchievementDifficulty) => {
    setSelectedDifficulties((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  };

  const existingBranches = [...new Set(definitions.map((d) => d.branch))];

  const nextTierForBranch = useCallback(
    (branch: string) => {
      const branchDefs = definitions.filter((d) => d.branch === branch);
      if (branchDefs.length === 0) return 1;
      return Math.max(...branchDefs.map((d) => d.tier)) + 1;
    },
    [definitions]
  );

  const handleSave = async (data: {
    name: string;
    category: string;
    branch: string;
    tier: number;
    difficulty: AchievementDifficulty;
    description: string;
    display_order: number;
  }) => {
    if (editing) {
      const { error } = await supabase
        .from('achievement_definitions')
        .update({
          name: data.name,
          category: data.category,
          branch: data.branch,
          tier: data.tier,
          difficulty: data.difficulty,
          description: data.description || null,
          display_order: data.display_order,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editing.id);

      if (error) {
        toast.error('Failed to update achievement');
        console.error(error);
        return;
      }
      toast.success('Achievement updated');
    } else {
      const { error } = await supabase.from('achievement_definitions').insert({
        name: data.name,
        category: data.category,
        branch: data.branch,
        tier: data.tier,
        difficulty: data.difficulty,
        description: data.description || null,
        display_order: data.display_order,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error(`Tier ${data.tier} already exists for branch "${data.branch}"`);
        } else {
          toast.error('Failed to add achievement');
        }
        console.error(error);
        return;
      }
      toast.success('Achievement added');
    }

    setShowModal(false);
    setEditing(null);
    fetchDefinitions();
  };

  const handleDelete = async (def: AchievementDefinition) => {
    const ok = await confirm({
      title: 'Delete Achievement',
      message: `Delete "${def.name}" (${def.branch} Tier ${def.tier})? This will also remove any athlete records for this achievement.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;

    const { error } = await supabase
      .from('achievement_definitions')
      .delete()
      .eq('id', def.id);

    if (error) {
      toast.error('Failed to delete achievement');
      console.error(error);
      return;
    }
    toast.success('Achievement deleted');
    fetchDefinitions();
  };

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-8 text-center text-gray-500">
        Loading achievements...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="text-amber-500" size={24} />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            Achievements
          </h2>
          <span className="text-sm text-gray-500">
            ({definitions.length} total)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {grouped.length > 0 && (
            <button
              onClick={() => {
                const allCats = grouped.map((g) => g.category);
                const allCollapsed = allCats.every((c) => collapsedCategories.has(c));
                setCollapsedCategories(allCollapsed ? new Set() : new Set(allCats));
              }}
              className="flex items-center gap-1 px-2.5 py-2 text-gray-400 hover:text-gray-200 transition text-xs"
              title={collapsedCategories.size === grouped.length ? 'Expand all' : 'Collapse all'}
            >
              {collapsedCategories.size === grouped.length ? (
                <><ChevronDown size={14} /> Expand</>
              ) : (
                <><ChevronRight size={14} /> Collapse</>
              )}
            </button>
          )}
          <button
            onClick={() => setShowAwardModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition text-sm"
          >
            <Award size={16} />
            Award
          </button>
          <button
            onClick={() => {
              setEditing(null);
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition text-sm"
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>

      {/* Difficulty filter chips */}
      {definitions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {DIFFICULTY_FILTERS.map(({ value, label, bg, border, text, activeBg }) => {
            const active = selectedDifficulties.has(value);
            return (
              <button
                key={value}
                onClick={() => toggleDifficulty(value)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                  active
                    ? `${activeBg} ${border} ${text}`
                    : `${bg} border-transparent ${text} opacity-50 hover:opacity-80`
                }`}
              >
                {label}
              </button>
            );
          })}
          {selectedDifficulties.size > 0 && (
            <button
              onClick={() => setSelectedDifficulties(new Set())}
              className="text-xs text-gray-400 hover:text-gray-200 transition ml-1"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {definitions.length === 0 && (
        <div className="bg-white rounded-lg p-12 text-center">
          <Trophy className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 mb-4">No achievements defined yet</p>
          <button
            onClick={() => {
              setEditing(null);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition text-sm"
          >
            Create your first achievement
          </button>
        </div>
      )}

      {/* Category groups */}
      {filteredGrouped.map(({ category, branches }) => (
        <div key={category} className="bg-gray-800/70 border-gray-600/40 rounded-lg overflow-hidden border">
          {/* Category header */}
          <button
            onClick={() => toggleCategory(category)}
            className="w-full flex items-center gap-2 px-4 py-3 bg-gray-700/80 hover:bg-gray-600/60 transition text-left"
          >
            {collapsedCategories.has(category) ? (
              <ChevronRight size={18} className="text-gray-400" />
            ) : (
              <ChevronDown size={18} className="text-gray-400" />
            )}
            <h3 className="font-bold text-gray-100">{category}</h3>
            <span className="text-xs text-gray-400">
              ({branches.reduce((sum, b) => sum + b.tiers.length, 0)} achievements)
            </span>
          </button>

          {/* Branch rows */}
          {!collapsedCategories.has(category) && (
            <div className="divide-y divide-gray-600/30">
              {branches.map(({ branch, tiers }) => (
                <div key={branch} className="px-4 py-3">
                  {/* Branch name */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-300 text-sm">
                      {branch}
                    </span>
                    <button
                      onClick={() => {
                        setEditing(null);
                        setShowModal(true);
                      }}
                      className="p-0.5 text-gray-500 hover:text-emerald-400 transition"
                      aria-label={`Add tier to ${branch}`}
                      title="Add tier"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Tier badges */}
                  <div className="flex flex-wrap gap-2">
                    {tiers.map((def) => (
                      <div
                        key={def.id}
                        className="group relative flex items-center gap-1.5 px-3 py-1.5 bg-teal-900/60 border-2 border-yellow-400 rounded-full text-sm"
                      >
                        <span className="text-yellow-400 text-xs">
                          {'★'.repeat(def.tier)}
                        </span>
                        <span className="text-yellow-200">{def.name}</span>
                        {def.description && (
                          <span className="text-gray-400 text-xs hidden sm:inline">
                            — {def.description}
                          </span>
                        )}

                        {/* Edit/Delete on hover */}
                        <div className="hidden group-hover:flex items-center gap-0.5 absolute -right-1 -top-1 bg-gray-700 rounded-full px-1 py-0.5 shadow-lg border border-gray-500">
                          <button
                            onClick={() => {
                              setEditing(def);
                              setShowModal(true);
                            }}
                            className="p-0.5 text-gray-300 hover:text-blue-400 transition"
                            aria-label={`Edit ${def.name}`}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(def)}
                            className="p-0.5 text-gray-300 hover:text-red-400 transition"
                            aria-label={`Delete ${def.name}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Definition Modal */}
      <AchievementDefinitionModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditing(null);
        }}
        onSave={handleSave}
        editing={editing}
        existingBranches={existingBranches}
        nextTierForBranch={nextTierForBranch}
        allDefinitions={definitions}
      />

      {/* Award Modal */}
      <AwardAchievementModal
        isOpen={showAwardModal}
        onClose={() => setShowAwardModal(false)}
      />

    </div>
  );
}
