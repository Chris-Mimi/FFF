import { confirm } from '@/lib/confirm';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export interface Benchmark {
  id: string;
  name: string;
  type: string;
  description: string | null;
  display_order: number;
}

export function useBenchmarksCrud() {
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
      toast.error(`Error saving benchmark: ${message}`);
    }
  };

  const deleteBenchmark = async (id: string) => {
    if (!await confirm({ title: 'Delete Benchmark', message: 'Are you sure you want to delete this benchmark? All athlete results will remain but will show as "Unknown Benchmark".', confirmText: 'Delete', variant: 'danger' })) {
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
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleBenchmarkFormChange = (field: string, value: string | number | boolean) => {
    setBenchmarkForm(prev => ({ ...prev, [field]: value }));
  };

  return {
    benchmarks,
    showBenchmarkModal,
    setShowBenchmarkModal,
    editingBenchmark,
    benchmarkForm,
    fetchBenchmarks,
    openBenchmarkModal,
    saveBenchmark,
    deleteBenchmark,
    handleBenchmarkFormChange,
  };
}
