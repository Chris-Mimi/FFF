'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trophy, Check, Lock, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { confirm } from '@/lib/confirm';
import { FocusTrap } from '@/components/ui/FocusTrap';
import type { AchievementDefinition, AthleteAchievement, AchievementDifficulty } from '@/types/achievements';

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

// Parse bodyweight percentage from achievement name (e.g. "@ 50% Bodyweight" → 0.5)
function parseBodyweightMultiplier(name: string): number | null {
  const match = name.match(/@\s*(\d+)%\s*Bodyweight/i);
  return match ? parseInt(match[1]) / 100 : null;
}

const DIFFICULTY_FILTERS: { value: AchievementDifficulty; label: string; bg: string; border: string; text: string; activeBg: string }[] = [
  { value: 'bronze', label: 'Bronze', bg: 'bg-amber-700/30', border: 'border-amber-600', text: 'text-amber-400', activeBg: 'bg-amber-700/60' },
  { value: 'silver', label: 'Silver', bg: 'bg-gray-500/20', border: 'border-gray-400', text: 'text-gray-300', activeBg: 'bg-gray-500/40' },
  { value: 'gold', label: 'Gold', bg: 'bg-yellow-600/20', border: 'border-yellow-500', text: 'text-yellow-400', activeBg: 'bg-yellow-600/40' },
  { value: 'platinum', label: 'Platinum', bg: 'bg-cyan-600/20', border: 'border-cyan-400', text: 'text-cyan-300', activeBg: 'bg-cyan-600/40' },
];

const DIFFICULTY_BADGE_STYLES: Record<AchievementDifficulty, { bg: string; border: string; star: string; name: string }> = {
  bronze:   { bg: 'bg-amber-900/40',   border: 'border-amber-600',  star: 'text-amber-400',  name: 'text-amber-200' },
  silver:   { bg: 'bg-gray-700/50',     border: 'border-gray-400',   star: 'text-gray-300',   name: 'text-gray-200' },
  gold:     { bg: 'bg-yellow-900/40',   border: 'border-yellow-500', star: 'text-yellow-400', name: 'text-yellow-200' },
  platinum: { bg: 'bg-cyan-900/40',     border: 'border-cyan-400',   star: 'text-cyan-300',   name: 'text-cyan-100' },
};

export default function AthletePageAchievementsTab({ userId }: AthletePageAchievementsTabProps) {
  const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
  const [achievements, setAchievements] = useState<AthleteAchievement[]>([]);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<AchievementDifficulty>>(new Set());
  const [claimModal, setClaimModal] = useState<AchievementDefinition | null>(null);
  const [claimDate, setClaimDate] = useState(new Date().toISOString().split('T')[0]);
  const [claimNotes, setClaimNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [detailModal, setDetailModal] = useState<(AchievementDefinition & { unlocked?: AthleteAchievement }) | null>(null);
  const [editingDate, setEditingDate] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [savingDate, setSavingDate] = useState(false);

  const fetchData = useCallback(async () => {
    const [defsRes, achRes, profileRes] = await Promise.all([
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
      supabase
        .from('athlete_profiles')
        .select('weight_kg')
        .eq('user_id', userId)
        .maybeSingle(),
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
    if (profileRes.data?.weight_kg) setWeightKg(Number(profileRes.data.weight_kg));
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

  const handleDateUpdate = async () => {
    if (!detailModal?.unlocked || !editDate) return;
    setSavingDate(true);

    const { error } = await supabase
      .from('athlete_achievements')
      .update({ achieved_date: editDate })
      .eq('id', detailModal.unlocked.id);

    if (error) {
      toast.error('Failed to update date');
      console.error(error);
      setSavingDate(false);
      return;
    }

    toast.success('Date updated');
    setEditingDate(false);
    setSavingDate(false);
    fetchData();
    setDetailModal(null);
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
          <Trophy className="text-emerald-400" size={24} />
          <h2 className="text-lg sm:text-xl font-bold text-gray-100">Achievements</h2>
        </div>
        <div className="flex items-center gap-3">
          {grouped.length > 0 && (
            <button
              onClick={() => {
                const allCats = grouped.map((g) => g.category);
                const allCollapsed = allCats.every((c) => collapsedCategories.has(c));
                setCollapsedCategories(allCollapsed ? new Set() : new Set(allCats));
              }}
              className="flex items-center gap-1 text-gray-400 hover:text-gray-200 transition text-xs"
              title={collapsedCategories.size === grouped.length ? 'Expand all' : 'Collapse all'}
            >
              {collapsedCategories.size === grouped.length ? (
                <><ChevronDown size={14} /> Expand</>
              ) : (
                <><ChevronRight size={14} /> Collapse</>
              )}
            </button>
          )}
          <div className="text-sm">
            <span className="font-semibold text-emerald-400">{totalUnlocked}</span>
            <span className="text-gray-400"> / {totalDefined}</span>
          </div>
        </div>
      </div>

      {/* Difficulty filter chips */}
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

      {/* Progress bar */}
      <div className="bg-gray-700/60 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
          style={{ width: `${totalDefined > 0 ? (totalUnlocked / totalDefined) * 100 : 0}%` }}
        />
      </div>

      {/* Category groups */}
      {filteredGrouped.map(({ category, branches }) => {
        const categoryUnlocked = branches.reduce(
          (sum, b) => sum + b.tiers.filter((ti) => ti.unlocked).length,
          0
        );
        const categoryTotal = branches.reduce((sum, b) => sum + b.tiers.length, 0);

        return (
          <div key={category} className="bg-gray-800/70 border-gray-600/40 rounded-lg overflow-hidden border">
            {/* Category header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-700/80 hover:bg-gray-600/60 transition text-left"
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
              <div className="divide-y divide-gray-600/30">
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
                        const ds = DIFFICULTY_BADGE_STYLES[def.difficulty] || DIFFICULTY_BADGE_STYLES.bronze;

                        return (
                          <button
                            key={def.id}
                            onClick={() => {
                              if (isUnlocked) {
                                setEditingDate(false);
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
                                ? `${ds.bg} border-2 ${ds.border} ${ds.name} hover:brightness-125 cursor-pointer`
                                : canClaim
                                  ? `${ds.bg} border-2 border-dashed ${ds.border} ${ds.name} hover:brightness-125 cursor-pointer animate-pulse-subtle`
                                  : `${ds.bg} border ${ds.border} ${ds.name} cursor-not-allowed opacity-40`
                              }
                            `}
                            title={(() => {
                              const multiplier = parseBodyweightMultiplier(def.name);
                              const bwNote = multiplier && weightKg
                                ? ` (${(multiplier * weightKg).toFixed(1).replace(/\.0$/, '')} kg)`
                                : '';
                              if (isUnlocked) return `Unlocked ${def.unlocked!.achieved_date}${bwNote} — tap for details`;
                              if (canClaim) return `Tap to claim!${bwNote}`;
                              return `Complete previous tiers first${bwNote}`;
                            })()}
                          >
                            {isUnlocked ? (
                              <Check size={14} className={ds.star} />
                            ) : isLocked ? (
                              <Lock size={12} className={ds.star} />
                            ) : null}
                            <span className={`text-xs ${ds.star}`}>
                              {'★'.repeat(def.tier)}
                            </span>
                            <span>{def.name}</span>
                            {(() => {
                              const multiplier = parseBodyweightMultiplier(def.name);
                              if (multiplier && weightKg) {
                                const targetKg = multiplier * weightKg;
                                return (
                                  <span className="text-[10px] opacity-70">
                                    ({targetKg.toFixed(1).replace(/\.0$/, '')} kg)
                                  </span>
                                );
                              }
                              return null;
                            })()}
                            {def.description && (
                              <span className="hidden sm:inline text-xs text-gray-400">
                                — {def.description}
                              </span>
                            )}
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
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Date achieved</span>
                  {editingDate ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleDateUpdate}
                        disabled={savingDate}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-medium transition disabled:opacity-50 min-h-[32px]"
                      >
                        {savingDate ? '...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingDate(false)}
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs font-medium transition min-h-[32px]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditDate(detailModal.unlocked!.achieved_date);
                        setEditingDate(true);
                      }}
                      className="text-gray-900 font-medium hover:text-amber-600 transition"
                      title="Click to edit date"
                    >
                      {detailModal.unlocked.achieved_date} ✎
                    </button>
                  )}
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
