'use client';

import { ChevronDown, Link, Play, Plus, Video, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { matchAllSectionsExercises, type MatchedExerciseVideo } from '@/utils/section-video-matcher';
import ExerciseVideoModal from '@/components/coach/ExerciseVideoModal';

interface VideoClip {
  label: string;
  url: string;
}

interface MovementDemosBarProps {
  sections: { content: string }[];
  exercises: { name: string; display_name?: string; video_url: string | null }[];
  videoClips: VideoClip[];
  onVideoClipsChange: (clips: VideoClip[]) => void;
}

export default function MovementDemosBar({
  sections,
  exercises,
  videoClips,
  onVideoClipsChange,
}: MovementDemosBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAddClip, setShowAddClip] = useState(false);
  const [newClipLabel, setNewClipLabel] = useState('');
  const [newClipUrl, setNewClipUrl] = useState('');

  // Video modal state
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('');
  const [selectedVideoName, setSelectedVideoName] = useState('');

  // Auto-detect exercises with videos across all sections (deduplicated)
  const autoDetectedVideos: MatchedExerciseVideo[] = useMemo(
    () => matchAllSectionsExercises(sections, exercises),
    [sections, exercises]
  );

  const totalCount = autoDetectedVideos.length + videoClips.length;

  const openVideo = (name: string, url: string) => {
    setSelectedVideoName(name);
    setSelectedVideoUrl(url);
    setVideoModalOpen(true);
  };

  const addManualClip = () => {
    if (!newClipUrl.trim()) return;
    onVideoClipsChange([...videoClips, { label: newClipLabel.trim() || 'Video', url: newClipUrl.trim() }]);
    setNewClipLabel('');
    setNewClipUrl('');
    setShowAddClip(false);
  };

  const removeManualClip = (index: number) => {
    onVideoClipsChange(videoClips.filter((_, i) => i !== index));
  };

  if (totalCount === 0 && !expanded) {
    return (
      <button
        type='button'
        onClick={() => setExpanded(true)}
        className='w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-500 hover:text-[#178da6] border border-dashed border-gray-300 rounded-lg hover:border-[#178da6] transition'
      >
        <Video size={14} />
        Movement Demos
        <span className='text-gray-400'>— attach video clips</span>
      </button>
    );
  }

  return (
    <>
      <div className='border border-purple-200 rounded-lg bg-purple-50/50'>
        {/* Header - always visible */}
        <button
          type='button'
          onClick={() => setExpanded(v => !v)}
          className='w-full flex items-center justify-between px-3 py-2 text-left'
        >
          <div className='flex items-center gap-2'>
            <Video size={14} className='text-purple-600' />
            <span className='text-xs font-semibold text-purple-800'>Movement Demos</span>
            {totalCount > 0 && (
              <span className='text-xs bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded-full font-medium'>
                {totalCount}
              </span>
            )}
            {!expanded && totalCount > 0 && (
              <span className='text-xs text-purple-600 italic truncate max-w-[200px]'>
                — {autoDetectedVideos.slice(0, 3).map(v => v.exerciseName).join(', ')}
                {totalCount > 3 && ` +${totalCount - 3} more`}
              </span>
            )}
          </div>
          <ChevronDown
            size={15}
            className={`text-purple-600 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className='px-3 pb-3 space-y-2'>
            {/* Auto-detected + manual clips */}
            {totalCount > 0 && (
              <div className='flex flex-wrap gap-1.5'>
                {/* Auto-detected exercise videos */}
                {autoDetectedVideos.map((match, idx) => (
                  <button
                    key={`auto-${idx}`}
                    type='button'
                    onClick={() => openVideo(match.exerciseName, match.videoUrl)}
                    className='inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white text-purple-700 border border-purple-200 rounded-md hover:bg-purple-100 transition'
                    title={`Play video: ${match.exerciseName}`}
                  >
                    <Play size={12} className='fill-purple-600 text-purple-600' />
                    {match.exerciseName}
                  </button>
                ))}

                {/* Manually attached clips */}
                {videoClips.map((clip, idx) => (
                  <div key={`manual-${idx}`} className='inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white text-emerald-700 border border-emerald-200 rounded-md'>
                    <button
                      type='button'
                      onClick={() => openVideo(clip.label, clip.url)}
                      className='inline-flex items-center gap-1 hover:text-emerald-900 transition'
                      title={`Play: ${clip.label}`}
                    >
                      <Link size={12} />
                      {clip.label}
                    </button>
                    <button
                      type='button'
                      onClick={() => removeManualClip(idx)}
                      className='text-emerald-500 hover:text-red-500 transition ml-0.5'
                      title='Remove clip'
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add manual clip */}
            {!showAddClip ? (
              <button
                type='button'
                onClick={() => setShowAddClip(true)}
                className='inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 transition'
              >
                <Plus size={12} />
                Attach video clip
              </button>
            ) : (
              <div className='flex items-center gap-2 p-2 bg-white border border-purple-200 rounded-lg'>
                <input
                  type='text'
                  value={newClipLabel}
                  onChange={e => setNewClipLabel(e.target.value)}
                  placeholder='Label (optional)'
                  className='w-28 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-400 text-gray-900 placeholder-gray-400'
                />
                <input
                  type='url'
                  value={newClipUrl}
                  onChange={e => setNewClipUrl(e.target.value)}
                  placeholder='Video URL (YouTube, .mp4, etc.)'
                  className='flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-400 text-gray-900 placeholder-gray-400'
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addManualClip(); } }}
                />
                <button
                  type='button'
                  onClick={addManualClip}
                  disabled={!newClipUrl.trim()}
                  className='px-2 py-1 text-xs font-medium bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 transition'
                >
                  Add
                </button>
                <button
                  type='button'
                  onClick={() => { setShowAddClip(false); setNewClipLabel(''); setNewClipUrl(''); }}
                  className='text-gray-400 hover:text-gray-600'
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {totalCount === 0 && !showAddClip && (
              <p className='text-xs text-purple-500 italic'>
                Video clips will appear automatically when exercises in your sections have linked videos.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Video Playback Modal */}
      <ExerciseVideoModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        videoUrl={selectedVideoUrl}
        exerciseName={selectedVideoName}
      />
    </>
  );
}
