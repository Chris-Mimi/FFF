'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { subscribe, resolveConfirm, type ConfirmOptions } from '@/lib/confirm';
import { FocusTrap } from './FocusTrap';

export function ConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    return subscribe(setOptions);
  }, []);

  // Reset the input each time a new dialog opens.
  useEffect(() => {
    setInputValue(options?.input?.defaultValue ?? '');
  }, [options]);

  const handleConfirm = useCallback(
    () => resolveConfirm(true, options?.input ? inputValue.trim() : null),
    [options, inputValue]
  );
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
  const confirmDisabled = !!options.input?.required && inputValue.trim().length === 0;

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

          {options.input && (
            <div className="mt-4">
              {options.input.label && (
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {options.input.label}
                </label>
              )}
              <input
                type="text"
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !confirmDisabled) handleConfirm();
                }}
                placeholder={options.input.placeholder}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={handleCancel}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]"
            >
              {options.cancelText || 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              autoFocus={!options.input}
              disabled={confirmDisabled}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed ${
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
