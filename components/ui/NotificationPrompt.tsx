'use client';

import { useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  usePushNotifications,
  type NotificationPreferences,
} from '@/hooks/usePushNotifications';

const PREF_LABELS: Record<keyof NotificationPreferences, string> = {
  wod_published: 'WOD Published',
  booking_confirmed: 'Booking Confirmed',
  booking_waitlisted: 'Waitlist Updates',
  booking_promoted: 'Spot Opened',
  pr_achieved: 'New PR',
};

export function NotificationPrompt() {
  const {
    isSupported,
    permission,
    isSubscribed,
    loading,
    preferences,
    subscribe,
    unsubscribe,
    updatePreferences,
  } = usePushNotifications();

  const [dismissed, setDismissed] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);

  // Don't render if not supported or permission permanently denied
  if (!isSupported || permission === 'denied') return null;

  // Already subscribed — show bell icon that opens preferences
  if (isSubscribed) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowPrefs(!showPrefs)}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-800"
          aria-label="Notification preferences"
        >
          <Bell className="h-5 w-5" />
        </button>

        {showPrefs && (
          <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              <button
                onClick={() => setShowPrefs(false)}
                className="rounded p-1 text-gray-500 hover:bg-gray-100"
                aria-label="Close preferences"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {(Object.keys(PREF_LABELS) as (keyof NotificationPreferences)[]).map(
                (key) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 hover:bg-gray-50"
                  >
                    <span className="text-sm text-gray-700">{PREF_LABELS[key]}</span>
                    <input
                      type="checkbox"
                      checked={preferences[key]}
                      onChange={(e) => {
                        updatePreferences({ [key]: e.target.checked });
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 accent-blue-600"
                    />
                  </label>
                )
              )}
            </div>

            <div className="mt-3 border-t border-gray-100 pt-3">
              <button
                onClick={async () => {
                  const ok = await unsubscribe();
                  if (ok) {
                    toast.success('Notifications disabled');
                    setShowPrefs(false);
                  }
                }}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <BellOff className="h-4 w-4" />
                Disable all notifications
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Not subscribed — show opt-in prompt (dismissible)
  if (dismissed) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
      <Bell className="h-5 w-5 flex-shrink-0 text-blue-600" />
      <p className="flex-1 text-sm text-gray-700">
        Get notified about new workouts, booking updates, and PRs.
      </p>
      <button
        onClick={async () => {
          const ok = await subscribe();
          if (ok) {
            toast.success('Notifications enabled!');
          } else if (Notification.permission === 'denied') {
            toast.error('Notifications blocked. Enable in browser settings.');
          }
        }}
        disabled={loading}
        className="whitespace-nowrap rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Enable
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="rounded p-1 text-gray-400 hover:text-gray-600"
        aria-label="Dismiss notification prompt"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
