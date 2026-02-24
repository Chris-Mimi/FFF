'use client';

import { useEffect, Dispatch, SetStateAction } from 'react';
import { authFetch } from '@/lib/auth-fetch';
import { getWeekNumber as getWeekNumberUtil, formatISOWeek } from '@/utils/logbook/photoHandlers';

interface WhiteboardPhoto {
  id: string;
  workout_week: string;
  photo_label: string;
  photo_url: string;
  caption?: string | null;
  display_order: number;
  created_at: string;
}

export interface PhotoHandlers {
  handleViewPhoto: (photo: WhiteboardPhoto) => void;
  handleClosePhotoModal: () => void;
  handlePreviousPhoto: () => void;
  handleNextPhoto: () => void;
  fetchWhiteboardPhotos: () => Promise<void>;
  getWeekNumber: (date: Date) => number;
}

export function usePhotoHandling(
  selectedDate: Date,
  whiteboardPhotos: WhiteboardPhoto[],
  setWhiteboardPhotos: Dispatch<SetStateAction<WhiteboardPhoto[]>>,
  photosLoading: boolean,
  setPhotosLoading: Dispatch<SetStateAction<boolean>>,
  selectedPhoto: WhiteboardPhoto | null,
  setSelectedPhoto: Dispatch<SetStateAction<WhiteboardPhoto | null>>,
  setShowPhotoModal: Dispatch<SetStateAction<boolean>>
): PhotoHandlers {
  // Re-export utility function through interface
  const getWeekNumber = getWeekNumberUtil;

  const fetchWhiteboardPhotos = async () => {
    const isoWeek = formatISOWeek(selectedDate);

    setPhotosLoading(true);
    try {
      const response = await authFetch(`/api/whiteboard-photos?week=${isoWeek}`);
      if (!response.ok) throw new Error('Failed to fetch photos');
      const data = await response.json();
      setWhiteboardPhotos(data);
    } catch (error) {
      console.error('Error fetching whiteboard photos:', error);
      setWhiteboardPhotos([]);
    } finally {
      setPhotosLoading(false);
    }
  };

  // Fetch whiteboard photos when selected date changes
  useEffect(() => {
    fetchWhiteboardPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const handleViewPhoto = (photo: WhiteboardPhoto) => {
    setSelectedPhoto(photo);
    setShowPhotoModal(true);
  };

  const handleClosePhotoModal = () => {
    setShowPhotoModal(false);
    setSelectedPhoto(null);
  };

  const handlePreviousPhoto = () => {
    if (!selectedPhoto || whiteboardPhotos.length === 0) return;
    const currentIndex = whiteboardPhotos.findIndex(p => p.id === selectedPhoto.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : whiteboardPhotos.length - 1;
    setSelectedPhoto(whiteboardPhotos[prevIndex]);
  };

  const handleNextPhoto = () => {
    if (!selectedPhoto || whiteboardPhotos.length === 0) return;
    const currentIndex = whiteboardPhotos.findIndex(p => p.id === selectedPhoto.id);
    const nextIndex = currentIndex < whiteboardPhotos.length - 1 ? currentIndex + 1 : 0;
    setSelectedPhoto(whiteboardPhotos[nextIndex]);
  };

  return {
    handleViewPhoto,
    handleClosePhotoModal,
    handlePreviousPhoto,
    handleNextPhoto,
    fetchWhiteboardPhotos,
    getWeekNumber,
  };
}
