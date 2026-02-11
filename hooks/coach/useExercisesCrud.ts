import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export interface Exercise {
  id: string;
  name: string;
  display_name?: string;
  category: string;
  subcategory?: string;
  description: string | null;
  video_url: string | null;
  tags: string[] | null;
  equipment?: string[];
  body_parts?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  is_warmup?: boolean;
  is_stretch?: boolean;
  search_terms?: string;
}

export function useExercisesCrud() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [collapsedExerciseCategories, setCollapsedExerciseCategories] = useState<Record<string, boolean>>({});
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');

  // Video modal state
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('');
  const [selectedVideoName, setSelectedVideoName] = useState('');

  const fetchExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('category', { ascending: true});

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    }
  };

  const handleSaveExercise = async (exerciseData: Omit<Exercise, 'id'> & { id?: string }) => {
    try {
      if (exerciseData.id) {
        const { error } = await supabase
          .from('exercises')
          .update({
            ...exerciseData,
            updated_at: new Date().toISOString()
          })
          .eq('id', exerciseData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('exercises')
          .insert(exerciseData);

        if (error) throw error;
      }

      setShowExerciseModal(false);
      setEditingExercise(null);
      fetchExercises();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error saving exercise:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      const errorMessage = error?.message || error?.error_description || error?.msg || 'Unknown error';
      toast.error(`Error saving exercise: ${errorMessage}`);
    }
  };

  const handleDeleteExercise = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exercise?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchExercises();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: unknown) {
      console.error('Error deleting exercise:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const toggleExerciseCategory = (category: string) => {
    setCollapsedExerciseCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const openVideoModal = (videoUrl: string, exerciseName: string) => {
    setSelectedVideoUrl(videoUrl);
    setSelectedVideoName(exerciseName);
    setVideoModalOpen(true);
  };

  const closeVideoModal = () => {
    setVideoModalOpen(false);
    setSelectedVideoUrl('');
    setSelectedVideoName('');
  };

  return {
    exercises,
    showExerciseModal,
    setShowExerciseModal,
    editingExercise,
    setEditingExercise,
    collapsedExerciseCategories,
    exerciseSearchTerm,
    setExerciseSearchTerm,
    videoModalOpen,
    selectedVideoUrl,
    selectedVideoName,
    fetchExercises,
    handleSaveExercise,
    handleDeleteExercise,
    toggleExerciseCategory,
    openVideoModal,
    closeVideoModal,
  };
}
