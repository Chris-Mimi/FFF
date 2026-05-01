'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { PersonalActivity, PersonalActivityInput } from '@/types/personal-activity';

export function usePersonalActivities(userId: string | null) {
  const [activities, setActivities] = useState<PersonalActivity[]>([]);
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

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const createActivity = async (input: PersonalActivityInput): Promise<boolean> => {
    if (!userId) return false;
    const { error } = await supabase
      .from('personal_activities')
      .insert({ ...input, user_id: userId });
    if (error) {
      toast.error('Failed to save activity');
      return false;
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

  return { activities, loading, createActivity, updateActivity, deleteActivity, refetch: fetchActivities };
}
