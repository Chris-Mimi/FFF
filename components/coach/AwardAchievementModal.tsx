'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Trophy, Check, Lock, ChevronDown, ChevronRight } from 'lucide-react';
import { authFetch } from '@/lib/auth-fetch';
import { toast } from 'sonner';
import { FocusTrap } from '@/components/ui/FocusTrap';
import type { AchievementDefinition } from '@/types/achievements';

interface Member {
  id: string;
  name: string;
  display_name: string | null;
}

function memberDisplayName(m: Member): string {
  return m.display_name || m.name || 'Unknown';
}

interface AthleteAchievementRecord {
  achievement_id: string;
}

interface AwardAchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AwardAchievementModal({ isOpen, onClose }: AwardAchievementModalProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementDefinition | null>(null);
  const [athleteAchievements, setAthleteAchievements] = useState<AthleteAchievementRecord[]>([]);
  const [achievedDate, setAchievedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Fetch members + definitions on open
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [membersRes, defsRes] = await Promise.all([
          authFetch('/api/achievements/athletes'),
          authFetch('/api/achievements/definitions'),
        ]);

        if (membersRes.ok) {
          const data = await membersRes.json();
          setMembers(data);
        }
        if (defsRes.ok) {
          const data = await defsRes.json();
          setDefinitions(data);
        }
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen]);

  // Fetch athlete's existing achievements when member selected
  useEffect(() => {
    if (!selectedMember) {
      setAthleteAchievements([]);
      return;
    }

    const fetchAthleteAchievements = async () => {
      try {
        const res = await authFetch(`/api/achievements/athlete-records?userId=${selectedMember.id}`);
        if (res.ok) {
          const data = await res.json();
          setAthleteAchievements(data);
        }
      } catch (err) {
        console.error('Fetch athlete achievements error:', err);
      }
    };

    fetchAthleteAchievements();
  }, [selectedMember]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSelectedMember(null);
      setSelectedAchievement(null);
      setAthleteAchievements([]);
      setAchievedDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setCollapsedCategories(new Set());
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const unlockedIds = useMemo(
    () => new Set(athleteAchievements.map((a) => a.achievement_id)),
    [athleteAchievements]
  );

  // Determine which achievements are claimable (next in sequence)
  const isNextClaimable = useCallback(
    (def: AchievementDefinition) => {
      if (unlockedIds.has(def.id)) return false;

      const branchTiers = definitions.filter((d) => d.branch === def.branch);
      let highestUnlocked = 0;
      for (const t of branchTiers) {
        if (unlockedIds.has(t.id) && t.tier > highestUnlocked) {
          highestUnlocked = t.tier;
        }
      }
      return def.tier === highestUnlocked + 1;
    },
    [definitions, unlockedIds]
  );

  // Group definitions by category → branch
  const grouped = useMemo(() => {
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

    const result: { category: string; branches: { branch: string; tiers: AchievementDefinition[] }[] }[] = [];
    for (const [category, branchMap] of categoryMap) {
      const branches: { branch: string; tiers: AchievementDefinition[] }[] = [];
      for (const [branch, tiers] of branchMap) {
        branches.push({ branch, tiers: tiers.sort((a, b) => a.tier - b.tier) });
      }
      result.push({ category, branches });
    }
    return result;
  }, [definitions]);

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const handleAward = async () => {
    if (!selectedMember || !selectedAchievement) return;

    setSaving(true);
    try {
      const res = await authFetch('/api/achievements/award', {
        method: 'POST',
        body: JSON.stringify({
          userId: selectedMember.id,
          achievementId: selectedAchievement.id,
          achievedDate,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to award achievement');
        return;
      }

      toast.success(`Awarded "${selectedAchievement.name}" to ${memberDisplayName(selectedMember)}`);
      onClose();
    } catch (err) {
      console.error('Award error:', err);
      toast.error('Failed to award achievement');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <FocusTrap>
        <div className="bg-teal-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-teal-700/40">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-teal-700/40 bg-teal-800/80 rounded-t-xl">
            <div className="flex items-center gap-2">
              <Trophy className="text-amber-400" size={20} />
              <h2 className="text-lg font-bold text-gray-100">Award Achievement</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-teal-700/60 rounded-lg transition"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Step 1: Select athlete from list */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                Athlete
              </label>
              {selectedMember ? (
                <div className="flex items-center justify-between px-3 py-2.5 bg-teal-800/60 border border-amber-500/40 rounded-lg">
                  <span className="font-medium text-amber-400">{memberDisplayName(selectedMember)}</span>
                  <button
                    onClick={() => {
                      setSelectedMember(null);
                      setSelectedAchievement(null);
                    }}
                    className="p-0.5 text-gray-400 hover:text-gray-200 transition"
                    aria-label="Change athlete"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : loading ? (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">Loading athletes...</div>
              ) : members.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">No athletes with active subscriptions</div>
              ) : (
                <div className="border border-teal-700/40 rounded-lg max-h-48 overflow-y-auto bg-teal-800/60">
                  {members.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMember(m)}
                      className="w-full text-left px-3 py-2.5 hover:bg-teal-700/60 text-sm transition border-b border-teal-700/30 last:border-b-0 min-h-[44px]"
                    >
                      <span className="font-medium text-gray-200">{memberDisplayName(m)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Select achievement (only after athlete selected) */}
            {selectedMember && (
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                  Achievement
                </label>
                {selectedAchievement ? (
                  <div className="flex items-center justify-between px-3 py-2.5 bg-teal-800/60 border border-amber-500/40 rounded-lg">
                    <div>
                      <span className="text-amber-400 text-xs mr-1">
                        {'★'.repeat(selectedAchievement.tier)}
                      </span>
                      <span className="font-medium text-gray-100">{selectedAchievement.name}</span>
                      <span className="text-gray-400 text-xs ml-2">({selectedAchievement.branch})</span>
                    </div>
                    <button
                      onClick={() => setSelectedAchievement(null)}
                      className="p-0.5 text-gray-400 hover:text-gray-200 transition"
                      aria-label="Change achievement"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="border border-teal-700/40 rounded-lg max-h-52 overflow-y-auto bg-teal-800/60">
                    {grouped.map(({ category, branches }) => (
                      <div key={category}>
                        <button
                          onClick={() => toggleCategory(category)}
                          className="w-full flex items-center gap-1.5 px-3 py-2 bg-teal-800/80 hover:bg-teal-700/60 text-left text-sm font-semibold text-gray-100 transition sticky top-0 z-[1]"
                        >
                          {collapsedCategories.has(category) ? (
                            <ChevronRight size={14} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={14} className="text-gray-400" />
                          )}
                          {category}
                        </button>
                        {!collapsedCategories.has(category) &&
                          branches.map(({ branch, tiers }) => (
                            <div key={branch} className="px-3 py-1.5">
                              <div className="text-xs font-medium text-gray-400 mb-1">{branch}</div>
                              <div className="flex flex-wrap gap-1.5">
                                {tiers.map((def) => {
                                  const unlocked = unlockedIds.has(def.id);
                                  const claimable = isNextClaimable(def);
                                  const locked = !unlocked && !claimable;

                                  return (
                                    <button
                                      key={def.id}
                                      onClick={() => {
                                        if (!locked) setSelectedAchievement(def);
                                      }}
                                      disabled={locked || unlocked}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition ${
                                        unlocked
                                          ? 'bg-green-800/50 text-green-300 cursor-default border border-green-700/40'
                                          : claimable
                                            ? 'bg-amber-900/40 border border-amber-500/50 text-amber-300 hover:bg-amber-800/50 cursor-pointer'
                                            : 'bg-teal-800/40 text-gray-500 cursor-not-allowed border border-teal-700/30'
                                      }`}
                                      title={
                                        unlocked
                                          ? 'Already unlocked'
                                          : locked
                                            ? 'Complete previous tiers first'
                                            : def.description || def.name
                                      }
                                    >
                                      {unlocked ? (
                                        <Check size={12} />
                                      ) : locked ? (
                                        <Lock size={10} />
                                      ) : (
                                        <span className="text-amber-400">{'★'.repeat(def.tier)}</span>
                                      )}
                                      {def.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Date + Notes (only after achievement selected) */}
            {selectedMember && selectedAchievement && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                    Date Achieved
                  </label>
                  <input
                    type="date"
                    value={achievedDate}
                    onChange={(e) => setAchievedDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2.5 bg-teal-800/60 border border-teal-700/40 rounded-lg text-sm text-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1.5">
                    Notes <span className="text-gray-500 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. During class WOD, first time unassisted"
                    rows={2}
                    className="w-full px-3 py-2.5 bg-teal-800/60 border border-teal-700/40 rounded-lg text-sm text-gray-200 placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-5 py-4 border-t border-teal-700/40">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-gray-300 hover:bg-teal-700/60 rounded-lg font-medium transition text-sm min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={handleAward}
              disabled={!selectedMember || !selectedAchievement || saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition text-sm min-h-[44px]"
            >
              <Trophy size={16} />
              {saving ? 'Awarding...' : 'Award'}
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}
