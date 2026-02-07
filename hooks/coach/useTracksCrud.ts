import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface Track {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
}

export function useTracksCrud() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [trackFormData, setTrackFormData] = useState({ name: '', description: '', color: '#208479' });
  const [loadingTracks, setLoadingTracks] = useState(true);

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

  return {
    tracks,
    showTrackModal,
    setShowTrackModal,
    editingTrack,
    trackFormData,
    loadingTracks,
    fetchTracks,
    openTrackModal,
    handleSaveTrack,
    handleDeleteTrack,
    handleTrackFormChange,
  };
}
