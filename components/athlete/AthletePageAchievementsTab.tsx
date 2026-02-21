'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trophy, Check, Lock, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { confirm } from '@/lib/confirm';
import { FocusTrap } from '@/components/ui/FocusTrap';
import type { AchievementDefinition, AthleteAchievement } from '@/types/achievements';

interface AthletePageAchievementsTabProps {
  userId: string;
}

interface BranchGroup {
  branch: string;
  tiers: (AchievementDefinition & { unlocked?: AthleteAchievement })[];
}

interface CategoryGroup {
  category: string;
  branches: BranchGroup[];
}

export default function AthletePageAchievementsTab({ userId }: AthletePageAchievementsTabProps) {
  const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
  const [achievements, setAchievements] = useState<AthleteAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [claimModal, setClaimModal] = useState<AchievementDefinition | null>(null);
  const [claimDate, setClaimDate] = useState(new Date().toISOString().split('T')[0]);
  const [claimNotes, setClaimNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [detailModal, setDetailModal] = useState<(AchievementDefinition & { unlocked?: AthleteAchievement }) | null>(null);

  const fetchData = useCallback(async () => {
    const [defsRes, achRes] = await Promise.all([
      supabase
        .from('achievement_definitions')
        .select('*')
        .order('category')
        .order('branch')
        .order('tier'),
      supabase
        .from('athlete_achievements')
        .select('*')
        .eq('user_id', userId),
    ]);

    if (defsRes.error) {
      toast.error('Failed to load achievements');
      console.error(defsRes.error);
      setLoading(false);
      return;
    }
    if (achRes.error) {
      console.error(achRes.error);
    }

    setDefinitions(defsRes.data || []);
    setAchievements(achRes.data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build unlocked set for quick lookup
  const unlockedMap = new Map<string, AthleteAchievement>();
  for (const ach of achievements) {
    unlockedMap.set(ach.achievement_id, ach);
  }

  // Group definitions by category → branch → tiers, merge unlock status
  const grouped: CategoryGroup[] = (() => {
    const categoryMap = new Map<string, Map<string, (AchievementDefinition & { unlocked?: AthleteAchievement })[]>>();

    for (const def of definitions) {
      if (!categoryMap.has(def.category)) {
        categoryMap.set(def.category, new Map());
      }
      const branchMap = categoryMap.get(def.category)!;
      if (!branchMap.has(def.branch)) {
        branchMap.set(def.branch, []);
      }
      branchMap.get(def.branch)!.push({
        ...def,
        unlocked: unlockedMap.get(def.id),
      });
    }

    const result: CategoryGroup[] = [];
    for (const [category, branchMap] of categoryMap) {
      const branches: BranchGroup[] = [];
      // Sort branches alphabetically
      const sortedBranches = [...branchMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      for (const [branch, tiers] of sortedBranches) {
        branches.push({ branch, tiers: tiers.sort((a, b) => a.tier - b.tier) });
      }
      result.push({ category, branches });
    }
    return result;
  })();

  // Check if a tier is the next claimable one in its branch
  const isNextClaimable = (branchTiers: (AchievementDefinition & { unlocked?: AthleteAchievement })[], tier: AchievementDefinition & { unlocked?: AthleteAchievement }) => {
    if (tier.unlocked) return false; // Already unlocked
    // Find the highest unlocked tier in this branch
    let highestUnlocked = 0;
    for (const t of branchTiers) {
      if (t.unlocked && t.tier > highestUnlocked) {
        highestUnlocked = t.tier;
      }
    }
    return tier.tier === highestUnlocked + 1;
  };

  const handleClaim = async () => {
    if (!claimModal) return;
    setSaving(true);

    const { error } = await supabase.from('athlete_achievements').insert({
      user_id: userId,
      achievement_id: claimModal.id,
      achieved_date: claimDate,
      notes: claimNotes || null,
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('Achievement already unlocked');
      } else {
        toast.error('Failed to log achievement');
        console.error(error);
      }
      setSaving(false);
      return;
    }

    toast.success(`🏆 ${claimModal.name} unlocked!`);
    setClaimModal(null);
    setClaimNotes('');
    setClaimDate(new Date().toISOString().split('T')[0]);
    setSaving(false);
    fetchData();
  };

  const handleUnclaim = async (achievement: AthleteAchievement) => {
    const ok = await confirm({
      title: 'Remove Achievement',
      message: 'Remove this achievement from your profile? You can re-claim it later.',
      confirmText: 'Remove',
      variant: 'danger',
    });
    if (!ok) return;

    const { error } = await supabase
      .from('athlete_achievements')
      .delete()
      .eq('id', achievement.id);

    if (error) {
      toast.error('Failed to remove achievement');
      console.error(error);
      return;
    }

    toast.success('Achievement removed');
    setDetailModal(null);
    fetchData();
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

  // Stats
  const totalDefined = definitions.length;
  const totalUnlocked = achievements.length;

  if (loading) {
    return (
      <div className="rounded-lg p-8 text-center text-gray-300">
        Loading achievements...
      </div>
    );
  }

  if (totalDefined === 0) {
    return (
      <div className="rounded-lg p-12 text-center">
        <Trophy className="mx-auto text-gray-400 mb-3" size={48} />
        <p className="text-gray-300">No achievements available yet</p>
        <p className="text-sm text-gray-400 mt-1">Your coach hasn&apos;t set up achievements. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + Progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="text-amber-400" size={24} />
          <h2 className="text-lg sm:text-xl font-bold text-gray-100">Achievements</h2>
        </div>
        <div className="text-sm">
          <span className="font-semibold text-amber-400">{totalUnlocked}</span>
          <span className="text-gray-400"> / {totalDefined}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-teal-800/60 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-amber-500 h-full rounded-full transition-all duration-500"
          style={{ width: `${totalDefined > 0 ? (totalUnlocked / totalDefined) * 100 : 0}%` }}
        />
      </div>

      {/* Category groups */}
      {grouped.map(({ category, branches }) => {
        const categoryUnlocked = branches.reduce(
          (sum, b) => sum + b.tiers.filter((t) => t.unlocked).length,
          0
        );
        const categoryTotal = branches.reduce((sum, b) => sum + b.tiers.length, 0);

        return (
          <div key={category} className="bg-teal-800/60 rounded-lg overflow-hidden border border-teal-700/40">
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3 bg-teal-800/80 hover:bg-teal-700/60 transition text-left"
            >
              {collapsedCategories.has(category) ? (
                <ChevronRight size={18} className="text-gray-400" />
              ) : (
                <ChevronDown size={18} className="text-gray-400" />
              )}
              <h3 className="font-bold text-gray-100">{category}</h3>
              <span className="text-xs text-gray-400">
                {categoryUnlocked}/{categoryTotal}
              </span>
            </button>

            {/* Branch rows */}
            {!collapsedCategories.has(category) && (
              <div className="divide-y divide-teal-700/30">
                {branches.map(({ branch, tiers }) => (
                  <div key={branch} className="px-3 py-2 sm:px-4 sm:py-3">
                    {/* Branch name */}
                    <div className="font-semibold text-gray-300 text-sm mb-2">
                      {branch}
                    </div>

                    {/* Tier badges */}
                    <div className="flex flex-wrap gap-2">
                      {tiers.map((def) => {
                        const isUnlocked = !!def.unlocked;
                        const canClaim = isNextClaimable(tiers, def);
                        const isLocked = !isUnlocked && !canClaim;

                        return (
                          <button
                            key={def.id}
                            onClick={() => {
                              if (isUnlocked) {
                                setDetailModal(def);
                              } else if (canClaim) {
                                setClaimDate(new Date().toISOString().split('T')[0]);
                                setClaimNotes('');
                                setClaimModal(def);
                              }
                            }}
                            disabled={isLocked}
                            className={`
                              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition
                              ${isUnlocked
                                ? 'bg-amber-900/40 border border-amber-500/50 text-amber-200 hover:bg-amber-900/60 cursor-pointer'
                                : canClaim
                                  ? 'bg-teal-900/40 border-2 border-dashed border-amber-400 text-amber-300 hover:bg-teal-800/60 cursor-pointer animate-pulse-subtle'
                                  : 'bg-teal-900/30 border border-teal-700/30 text-gray-500 cursor-not-allowed opacity-60'
                              }
                            `}
                            title={
                              isUnlocked
                                ? `Unlocked ${def.unlocked!.achieved_date} — tap for details`
                                : canClaim
                                  ? 'Tap to claim!'
                                  : 'Complete previous tiers first'
                            }
                          >
                            {isUnlocked ? (
                              <Check size={14} className="text-amber-400" />
                            ) : isLocked ? (
                              <Lock size={12} className="text-gray-500" />
                            ) : null}
                            <span className="text-xs text-amber-400">
                              {'★'.repeat(def.tier)}
                            </span>
                            <span>{def.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Claim Modal */}
      {claimModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <FocusTrap>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="text-amber-500" size={24} />
                <h3 className="text-lg font-bold text-gray-900">Claim Achievement</h3>
              </div>

              <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="font-semibold text-amber-800">{claimModal.name}</div>
                <div className="text-sm text-amber-600">
                  {claimModal.branch} — Tier {claimModal.tier}
                </div>
                {claimModal.description && (
                  <div className="text-sm text-gray-600 mt-1">{claimModal.description}</div>
                )}
              </div>

              <div className="space-y-3 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar size={14} className="inline mr-1" />
                    Date achieved
                  </label>
                  <input
                    type="date"
                    value={claimDate}
                    onChange={(e) => setClaimDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={claimNotes}
                    onChange={(e) => setClaimNotes(e.target.value)}
                    placeholder="e.g. During class WOD, first time unassisted"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setClaimModal(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition text-sm min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClaim}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition text-sm disabled:opacity-50 min-h-[44px]"
                >
                  {saving ? 'Saving...' : '🏆 Claim!'}
                </button>
              </div>
            </div>
          </FocusTrap>
        </div>
      )}

      {/* Detail Modal (for unlocked achievements) */}
      {detailModal && detailModal.unlocked && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <FocusTrap>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-2 mb-4">
                <Check className="text-amber-500" size={24} />
                <h3 className="text-lg font-bold text-gray-900">Achievement Unlocked</h3>
              </div>

              <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="font-semibold text-amber-800">{detailModal.name}</div>
                <div className="text-sm text-amber-600">
                  {detailModal.branch} — Tier {detailModal.tier}
                </div>
                {detailModal.description && (
                  <div className="text-sm text-gray-600 mt-1">{detailModal.description}</div>
                )}
              </div>

              <div className="space-y-2 mb-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Date achieved</span>
                  <span className="text-gray-900 font-medium">{detailModal.unlocked.achieved_date}</span>
                </div>
                {detailModal.unlocked.awarded_by && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Awarded by</span>
                    <span className="text-gray-900 font-medium">Coach</span>
                  </div>
                )}
                {detailModal.unlocked.notes && (
                  <div>
                    <span className="text-gray-500">Notes</span>
                    <p className="text-gray-900 mt-0.5">{detailModal.unlocked.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleUnclaim(detailModal.unlocked!)}
                  className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition text-sm min-h-[44px]"
                >
                  Remove
                </button>
                <button
                  onClick={() => setDetailModal(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition text-sm min-h-[44px]"
                >
                  Close
                </button>
              </div>
            </div>
          </FocusTrap>
        </div>
      )}
    </div>
  );
}
