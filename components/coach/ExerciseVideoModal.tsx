'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getEmbedUrl } from '@/utils/video-helpers';

interface ExerciseVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  exerciseName: string;
}

export default function ExerciseVideoModal({
  isOpen,
  onClose,
  videoUrl,
  exerciseName,
}: ExerciseVideoModalProps) {
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  // Modal size and position state
  const [modalSize, setModalSize] = useState({ width: 800, height: 600 });
  const [modalPos, setModalPos] = useState({ top: 100, left: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, top: 0, left: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check for mobile screen
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Process video URL
  const { type, embedUrl } = getEmbedUrl(videoUrl);

  // Center modal on first open
  useEffect(() => {
    if (isOpen) {
      const centerX = Math.max(0, (window.innerWidth - modalSize.width) / 2);
      const centerY = Math.max(0, (window.innerHeight - modalSize.height) / 2);
      setModalPos({ top: centerY, left: centerX });
    }
  }, [isOpen]); // Only run when isOpen changes, not modalSize

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Cleanup video on close
  useEffect(() => {
    if (!isOpen) {
      // Stop video playback
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      // Stop iframe video (YouTube)
      if (iframeRef.current) {
        // Reload iframe to stop video
        const src = iframeRef.current.src;
        iframeRef.current.src = '';
        iframeRef.current.src = src;
      }
    }
  }, [isOpen]);

  // Handle drag
  const handleDragStart = (e: React.MouseEvent) => {
    // Only allow dragging from header, not close button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      top: modalPos.top,
      left: modalPos.left,
    });
  };

  // Handle resize (bottom-right corner only)
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: modalSize.width,
      height: modalSize.height,
    });
  };

  // Drag and resize effects
  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        setModalPos({
          top: Math.max(0, dragStart.top + deltaY),
          left: Math.max(0, dragStart.left + deltaX),
        });
      };
      const handleMouseUp = () => setIsDragging(false);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }

    if (isResizing) {
      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;

        const newWidth = Math.max(600, Math.min(1400, resizeStart.width + deltaX));
        const newHeight = Math.max(400, Math.min(900, resizeStart.height + deltaY));

        setModalSize({ width: newWidth, height: newHeight });
      };
      const handleMouseUp = () => setIsResizing(false);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className='fixed inset-0 bg-black/90 z-[110]'
        onClick={onClose}
        style={{ cursor: isDragging ? 'grabbing' : 'default' }}
      />

      {/* Modal */}
      <div
        className={`fixed bg-black shadow-2xl z-[110] flex flex-col ${
          isMobile ? 'inset-0' : 'border border-gray-700 rounded-lg'
        }`}
        style={isMobile ? {} : {
          top: `${modalPos.top}px`,
          left: `${modalPos.left}px`,
          width: `${modalSize.width}px`,
          height: `${modalSize.height}px`,
          cursor: isDragging ? 'grabbing' : 'default',
        }}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700 ${
            isMobile ? '' : 'rounded-t-lg cursor-move'
          }`}
          onMouseDown={isMobile ? undefined : handleDragStart}
        >
          <div className='flex items-center gap-2 text-white'>
            <span className='text-lg'>📹</span>
            <h3 className='text-lg font-semibold truncate'>{exerciseName}</h3>
          </div>
          <button
            onClick={onClose}
            className='flex-shrink-0 p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition'
            aria-label='Close'
          >
            <X size={20} />
          </button>
        </div>

        {/* Video content */}
        <div className='flex-1 p-4 bg-black flex items-center justify-center overflow-hidden'>
          {type === 'youtube' && (
            <iframe
              ref={iframeRef}
              src={embedUrl}
              title={exerciseName}
              allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
              allowFullScreen
              className='w-full h-full rounded'
            />
          )}

          {type === 'video' && (
            <video
              ref={videoRef}
              src={embedUrl}
              controls
              className='w-full h-full rounded'
              preload='metadata'
            >
              Your browser does not support the video tag.
            </video>
          )}

          {type === 'unknown' && (
            <div className='text-center'>
              <p className='text-white mb-4'>Unable to load video</p>
              <p className='text-gray-400 text-sm mb-4'>Unsupported video format</p>
              <a
                href={videoUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='text-teal-400 hover:text-teal-300 underline'
              >
                Open video in new tab
              </a>
            </div>
          )}
        </div>

        {/* Resize handle (bottom-right corner) - desktop only */}
        {!isMobile && (
          <div
            className='absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize'
            onMouseDown={handleResizeStart}
            style={{
              background: 'linear-gradient(135deg, transparent 50%, #4b5563 50%)',
            }}
          />
        )}
      </div>
    </>
  );
}
