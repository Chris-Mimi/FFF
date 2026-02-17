import { sendToUser, sendToAllMembers, type PushPayload } from './web-push';

/**
 * Notify all subscribed members that a new workout has been published.
 * Fire-and-forget — errors are logged but never block the caller.
 */
export function notifyWodPublished(workoutName: string, workoutDate: string): void {
  const dateFormatted = new Date(workoutDate + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const payload: PushPayload = {
    title: 'New Workout Published',
    body: workoutName ? `${workoutName} — ${dateFormatted}` : dateFormatted,
    data: { url: '/member/book', type: 'wod_published' },
  };

  // Fire-and-forget — don't await
  sendToAllMembers(payload, 'wod_published').catch((err) =>
    console.error('notifyWodPublished failed:', err)
  );
}

/**
 * Notify a specific user about a booking confirmation.
 */
export function notifyBookingConfirmed(userId: string, sessionDate: string, sessionTime: string): void {
  const dateFormatted = new Date(sessionDate + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const payload: PushPayload = {
    title: 'Booking Confirmed',
    body: `You're in! ${dateFormatted} at ${sessionTime}`,
    data: { url: '/member/book', type: 'booking_confirmed' },
  };

  sendToUser(userId, payload, 'booking_confirmed').catch((err) =>
    console.error('notifyBookingConfirmed failed:', err)
  );
}

/**
 * Notify a specific user they've been added to the waitlist.
 */
export function notifyBookingWaitlisted(userId: string, sessionDate: string, sessionTime: string): void {
  const dateFormatted = new Date(sessionDate + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const payload: PushPayload = {
    title: 'Waitlisted',
    body: `Class full — you're on the waitlist for ${dateFormatted} at ${sessionTime}`,
    data: { url: '/member/book', type: 'booking_waitlisted' },
  };

  sendToUser(userId, payload, 'booking_waitlisted').catch((err) =>
    console.error('notifyBookingWaitlisted failed:', err)
  );
}

/**
 * Notify a user they've been promoted from the waitlist to confirmed.
 */
export function notifyWaitlistPromoted(userId: string, sessionDate: string, sessionTime: string): void {
  const dateFormatted = new Date(sessionDate + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const payload: PushPayload = {
    title: 'Spot Opened!',
    body: `You're in! Promoted from waitlist — ${dateFormatted} at ${sessionTime}`,
    data: { url: '/member/book', type: 'booking_promoted' },
  };

  sendToUser(userId, payload, 'booking_promoted').catch((err) =>
    console.error('notifyWaitlistPromoted failed:', err)
  );
}

/**
 * Notify a user they achieved a new personal record.
 */
export function notifyPrAchieved(userId: string, liftOrBenchmark: string, value: string): void {
  const payload: PushPayload = {
    title: 'New PR!',
    body: `${liftOrBenchmark}: ${value}`,
    data: { url: '/athlete?tab=records', type: 'pr_achieved' },
  };

  sendToUser(userId, payload, 'pr_achieved').catch((err) =>
    console.error('notifyPrAchieved failed:', err)
  );
}
