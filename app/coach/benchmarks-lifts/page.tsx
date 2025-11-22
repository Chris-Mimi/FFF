'use client';

import BenchmarksTab from '@/components/coach/BenchmarksTab';
import ExercisesTab from '@/components/coach/ExercisesTab';
import ForgeBenchmarksTab from '@/components/coach/ForgeBenchmarksTab';
import LiftsTab from '@/components/coach/LiftsTab';
import ReferencesTab from '@/components/coach/ReferencesTab';
import { supabase } from '@/lib/supabase';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
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
  const [activeTab, setActiveTab] = useState<'benchmarks' | 'forge' | 'lifts' | 'exercises' | 'references'>('benchmarks');
  const [loading, setLoading] = useState(true);

  // Benchmarks state
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [showBenchmarkModal, setShowBenchmarkModal] = useState(false);
  const [editingBenchmark, setEditingBenchmark] = useState<Benchmark | null>(null);
  const [benchmarkForm, setBenchmarkForm] = useState({
    name: '',
    type: '',
    description: '',
    display_order: 0
  });

  // Forge Benchmarks state
  const [forgeBenchmarks, setForgeBenchmarks] = useState<Benchmark[]>([]);
  const [showForgeModal, setShowForgeModal] = useState(false);
  const [editingForge, setEditingForge] = useState<Benchmark | null>(null);
  const [forgeForm, setForgeForm] = useState({
    name: '',
    type: '',
    description: '',
    display_order: 0
  });

  // Lifts state
  const [lifts, setLifts] = useState<Lift[]>([]);
  const [showLiftModal, setShowLiftModal] = useState(false);
  const [editingLift, setEditingLift] = useState<Lift | null>(null);
  const [liftForm, setLiftForm] = useState({
    name: '',
    category: '',
    display_order: 0
  });

  // Exercises state
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [collapsedExerciseCategories, setCollapsedExerciseCategories] = useState<Record<string, boolean>>({});
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');

  // References state
  interface NamingConvention {
    abbr: string;
    full: string;
    notes?: string | null;
  }

  interface Resource {
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
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!loading) {
      fetchBenchmarks();
      fetchForgeBenchmarks();
      fetchLifts();
      fetchExercises();
      fetchReferences();
    }
  }, [loading]);

  const checkAuth = async () => {
    const { getCurrentUser } = await import('@/lib/auth');
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
        .order('display_order', { ascending: true });

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
        display_order: benchmark.display_order
      });
    } else {
      setEditingBenchmark(null);
      const maxOrder = benchmarks.length > 0 ? Math.max(...benchmarks.map(b => b.display_order)) : 0;
      setBenchmarkForm({
        name: '',
        type: 'For Time',
        description: '',
        display_order: maxOrder + 1
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
            display_order: benchmarkForm.display_order
          });

        if (error) throw error;
      }

      setShowBenchmarkModal(false);
      fetchBenchmarks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error saving benchmark:', error);
      alert(`Error: ${error.message}`);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error deleting benchmark:', error);
      alert(`Error: ${error.message}`);
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
        display_order: forge.display_order
      });
    } else {
      setEditingForge(null);
      const maxOrder = forgeBenchmarks.length > 0 ? Math.max(...forgeBenchmarks.map(b => b.display_order)) : 0;
      setForgeForm({
        name: '',
        type: 'For Time',
        description: '',
        display_order: maxOrder + 1
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
            display_order: forgeForm.display_order
          });

        if (error) throw error;
      }

      setShowForgeModal(false);
      fetchForgeBenchmarks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error saving forge benchmark:', error);
      alert(`Error: ${error.message}`);
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
    } catch (error: any) {
      console.error('Error deleting forge benchmark:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleForgeDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = forgeBenchmarks.findIndex((item) => item.id === active.id);
    const newIndex = forgeBenchmarks.findIndex((item) => item.id === over.id);

    const reorderedItems = arrayMove(forgeBenchmarks, oldIndex, newIndex);

    // Update local state immediately for smooth UX
    setForgeBenchmarks(reorderedItems);

    // Update display_order in database
    try {
      const updates = reorderedItems.map((item, index) => ({
        id: item.id,
        display_order: index + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('forge_benchmarks')
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (error) throw error;
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error updating order:', error);
      alert(`Error updating order: ${error.message}`);
      // Revert to original order on error
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
        category: lift.category,
        display_order: lift.display_order
      });
    } else {
      setEditingLift(null);
      const maxOrder = lifts.length > 0 ? Math.max(...lifts.map(l => l.display_order)) : 0;
      setLiftForm({
        name: '',
        category: 'Squat',
        display_order: maxOrder + 1
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
            display_order: liftForm.display_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingLift.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('barbell_lifts')
          .insert({
            name: liftForm.name,
            category: liftForm.category,
            display_order: liftForm.display_order
          });

        if (error) throw error;
      }

      setShowLiftModal(false);
      fetchLifts();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error saving lift:', error);
      alert(`Error: ${error.message}`);
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
    } catch (error: any) {
      console.error('Error deleting lift:', error);
      alert(`Error: ${error.message}`);
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
      const response = await fetch('/programming-references.json');
      const data = await response.json();
      setReferences(data);
    } catch (error) {
      console.error('Error loading references:', error);
    }
  };

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleExerciseCategory = (category: string) => {
    setCollapsedExerciseCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const handleSaveReference = () => {
    if (!references) return;

    const updatedRefs = { ...references };

    if (referenceType === 'naming') {
      const category = referenceCategory;
      const categoryKey = category as keyof typeof updatedRefs.namingConventions;

      if (editingReference) {
        // Update existing
        const index = editingReference.index;
        updatedRefs.namingConventions[categoryKey][index] = {
          abbr: referenceForm.abbr,
          full: referenceForm.full,
          notes: referenceForm.notes || null
        };
      } else {
        // Add new
        updatedRefs.namingConventions[categoryKey].push({
          abbr: referenceForm.abbr,
          full: referenceForm.full,
          notes: referenceForm.notes || null
        });
      }
    } else {
      // Resource
      if (editingReference) {
        const index = editingReference.index;
        updatedRefs.resources[index] = {
          name: referenceForm.name,
          description: referenceForm.description,
          url: referenceForm.url || null,
          category: referenceForm.category
        };
      } else {
        updatedRefs.resources.push({
          name: referenceForm.name,
          description: referenceForm.description,
          url: referenceForm.url || null,
          category: referenceForm.category
        });
      }
    }

    setReferences(updatedRefs);
    // Note: Changes are only in-memory. To persist, would need to save to JSON file
    setShowReferenceModal(false);
    setEditingReference(null);
    setReferenceForm({ abbr: '', full: '', notes: '', name: '', description: '', url: '', category: '' });
  };

  const handleDeleteReference = (type: 'naming' | 'resource', category: string, index: number) => {
    if (!references || !confirm('Delete this reference?')) return;

    const updatedRefs = { ...references };

    if (type === 'naming') {
      const categoryKey = category as keyof typeof updatedRefs.namingConventions;
      updatedRefs.namingConventions[categoryKey].splice(index, 1);
    } else {
      updatedRefs.resources.splice(index, 1);
    }

    setReferences(updatedRefs);
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
      alert(`Error: ${error.message}`);
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
    } catch (error: any) {
      console.error('Error deleting exercise:', error);
      alert(`Error: ${error.message}`);
    }
  };

  // Handler functions for tab components
  const handleBenchmarkFormChange = (field: string, value: string | number) => {
    setBenchmarkForm(prev => ({ ...prev, [field]: value }));
  };

  const handleForgeFormChange = (field: string, value: string | number) => {
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
      setReferenceForm({ abbr: namingItem.abbr, full: namingItem.full, notes: namingItem.notes || '', name: '', description: '', url: '', category: '' });
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
          <div className='flex items-center gap-4 py-4'>
            <button
              onClick={() => router.push('/coach')}
              className='p-2 hover:bg-gray-100 rounded-lg transition text-gray-700'
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className='text-3xl font-bold text-gray-900'>Coach Library</h1>
              <p className='text-sm text-gray-600'>Manage benchmarks, lifts, exercises, and programming references</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Tabs */}
        <div className='flex gap-2 mb-6'>
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'benchmarks'
                ? 'bg-teal-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Benchmark Workouts
          </button>
          <button
            onClick={() => setActiveTab('forge')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'forge'
                ? 'bg-cyan-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Forge Benchmarks
          </button>
          <button
            onClick={() => setActiveTab('lifts')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'lifts'
                ? 'bg-blue-400 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Barbell Lifts
          </button>
          <button
            onClick={() => setActiveTab('exercises')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'exercises'
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Exercises
          </button>
          <button
            onClick={() => setActiveTab('references')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'references'
                ? 'bg-gray-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            References
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
          />
        )}

        {activeTab === 'forge' && (
          <ForgeBenchmarksTab
            forgeBenchmarks={forgeBenchmarks}
            onAdd={() => openForgeModal()}
            onEdit={openForgeModal}
            onDelete={deleteForge}
            onDragEnd={handleForgeDragEnd}
            showModal={showForgeModal}
            onCloseModal={() => setShowForgeModal(false)}
            editingForge={editingForge}
            form={forgeForm}
            onFormChange={handleForgeFormChange}
            onSave={saveForge}
          />
        )}

        {activeTab === 'lifts' && (
          <LiftsTab
            lifts={lifts}
            onAdd={() => openLiftModal()}
            onEdit={openLiftModal}
            onDelete={deleteLift}
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
      </div>
    </div>
  );
}
