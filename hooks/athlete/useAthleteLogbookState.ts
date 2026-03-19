'use client';

import { useState, Dispatch, SetStateAction } from 'react';

interface LiftRecord {
  lift_name: string;
  weight_kg: string;
  reps: number;
  rep_scheme?: string;
}

interface BenchmarkResult {
  benchmark_name: string;
  benchmark_type: string;
  time_result?: string;
  reps_result?: string;
  weight_result?: string;
  scaling_level?: 'Rx' | 'Sc1' | 'Sc2' | 'Sc3';
  benchmark_id?: string;
  forge_benchmark_id?: string;
}

interface SectionResult {
  time_result?: string;
  reps_result?: string;
  weight_result?: string;
  weight_result_2?: string;
  scaling_level?: 'Rx' | 'Sc1' | 'Sc2' | 'Sc3' | '';
  rounds_result?: string;
  calories_result?: string;
  metres_result?: string;
  task_completed?: boolean;
}

interface WhiteboardPhoto {
  id: string;
  workout_week: string;
  photo_label: string;
  photo_url: string;
  caption?: string | null;
  display_order: number;
  created_at: string;
}

export interface AthleteLogbookState {
  selectedDate: Date;
  setSelectedDate: Dispatch<SetStateAction<Date>>;
  viewMode: 'day' | 'week' | 'month';
  setViewMode: Dispatch<SetStateAction<'day' | 'week' | 'month'>>;
  liftRecords: Record<string, LiftRecord>;
  setLiftRecords: Dispatch<SetStateAction<Record<string, LiftRecord>>>;
  benchmarkResults: Record<string, BenchmarkResult>;
  setBenchmarkResults: Dispatch<SetStateAction<Record<string, BenchmarkResult>>>;
  sectionResults: Record<string, SectionResult>;
  setSectionResults: Dispatch<SetStateAction<Record<string, SectionResult>>>;
  whiteboardPhotos: WhiteboardPhoto[];
  setWhiteboardPhotos: Dispatch<SetStateAction<WhiteboardPhoto[]>>;
  photosLoading: boolean;
  setPhotosLoading: Dispatch<SetStateAction<boolean>>;
  selectedPhoto: WhiteboardPhoto | null;
  setSelectedPhoto: Dispatch<SetStateAction<WhiteboardPhoto | null>>;
  showPhotoModal: boolean;
  setShowPhotoModal: Dispatch<SetStateAction<boolean>>;
}

export function useAthleteLogbookState(
  initialDate?: Date,
  initialViewMode?: 'day' | 'week' | 'month'
): AthleteLogbookState {
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>(initialViewMode || 'week');
  const [liftRecords, setLiftRecords] = useState<Record<string, LiftRecord>>({});
  const [benchmarkResults, setBenchmarkResults] = useState<Record<string, BenchmarkResult>>({});
  const [sectionResults, setSectionResults] = useState<Record<string, SectionResult>>({});
  const [whiteboardPhotos, setWhiteboardPhotos] = useState<WhiteboardPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<WhiteboardPhoto | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  return {
    selectedDate,
    setSelectedDate,
    viewMode,
    setViewMode,
    liftRecords,
    setLiftRecords,
    benchmarkResults,
    setBenchmarkResults,
    sectionResults,
    setSectionResults,
    whiteboardPhotos,
    setWhiteboardPhotos,
    photosLoading,
    setPhotosLoading,
    selectedPhoto,
    setSelectedPhoto,
    showPhotoModal,
    setShowPhotoModal,
  };
}
