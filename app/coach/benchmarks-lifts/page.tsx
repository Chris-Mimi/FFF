'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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

export default function BenchmarksLiftsManagementPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'benchmarks' | 'forge' | 'lifts'>('benchmarks');
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

  useEffect(() => {
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!loading) {
      fetchBenchmarks();
      fetchForgeBenchmarks();
      fetchLifts();
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
    } catch (error: any) {
      console.error('Error deleting forge benchmark:', error);
      alert(`Error: ${error.message}`);
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
      const { error } = await supabase
        .from('barbell_lifts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchLifts();
    } catch (error: any) {
      console.error('Error deleting lift:', error);
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
    <div className='min-h-screen bg-gray-100'>
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
              <h1 className='text-3xl font-bold text-gray-900'>Benchmarks & Lifts</h1>
              <p className='text-sm text-gray-600'>Manage benchmark workouts and barbell lifts</p>
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
                ? 'bg-teal-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Forge Benchmarks
          </button>
          <button
            onClick={() => setActiveTab('lifts')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeTab === 'lifts'
                ? 'bg-teal-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Barbell Lifts
          </button>
        </div>

        {/* Benchmarks Tab */}
        {activeTab === 'benchmarks' && (
          <div className='bg-white rounded-lg shadow p-6'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-bold text-gray-900'>Benchmark Workouts</h2>
              <button
                onClick={() => openBenchmarkModal()}
                className='px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition flex items-center gap-2'
              >
                <Plus size={20} />
                Add Benchmark
              </button>
            </div>

            <div className='space-y-2'>
              {benchmarks.map((benchmark) => (
                <div
                  key={benchmark.id}
                  className='flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition'
                >
                  <div className='flex-1'>
                    <div className='flex items-center gap-3'>
                      <span className='text-xs text-gray-500 font-mono w-8'>#{benchmark.display_order}</span>
                      <div>
                        <h3 className='font-semibold text-gray-900'>{benchmark.name}</h3>
                        <p className='text-sm text-gray-600'>{benchmark.type}</p>
                        {benchmark.description && (
                          <p className='text-sm text-gray-500 mt-1 whitespace-pre-line'>{benchmark.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => openBenchmarkModal(benchmark)}
                      className='p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition'
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => deleteBenchmark(benchmark.id)}
                      className='p-2 text-red-600 hover:bg-red-50 rounded-lg transition'
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}

              {benchmarks.length === 0 && (
                <div className='text-center py-8 text-gray-500'>
                  No benchmarks yet. Click "Add Benchmark" to create one.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Forge Benchmarks Tab */}
        {activeTab === 'forge' && (
          <div className='bg-white rounded-lg shadow p-6'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-bold text-gray-900'>Forge Benchmarks</h2>
              <button
                onClick={() => openForgeModal()}
                className='px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition flex items-center gap-2'
              >
                <Plus size={20} />
                Add Forge Benchmark
              </button>
            </div>

            <div className='space-y-2'>
              {forgeBenchmarks.map((forge) => (
                <div
                  key={forge.id}
                  className='flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition'
                >
                  <div className='flex-1'>
                    <div className='flex items-center gap-3'>
                      <span className='text-xs text-gray-500 font-mono w-8'>#{forge.display_order}</span>
                      <div>
                        <h3 className='font-semibold text-gray-900'>{forge.name}</h3>
                        <p className='text-sm text-gray-600'>{forge.type}</p>
                        {forge.description && (
                          <p className='text-sm text-gray-500 mt-1 whitespace-pre-line'>{forge.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => openForgeModal(forge)}
                      className='p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition'
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => deleteForge(forge.id)}
                      className='p-2 text-red-600 hover:bg-red-50 rounded-lg transition'
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}

              {forgeBenchmarks.length === 0 && (
                <div className='text-center py-8 text-gray-500'>
                  No Forge benchmarks yet. Click "Add Forge Benchmark" to create one.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lifts Tab */}
        {activeTab === 'lifts' && (
          <div className='bg-white rounded-lg shadow p-6'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-bold text-gray-900'>Barbell Lifts</h2>
              <button
                onClick={() => openLiftModal()}
                className='px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition flex items-center gap-2'
              >
                <Plus size={20} />
                Add Lift
              </button>
            </div>

            <div className='space-y-2'>
              {lifts.map((lift) => (
                <div
                  key={lift.id}
                  className='flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition'
                >
                  <div className='flex items-center gap-3 flex-1'>
                    <span className='text-xs text-gray-500 font-mono w-8'>#{lift.display_order}</span>
                    <div>
                      <h3 className='font-semibold text-gray-900'>{lift.name}</h3>
                      <p className='text-sm text-gray-600'>{lift.category}</p>
                    </div>
                  </div>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => openLiftModal(lift)}
                      className='p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition'
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => deleteLift(lift.id)}
                      className='p-2 text-red-600 hover:bg-red-50 rounded-lg transition'
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}

              {lifts.length === 0 && (
                <div className='text-center py-8 text-gray-500'>
                  No lifts yet. Click "Add Lift" to create one.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Benchmark Modal */}
      {showBenchmarkModal && (
        <div className='fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4' onClick={() => setShowBenchmarkModal(false)}>
          <div className='bg-white rounded-lg max-w-lg w-full p-6 shadow-2xl' onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-xl font-bold text-gray-900'>
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
                <label className='block text-sm font-medium text-gray-700 mb-1'>
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
                <label className='block text-sm font-medium text-gray-700 mb-1'>
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
                <label className='block text-sm font-medium text-gray-700 mb-1'>
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
                <label className='block text-sm font-medium text-gray-700 mb-1'>
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
          <div className='bg-white rounded-lg max-w-lg w-full p-6 shadow-2xl' onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-xl font-bold text-gray-900'>
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
                <label className='block text-sm font-medium text-gray-700 mb-1'>
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
                <label className='block text-sm font-medium text-gray-700 mb-1'>
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
                <label className='block text-sm font-medium text-gray-700 mb-1'>
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
          <div className='bg-white rounded-lg max-w-lg w-full p-6 shadow-2xl' onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-xl font-bold text-gray-900'>
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
                <label className='block text-sm font-medium text-gray-700 mb-1'>
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
                <label className='block text-sm font-medium text-gray-700 mb-1'>
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
                <label className='block text-sm font-medium text-gray-700 mb-1'>
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
                <label className='block text-sm font-medium text-gray-700 mb-1'>
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
    </div>
  );
}
