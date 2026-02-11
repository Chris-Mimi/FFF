'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { authFetch } from '@/lib/auth-fetch';

interface ReactionData {
  count: number;
  userReacted: boolean;
  reactors: string[];
}

type ReactionTargetType = 'wod_section_result' | 'benchmark_result' | 'lift_record';

interface ReactionTarget {
  targetType: ReactionTargetType;
  targetId: string;
}

/**
 * Hook for fetching and toggling fist bump reactions.
 * Supports batch-fetching for multiple targets and optimistic updates.
 */
export function useReactions() {
  const [reactions, setReactions] = useState<Record<string, ReactionData>>({});
  const [loading, setLoading] = useState(false);
  const pendingToggle = useRef<Set<string>>(new Set());

  const fetchReactions = useCallback(async (targets: ReactionTarget[]) => {
    if (targets.length === 0) return;

    // Group by targetType for batch fetching
    const grouped: Record<string, string[]> = {};
    for (const t of targets) {
      if (!grouped[t.targetType]) grouped[t.targetType] = [];
      grouped[t.targetType].push(t.targetId);
    }

    setLoading(true);
    try {
      const results: Record<string, ReactionData> = {};

      await Promise.all(
        Object.entries(grouped).map(async ([targetType, targetIds]) => {
          const res = await authFetch(
            `/api/reactions?targetType=${targetType}&targetIds=${targetIds.join(',')}`
          );
          if (res.ok) {
            const data = await res.json();
            Object.assign(results, data);
          }
        })
      );

      setReactions(prev => ({ ...prev, ...results }));
    } catch (err) {
      console.error('Failed to fetch reactions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleReaction = useCallback(async (targetType: ReactionTargetType, targetId: string) => {
    // Prevent double-clicks
    if (pendingToggle.current.has(targetId)) return;
    pendingToggle.current.add(targetId);

    // Optimistic update
    setReactions(prev => {
      const current = prev[targetId] || { count: 0, userReacted: false, reactors: [] };
      return {
        ...prev,
        [targetId]: {
          count: current.userReacted ? current.count - 1 : current.count + 1,
          userReacted: !current.userReacted,
          reactors: current.reactors // Keep as-is for optimistic
        }
      };
    });

    try {
      const res = await authFetch('/api/reactions', {
        method: 'POST',
        body: JSON.stringify({ targetType, targetId })
      });

      if (res.ok) {
        const data = await res.json();
        setReactions(prev => ({
          ...prev,
          [targetId]: {
            ...prev[targetId],
            count: data.count,
            userReacted: data.reacted
          }
        }));
      }
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
      // Revert optimistic update on error
      setReactions(prev => {
        const current = prev[targetId];
        if (!current) return prev;
        return {
          ...prev,
          [targetId]: {
            count: current.userReacted ? current.count - 1 : current.count + 1,
            userReacted: !current.userReacted,
            reactors: current.reactors
          }
        };
      });
    } finally {
      pendingToggle.current.delete(targetId);
    }
  }, []);

  const getReaction = useCallback((targetId: string): ReactionData => {
    return reactions[targetId] || { count: 0, userReacted: false, reactors: [] };
  }, [reactions]);

  return { reactions, loading, fetchReactions, toggleReaction, getReaction };
}
