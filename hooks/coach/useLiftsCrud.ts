import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DragEndEvent } from '@dnd-kit/core';

export interface Lift {
  id: string;
  name: string;
  category: string;
  display_order: number;
}

export function useLiftsCrud() {
  const [lifts, setLifts] = useState<Lift[]>([]);
  const [showLiftModal, setShowLiftModal] = useState(false);
  const [editingLift, setEditingLift] = useState<Lift | null>(null);
  const [liftForm, setLiftForm] = useState({
    name: '',
    category: ''
  });

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

    const draggedLift = lifts.find(l => l.id === active.id);
    if (!draggedLift) return;

    let targetPosition: number;

    if (over.id === active.id) {
      return;
    }

    const targetLift = lifts.find(l => l.id === over.id);

    if (targetLift) {
      targetPosition = targetLift.display_order;

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

  const handleLiftFormChange = (field: string, value: string | number) => {
    setLiftForm(prev => ({ ...prev, [field]: value }));
  };

  return {
    lifts,
    showLiftModal,
    setShowLiftModal,
    editingLift,
    liftForm,
    fetchLifts,
    openLiftModal,
    saveLift,
    deleteLift,
    handleLiftDragEnd,
    handleLiftFormChange,
  };
}
