/**
 * Supabase-backed named groups of session types (e.g. "Adults", "Kids").
 * Mirrors useExerciseGroups in lib/exercise-storage.ts. Syncs across the
 * coach's machines/profiles. Groups have no stored "active" flag — a group is
 * considered active in the UI when its session types are the current selection.
 */

import { supabase } from '@/lib/supabase';
import { useEffect, useState, useCallback } from 'react';

export interface SessionTypeGroup {
  id: string;
  name: string;
  session_types: string[];
  display_order: number;
}

export function useSessionTypeGroups() {
  const [groups, setGroups] = useState<SessionTypeGroup[]>([]);

  const loadGroups = useCallback(async () => {
    const { data, error } = await supabase
      .from('session_type_groups')
      .select('id, name, session_types, display_order')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading session type groups:', error);
      return;
    }

    setGroups(data || []);
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const createGroup = useCallback(async (name: string, sessionTypes: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newGroup: SessionTypeGroup = {
      id: crypto.randomUUID(),
      name,
      session_types: sessionTypes,
      display_order: groups.length,
    };

    // Optimistic update
    setGroups(prev => [...prev, newGroup]);

    const { error } = await supabase
      .from('session_type_groups')
      .insert({
        user_id: user.id,
        name,
        session_types: sessionTypes,
        display_order: groups.length,
      });

    if (error) {
      console.error('Error creating session type group:', error);
      loadGroups();
    }
  }, [groups.length, loadGroups]);

  const deleteGroup = useCallback(async (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));

    const { error } = await supabase
      .from('session_type_groups')
      .delete()
      .eq('id', groupId);

    if (error) {
      console.error('Error deleting session type group:', error);
      loadGroups();
    }
  }, [loadGroups]);

  const renameGroup = useCallback(async (groupId: string, name: string) => {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, name } : g));

    const { error } = await supabase
      .from('session_type_groups')
      .update({ name })
      .eq('id', groupId);

    if (error) {
      console.error('Error renaming session type group:', error);
      loadGroups();
    }
  }, [loadGroups]);

  const updateGroupSessionTypes = useCallback(async (groupId: string, sessionTypes: string[]) => {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, session_types: sessionTypes } : g));

    const { error } = await supabase
      .from('session_type_groups')
      .update({ session_types: sessionTypes })
      .eq('id', groupId);

    if (error) {
      console.error('Error updating session type group:', error);
      loadGroups();
    }
  }, [loadGroups]);

  return {
    groups,
    createGroup,
    deleteGroup,
    renameGroup,
    updateGroupSessionTypes,
  };
}
