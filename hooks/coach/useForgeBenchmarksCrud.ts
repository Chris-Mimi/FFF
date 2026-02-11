import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { DragEndEvent } from '@dnd-kit/core';
import { Benchmark } from './useBenchmarksCrud';

export function useForgeBenchmarksCrud() {
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
      toast.error(`Error saving forge benchmark: ${message}`);
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
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleForgeDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const draggedItem = forgeBenchmarks.find((item) => item.id === active.id);
    if (!draggedItem) return;

    let targetPosition: number;

    if (over.id === active.id) {
      return;
    }

    const targetItem = forgeBenchmarks.find((item) => item.id === over.id);

    if (targetItem) {
      targetPosition = targetItem.display_order;

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
        toast.error(`Error updating order: ${error instanceof Error ? error.message : 'Unknown error'}`);
        fetchForgeBenchmarks();
      }
    } else {
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

        try {
          await supabase
            .from('forge_benchmarks')
            .update({ display_order: targetPosition })
            .eq('id', draggedItem.id);
        } catch (error: unknown) {
          console.error('Error updating order:', error);
          toast.error(`Error updating order: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      const benchmarksToShift = forgeBenchmarks.filter(b => b.display_order > afterPosition);

      if (benchmarksToShift.length === 0) {
        toast.info('No benchmarks to shift. The row below is already empty.');
        return;
      }

      const updatedBenchmarks = forgeBenchmarks.map(item => {
        if (item.display_order > afterPosition) {
          return { ...item, display_order: item.display_order + 5 };
        }
        return item;
      });

      setForgeBenchmarks(updatedBenchmarks);

      for (const benchmark of benchmarksToShift) {
        const { error } = await supabase
          .from('forge_benchmarks')
          .update({ display_order: benchmark.display_order + 5 })
          .eq('id', benchmark.id);

        if (error) throw error;
      }
    } catch (error: unknown) {
      console.error('Error inserting row:', error);
      toast.error(`Error inserting row: ${error instanceof Error ? error.message : 'Unknown error'}`);
      fetchForgeBenchmarks();
    }
  };

  const handleForgeFormChange = (field: string, value: string | number | boolean) => {
    setForgeForm(prev => ({ ...prev, [field]: value }));
  };

  return {
    forgeBenchmarks,
    showForgeModal,
    setShowForgeModal,
    editingForge,
    forgeForm,
    fetchForgeBenchmarks,
    openForgeModal,
    saveForge,
    deleteForge,
    handleForgeDragEnd,
    handleInsertForgeRow,
    handleForgeFormChange,
  };
}
