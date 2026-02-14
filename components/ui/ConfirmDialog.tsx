'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { subscribe, resolveConfirm, type ConfirmOptions } from '@/lib/confirm';
import { FocusTrap } from './FocusTrap';

export function ConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  useEffect(() => {
    return subscribe(setOptions);
  }, []);

  const handleConfirm = useCallback(() => resolveConfirm(true), []);
  const handleCancel = useCallback(() => resolveConfirm(false), []);

  useEffect(() => {
    if (!options) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [options, handleCancel]);

  if (!options) return null;

  const isDanger = options.variant === 'danger';

  return (
    <FocusTrap>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
        onClick={handleCancel}
      >
        <div
          className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-3">
            {isDanger && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            )}
            <div className="min-w-0">
              {options.title && (
                <h3 className="text-lg font-semibold text-gray-900">
                  {options.title}
                </h3>
              )}
              <p className={`text-sm text-gray-600 ${options.title ? 'mt-1' : ''}`}>
                {options.message}
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={handleCancel}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]"
            >
              {options.cancelText || 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              autoFocus
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white min-h-[44px] ${
                isDanger
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-teal-600 hover:bg-teal-700'
              }`}
            >
              {options.confirmText || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </FocusTrap>
  );
}
