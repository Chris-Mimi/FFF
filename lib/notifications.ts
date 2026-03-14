import { sendToUser, sendToAllMembers, sendToCoaches, type PushPayload } from './web-push';

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
 * Notify a specific user that their session has been cancelled by the coach.
 */
export function notifySessionCancelled(userId: string, sessionDate: string, sessionTime: string): void {
  const dateFormatted = new Date(sessionDate + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const payload: PushPayload = {
    title: 'Session Cancelled',
    body: `${dateFormatted} at ${sessionTime} has been cancelled by your coach`,
    data: { url: '/member/book', type: 'session_cancelled' },
  };

  sendToUser(userId, payload, 'session_cancelled').catch((err) =>
    console.error('notifySessionCancelled failed:', err)
  );
}

/**
 * Notify a user that the coach added them to a session.
 */
export function notifyCoachBooked(userId: string, sessionDate: string, sessionTime: string, status: 'confirmed' | 'waitlist'): void {
  const dateFormatted = new Date(sessionDate + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const isConfirmed = status === 'confirmed';
  const payload: PushPayload = {
    title: isConfirmed ? 'Booked by Coach' : 'Waitlisted by Coach',
    body: isConfirmed
      ? `Your coach booked you in for ${dateFormatted} at ${sessionTime}`
      : `Your coach added you to the waitlist for ${dateFormatted} at ${sessionTime}`,
    data: { url: '/member/book', type: isConfirmed ? 'booking_confirmed' : 'booking_waitlisted' },
  };

  const notificationType = isConfirmed ? 'booking_confirmed' : 'booking_waitlisted';
  sendToUser(userId, payload, notificationType).catch((err) =>
    console.error('notifyCoachBooked failed:', err)
  );
}

/**
 * Notify a user that the coach removed them from a session.
 */
export function notifyCoachRemoved(userId: string, sessionDate: string, sessionTime: string): void {
  const dateFormatted = new Date(sessionDate + 'T00:00:00').toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const payload: PushPayload = {
    title: 'Booking Removed',
    body: `Your coach removed your booking for ${dateFormatted} at ${sessionTime}`,
    data: { url: '/member/book', type: 'session_cancelled' },
  };

  sendToUser(userId, payload, 'session_cancelled').catch((err) =>
    console.error('notifyCoachRemoved failed:', err)
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

/**
 * Notify a user that a coach awarded them an achievement.
 */
export function notifyAchievementAwarded(userId: string, achievementName: string): void {
  const payload: PushPayload = {
    title: 'Achievement Unlocked!',
    body: `Your coach awarded you: ${achievementName}`,
    data: { url: '/athlete?tab=records', type: 'achievement_awarded' },
  };

  sendToUser(userId, payload, 'achievement_awarded').catch((err) =>
    console.error('notifyAchievementAwarded failed:', err)
  );
}

/**
 * Notify athletes that the coach recorded their scores.
 * Called after coach bulk save — one notification per athlete.
 */
export function notifyScoreRecorded(userId: string, workoutName: string): void {
  const payload: PushPayload = {
    title: 'Score Recorded',
    body: workoutName
      ? `Your coach recorded your score for ${workoutName}`
      : 'Your coach recorded your score',
    data: { url: '/athlete?tab=workouts', type: 'score_recorded' },
  };

  sendToUser(userId, payload, 'score_recorded').catch((err) =>
    console.error('notifyScoreRecorded failed:', err)
  );
}

/**
 * Notify all coaches that an athlete is querying their score.
 * Fire-and-forget — no preference check (coaches always receive these).
 */
export async function notifyScoreQuery(athleteName: string, workoutName: string, message: string): Promise<void> {
  const payload: PushPayload = {
    title: 'Score Query',
    body: `${athleteName} is querying their score${workoutName ? ` for ${workoutName}` : ''}: "${message}"`,
    data: { url: '/coach', type: 'score_query' },
  };

  await sendToCoaches(payload, 'score_query');
}
