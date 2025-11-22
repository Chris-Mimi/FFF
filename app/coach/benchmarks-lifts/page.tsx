'use client';

import { supabase } from '@/lib/supabase';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, Edit2, GripVertical, Plus, Save, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ExerciseFormModal from '@/components/coach/ExerciseFormModal';

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

// Sortable Forge Card Component
function SortableForgeCard({
  forge,
  onEdit,
  onDelete,
}: {
  forge: Benchmark;
  onEdit: (forge: Benchmark) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: forge.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className='border border-gray-300 rounded-lg p-3 bg-cyan-200 hover:bg-cyan-300 hover:shadow-lg hover:z-10 transition-all group relative'
    >
      {/* Drag Handle */}
      <div
        {...listeners}
        className='absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600'
      >
        <GripVertical size={18} />
      </div>

      {/* Edit/Delete Buttons */}
      <div className='absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition'>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(forge);
          }}
          className='p-1 text-blue-600 hover:bg-blue-50 rounded transition'
        >
          <Edit2 size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(forge.id);
          }}
          className='p-1 text-red-600 hover:bg-red-50 rounded transition'
        >
          <Trash2 size={16} />
        </button>
      </div>
      <h3 className='text-base font-bold text-gray-900 mb-1'>{forge.name}</h3>
      <p className='text-sm text-gray-800 mb-1'>{forge.type}</p>
      {forge.description && (
        <p className='text-xs text-gray-700 line-clamp-2 group-hover:line-clamp-none'>{forge.description}</p>
      )}
    </div>
  );
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

  // References state
  const [references, setReferences] = useState<any>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

        {/* Benchmarks Tab */}
        {activeTab === 'benchmarks' && (
          <div className='bg-white rounded-lg shadow p-6'>
            <div className='flex justify-between items-center mb-4'>
              <div className='flex items-center gap-3'>
                <h2 className='text-xl font-bold text-gray-900'>Benchmark Workouts</h2>
                <span className='px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-semibold'>
                  {benchmarks.length}
                </span>
              </div>
              <button
                onClick={() => openBenchmarkModal()}
                className='px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition flex items-center gap-2'
              >
                <Plus size={20} />
                Add Benchmark
              </button>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3'>
              {benchmarks.map((benchmark) => (
                <div
                  key={benchmark.id}
                  className='border border-gray-300 rounded-lg p-3 bg-teal-100 hover:bg-teal-200 hover:shadow-lg hover:z-10 transition-all group relative'
                >
                  <div className='absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition'>
                    <button
                      onClick={() => openBenchmarkModal(benchmark)}
                      className='p-1 text-blue-600 hover:bg-blue-50 rounded transition'
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => deleteBenchmark(benchmark.id)}
                      className='p-1 text-red-600 hover:bg-red-50 rounded transition'
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <h3 className='text-base font-bold text-gray-900 mb-1'>{benchmark.name}</h3>
                  <p className='text-sm text-gray-800 mb-1'>{benchmark.type}</p>
                  {benchmark.description && (
                    <p className='text-xs text-gray-700 line-clamp-2 group-hover:line-clamp-none'>{benchmark.description}</p>
                  )}
                </div>
              ))}

              {benchmarks.length === 0 && (
                <div className='text-center py-8 text-gray-500'>
                  No benchmarks yet. Click &quot;Add Benchmark&quot; to create one.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Forge Benchmarks Tab */}
        {activeTab === 'forge' && (
          <div className='bg-white rounded-lg shadow p-6'>
            <div className='flex justify-between items-center mb-4'>
              <div className='flex items-center gap-3'>
                <h2 className='text-xl font-bold text-gray-900'>Forge Benchmarks</h2>
                <span className='px-3 py-1 bg-cyan-300 text-gray-700 rounded-full text-sm font-semibold'>
                  {forgeBenchmarks.length}
                </span>
              </div>
              <button
                onClick={() => openForgeModal()}
                className='px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition flex items-center gap-2'
              >
                <Plus size={20} />
                Add Forge Benchmark
              </button>
            </div>

            {forgeBenchmarks.length === 0 ? (
              <div className='text-center py-8 text-gray-500'>
                No Forge benchmarks yet. Click &quot;Add Forge Benchmark&quot; to create one.
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleForgeDragEnd}
              >
                <SortableContext
                  items={forgeBenchmarks.map(f => f.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3'>
                    {forgeBenchmarks.map((forge) => (
                      <SortableForgeCard
                        key={forge.id}
                        forge={forge}
                        onEdit={openForgeModal}
                        onDelete={deleteForge}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        )}

        {/* Lifts Tab */}
        {activeTab === 'lifts' && (
          <div className='bg-white rounded-lg shadow p-6'>
            <div className='flex justify-between items-center mb-4'>
              <div className='flex items-center gap-3'>
                <h2 className='text-xl font-bold text-gray-900'>Barbell Lifts</h2>
                <span className='px-3 py-1 bg-blue-300 text-gray-700 rounded-full text-sm font-semibold'>
                  {lifts.length}
                </span>
              </div>
              <button
                onClick={() => openLiftModal()}
                className='px-4 py-2 bg-sky-500 text-gray-100 rounded-lg hover:bg-blue-600 transition flex items-center gap-2'
              >
                <Plus size={20} />
                Add Lift
              </button>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3'>
              {lifts.map((lift) => (
                <div
                  key={lift.id}
                  className='border border-gray-300 rounded-lg p-3 bg-blue-200 hover:bg-sky-300 hover:shadow-lg hover:z-10 transition-all group relative'
                >
                  <div className='absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition'>
                    <button
                      onClick={() => openLiftModal(lift)}
                      className='p-1 text-blue-600 hover:bg-blue-50 rounded transition'
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => deleteLift(lift.id)}
                      className='p-1 text-red-600 hover:bg-red-50 rounded transition'
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <h3 className='text-base font-bold text-gray-900 mb-1'>{lift.name}</h3>
                  <p className='text-sm text-gray-800'>{lift.category}</p>
                </div>
              ))}

              {lifts.length === 0 && (
                <div className='text-center py-8 text-gray-500'>
                  No lifts yet. Click &quot;Add Lift&quot; to create one.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Exercises Tab */}
        {activeTab === 'exercises' && (
          <div className='bg-white rounded-lg shadow p-6'>
            <div className='flex justify-between items-center mb-4'>
              <div className='flex items-center gap-3'>
                <h2 className='text-xl font-bold text-gray-900'>Exercise Library</h2>
                <span className='px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold'>
                  {exercises.length}
                </span>
              </div>
              <button
                onClick={() => {
                  setEditingExercise(null);
                  setShowExerciseModal(true);
                }}
                className='px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition flex items-center gap-2'
              >
                <Plus size={20} />
                Add Exercise
              </button>
            </div>

            {/* Group by category */}
            {Object.entries(
              exercises.reduce((acc, ex) => {
                if (!acc[ex.category]) acc[ex.category] = [];
                acc[ex.category].push(ex);
                return acc;
              }, {} as Record<string, Exercise[]>)
            ).map(([category, categoryExercises]) => (
              <div key={category} className='mb-6'>
                <h3 className='text-lg font-semibold text-gray-800 mb-3 border-b pb-2'>
                  {category} ({categoryExercises.length})
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3'>
                  {categoryExercises.map((exercise) => (
                    <div
                      key={exercise.id}
                      className='border border-gray-300 rounded-lg p-3 bg-green-50 hover:bg-green-100 hover:shadow-lg hover:z-10 transition-all group relative'
                    >
                      <div className='absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition'>
                        <button
                          onClick={() => {
                            setEditingExercise(exercise);
                            setShowExerciseModal(true);
                          }}
                          className='p-1 text-blue-600 hover:bg-blue-50 rounded transition'
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteExercise(exercise.id)}
                          className='p-1 text-red-600 hover:bg-red-50 rounded transition'
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <h4 className='text-base font-bold text-gray-900 mb-1'>
                        {exercise.display_name || exercise.name}
                      </h4>
                      {exercise.subcategory && (
                        <p className='text-xs text-gray-600 mb-1'>{exercise.subcategory}</p>
                      )}
                      {exercise.tags && exercise.tags.length > 0 && (
                        <div className='flex flex-wrap gap-1 mt-2'>
                          {exercise.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className='text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded'>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {exercises.length === 0 && (
              <div className='text-center py-8 text-gray-500'>
                No exercises yet. Click &quot;Add Exercise&quot; to create one.
              </div>
            )}
          </div>
        )}

        {/* References Tab */}
        {activeTab === 'references' && (
          <div className='bg-white rounded-lg shadow p-6'>
            <h2 className='text-2xl font-bold text-gray-900 mb-6'>Programming References</h2>

            {!references ? (
              <div className='text-center py-8 text-gray-500'>Loading references...</div>
            ) : (
              <>
                {/* Naming Conventions */}
                <div className='mb-8'>
                  <h3 className='text-xl font-bold text-gray-800 mb-4 border-b pb-2'>Naming Conventions</h3>

                  {/* Equipment */}
                  <div className='mb-6'>
                    <h4 className='text-lg font-semibold text-gray-700 mb-2'>Equipment</h4>
                    <div className='space-y-1 ml-4'>
                      {references.namingConventions?.equipment?.map((item: any, idx: number) => (
                        <div key={idx} className='py-1'>
                          <span className='font-bold text-gray-900'>{item.abbr}</span> = {item.full}
                          {item.notes && <span className='text-sm text-gray-600 ml-2'>({item.notes})</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Movement Types */}
                  <div className='mb-6'>
                    <h4 className='text-lg font-semibold text-gray-700 mb-2'>Movement Types</h4>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 ml-4'>
                      {references.namingConventions?.movementTypes?.map((item: any, idx: number) => (
                        <div key={idx} className='py-1'>
                          <span className='font-bold text-gray-900'>{item.abbr}</span> = {item.full}
                          {item.notes && <span className='text-sm text-gray-600 ml-2'>({item.notes})</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Anatomical Terms */}
                  <div className='mb-6'>
                    <h4 className='text-lg font-semibold text-gray-700 mb-2'>Anatomical Terms</h4>
                    <div className='space-y-1 ml-4'>
                      {references.namingConventions?.anatomicalTerms?.map((item: any, idx: number) => (
                        <div key={idx} className='py-1'>
                          <span className='font-bold text-gray-900'>{item.abbr}</span> = {item.full}
                          {item.notes && <span className='text-sm text-gray-600 ml-2'>({item.notes})</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Movement Patterns */}
                  <div className='mb-6'>
                    <h4 className='text-lg font-semibold text-gray-700 mb-2'>Movement Patterns & Methods</h4>
                    <div className='space-y-1 ml-4'>
                      {references.namingConventions?.movementPatterns?.map((item: any, idx: number) => (
                        <div key={idx} className='py-1'>
                          <span className='font-bold text-gray-900'>{item.abbr}</span> = {item.full}
                          {item.notes && <span className='text-sm text-gray-600 ml-2'>({item.notes})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Resources */}
                <div className='mb-8'>
                  <h3 className='text-xl font-bold text-gray-800 mb-4 border-b pb-2'>Programs & Resources</h3>
                  <div className='space-y-2 ml-4'>
                    {references.resources?.map((resource: any, idx: number) => (
                      <div key={idx} className='py-2 border-b border-gray-100 last:border-0'>
                        <div className='flex items-start justify-between'>
                          <div>
                            <span className='font-bold text-gray-900'>{resource.name}</span>
                            <span className='text-sm text-gray-600 ml-2'>({resource.category})</span>
                            <p className='text-gray-700 mt-1'>{resource.description}</p>
                            {resource.url && (
                              <a
                                href={resource.url}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-blue-600 text-sm hover:underline inline-block mt-1'
                              >
                                Visit Website →
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Benchmark Modal */}
      {showBenchmarkModal && (
        <div className='fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4' onClick={() => setShowBenchmarkModal(false)}>
          <div className='bg-gray-500 rounded-lg max-w-lg w-full p-6 shadow-2xl' onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-xl font-bold text-gray-100'>
                {editingBenchmark ? 'Edit Benchmark' : 'Add Benchmark'}
              </h3>
              <button
                onClick={() => setShowBenchmarkModal(false)}
                className='p-1 hover:bg-gray-100 rounded'
              >
                <X size={24} />
              </button>
            </div>

            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>
                  Name
                </label>
                <input
                  type='text'
                  value={benchmarkForm.name}
                  onChange={(e) => setBenchmarkForm({ ...benchmarkForm, name: e.target.value })}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
                  placeholder='e.g., Fran, Helen, Murph'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>
                  Type
                </label>
                <select
                  value={benchmarkForm.type}
                  onChange={(e) => setBenchmarkForm({ ...benchmarkForm, type: e.target.value })}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer'
                >
                  <option value='For Time'>For Time</option>
                  <option value='AMRAP'>AMRAP</option>
                  <option value='EMOM'>EMOM</option>
                  <option value='Max Reps'>Max Reps</option>
                  <option value='Max Weight'>Max Weight</option>
                </select>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>
                  Description
                </label>
                <textarea
                  value={benchmarkForm.description}
                  onChange={(e) => setBenchmarkForm({ ...benchmarkForm, description: e.target.value })}
                  rows={4}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
                  placeholder='Workout details (e.g., 21-15-9 Thrusters & Pull-ups)'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>
                  Display Order
                </label>
                <input
                  type='number'
                  value={benchmarkForm.display_order}
                  onChange={(e) => setBenchmarkForm({ ...benchmarkForm, display_order: parseInt(e.target.value) || 0 })}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
                />
              </div>
            </div>

            <div className='flex gap-3 mt-6'>
              <button
                onClick={saveBenchmark}
                className='flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition flex items-center justify-center gap-2'
              >
                <Save size={18} />
                {editingBenchmark ? 'Update' : 'Create'}
              </button>
              <button
                onClick={() => setShowBenchmarkModal(false)}
                className='px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lift Modal */}
      {showLiftModal && (
        <div className='fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4' onClick={() => setShowLiftModal(false)}>
          <div className='bg-gray-500 rounded-lg max-w-lg w-full p-6 shadow-2xl' onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-xl font-bold text-gray-100'>
                {editingLift ? 'Edit Lift' : 'Add Lift'}
              </h3>
              <button
                onClick={() => setShowLiftModal(false)}
                className='p-1 hover:bg-gray-100 rounded'
              >
                <X size={24} />
              </button>
            </div>

            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>
                  Name
                </label>
                <input
                  type='text'
                  value={liftForm.name}
                  onChange={(e) => setLiftForm({ ...liftForm, name: e.target.value })}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
                  placeholder='e.g., Back Squat, Deadlift'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>
                  Category
                </label>
                <select
                  value={liftForm.category}
                  onChange={(e) => setLiftForm({ ...liftForm, category: e.target.value })}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer'
                >
                  <option value='Squat'>Squat</option>
                  <option value='Pull'>Pull</option>
                  <option value='Press'>Press</option>
                  <option value='Olympic'>Olympic</option>
                </select>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>
                  Display Order
                </label>
                <input
                  type='number'
                  value={liftForm.display_order}
                  onChange={(e) => setLiftForm({ ...liftForm, display_order: parseInt(e.target.value) || 0 })}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
                />
              </div>
            </div>

            <div className='flex gap-3 mt-6'>
              <button
                onClick={saveLift}
                className='flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition flex items-center justify-center gap-2'
              >
                <Save size={18} />
                {editingLift ? 'Update' : 'Create'}
              </button>
              <button
                onClick={() => setShowLiftModal(false)}
                className='px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forge Benchmark Modal */}
      {showForgeModal && (
        <div className='fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4' onClick={() => setShowForgeModal(false)}>
          <div className='bg-gray-500 rounded-lg max-w-lg w-full p-6 shadow-2xl' onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-xl font-bold text-gray-100'>
                {editingForge ? 'Edit Forge Benchmark' : 'Add Forge Benchmark'}
              </h3>
              <button
                onClick={() => setShowForgeModal(false)}
                className='p-1 hover:bg-gray-100 rounded'
              >
                <X size={24} />
              </button>
            </div>

            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>
                  Name
                </label>
                <input
                  type='text'
                  value={forgeForm.name}
                  onChange={(e) => setForgeForm({ ...forgeForm, name: e.target.value })}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
                  placeholder='e.g., Forge Friday, The Grind'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>
                  Type
                </label>
                <select
                  value={forgeForm.type}
                  onChange={(e) => setForgeForm({ ...forgeForm, type: e.target.value })}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer'
                >
                  <option value='For Time'>For Time</option>
                  <option value='AMRAP'>AMRAP</option>
                  <option value='EMOM'>EMOM</option>
                  <option value='Max Reps'>Max Reps</option>
                  <option value='Max Weight'>Max Weight</option>
                </select>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>
                  Description
                </label>
                <textarea
                  value={forgeForm.description}
                  onChange={(e) => setForgeForm({ ...forgeForm, description: e.target.value })}
                  rows={4}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
                  placeholder='Workout details'
                />
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-100 mb-1'>
                  Display Order
                </label>
                <input
                  type='number'
                  value={forgeForm.display_order}
                  onChange={(e) => setForgeForm({ ...forgeForm, display_order: parseInt(e.target.value) || 0 })}
                  className='w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent'
                />
              </div>
            </div>

            <div className='flex gap-3 mt-6'>
              <button
                onClick={saveForge}
                className='flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition flex items-center justify-center gap-2'
              >
                <Save size={18} />
                {editingForge ? 'Update' : 'Create'}
              </button>
              <button
                onClick={() => setShowForgeModal(false)}
                className='px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Form Modal */}
      <ExerciseFormModal
        isOpen={showExerciseModal}
        onClose={() => {
          setShowExerciseModal(false);
          setEditingExercise(null);
        }}
        onSave={handleSaveExercise}
        editingExercise={editingExercise}
      />
    </div>
  );
}
