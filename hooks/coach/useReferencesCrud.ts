import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export interface NamingConvention {
  id?: string;
  abbr: string;
  full_name: string;
  notes?: string | null;
}

export interface Resource {
  id?: string;
  name: string;
  description: string;
  url?: string | null;
  category: string;
}

export interface References {
  namingConventions: {
    equipment: NamingConvention[];
    movementTypes: NamingConvention[];
    anatomicalTerms: NamingConvention[];
    movementPatterns: NamingConvention[];
  };
  resources: Resource[];
}

export function useReferencesCrud() {
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

  const fetchReferences = async () => {
    try {
      const { data: namingData, error: namingError } = await supabase
        .from('naming_conventions')
        .select('*')
        .order('abbr');

      if (namingError) throw namingError;

      const namingConventions = {
        equipment: namingData?.filter(n => n.category === 'equipment') || [],
        movementTypes: namingData?.filter(n => n.category === 'movementTypes') || [],
        anatomicalTerms: namingData?.filter(n => n.category === 'anatomicalTerms') || [],
        movementPatterns: namingData?.filter(n => n.category === 'movementPatterns') || [],
      };

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

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
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
          const { error } = await supabase
            .from('naming_conventions')
            .update(namingData)
            .eq('id', editingReference.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('naming_conventions')
            .insert(namingData);

          if (error) throw error;
        }
      } else {
        const resourceData = {
          name: referenceForm.name,
          description: referenceForm.description,
          url: referenceForm.url || null,
          category: referenceForm.category
        };

        if (editingReference && editingReference.id) {
          const { error } = await supabase
            .from('resources')
            .update(resourceData)
            .eq('id', editingReference.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('resources')
            .insert(resourceData);

          if (error) throw error;
        }
      }

      await fetchReferences();

      setShowReferenceModal(false);
      setEditingReference(null);
      setReferenceForm({ abbr: '', full: '', notes: '', name: '', description: '', url: '', category: '' });
    } catch (error) {
      console.error('Error saving reference:', error);
      toast.error('Error saving reference. Please try again.');
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

      await fetchReferences();
    } catch (error) {
      console.error('Error deleting reference:', error);
      toast.error('Error deleting reference. Please try again.');
    }
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

  const handleReferenceFormChange = (field: string, value: string) => {
    setReferenceForm(prev => ({ ...prev, [field]: value }));
  };

  return {
    references,
    collapsedSections,
    showReferenceModal,
    setShowReferenceModal,
    editingReference,
    setEditingReference,
    referenceType,
    referenceForm,
    fetchReferences,
    toggleSection,
    handleSaveReference,
    handleDeleteReference,
    handleAddReference,
    handleEditReference,
    handleReferenceFormChange,
  };
}
