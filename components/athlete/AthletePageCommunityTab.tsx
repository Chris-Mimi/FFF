'use client';

import { supabase } from '@/lib/supabase';
import { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import FistBumpButton from './FistBumpButton';
import LeaderboardView from './LeaderboardView';
import { useReactions } from '@/hooks/athlete/useReactions';

interface FeedItem {
  id: string;
  userId: string;
  memberName: string;
  targetType: 'wod_section_result' | 'benchmark_result' | 'lift_record';
  resultDate: string;
  createdAt: string;
  // WOD section result fields
  sectionType?: string;
  sectionDuration?: number;
  workoutName?: string;
  timeResult?: string;
  repsResult?: number;
  weightResult?: number;
  roundsResult?: number;
  caloriesResult?: number;
  metresResult?: number;
  scalingLevel?: string;
  taskCompleted?: boolean;
  // Benchmark result fields
  benchmarkName?: string;
  benchmarkType?: string;
  // Lift record fields
  liftName?: string;
  weightKg?: number;
  reps?: number;
  repMaxType?: string;
  repScheme?: string;
  calculated1rm?: number;
}

interface AthletePageCommunityTabProps {
  userId: string;
}

const FEED_PAGE_SIZE = 20;

export default function AthletePageCommunityTab({ userId }: AthletePageCommunityTabProps) {
  const [activeView, setActiveView] = useState<'feed' | 'leaderboard'>('feed');
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const { fetchReactions, toggleReaction, getReaction } = useReactions();

  const loadFeed = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      // Calculate date range — page 0 = last 7 days, each page adds 7 more days back
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - (pageNum * 7));
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 7);

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      // Fetch all three result types in parallel
      const [wodResults, benchmarkResults, liftResults] = await Promise.all([
        supabase
          .from('wod_section_results')
          .select('id, user_id, wod_id, section_id, workout_date, time_result, reps_result, weight_result, rounds_result, calories_result, metres_result, scaling_level, task_completed, created_at')
          .gte('workout_date', startStr)
          .lte('workout_date', endStr)
          .order('created_at', { ascending: false })
          .limit(FEED_PAGE_SIZE),

        supabase
          .from('benchmark_results')
          .select('id, user_id, benchmark_name, benchmark_type, time_result, reps_result, weight_result, scaling_level, result_date, created_at')
          .gte('result_date', startStr)
          .lte('result_date', endStr)
          .order('created_at', { ascending: false })
          .limit(FEED_PAGE_SIZE),

        supabase
          .from('lift_records')
          .select('id, user_id, lift_name, weight_kg, reps, rep_max_type, rep_scheme, calculated_1rm, lift_date, created_at')
          .gte('lift_date', startStr)
          .lte('lift_date', endStr)
          .order('created_at', { ascending: false })
          .limit(FEED_PAGE_SIZE),
      ]);

      // Collect unique user IDs for name lookup
      const allUserIds = new Set<string>();
      (wodResults.data || []).forEach(r => allUserIds.add(r.user_id));
      (benchmarkResults.data || []).forEach(r => allUserIds.add(r.user_id));
      (liftResults.data || []).forEach(r => allUserIds.add(r.user_id));

      // Fetch member names (uses RPC to bypass members RLS)
      const memberNames: Record<string, string> = {};
      if (allUserIds.size > 0) {
        const { data: members } = await supabase
          .rpc('get_member_names', { member_ids: [...allUserIds] });

        if (members) {
          for (const m of members as { id: string; display_name: string | null; name: string | null }[]) {
            memberNames[m.id] = m.display_name || m.name || 'Unknown';
          }
        }
      }

      // Fetch WOD data for section context
      const wodIds = [...new Set((wodResults.data || []).map(r => r.wod_id))];
      const wodMap: Record<string, { sections: Array<{ id: string; type: string; duration: number }>; workout_name?: string }> = {};
      if (wodIds.length > 0) {
        const { data: wods } = await supabase
          .from('wods')
          .select('id, sections, workout_name')
          .in('id', wodIds);

        if (wods) {
          for (const w of wods) {
            wodMap[w.id] = { sections: w.sections || [], workout_name: w.workout_name };
          }
        }
      }

      // Build feed items
      const items: FeedItem[] = [];

      // WOD section results
      for (const r of (wodResults.data || [])) {
        const wod = wodMap[r.wod_id];
        const section = wod?.sections?.find((s: { id: string }) => s.id === r.section_id || r.section_id?.startsWith(s.id));

        // Skip if no meaningful result data
        const hasData = r.time_result || r.reps_result || r.weight_result || r.rounds_result || r.calories_result || r.metres_result || r.task_completed;
        if (!hasData) continue;

        items.push({
          id: r.id,
          userId: r.user_id,
          memberName: memberNames[r.user_id] || 'Unknown',
          targetType: 'wod_section_result',
          resultDate: r.workout_date,
          createdAt: r.created_at,
          sectionType: section?.type,
          sectionDuration: section?.duration,
          workoutName: wod?.workout_name || undefined,
          timeResult: r.time_result || undefined,
          repsResult: r.reps_result || undefined,
          weightResult: r.weight_result || undefined,
          roundsResult: r.rounds_result || undefined,
          caloriesResult: r.calories_result || undefined,
          metresResult: r.metres_result || undefined,
          scalingLevel: r.scaling_level || undefined,
          taskCompleted: r.task_completed ?? undefined,
        });
      }

      // Benchmark results
      for (const r of (benchmarkResults.data || [])) {
        const hasData = r.time_result || r.reps_result || r.weight_result;
        if (!hasData) continue;

        items.push({
          id: r.id,
          userId: r.user_id,
          memberName: memberNames[r.user_id] || 'Unknown',
          targetType: 'benchmark_result',
          resultDate: r.result_date,
          createdAt: r.created_at,
          benchmarkName: r.benchmark_name,
          benchmarkType: r.benchmark_type,
          timeResult: r.time_result || undefined,
          repsResult: r.reps_result || undefined,
          weightResult: r.weight_result || undefined,
          scalingLevel: r.scaling_level || undefined,
        });
      }

      // Lift records
      for (const r of (liftResults.data || [])) {
        items.push({
          id: r.id,
          userId: r.user_id,
          memberName: memberNames[r.user_id] || 'Unknown',
          targetType: 'lift_record',
          resultDate: r.lift_date,
          createdAt: r.created_at,
          liftName: r.lift_name,
          weightKg: r.weight_kg,
          reps: r.reps,
          repMaxType: r.rep_max_type || undefined,
          repScheme: r.rep_scheme || undefined,
          calculated1rm: r.calculated_1rm || undefined,
        });
      }

      // Sort by created_at descending
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Check if there's more data
      const totalResults = (wodResults.data?.length || 0) + (benchmarkResults.data?.length || 0) + (liftResults.data?.length || 0);
      if (totalResults === 0) setHasMore(false);

      if (append) {
        setFeedItems(prev => {
          const existingIds = new Set(prev.map(p => `${p.targetType}-${p.id}`));
          const newItems = items.filter(i => !existingIds.has(`${i.targetType}-${i.id}`));
          return [...prev, ...newItems];
        });
      } else {
        setFeedItems(items);
      }

      // Fetch reactions for all items
      if (items.length > 0) {
        fetchReactions(items.map(item => ({ targetType: item.targetType, targetId: item.id })));
      }

    } catch (err) {
      console.error('Failed to load community feed:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [fetchReactions]);

  useEffect(() => {
    loadFeed(0);
  }, [loadFeed]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadFeed(nextPage, true);
  };

  const handleRefresh = () => {
    setPage(0);
    setHasMore(true);
    loadFeed(0);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const renderResultBadge = (item: FeedItem) => {
    switch (item.targetType) {
      case 'wod_section_result':
        return (
          <span className='inline-block text-xs font-medium bg-green-100 text-green-800 rounded px-1.5 py-0.5'>
            WOD
          </span>
        );
      case 'benchmark_result':
        return (
          <span className='inline-block text-xs font-medium bg-teal-100 text-teal-800 rounded px-1.5 py-0.5'>
            Benchmark
          </span>
        );
      case 'lift_record':
        return (
          <span className='inline-block text-xs font-medium bg-blue-100 text-blue-800 rounded px-1.5 py-0.5'>
            Lift
          </span>
        );
    }
  };

  const renderResultDetails = (item: FeedItem) => {
    switch (item.targetType) {
      case 'wod_section_result':
        return (
          <div className='space-y-1'>
            <div className='font-medium text-gray-900 text-sm'>
              {item.sectionType || 'Workout'}
              {item.sectionDuration ? ` (${item.sectionDuration} min)` : ''}
              {item.workoutName && <span className='text-gray-500 ml-1'>- {item.workoutName}</span>}
            </div>
            <div className='text-sm text-gray-700 flex flex-wrap gap-x-3 gap-y-0.5'>
              {item.timeResult && <span>Time: {item.timeResult}</span>}
              {item.roundsResult && <span>Rounds: {item.roundsResult}</span>}
              {item.repsResult && <span>Reps: {item.repsResult}</span>}
              {item.weightResult && <span>Weight: {item.weightResult} kg</span>}
              {item.caloriesResult && <span>Calories: {item.caloriesResult}</span>}
              {item.metresResult && <span>Distance: {item.metresResult} m</span>}
              {item.scalingLevel && <span className='font-medium'>({item.scalingLevel})</span>}
              {item.taskCompleted !== undefined && (
                <span>{item.taskCompleted ? 'Completed' : 'Not completed'}</span>
              )}
            </div>
          </div>
        );

      case 'benchmark_result':
        return (
          <div className='space-y-1'>
            <div className='font-medium text-gray-900 text-sm'>
              {item.benchmarkName}
              {item.benchmarkType && <span className='text-gray-500 ml-1'>({item.benchmarkType})</span>}
            </div>
            <div className='text-sm text-gray-700 flex flex-wrap gap-x-3 gap-y-0.5'>
              {item.timeResult && <span>Time: {item.timeResult}</span>}
              {item.repsResult && <span>Reps: {item.repsResult}</span>}
              {item.weightResult && <span>Weight: {item.weightResult} kg</span>}
              {item.scalingLevel && <span className='font-medium'>({item.scalingLevel})</span>}
            </div>
          </div>
        );

      case 'lift_record':
        return (
          <div className='space-y-1'>
            <div className='font-medium text-gray-900 text-sm'>
              {item.liftName}
              {item.repMaxType && <span className='text-gray-500 ml-1'>({item.repMaxType})</span>}
            </div>
            <div className='text-sm text-gray-700 flex flex-wrap gap-x-3 gap-y-0.5'>
              {item.reps && <span>{item.reps} reps</span>}
              {item.weightKg && <span>@ {item.weightKg} kg</span>}
              {item.repScheme && <span>Scheme: {item.repScheme}</span>}
              {item.calculated1rm && <span>Est. 1RM: {item.calculated1rm} kg</span>}
            </div>
          </div>
        );
    }
  };

  return (
    <div className='space-y-4'>
      {/* Feed / Leaderboard Toggle */}
      <div className='bg-white rounded-lg shadow-sm p-2'>
        <div className='flex bg-gray-100 rounded-lg p-1'>
          <button
            onClick={() => setActiveView('feed')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
              activeView === 'feed' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Feed
          </button>
          <button
            onClick={() => setActiveView('leaderboard')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
              activeView === 'leaderboard' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Leaderboard
          </button>
        </div>
      </div>

      {activeView === 'leaderboard' ? (
        <LeaderboardView userId={userId} />
      ) : loading ? (
        <div className='flex justify-center py-12'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[#208479]' />
        </div>
      ) : (
      <>
      {/* Feed Header */}
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-bold text-gray-900'>Recent Results</h2>
        <button
          onClick={handleRefresh}
          className='p-2 hover:bg-gray-100 rounded-full transition text-gray-600'
          title='Refresh feed'
          aria-label='Refresh'
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Feed */}
      {feedItems.length === 0 ? (
        <div className='bg-white rounded-lg shadow-sm p-8 text-center'>
          <p className='text-gray-500'>No results logged recently.</p>
          <p className='text-gray-400 text-sm mt-1'>Results from all gym members will appear here.</p>
        </div>
      ) : (
        <div className='space-y-3'>
          {feedItems.map(item => {
            const reaction = getReaction(item.id);
            const isOwnResult = item.userId === userId;

            return (
              <div
                key={`${item.targetType}-${item.id}`}
                className={`bg-white rounded-lg shadow-sm p-4 border ${
                  isOwnResult ? 'border-[#208479]/30' : 'border-gray-100'
                }`}
              >
                {/* Header: name + date + badge */}
                <div className='flex items-center justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <div className='w-8 h-8 rounded-full bg-[#208479] text-white flex items-center justify-center text-sm font-bold flex-shrink-0'>
                      {item.memberName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className='font-semibold text-gray-900 text-sm'>
                        {isOwnResult ? 'You' : item.memberName}
                      </span>
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    {renderResultBadge(item)}
                    <span className='text-xs text-gray-400'>{formatDate(item.resultDate)}</span>
                  </div>
                </div>

                {/* Result details */}
                <div className='mb-3'>
                  {renderResultDetails(item)}
                </div>

                {/* Fist bump */}
                <div className='pt-2 border-t border-gray-100'>
                  <FistBumpButton
                    targetType={item.targetType}
                    targetId={item.id}
                    count={reaction.count}
                    userReacted={reaction.userReacted}
                    reactors={reaction.reactors}
                    onToggle={toggleReaction}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {hasMore && feedItems.length > 0 && (
        <div className='text-center py-4'>
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className='px-6 py-2 bg-[#208479] text-white rounded-lg hover:bg-[#1a6b62] transition disabled:opacity-50 text-sm font-medium'
          >
            {loadingMore ? 'Loading...' : 'Load Earlier Results'}
          </button>
        </div>
      )}
      </>
      )}
    </div>
  );
}
