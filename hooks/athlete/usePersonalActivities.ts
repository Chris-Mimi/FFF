'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  PERSONAL_ACTIVITY_TYPES,
  type PersonalActivity,
  type PersonalActivityInput,
  type PersonalActivityCustomType,
} from '@/types/personal-activity';

const isPresetType = (t: string): boolean =>
  (PERSONAL_ACTIVITY_TYPES as readonly string[]).includes(t);

export function usePersonalActivities(userId: string | null) {
  const [activities, setActivities] = useState<PersonalActivity[]>([]);
  const [customTypes, setCustomTypes] = useState<PersonalActivityCustomType[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActivities = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('personal_activities')
      .select('*')
      .eq('user_id', userId)
      .order('activity_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching personal activities:', error);
      toast.error('Failed to load activities');
      setLoading(false);
      return;
    }
    setActivities((data || []) as PersonalActivity[]);
    setLoading(false);
  }, [userId]);

  const fetchCustomTypes = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('personal_activity_custom_types')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });
    if (error) {
      console.error('Error fetching custom activity types:', error);
      return;
    }
    setCustomTypes((data || []) as PersonalActivityCustomType[]);
  }, [userId]);

  useEffect(() => {
    fetchActivities();
    fetchCustomTypes();
  }, [fetchActivities, fetchCustomTypes]);

  const ensureCustomType = async (name: string) => {
    if (!userId) return;
    const trimmed = name.trim();
    if (trimmed === '' || isPresetType(trimmed)) return;
    // Check for existing entry case-insensitively (the unique index is on
    // lower(name); .upsert() onConflict can't target expression indexes).
    const { data: existing } = await supabase
      .from('personal_activity_custom_types')
      .select('id')
      .eq('user_id', userId)
      .ilike('name', trimmed)
      .maybeSingle();
    if (existing) return;
    const { error } = await supabase
      .from('personal_activity_custom_types')
      .insert({ user_id: userId, name: trimmed });
    if (error) {
      // Non-fatal: the activity still saves; we just don't get the dropdown entry.
      console.error('Error saving custom activity type:', error);
      return;
    }
    await fetchCustomTypes();
  };

  const deleteCustomType = async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('personal_activity_custom_types')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Failed to delete custom activity');
      return false;
    }
    toast.success('Custom activity removed');
    await fetchCustomTypes();
    return true;
  };

  const createActivity = async (input: PersonalActivityInput): Promise<boolean> => {
    if (!userId) return false;
    const { error } = await supabase
      .from('personal_activities')
      .insert({ ...input, user_id: userId });
    if (error) {
      toast.error('Failed to save activity');
      return false;
    }
    if (!isPresetType(input.activity_type)) {
      await ensureCustomType(input.activity_type);
    }
    toast.success('Activity saved');
    await fetchActivities();
    return true;
  };

  const updateActivity = async (id: string, input: PersonalActivityInput) => {
    const { error } = await supabase
      .from('personal_activities')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast.error('Failed to update activity');
      return false;
    }
    if (!isPresetType(input.activity_type)) {
      await ensureCustomType(input.activity_type);
    }
    toast.success('Activity updated');
    await fetchActivities();
    return true;
  };

  const deleteActivity = async (id: string) => {
    const { error } = await supabase
      .from('personal_activities')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Failed to delete activity');
      return false;
    }
    toast.success('Activity deleted');
    await fetchActivities();
    return true;
  };

  return {
    activities,
    customTypes,
    loading,
    createActivity,
    updateActivity,
    deleteActivity,
    deleteCustomType,
    refetch: fetchActivities,
  };
}
