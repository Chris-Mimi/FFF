'use client';

import BenchmarksTab from '@/components/coach/BenchmarksTab';
import ExercisesTab from '@/components/coach/ExercisesTab';
import ExerciseVideoModal from '@/components/coach/ExerciseVideoModal';
import ForgeBenchmarksTab from '@/components/coach/ForgeBenchmarksTab';
import LiftsTab from '@/components/coach/LiftsTab';
import ReferencesTab from '@/components/coach/ReferencesTab';
import ProgrammingNotesTab from '@/components/coach/ProgrammingNotesTab';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { DragEndEvent } from '@dnd-kit/core';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Benchmark {
  id: string;
  name: string;
  type: string;
  description: string | null;
  display_order: number;
}

interface Lift {
  id: string;
  name: string;
  category: string;
  display_order: number;
}

interface Exercise {
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

export default function BenchmarksLiftsManagementPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'benchmarks' | 'forge' | 'lifts' | 'exercises' | 'references' | 'tracks' | 'notes'>('benchmarks');
  const [loading, setLoading] = useState(true);

  // Benchmarks state
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [showBenchmarkModal, setShowBenchmarkModal] = useState(false);
  const [editingBenchmark, setEditingBenchmark] = useState<Benchmark | null>(null);
  const [benchmarkForm, setBenchmarkForm] = useState({
    name: '',
    type: '',
    description: '',
    display_order: 0,
    has_scaling: true
  });

  // Forge Benchmarks state
  const [forgeBenchmarks, setForgeBenchmarks] = useState<Benchmark[]>([]);
  const [showForgeModal, setShowForgeModal] = useState(false);
  const [editingForge, setEditingForge] = useState<Benchmark | null>(null);
  const [forgeForm, setForgeForm] = useState({
    name: '',
    type: '',
    description: '',
    display_order: 0,
    has_scaling: true
  });

  // Lifts state
  const [lifts, setLifts] = useState<Lift[]>([]);
  const [showLiftModal, setShowLiftModal] = useState(false);
  const [editingLift, setEditingLift] = useState<Lift | null>(null);
  const [liftForm, setLiftForm] = useState({
    name: '',
    category: ''
  });

  // Exercises state
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [collapsedExerciseCategories, setCollapsedExerciseCategories] = useState<Record<string, boolean>>({});
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');

  // Exercise filter state
  const [availableEquipment, setAvailableEquipment] = useState<string[]>([]);
  const [availableBodyParts, setAvailableBodyParts] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>([]);

  // Video modal state
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('');
  const [selectedVideoName, setSelectedVideoName] = useState('');

  // Workout types state
  const [workoutTypes, setWorkoutTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingWorkoutTypes, setLoadingWorkoutTypes] = useState(true);

  // Tracks state
  interface Track {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
  }

  const [tracks, setTracks] = useState<Track[]>([]);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [trackFormData, setTrackFormData] = useState({ name: '', description: '', color: '#208479' });
  const [loadingTracks, setLoadingTracks] = useState(true);

  // References state
  interface NamingConvention {
    id?: string;
    abbr: string;
    full_name: string;
    notes?: string | null;
  }

  interface Resource {
    id?: string;
    name: string;
    description: string;
    url?: string | null;
    category: string;
  }

  interface References {
    namingConventions: {
      equipment: NamingConvention[];
      movementTypes: NamingConvention[];
      anatomicalTerms: NamingConvention[];
      movementPatterns: NamingConvention[];
    };
    resources: Resource[];
  }

  const [references, setReferences] = useState<References | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    equipment: false,
    movementTypes: false,
    anatomicalTerms: true,
    movementPatterns: true,
    resources: false
  });
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [editingReference, setEditingReference] = useState<((NamingConvention | Resource) & { index: number; category?: string }) | null>(null);
  const [referenceType, setReferenceType] = useState<'naming' | 'resource'>('naming');
  const [referenceCategory, setReferenceCategory] = useState<string>('equipment');
  const [referenceForm, setReferenceForm] = useState({
    abbr: '',
    full: '',
    notes: '',
    name: '',
    description: '',
    url: '',
    category: ''
  });

  useEffect(() => {
    let cancelled = false;

    const runAuth = async () => {
      if (!cancelled) {
        await checkAuth();
      }
    };

    runAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!loading && !cancelled) {
        await Promise.all([
          fetchBenchmarks(),
          fetchForgeBenchmarks(),
          fetchLifts(),
          fetchExercises(),
          fetchReferences(),
          fetchWorkoutTypes(),
          fetchTracks(),
        ]);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [loading]);

  const checkAuth = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      router.push('/login');
      return;
    }

    const role = currentUser.user_metadata?.role || 'athlete';
    if (role !== 'coach') {
      router.push('/coach');
      return;
    }

    setLoading(false);
  };

  // Benchmarks functions
  const fetchBenchmarks = async () => {
    try {
      const { data, error } = await supabase
        .from('benchmark_workouts')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setBenchmarks(data || []);
    } catch (error) {
      console.error('Error fetching benchmarks:', error);
    }
  };

  const openBenchmarkModal = (benchmark?: Benchmark) => {
    if (benchmark) {
      setEditingBenchmark(benchmark);
      setBenchmarkForm({
        name: benchmark.name,
        type: benchmark.type,
        description: benchmark.description || '',
        display_order: benchmark.display_order,
        has_scaling: (benchmark as { has_scaling?: boolean }).has_scaling ?? true
      });
    } else {
      setEditingBenchmark(null);
      const maxOrder = benchmarks.length > 0 ? Math.max(...benchmarks.map(b => b.display_order)) : 0;
      setBenchmarkForm({
        name: '',
        type: 'For Time',
        description: '',
        display_order: maxOrder + 1,
        has_scaling: true
      });
    }
    setShowBenchmarkModal(true);
  };

  const saveBenchmark = async () => {
    try {
      if (editingBenchmark) {
        // Update existing
        const { error } = await supabase
          .from('benchmark_workouts')
          .update({
            name: benchmarkForm.name,
            type: benchmarkForm.type,
            description: benchmarkForm.description,
            display_order: benchmarkForm.display_order,
            has_scaling: benchmarkForm.has_scaling,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingBenchmark.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('benchmark_workouts')
          .insert({
            name: benchmarkForm.name,
            type: benchmarkForm.type,
            description: benchmarkForm.description,
            display_order: benchmarkForm.display_order,
            has_scaling: benchmarkForm.has_scaling
          });

        if (error) throw error;
      }

      setShowBenchmarkModal(false);
      fetchBenchmarks();
    } catch (error: unknown) {
      console.error('Error saving benchmark:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error saving benchmark: ${message}`);
    }
  };

  const deleteBenchmark = async (id: string) => {
    if (!confirm('Are you sure you want to delete this benchmark? All athlete results will remain but will show as "Unknown Benchmark".')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('benchmark_workouts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchBenchmarks();
    } catch (error: unknown) {
      console.error('Error deleting benchmark:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Forge Benchmarks functions
  const fetchForgeBenchmarks = async () => {
    try {
      const { data, error } = await supabase
        .from('forge_benchmarks')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setForgeBenchmarks(data || []);
    } catch (error) {
      console.error('Error fetching forge benchmarks:', error);
    }
  };

  const openForgeModal = (forge?: Benchmark) => {
    if (forge) {
      setEditingForge(forge);
      setForgeForm({
        name: forge.name,
        type: forge.type,
        description: forge.description || '',
        display_order: forge.display_order,
        has_scaling: (forge as { has_scaling?: boolean }).has_scaling ?? true
      });
    } else {
      setEditingForge(null);
      const maxOrder = forgeBenchmarks.length > 0 ? Math.max(...forgeBenchmarks.map(b => b.display_order)) : 0;
      setForgeForm({
        name: '',
        type: 'For Time',
        description: '',
        display_order: maxOrder + 1,
        has_scaling: true
      });
    }
    setShowForgeModal(true);
  };

  const saveForge = async () => {
    try {
      if (editingForge) {
        // Update existing
        const { error } = await supabase
          .from('forge_benchmarks')
          .update({
            name: forgeForm.name,
            type: forgeForm.type,
            description: forgeForm.description,
            display_order: forgeForm.display_order,
            has_scaling: forgeForm.has_scaling,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingForge.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('forge_benchmarks')
          .insert({
            name: forgeForm.name,
            type: forgeForm.type,
            description: forgeForm.description,
            display_order: forgeForm.display_order,
            has_scaling: forgeForm.has_scaling
          });

        if (error) throw error;
      }

      setShowForgeModal(false);
      fetchForgeBenchmarks();
    } catch (error: unknown) {
      console.error('Error saving forge benchmark:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error saving forge benchmark: ${message}`);
    }
  };

  const deleteForge = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Forge benchmark? All athlete results will remain but will show as "Unknown Benchmark".')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('forge_benchmarks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchForgeBenchmarks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: unknown) {
      console.error('Error deleting forge benchmark:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleForgeDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    // Find the dragged item
    const draggedItem = forgeBenchmarks.find((item) => item.id === active.id);
    if (!draggedItem) return;

    // Determine target position
    let targetPosition: number;

    if (over.id === active.id) {
      return; // No change
    }

    // Check if dropping on another benchmark or an empty cell
    const targetItem = forgeBenchmarks.find((item) => item.id === over.id);

    if (targetItem) {
      // Dropping on another benchmark - swap positions
      targetPosition = targetItem.display_order;

      // Swap the two items
      const updatedBenchmarks = forgeBenchmarks.map(item => {
        if (item.id === draggedItem.id) {
          return { ...item, display_order: targetPosition };
        }
        if (item.id === targetItem.id) {
          return { ...item, display_order: draggedItem.display_order };
        }
        return item;
      });

      setForgeBenchmarks(updatedBenchmarks);

      // Update both items in database
      try {
        await supabase
          .from('forge_benchmarks')
          .update({ display_order: targetPosition })
          .eq('id', draggedItem.id);

        await supabase
          .from('forge_benchmarks')
          .update({ display_order: draggedItem.display_order })
          .eq('id', targetItem.id);
      } catch (error: unknown) {
        console.error('Error updating order:', error);
        alert(`Error updating order: ${error instanceof Error ? error.message : 'Unknown error'}`);
        fetchForgeBenchmarks();
      }
    } else {
      // Dropping on empty cell - extract position from key
      const emptyKey = over.id as string;
      if (emptyKey.startsWith('empty-')) {
        targetPosition = parseInt(emptyKey.replace('empty-', ''));

        const updatedBenchmarks = forgeBenchmarks.map(item => {
          if (item.id === draggedItem.id) {
            return { ...item, display_order: targetPosition };
          }
          return item;
        });

        setForgeBenchmarks(updatedBenchmarks);

        // Update only the dragged item
        try {
          await supabase
            .from('forge_benchmarks')
            .update({ display_order: targetPosition })
            .eq('id', draggedItem.id);
        } catch (error: unknown) {
          console.error('Error updating order:', error);
          alert(`Error updating order: ${error instanceof Error ? error.message : 'Unknown error'}`);
          fetchForgeBenchmarks();
        }
      }
    }
  };

  const handleInsertForgeRow = async (afterPosition: number) => {
    if (!confirm(`Insert an empty row below position ${afterPosition}? This will shift all benchmarks below down by 5 positions.`)) {
      return;
    }

    try {
      // Find all benchmarks at or after afterPosition + 1
      const benchmarksToShift = forgeBenchmarks.filter(b => b.display_order > afterPosition);

      if (benchmarksToShift.length === 0) {
        alert('No benchmarks to shift. The row below is already empty.');
        return;
      }

      // Shift them down by 5
      const updatedBenchmarks = forgeBenchmarks.map(item => {
        if (item.display_order > afterPosition) {
          return { ...item, display_order: item.display_order + 5 };
        }
        return item;
      });

      // Update local state
      setForgeBenchmarks(updatedBenchmarks);

      // Update database
      for (const benchmark of benchmarksToShift) {
        const { error } = await supabase
          .from('forge_benchmarks')
          .update({ display_order: benchmark.display_order + 5 })
          .eq('id', benchmark.id);

        if (error) throw error;
      }
    } catch (error: unknown) {
      console.error('Error inserting row:', error);
      alert(`Error inserting row: ${error instanceof Error ? error.message : 'Unknown error'}`);
      fetchForgeBenchmarks();
    }
  };

  // Lifts functions
  const fetchLifts = async () => {
    try {
      const { data, error } = await supabase
        .from('barbell_lifts')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setLifts(data || []);
    } catch (error) {
      console.error('Error fetching lifts:', error);
    }
  };

  const openLiftModal = (lift?: Lift) => {
    if (lift) {
      setEditingLift(lift);
      setLiftForm({
        name: lift.name,
        category: lift.category
      });
    } else {
      setEditingLift(null);
      setLiftForm({
        name: '',
        category: 'Olympic'
      });
    }
    setShowLiftModal(true);
  };

  const saveLift = async () => {
    try {
      if (editingLift) {
        // Update existing
        const { error } = await supabase
          .from('barbell_lifts')
          .update({
            name: liftForm.name,
            category: liftForm.category,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingLift.id);

        if (error) throw error;
      } else {
        // Create new - get max display_order globally across ALL lifts
        const maxOrder = lifts.length > 0 ? Math.max(...lifts.map(l => l.display_order)) : 0;

        const { error } = await supabase
          .from('barbell_lifts')
          .insert({
            name: liftForm.name,
            category: liftForm.category,
            display_order: maxOrder + 1
          });

        if (error) throw error;
      }

      setShowLiftModal(false);
      fetchLifts();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: unknown) {
      console.error('Error saving lift:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLiftDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    // Find the dragged item
    const draggedLift = lifts.find(l => l.id === active.id);
    if (!draggedLift) return;

    // Determine target position
    let targetPosition: number;

    if (over.id === active.id) {
      return; // No change
    }

    // Check if dropping on another lift or an empty cell
    const targetLift = lifts.find(l => l.id === over.id);

    if (targetLift) {
      // Dropping on another lift - swap positions
      targetPosition = targetLift.display_order;

      // Swap the two items
      const updatedLifts = lifts.map(lift => {
        if (lift.id === draggedLift.id) {
          return { ...lift, display_order: targetPosition };
        }
        if (lift.id === targetLift.id) {
          return { ...lift, display_order: draggedLift.display_order };
        }
        return lift;
      });

      setLifts(updatedLifts);

      // Update both items in database
      try {
        await supabase
          .from('barbell_lifts')
          .update({ display_order: targetPosition })
          .eq('id', draggedLift.id);

        await supabase
          .from('barbell_lifts')
          .update({ display_order: draggedLift.display_order })
          .eq('id', targetLift.id);
      } catch (error: unknown) {
        console.error('Error updating order:', error);
        alert(`Error updating order: ${error instanceof Error ? error.message : 'Unknown error'}`);
        fetchLifts();
      }
    } else {
      // Dropping on empty cell - extract position from key
      const emptyKey = over.id as string;
      if (emptyKey.startsWith('empty-')) {
        targetPosition = parseInt(emptyKey.replace('empty-', ''));

        const updatedLifts = lifts.map(lift => {
          if (lift.id === draggedLift.id) {
            return { ...lift, display_order: targetPosition };
          }
          return lift;
        });

        setLifts(updatedLifts);

        // Update only the dragged item
        try {
          await supabase
            .from('barbell_lifts')
            .update({ display_order: targetPosition })
            .eq('id', draggedLift.id);
        } catch (error: unknown) {
          console.error('Error updating order:', error);
          alert(`Error updating order: ${error instanceof Error ? error.message : 'Unknown error'}`);
          fetchLifts();
        }
      }
    }
  };

  const deleteLift = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lift? All athlete PRs will remain but will show as "Unknown Lift".')) {
      return;
    }

    try {
      const { error} = await supabase
        .from('barbell_lifts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchLifts();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: unknown) {
      console.error('Error deleting lift:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Exercises functions
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

  const fetchReferences = async () => {
    try {
      // Fetch naming conventions
      const { data: namingData, error: namingError } = await supabase
        .from('naming_conventions')
        .select('*')
        .order('abbr');

      if (namingError) throw namingError;

      // Group by category
      const namingConventions = {
        equipment: namingData?.filter(n => n.category === 'equipment') || [],
        movementTypes: namingData?.filter(n => n.category === 'movementTypes') || [],
        anatomicalTerms: namingData?.filter(n => n.category === 'anatomicalTerms') || [],
        movementPatterns: namingData?.filter(n => n.category === 'movementPatterns') || [],
      };

      // Fetch resources
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('resources')
        .select('*')
        .order('name');

      if (resourcesError) throw resourcesError;

      setReferences({
        namingConventions,
        resources: resourcesData || [],
      });
    } catch (error) {
      console.error('Error loading references:', error);
    }
  };

  const fetchWorkoutTypes = async () => {
    setLoadingWorkoutTypes(true);
    const { data, error } = await supabase
      .from('workout_types')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error fetching workout types:', error);
    } else {
      setWorkoutTypes(data || []);
    }
    setLoadingWorkoutTypes(false);
  };

  const fetchTracks = async () => {
    setLoadingTracks(true);
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching tracks:', error);
    } else {
      setTracks(data || []);
    }
    setLoadingTracks(false);
  };

  const openTrackModal = (track: Track | null = null) => {
    if (track) {
      setEditingTrack(track);
      setTrackFormData({
        name: track.name,
        description: track.description || '',
        color: track.color || '#208479',
      });
    } else {
      setEditingTrack(null);
      setTrackFormData({ name: '', description: '', color: '#208479' });
    }
    setShowTrackModal(true);
  };

  const handleSaveTrack = async () => {
    if (!trackFormData.name.trim()) {
      alert('Track name is required');
      return;
    }

    try {
      if (editingTrack) {
        // Update existing
        const { error } = await supabase
          .from('tracks')
          .update({
            name: trackFormData.name,
            description: trackFormData.description || null,
            color: trackFormData.color,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTrack.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('tracks')
          .insert([{
            name: trackFormData.name,
            description: trackFormData.description || null,
            color: trackFormData.color,
          }]);

        if (error) throw error;
      }

      setShowTrackModal(false);
      fetchTracks();
    } catch (error) {
      console.error('Error saving track:', error);
      alert('Failed to save track');
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm('Are you sure you want to delete this track?')) return;

    try {
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);

      if (error) throw error;
      fetchTracks();
    } catch (error) {
      console.error('Error deleting track:', error);
      alert('Failed to delete track');
    }
  };

  const handleTrackFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTrackFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleExerciseCategory = (category: string) => {
    setCollapsedExerciseCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const handleSaveReference = async () => {
    try {
      if (referenceType === 'naming') {
        const namingData = {
          category: referenceCategory,
          abbr: referenceForm.abbr,
          full_name: referenceForm.full,
          notes: referenceForm.notes || null
        };

        if (editingReference && editingReference.id) {
          // Update existing
          const { error } = await supabase
            .from('naming_conventions')
            .update(namingData)
            .eq('id', editingReference.id);

          if (error) throw error;
        } else {
          // Add new
          const { error } = await supabase
            .from('naming_conventions')
            .insert(namingData);

          if (error) throw error;
        }
      } else {
        // Resource
        const resourceData = {
          name: referenceForm.name,
          description: referenceForm.description,
          url: referenceForm.url || null,
          category: referenceForm.category
        };

        if (editingReference && editingReference.id) {
          // Update existing
          const { error } = await supabase
            .from('resources')
            .update(resourceData)
            .eq('id', editingReference.id);

          if (error) throw error;
        } else {
          // Add new
          const { error } = await supabase
            .from('resources')
            .insert(resourceData);

          if (error) throw error;
        }
      }

      // Refresh data from database
      await fetchReferences();

      setShowReferenceModal(false);
      setEditingReference(null);
      setReferenceForm({ abbr: '', full: '', notes: '', name: '', description: '', url: '', category: '' });
    } catch (error) {
      console.error('Error saving reference:', error);
      alert('Error saving reference. Please try again.');
    }
  };

  const handleDeleteReference = async (type: 'naming' | 'resource', item: NamingConvention | Resource) => {
    if (!confirm('Delete this reference?')) return;

    try {
      if (type === 'naming') {
        const namingItem = item as NamingConvention;
        if (!namingItem.id) return;

        const { error } = await supabase
          .from('naming_conventions')
          .delete()
          .eq('id', namingItem.id);

        if (error) throw error;
      } else {
        const resourceItem = item as Resource;
        if (!resourceItem.id) return;

        const { error } = await supabase
          .from('resources')
          .delete()
          .eq('id', resourceItem.id);

        if (error) throw error;
      }

      // Refresh data from database
      await fetchReferences();
    } catch (error) {
      console.error('Error deleting reference:', error);
      alert('Error deleting reference. Please try again.');
    }
  };

  const handleSaveExercise = async (exerciseData: Omit<Exercise, 'id'> & { id?: string }) => {
    try {
      if (exerciseData.id) {
        // Update existing
        const { error } = await supabase
          .from('exercises')
          .update({
            ...exerciseData,
            updated_at: new Date().toISOString()
          })
          .eq('id', exerciseData.id);

        if (error) throw error;
      } else {
        // Create new
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
      alert(`Error saving exercise: ${errorMessage}`);
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
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Video modal handlers
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

  // Handler functions for tab components
  const handleBenchmarkFormChange = (field: string, value: string | number | boolean) => {
    setBenchmarkForm(prev => ({ ...prev, [field]: value }));
  };

  const handleForgeFormChange = (field: string, value: string | number | boolean) => {
    setForgeForm(prev => ({ ...prev, [field]: value }));
  };

  const handleLiftFormChange = (field: string, value: string | number) => {
    setLiftForm(prev => ({ ...prev, [field]: value }));
  };

  const handleReferenceFormChange = (field: string, value: string) => {
    setReferenceForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddReference = (type: 'naming' | 'resource', category?: string) => {
    setReferenceType(type);
    if (category) {
      setReferenceCategory(category);
    }
    setEditingReference(null);
    setReferenceForm({ abbr: '', full: '', notes: '', name: '', description: '', url: '', category: '' });
    setShowReferenceModal(true);
  };

  const handleEditReference = (type: 'naming' | 'resource', item: NamingConvention | Resource, index: number, category?: string) => {
    setEditingReference({ ...item, index, ...(category && { category }) });
    setReferenceType(type);
    if (category) {
      setReferenceCategory(category);
    }
    if (type === 'naming') {
      const namingItem = item as NamingConvention;
      setReferenceForm({ abbr: namingItem.abbr, full: namingItem.full_name, notes: namingItem.notes || '', name: '', description: '', url: '', category: '' });
    } else {
      const resourceItem = item as Resource;
      setReferenceForm({ abbr: '', full: '', notes: '', name: resourceItem.name, description: resourceItem.description, url: resourceItem.url || '', category: resourceItem.category });
    }
    setShowReferenceModal(true);
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-100 flex items-center justify-center'>
        <div className='text-gray-600'>Loading...</div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-400'>
      {/* Header */}
      <div className='bg-white shadow'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center gap-2 md:gap-4 py-2 md:py-4'>
            <button
              onClick={() => router.push('/coach')}
              className='flex items-center gap-1 p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition text-gray-700 text-sm'
            >
              <ArrowLeft size={20} className='md:w-6 md:h-6' />
              <span className='md:hidden'>Back</span>
            </button>
            <div>
              <h1 className='text-xl md:text-3xl font-bold text-gray-900'>Coach Library</h1>
              <p className='text-xs md:text-sm text-gray-600 hidden md:block'>Manage benchmarks, lifts, exercises, programming references, and notes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Tabs */}
        <div className='flex gap-1 md:gap-2 mb-4 md:mb-6 overflow-x-auto pb-2'>
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`px-2 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition text-xs md:text-base whitespace-nowrap ${
              activeTab === 'benchmarks'
                ? 'bg-teal-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Benchmarks
          </button>
          <button
            onClick={() => setActiveTab('forge')}
            className={`px-2 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition text-xs md:text-base whitespace-nowrap ${
              activeTab === 'forge'
                ? 'bg-cyan-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Forge
          </button>
          <button
            onClick={() => setActiveTab('lifts')}
            className={`px-2 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition text-xs md:text-base whitespace-nowrap ${
              activeTab === 'lifts'
                ? 'bg-blue-400 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Lifts
          </button>
          <button
            onClick={() => setActiveTab('exercises')}
            className={`px-2 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition text-xs md:text-base whitespace-nowrap ${
              activeTab === 'exercises'
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Exercises
          </button>
          <button
            onClick={() => setActiveTab('references')}
            className={`px-2 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition text-xs md:text-base whitespace-nowrap ${
              activeTab === 'references'
                ? 'bg-gray-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Refs
          </button>
          <button
            onClick={() => setActiveTab('tracks')}
            className={`px-2 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition text-xs md:text-base whitespace-nowrap ${
              activeTab === 'tracks'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Tracks
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-2 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition text-xs md:text-base whitespace-nowrap ${
              activeTab === 'notes'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Aids
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'benchmarks' && (
          <BenchmarksTab
            benchmarks={benchmarks}
            onAdd={() => openBenchmarkModal()}
            onEdit={openBenchmarkModal}
            onDelete={deleteBenchmark}
            showModal={showBenchmarkModal}
            onCloseModal={() => setShowBenchmarkModal(false)}
            editingBenchmark={editingBenchmark}
            form={benchmarkForm}
            onFormChange={handleBenchmarkFormChange}
            onSave={saveBenchmark}
            workoutTypes={workoutTypes}
            loadingWorkoutTypes={loadingWorkoutTypes}
          />
        )}

        {activeTab === 'forge' && (
          <ForgeBenchmarksTab
            forgeBenchmarks={forgeBenchmarks}
            onAdd={() => openForgeModal()}
            onEdit={openForgeModal}
            onDelete={deleteForge}
            onDragEnd={handleForgeDragEnd}
            onInsertRow={handleInsertForgeRow}
            showModal={showForgeModal}
            onCloseModal={() => setShowForgeModal(false)}
            editingForge={editingForge}
            form={forgeForm}
            onFormChange={handleForgeFormChange}
            onSave={saveForge}
            workoutTypes={workoutTypes}
            loadingWorkoutTypes={loadingWorkoutTypes}
          />
        )}

        {activeTab === 'lifts' && (
          <LiftsTab
            lifts={lifts}
            onAdd={() => openLiftModal()}
            onEdit={openLiftModal}
            onDelete={deleteLift}
            onDragEnd={handleLiftDragEnd}
            showModal={showLiftModal}
            onCloseModal={() => setShowLiftModal(false)}
            editingLift={editingLift}
            form={liftForm}
            onFormChange={handleLiftFormChange}
            onSave={saveLift}
          />
        )}

        {activeTab === 'exercises' && (
          <ExercisesTab
            exercises={exercises}
            onAdd={() => {
              setEditingExercise(null);
              setShowExerciseModal(true);
            }}
            onEdit={(exercise) => {
              setEditingExercise(exercise);
              setShowExerciseModal(true);
            }}
            onDelete={handleDeleteExercise}
            searchTerm={exerciseSearchTerm}
            onSearchChange={setExerciseSearchTerm}
            collapsedCategories={collapsedExerciseCategories}
            onToggleCategory={toggleExerciseCategory}
            showModal={showExerciseModal}
            onCloseModal={() => {
              setShowExerciseModal(false);
              setEditingExercise(null);
            }}
            editingExercise={editingExercise}
            onSave={handleSaveExercise}
            onOpenVideoModal={openVideoModal}
          />
        )}

        {activeTab === 'references' && (
          <ReferencesTab
            references={references}
            collapsedSections={collapsedSections}
            onToggleSection={toggleSection}
            onAddReference={handleAddReference}
            onEditReference={handleEditReference}
            onDeleteReference={handleDeleteReference}
            showModal={showReferenceModal}
            onCloseModal={() => {
              setShowReferenceModal(false);
              setEditingReference(null);
            }}
            editingReference={editingReference}
            referenceType={referenceType}
            form={referenceForm}
            onFormChange={handleReferenceFormChange}
            onSave={handleSaveReference}
          />
        )}

        {activeTab === 'tracks' && (
          <div className='space-y-4'>
            <div className='flex justify-between items-center'>
              <h2 className='text-2xl font-bold text-gray-900'>Tracks</h2>
              <button
                onClick={() => openTrackModal(null)}
                className='px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700'
              >
                Add Track
              </button>
            </div>

            {loadingTracks ? (
              <div className='text-center py-8 text-gray-500'>Loading tracks...</div>
            ) : tracks.length === 0 ? (
              <div className='text-center py-8 text-gray-500'>
                No tracks yet. Click &quot;Add Track&quot; to create one.
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
                {tracks.map(track => (
                  <div
                    key={track.id}
                    className='bg-white rounded-lg p-4 border-2 hover:shadow-md transition'
                    style={{ borderColor: track.color || '#208479' }}
                  >
                    <div className='flex justify-between items-start mb-2'>
                      <h3 className='font-semibold text-gray-900'>{track.name}</h3>
                      <div className='flex gap-2'>
                        <button
                          onClick={() => openTrackModal(track)}
                          className='text-sm text-blue-600 hover:text-blue-800'
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTrack(track.id)}
                          className='text-sm text-red-600 hover:text-red-800'
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {track.description && (
                      <p className='text-sm text-gray-600'>{track.description}</p>
                    )}
                    <div
                      className='mt-2 h-2 rounded'
                      style={{ backgroundColor: track.color || '#208479' }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Track Modal */}
            {showTrackModal && (
              <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
                <div className='bg-white rounded-lg p-6 w-full max-w-md'>
                  <h3 className='text-xl font-bold mb-4'>
                    {editingTrack ? 'Edit Track' : 'Add New Track'}
                  </h3>

                  <div className='space-y-4'>
                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Name <span className='text-red-500'>*</span>
                      </label>
                      <input
                        type='text'
                        name='name'
                        value={trackFormData.name}
                        onChange={handleTrackFormChange}
                        className='w-full px-4 py-2 border border-gray-300 rounded-lg'
                        placeholder='e.g., Strength, Olympic Lifting'
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Description
                      </label>
                      <textarea
                        name='description'
                        value={trackFormData.description}
                        onChange={handleTrackFormChange}
                        rows={3}
                        className='w-full px-4 py-2 border border-gray-300 rounded-lg'
                        placeholder='Optional description...'
                      />
                    </div>

                    <div>
                      <label className='block text-sm font-medium text-gray-700 mb-2'>
                        Color
                      </label>
                      <input
                        type='color'
                        name='color'
                        value={trackFormData.color}
                        onChange={handleTrackFormChange}
                        className='w-full h-10 border border-gray-300 rounded-lg'
                      />
                    </div>
                  </div>

                  <div className='flex gap-3 mt-6'>
                    <button
                      onClick={handleSaveTrack}
                      className='flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700'
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowTrackModal(false)}
                      className='flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400'
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && <ProgrammingNotesTab />}
      </div>

      {/* Video Modal */}
      <ExerciseVideoModal
        isOpen={videoModalOpen}
        onClose={closeVideoModal}
        videoUrl={selectedVideoUrl}
        exerciseName={selectedVideoName}
      />
    </div>
  );
}
