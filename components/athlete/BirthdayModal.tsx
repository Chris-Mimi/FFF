'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

interface BirthdayModalProps {
  name: string;
  onClose: () => void;
}

const CONFETTI_COLORS = ['#14b8a6', '#f59e0b', '#ec4899', '#3b82f6', '#a855f7', '#ef4444', '#22c55e'];

/**
 * One-time happy-birthday celebration shown on the athlete's birthday at login.
 * Portaled to document.body — iOS Safari mis-pins fixed overlays inside scroll
 * containers (see ExerciseVideoModal). Confetti is pure CSS, no dependency.
 */
export default function BirthdayModal({ name, onClose }: BirthdayModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Stable confetti pieces (client-only render, so no hydration concern).
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2.5,
        duration: 2.8 + Math.random() * 2.2,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
        rotate: Math.random() * 360,
      })),
    []
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className='fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4'
      onClick={onClose}
    >
      <style>{`
        @keyframes forge-confetti-fall {
          0%   { transform: translateY(-12vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(112vh) rotate(540deg); opacity: 0.9; }
        }
        @keyframes forge-birthday-pop {
          0%   { transform: scale(0.85); opacity: 0; }
          60%  { transform: scale(1.03); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Confetti layer */}
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        {pieces.map(p => (
          <span
            key={p.id}
            style={{
              position: 'absolute',
              top: 0,
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size * 0.4}px`,
              backgroundColor: p.color,
              transform: `rotate(${p.rotate}deg)`,
              borderRadius: '1px',
              animation: `forge-confetti-fall ${p.duration}s linear ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>

      <div
        className='relative w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl'
        style={{ animation: 'forge-birthday-pop 0.45s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src='/icon.png'
          alt='The Forge'
          width={64}
          height={64}
          className='mx-auto h-16 w-16 object-contain'
        />
        <div className='mt-2 text-3xl'>🎉 🎂 🎉</div>
        <h2 className='mt-3 text-xl font-bold text-gray-900'>
          Happy Birthday, {name}!
        </h2>
        <p className='mt-2 text-sm text-gray-600'>
          Heute feiern wir DICH! Wir wünschen dir ein starkes neues Lebensjahr voller PRs und guter Laune.
        </p>
        <p className='mt-3 text-sm font-semibold text-teal-700'>
          — Deine Coaches von The Forge 🏋️
        </p>
        <button
          onClick={onClose}
          autoFocus
          className='mt-6 w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 min-h-[44px]'
        >
          Danke! 🎉
        </button>
      </div>
    </div>,
    document.body
  );
}
