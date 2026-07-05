'use client';

import { confirm } from '@/lib/confirm';
import { WODFormData } from '@/components/coach/WorkoutModal';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/auth-fetch';
import { toast } from 'sonner';
import { formatDate, calculateWorkoutWeek } from '@/utils/date-utils';

interface UseWODOperationsProps {
  fetchWODs: () => Promise<void>;
  fetchTracksAndCounts: () => Promise<void>;
}

export const useWODOperations = ({ fetchWODs, fetchTracksAndCounts }: UseWODOperationsProps) => {
  const handleSaveWOD = async (
    wodData: WODFormData,
    editingWOD: WODFormData | null,
    modalDate: Date
  ) => {
    const dateKey = formatDate(modalDate);
    const workoutWeek = calculateWorkoutWeek(modalDate);
    // Trim workout_name to prevent whitespace-only differences splitting leaderboard results
    if (wodData.workout_name) wodData.workout_name = wodData.workout_name.trim();

    // RM-test lift sections store the lifted weight as their score, so they MUST
    // carry scoring_fields.load = true. The score-entry grid synthesises this in
    // memory (useScoreEntry) but never persisted it, leaving the stored WOD with
    // load:false/undefined. That was a silent data-loss trap: the edit-cleanup
    // below nulls weight_result whenever load flips true→false, so re-saving one
    // of these WODs (e.g. to rename the lift) wiped every athlete's lifted weight
    // — the Back Squat Testing 3&1RM incident. Forcing load:true here makes that
    // flip impossible and stops the leaderboard safeguard from hiding the weight.
    for (const s of (wodData.sections || []) as Array<{
      lifts?: Array<{ rm_test?: string }>;
      scoring_fields?: { load?: boolean };
    }>) {
      if (s.lifts?.some(l => l.rm_test) && s.scoring_fields?.load !== true) {
        s.scoring_fields = { ...s.scoring_fields, load: true };
      }
    }

    // Capacity is owned by weekly_sessions.capacity and edited via Session Management Modal.
    // New session inserts default to 12; existing sessions are never touched here. The
    // wods.max_capacity column was dropped in S362 after years of being a drift landmine.

    try {
      // Check if we're editing a real workout (not an empty session with 'session-{uuid}' id)
      const isEditingRealWorkout = editingWOD && editingWOD.id && !editingWOD.id.startsWith('session-');

      if (isEditingRealWorkout) {
        const hasContent = wodData.sections && wodData.sections.length > 0;

        // Cascade-delete result rows for sections being removed in this save. Without
        // this, removed sections leave orphan wod_section_results rows that surface in
        // the leaderboard / analytics weeks later. Also cascades to lift_records (which
        // have no section_id, so we match on (lift_name, rep_max_type|rep_scheme) tuples
        // and only delete tuples not still present in a kept section).
        type SectionScoringFields = {
          load?: boolean;
          load2?: boolean;
          load3?: boolean;
          scaling?: boolean;
          scaling_2?: boolean;
          scaling_3?: boolean;
        };
        type OldSection = {
          id: string;
          type: string;
          scoring_fields?: SectionScoringFields;
          lifts?: Array<{
            name?: string;
            rm_test?: string;
            rep_type?: 'constant' | 'variable';
            sets?: number;
            reps?: number;
            variable_sets?: Array<{ reps: number }>;
          }>;
        };
        const liftTupleKey = (l: NonNullable<OldSection['lifts']>[number]): string | null => {
          if (!l.name) return null;
          if (l.rm_test) return `${l.name}|RM:${l.rm_test}`;
          const repScheme = l.rep_type === 'constant'
            ? `${l.sets || 1}x${l.reps || 1}`
            : (l.variable_sets || []).map(s => s.reps).join('-') || '1';
          return `${l.name}|RS:${repScheme}`;
        };
        const collectLiftTuples = (sections: OldSection[]): Set<string> => {
          const out = new Set<string>();
          for (const s of sections) {
            for (const l of s.lifts || []) {
              const k = liftTupleKey(l);
              if (k) out.add(k);
            }
          }
          return out;
        };

        const newSectionIds = new Set((wodData.sections || []).map(s => s.id));
        const { data: oldWod } = await supabase
          .from('wods')
          .select('sections')
          .eq('id', editingWOD.id!)
          .maybeSingle();
        const oldSections = ((oldWod?.sections as OldSection[] | null) || []);
        const allRemovedSections = oldSections.filter(s => !newSectionIds.has(s.id));

        // Rename detection. Section IDs use `section-${Date.now()}` and regenerate
        // on drag-drop or remove-and-re-add, even when the section's type/role is
        // unchanged. Without this step, the cascade below would treat every
        // regenerated ID as a removal and silently offer to delete its WSRs —
        // the S356 incident. For each removed-old, match positionally to an
        // unmatched-new section of the same type and migrate WSR section_id
        // instead of deleting. Genuine type-changes / actual removals still
        // fall through to the cascade.
        const oldSectionIds = new Set(oldSections.map(s => s.id));
        const unmatchedNewSections = ((wodData.sections || []) as OldSection[])
          .filter(s => !oldSectionIds.has(s.id));
        const removedByType = new Map<string, OldSection[]>();
        for (const old of allRemovedSections) {
          if (!removedByType.has(old.type)) removedByType.set(old.type, []);
          removedByType.get(old.type)!.push(old);
        }
        const unmatchedNewByType = new Map<string, OldSection[]>();
        for (const n of unmatchedNewSections) {
          if (!unmatchedNewByType.has(n.type)) unmatchedNewByType.set(n.type, []);
          unmatchedNewByType.get(n.type)!.push(n);
        }
        const migrations = new Map<string, string>();
        for (const [type, removedOfType] of removedByType) {
          const candidates = unmatchedNewByType.get(type) || [];
          const pairCount = Math.min(removedOfType.length, candidates.length);
          for (let i = 0; i < pairCount; i++) {
            migrations.set(removedOfType[i].id, candidates[i].id);
          }
        }
        // Athlete-data writes (section_id migrations, score/lift deletes, scoring-
        // field clears) are collected here and applied together at the end via the
        // service-role endpoint. Running them on the coach's browser token would
        // silently match 0 rows under athlete RLS (the S344 ghost-score bug). (S393)
        const sectionMigrations: { fromKey: string; toKey: string }[] = [];
        for (const [oldId, newId] of migrations) {
          sectionMigrations.push({
            fromKey: `${oldId}-content-0`,
            toKey: `${newId}-content-0`,
          });
        }
        let deleteSectionKeys: string[] = [];
        let deleteLiftRecordIds: string[] = [];
        const fieldClears: { sectionKey: string; columns: string[] }[] = [];

        const removedSections = allRemovedSections.filter(s => !migrations.has(s.id));
        const removedSectionIds = removedSections.map(s => s.id);

        if (removedSectionIds.length > 0) {
          const removedKeys = removedSectionIds.map(id => `${id}-content-0`);
          const { data: affectedRows } = await supabase
            .from('wod_section_results')
            .select('id, member_id, user_id, whiteboard_name')
            .eq('wod_id', editingWOD.id!)
            .in('section_id', removedKeys);

          const removedLiftTuples = collectLiftTuples(removedSections);
          const keptLiftTuples = collectLiftTuples((wodData.sections || []) as OldSection[]);
          const tuplesToDelete = new Set(
            [...removedLiftTuples].filter(t => !keptLiftTuples.has(t))
          );

          let liftRowsToDelete: string[] = [];
          if (tuplesToDelete.size > 0) {
            const liftNames = [...new Set(
              [...tuplesToDelete].map(t => t.split('|')[0])
            )];
            const { data: liftCandidates } = await supabase
              .from('lift_records')
              .select('id, lift_name, rep_max_type, rep_scheme')
              .eq('wod_id', editingWOD.id!)
              .in('lift_name', liftNames);
            liftRowsToDelete = (liftCandidates || [])
              .filter(r => {
                const key = r.rep_max_type
                  ? `${r.lift_name}|RM:${r.rep_max_type}`
                  : `${r.lift_name}|RS:${r.rep_scheme}`;
                return tuplesToDelete.has(key);
              })
              .map(r => r.id as string);
          }

          const rowCount = affectedRows?.length || 0;
          const liftCount = liftRowsToDelete.length;
          if (rowCount > 0 || liftCount > 0) {
            const athleteCount = new Set(
              (affectedRows || []).map(r => r.member_id || r.user_id || `wb:${r.whiteboard_name}`)
            ).size;
            const parts: string[] = [];
            if (rowCount > 0) {
              parts.push(`${rowCount} score${rowCount === 1 ? '' : 's'} from ${athleteCount} athlete${athleteCount === 1 ? '' : 's'}`);
            }
            if (liftCount > 0) {
              parts.push(`${liftCount} lift record${liftCount === 1 ? '' : 's'}`);
            }
            const ok = await confirm({
              title: 'Remove sections with saved data?',
              message: `Saving will delete ${parts.join(' and ')} on the section${removedSectionIds.length === 1 ? '' : 's'} you removed.\n\nThis cannot be undone.`,
              confirmText: 'Delete and save',
              variant: 'danger',
            });
            if (!ok) return;
            if (rowCount > 0) {
              deleteSectionKeys = removedKeys;
            }
            if (liftCount > 0) {
              deleteLiftRecordIds = liftRowsToDelete;
            }
          }
        }

        // For sections that survived the edit (or were just migrated by the
        // rename-detection step above), detect any scoring_fields that flipped
        // from true → false and null the corresponding columns on existing
        // wod_section_results. Without this, the leaderboard ranker's safeguard
        // would still hide the values, but stale data would persist in the DB
        // and could resurface if the toggle is flipped back on.
        const newSectionsById = new Map(
          ((wodData.sections || []) as OldSection[]).map((s) => [s.id, s])
        );
        const fieldToColumn: Array<{
          field: keyof SectionScoringFields;
          column: string;
        }> = [
          { field: 'load', column: 'weight_result' },
          { field: 'load2', column: 'weight_result_2' },
          { field: 'load3', column: 'weight_result_3' },
          { field: 'scaling', column: 'scaling_level' },
          { field: 'scaling_2', column: 'scaling_level_2' },
          { field: 'scaling_3', column: 'scaling_level_3' },
        ];
        for (const oldS of oldSections) {
          // Resolve to the new section: survivor (same id) or migration target.
          const newId = migrations.get(oldS.id) ?? oldS.id;
          const newS = newSectionsById.get(newId);
          if (!newS) continue;
          const oldSf = oldS.scoring_fields || {};
          const newSf = newS.scoring_fields || {};
          const cleared: Record<string, null> = {};
          for (const { field, column } of fieldToColumn) {
            if (oldSf[field] === true && newSf[field] !== true) {
              cleared[column] = null;
            }
          }
          if (Object.keys(cleared).length > 0) {
            // WSRs now live at newId-content-0 (server applies the migration first).
            fieldClears.push({
              sectionKey: `${newS.id}-content-0`,
              columns: Object.keys(cleared),
            });
          }
        }

        // Apply every athlete-data write server-side (service role) so none of them
        // silently no-ops under RLS. If it fails, stop before touching the WOD so the
        // coach isn't told the edit saved when the score cleanup didn't. (S393)
        if (
          sectionMigrations.length > 0 ||
          deleteSectionKeys.length > 0 ||
          deleteLiftRecordIds.length > 0 ||
          fieldClears.length > 0
        ) {
          const cleanupRes = await authFetch('/api/sessions/edit-section-results', {
            method: 'POST',
            body: JSON.stringify({
              wodId: editingWOD.id!,
              migrations: sectionMigrations,
              deleteSectionKeys,
              deleteLiftRecordIds,
              fieldClears,
            }),
          });
          if (!cleanupRes.ok) {
            toast.error('Could not update athlete scores for the edited sections. No changes saved — please try again.');
            return;
          }
        }

        const { error } = await supabase
          .from('wods')
          .update({
            title: wodData.title,
            session_type: wodData.title || wodData.session_type,
            workout_name: wodData.workout_name || null,
            workout_week: workoutWeek,
            track_id: wodData.track_id || null,
            workout_type_id: wodData.workout_type_id || null,
            class_times: wodData.classTimes,
            date: dateKey,
            sections: wodData.sections,
            coach_notes: wodData.coach_notes || null,
            workout_publish_status: hasContent ? (editingWOD.workout_publish_status || 'draft') : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingWOD.id);

        if (error) throw error;

        if (editingWOD.booking_info?.session_id) {
          // Re-affirm published for an already-visible session, but NEVER unhide a
          // coach-hidden (draft) or cancelled one — only the Hide/Unhide toggle may
          // change visibility. The `.neq` filters make this a no-op for draft/
          // cancelled rows, so editing+saving a workout can't silently unhide it. (S384)
          await supabase
            .from('weekly_sessions')
            .update({ status: 'published' })
            .eq('id', editingWOD.booking_info.session_id)
            .neq('status', 'draft')
            .neq('status', 'cancelled');
        }

        // Sync the type label across three columns. wods.title is the UI-driven source
        // of truth (the "Session Type" input writes to it); wods.session_type and
        // weekly_sessions.workout_type are mirrors. Athlete book page reads workout_type,
        // so without this sync the athlete app shows the old schedule-template value.
        await supabase
          .from('weekly_sessions')
          .update({ workout_type: wodData.title || wodData.session_type })
          .eq('workout_id', editingWOD.id);

      } else {
        const hasContent = wodData.sections && wodData.sections.length > 0;

        // Duplicate guard: if saving to an existing session, check if it already has a workout
        // (prevents duplicates from double-click or race conditions)
        if (editingWOD?.booking_info?.session_id) {
          const { data: currentSession } = await supabase
            .from('weekly_sessions')
            .select('workout_id')
            .eq('id', editingWOD.booking_info.session_id)
            .single();

          if (currentSession?.workout_id) {
            // Session already has a workout — update it instead of creating a duplicate
            const { error: updateError } = await supabase
              .from('wods')
              .update({
                title: wodData.title,
                session_type: wodData.title || wodData.session_type,
                workout_name: wodData.workout_name || null,
                workout_week: workoutWeek,
                track_id: wodData.track_id || null,
                workout_type_id: wodData.workout_type_id || null,
                class_times: wodData.classTimes,
                date: dateKey,
                sections: wodData.sections,
                coach_notes: wodData.coach_notes || null,
                workout_publish_status: hasContent ? 'draft' : null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', currentSession.workout_id);

            if (updateError) throw updateError;

            await supabase
              .from('weekly_sessions')
              .update({ workout_type: wodData.title || wodData.session_type })
              .eq('workout_id', currentSession.workout_id);

            await fetchWODs();
            await fetchTracksAndCounts();
            return;
          }
        }

        // Belt-and-braces orphan prevention: if any session at date+classTime already
        // has a linked workout, update that workout instead of inserting a new one.
        // Catches rapid re-saves where editingWOD.booking_info.session_id wasn't passed.
        if (
          wodData.classTimes &&
          wodData.classTimes.length > 0
        ) {
          const { data: preexistingLinked } = await supabase
            .from('weekly_sessions')
            .select('workout_id')
            .eq('date', dateKey)
            .in('time', wodData.classTimes)
            .not('workout_id', 'is', null)
            .limit(1);

          const targetWorkoutId = preexistingLinked?.[0]?.workout_id;
          if (targetWorkoutId) {
            const { error: updateError } = await supabase
              .from('wods')
              .update({
                title: wodData.title,
                session_type: wodData.title || wodData.session_type,
                workout_name: wodData.workout_name || null,
                workout_week: workoutWeek,
                track_id: wodData.track_id || null,
                workout_type_id: wodData.workout_type_id || null,
                class_times: wodData.classTimes,
                date: dateKey,
                sections: wodData.sections,
                coach_notes: wodData.coach_notes || null,
                workout_publish_status: hasContent ? 'draft' : null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', targetWorkoutId);

            if (updateError) throw updateError;

            for (const time of wodData.classTimes) {
              const { data: existingSession } = await supabase
                .from('weekly_sessions')
                .select('id')
                .eq('date', dateKey)
                .eq('time', time)
                .maybeSingle();

              if (existingSession) {
                await supabase
                  .from('weekly_sessions')
                  .update({ workout_id: targetWorkoutId, status: 'published' })
                  .eq('id', existingSession.id);
              } else {
                await supabase.from('weekly_sessions').insert({
                  date: dateKey,
                  time: time,
                  workout_id: targetWorkoutId,
                  capacity: 12,
                  status: 'published',
                });
              }
            }

            await supabase
              .from('weekly_sessions')
              .update({ workout_type: wodData.title || wodData.session_type })
              .eq('workout_id', targetWorkoutId);

            await fetchWODs();
            await fetchTracksAndCounts();
            return;
          }
        }

        const { data: newWOD, error } = await supabase
          .from('wods')
          .insert([
            {
              title: wodData.title,
              session_type: wodData.title || wodData.session_type,
              workout_name: wodData.workout_name || null,
              workout_week: workoutWeek,
              track_id: wodData.track_id || null,
              workout_type_id: wodData.workout_type_id || null,
              class_times: wodData.classTimes,
              date: dateKey,
              sections: wodData.sections,
              coach_notes: wodData.coach_notes || null,
              workout_publish_status: hasContent ? 'draft' : null,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        const { data: _existingSessions } = await supabase
          .from('weekly_sessions')
          .select('id')
          .eq('date', dateKey);

        if (wodData.classTimes && wodData.classTimes.length > 0 && newWOD) {
          for (const time of wodData.classTimes) {
            // Check if session exists at this date/time
            const { data: existingSession } = await supabase
              .from('weekly_sessions')
              .select('id')
              .eq('date', dateKey)
              .eq('time', time)
              .maybeSingle();

            if (existingSession) {
              // Update existing session
              await supabase
                .from('weekly_sessions')
                .update({ workout_id: newWOD.id, status: 'published' })
                .eq('id', existingSession.id);
            } else {
              // Create new session
              await supabase.from('weekly_sessions').insert({
                date: dateKey,
                time: time,
                workout_id: newWOD.id,
                capacity: 12,
                status: 'published'
              });
            }
          }
        } else if (editingWOD?.booking_info?.session_id && newWOD) {
          // Editing an empty session - link the new workout to this session
          await supabase
            .from('weekly_sessions')
            .update({ workout_id: newWOD.id, status: 'published' })
            .eq('id', editingWOD.booking_info.session_id);
        }

        // Guard: verify the new wod is linked to at least one session
        if (newWOD) {
          const { data: linkedSessions } = await supabase
            .from('weekly_sessions')
            .select('id')
            .eq('workout_id', newWOD.id)
            .limit(1);

          if (!linkedSessions || linkedSessions.length === 0) {
            // Delete the orphaned wod
            await supabase.from('wods').delete().eq('id', newWOD.id);
            toast.error('Could not save: no session time slot linked. Please select a time.');
            return;
          }

          await supabase
            .from('weekly_sessions')
            .update({ workout_type: wodData.title || wodData.session_type })
            .eq('workout_id', newWOD.id);
        }
      }

      await fetchWODs();
      await fetchTracksAndCounts();
    } catch (error) {
      console.error('Error saving WOD:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Error saving WOD: ${errorMessage}`);
    }
  };

  // Return to empty state (session kept, workout removed)
  const handleDeleteWODToEmpty = async (wodId: string) => {
    try {
      // Set session workout_id to NULL (session returns to empty state)
      await supabase
        .from('weekly_sessions')
        .update({ workout_id: null })
        .eq('workout_id', wodId);

      // Delete the workout
      const { error } = await supabase.from('wods').delete().eq('id', wodId);
      if (error) throw error;

      await fetchWODs();
      await fetchTracksAndCounts();
    } catch (error) {
      console.error('Error deleting WOD:', error);
      toast.error('Error deleting WOD. Please try again.');
    }
  };

  // Permanent delete (completely removes workout from database)
  const handleDeleteWODPermanently = async (wodId: string) => {
    try {
      // Delete the workout (cascade should handle session references)
      const { error } = await supabase.from('wods').delete().eq('id', wodId);
      if (error) throw error;

      await fetchWODs();
      await fetchTracksAndCounts();
    } catch (error) {
      console.error('Error permanently deleting WOD:', error);
      toast.error('Error permanently deleting WOD. Please try again.');
    }
  };

  // Legacy function that returns callback data for modal
  const handleDeleteWOD = async (dateKey: string, wodId: string) => {
    if (wodId.startsWith('session-')) {
      toast.warning('Cannot delete empty sessions. Click to add workout content instead.');
      return null;
    }

    // Return wodId so the parent can open the modal
    return wodId;
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!await confirm({ title: 'Delete Session', message: 'Delete this session entirely? This cancels every booking for this time slot and clears any scores entered for those athletes.', confirmText: 'Delete', variant: 'danger' })) return;

    try {
      const res = await authFetch('/api/coach/delete-session', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to delete session');
      }

      await fetchWODs();
      await fetchTracksAndCounts();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Error deleting session. Please try again.');
    }
  };

  const handleCopyWOD = async (wod: WODFormData, targetDate: Date, targetSessionId?: string) => {
    const dateKey = formatDate(targetDate);

    try {
      // ALWAYS fetch session times from the database (classTimes can be stale)
      let timesToCreate: string[] = [];

      if (wod.id && !wod.id.startsWith('session-')) {
        // Fetch session times for this workout from the database
        const { data: sourceSessions, error: sessionsFetchError } = await supabase
          .from('weekly_sessions')
          .select('time')
          .eq('workout_id', wod.id)
          .order('time', { ascending: true });

        if (!sessionsFetchError && sourceSessions && sourceSessions.length > 0) {
          timesToCreate = sourceSessions.map(s => s.time);
        }
      }

      // Fallback to classTimes only if DB fetch returned nothing
      if (timesToCreate.length === 0 && wod.classTimes && wod.classTimes.length > 0) {
        timesToCreate = wod.classTimes;
      }

      // Calculate workout_week for target date
      const targetWorkoutWeek = calculateWorkoutWeek(targetDate);

      // Collect old WOD IDs and clean up Calendar events before overwriting
      const oldWodIds: string[] = [];

      if (targetSessionId) {
        // Find the old workout linked to this session
        const { data: oldSession } = await supabase
          .from('weekly_sessions')
          .select('workout_id')
          .eq('id', targetSessionId)
          .single();

        if (oldSession?.workout_id) {
          oldWodIds.push(oldSession.workout_id);
          const { data: oldWod } = await supabase
            .from('wods')
            .select('google_event_id')
            .eq('id', oldSession.workout_id)
            .single();

          if (oldWod?.google_event_id) {
            try {
              await authFetch(`/api/google/publish-workout?workoutId=${oldSession.workout_id}`, {
                method: 'DELETE',
              });
            } catch {
              // Continue even if calendar cleanup fails
            }
          }
        }
      } else if (timesToCreate.length > 0) {
        // Find old workouts at matching date/time slots
        for (const time of timesToCreate) {
          const { data: oldSessions } = await supabase
            .from('weekly_sessions')
            .select('id, workout_id')
            .eq('date', dateKey)
            .eq('time', time);

          if (oldSessions && oldSessions.length > 0) {
            // Collect unique workout IDs for cleanup
            for (const s of oldSessions) {
              if (s.workout_id && !oldWodIds.includes(s.workout_id)) {
                oldWodIds.push(s.workout_id);
                const { data: oldWod } = await supabase
                  .from('wods')
                  .select('google_event_id')
                  .eq('id', s.workout_id)
                  .single();

                if (oldWod?.google_event_id) {
                  try {
                    await authFetch(`/api/google/publish-workout?workoutId=${s.workout_id}`, {
                      method: 'DELETE',
                    });
                  } catch {
                    // Continue even if calendar cleanup fails
                  }
                }
              }
            }

            // Delete any duplicate sessions at this date/time (keep first, delete rest)
            if (oldSessions.length > 1) {
              const duplicateIds = oldSessions.slice(1).map(s => s.id);
              await supabase.from('weekly_sessions').delete().in('id', duplicateIds);
            }
          }
        }
      }

      const { data: newWorkout, error: workoutError } = await supabase
        .from('wods')
        .insert([
          {
            title: wod.title,
            session_type: wod.title || wod.session_type,
            workout_name: wod.workout_name?.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/) ? null : (wod.workout_name?.trim() || null),
            workout_week: targetWorkoutWeek,
            track_id: wod.track_id || null,
            workout_type_id: wod.workout_type_id || null,
            class_times: timesToCreate,
            date: dateKey,
            sections: wod.sections,
            workout_publish_status: 'draft',
            is_published: false,
          },
        ])
        .select()
        .single();

      if (workoutError) throw workoutError;

      if (targetSessionId && newWorkout) {
        // Update existing session with new workout
        const { error: sessionError } = await supabase
          .from('weekly_sessions')
          .update({ workout_id: newWorkout.id })
          .eq('id', targetSessionId);

        if (sessionError) throw sessionError;
      } else if (newWorkout && timesToCreate.length > 0) {
        // No target session - create or update sessions at the same times as source workout
        for (const time of timesToCreate) {
          // Check if session(s) exist at this date/time
          const { data: existingSessions } = await supabase
            .from('weekly_sessions')
            .select('id')
            .eq('date', dateKey)
            .eq('time', time);

          if (existingSessions && existingSessions.length > 0) {
            // Update first session
            await supabase
              .from('weekly_sessions')
              .update({
                workout_id: newWorkout.id,
                status: 'published'
              })
              .eq('id', existingSessions[0].id);

            // Delete any duplicates
            if (existingSessions.length > 1) {
              const duplicateIds = existingSessions.slice(1).map(s => s.id);
              await supabase.from('weekly_sessions').delete().in('id', duplicateIds);
            }
          } else {
            // Create new session
            await supabase.from('weekly_sessions').insert({
              date: dateKey,
              time: time,
              workout_id: newWorkout.id,
              capacity: 12,
              status: 'published'
            });
          }
        }
      }

      if (newWorkout) {
        await supabase
          .from('weekly_sessions')
          .update({ workout_type: wod.title || wod.session_type })
          .eq('workout_id', newWorkout.id);
      }

      // Clean up old workouts: only delete if no sessions still reference them
      if (oldWodIds.length > 0) {
        const orphanWodIds: string[] = [];
        for (const wodId of oldWodIds) {
          const { data: refs } = await supabase
            .from('weekly_sessions')
            .select('id')
            .eq('workout_id', wodId)
            .limit(1);

          if (!refs || refs.length === 0) {
            orphanWodIds.push(wodId);
          }
        }

        if (orphanWodIds.length > 0) {
          // Delete athlete results via service role API (RLS blocks coach from deleting athlete data)
          try {
            await authFetch('/api/sessions/cleanup-results', {
              method: 'DELETE',
              body: JSON.stringify({ wodIds: orphanWodIds }),
            });
          } catch {
            // Continue even if cleanup fails
          }

          // Delete the orphaned workout rows
          await supabase
            .from('wods')
            .delete()
            .in('id', orphanWodIds);
        }
      }

      await fetchWODs();
      await fetchTracksAndCounts();
    } catch (error) {
      console.error('Error copying WOD:', error);
      toast.error('Error copying WOD. Please try again.');
    }
  };

  return {
    handleSaveWOD,
    handleDeleteWOD,
    handleDeleteWODToEmpty,
    handleDeleteWODPermanently,
    handleDeleteSession,
    handleCopyWOD,
  };
};
