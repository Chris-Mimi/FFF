'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Trophy, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { confirm } from '@/lib/confirm';
import AchievementDefinitionModal from './AchievementDefinitionModal';
import AwardAchievementModal from './AwardAchievementModal';
import type { AchievementDefinition } from '@/types/achievements';

interface BranchGroup {
  branch: string;
  tiers: AchievementDefinition[];
}

interface CategoryGroup {
  category: string;
  branches: BranchGroup[];
}

export default function AchievementsTab() {
  const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AchievementDefinition | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showAwardModal, setShowAwardModal] = useState(false);

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
      {grouped.map(({ category, branches }) => (
        <div key={category} className="bg-teal-800/60 rounded-lg overflow-hidden border border-teal-700/40">
          {/* Category header */}
          <button
            onClick={() => toggleCategory(category)}
            className="w-full flex items-center gap-2 px-4 py-3 bg-teal-800/80 hover:bg-teal-700/60 transition text-left"
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
            <div className="divide-y divide-teal-700/30">
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
                      className="p-0.5 text-gray-500 hover:text-amber-400 transition"
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
                        className="group relative flex items-center gap-1.5 px-3 py-1.5 bg-amber-900/40 border border-amber-500/50 rounded-full text-sm"
                      >
                        <span className="text-amber-400 text-xs">
                          {'★'.repeat(def.tier)}
                        </span>
                        <span className="text-gray-200">{def.name}</span>
                        {def.description && (
                          <span className="text-gray-400 text-xs hidden sm:inline">
                            — {def.description}
                          </span>
                        )}

                        {/* Edit/Delete on hover */}
                        <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                          <button
                            onClick={() => {
                              setEditing(def);
                              setShowModal(true);
                            }}
                            className="p-0.5 text-gray-400 hover:text-blue-400 transition"
                            aria-label={`Edit ${def.name}`}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(def)}
                            className="p-0.5 text-gray-400 hover:text-red-400 transition"
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
      />

      {/* Award Modal */}
      <AwardAchievementModal
        isOpen={showAwardModal}
        onClose={() => setShowAwardModal(false)}
      />

    </div>
  );
}
