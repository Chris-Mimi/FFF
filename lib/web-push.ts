import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Initialize VAPID credentials (only if env vars are set)
const vapidConfigured =
  process.env.VAPID_SUBJECT &&
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY;

if (vapidConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

// Admin client for bypassing RLS (server-side only)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: { url?: string; type?: string };
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
}

/**
 * Send to a single push subscription. Auto-deletes expired subs (410/404).
 */
async function sendToSubscription(
  sub: PushSubscriptionRow,
  payload: PushPayload
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload)
    );
    return true;
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 410 || statusCode === 404) {
      // Subscription expired — clean up
      await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
    }
    console.error(`Push failed for sub ${sub.id}:`, statusCode || (error as Error).message);
    return false;
  }
}

/**
 * Send notification to all devices for a specific user.
 * Checks notification_preferences if notificationType is provided.
 */
export async function sendToUser(
  userId: string,
  payload: PushPayload,
  notificationType?: string
): Promise<void> {
  // Check user preference if type provided
  if (notificationType) {
    const { data: prefs } = await supabaseAdmin
      .from('notification_preferences')
      .select(notificationType)
      .eq('user_id', userId)
      .maybeSingle();

    // If prefs exist and this type is explicitly off, skip
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (prefs && (prefs as Record<string, any>)[notificationType] === false) return;
  }

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, user_id')
    .eq('user_id', userId);

  if (!subs || subs.length === 0) return;

  // Log notification
  await supabaseAdmin.from('notification_log').insert({
    user_id: userId,
    notification_type: notificationType || 'unknown',
    title: payload.title,
    body: payload.body,
    data: payload.data || null,
  });

  await Promise.allSettled(subs.map((sub) => sendToSubscription(sub, payload)));
}

/**
 * Send notification to all subscribed active members (broadcast).
 * Respects per-user notification preferences.
 */
export async function sendToAllMembers(
  payload: PushPayload,
  notificationType: string
): Promise<void> {
  // Get all push subscriptions for active members
  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, user_id');

  if (!subs || subs.length === 0) return;

  // Get unique user IDs
  const userIds = [...new Set(subs.map((s) => s.user_id))];

  // Get active member IDs
  const { data: activeMembers } = await supabaseAdmin
    .from('members')
    .select('id, status')
    .in('id', userIds);

  const activeMemberIds = new Set((activeMembers || []).filter(m => m.status === 'active').map((m) => m.id));

  if (activeMemberIds.size === 0) return;

  // Get preferences for users who have opted out
  const { data: optedOut } = await supabaseAdmin
    .from('notification_preferences')
    .select('user_id')
    .in('user_id', userIds)
    .eq(notificationType, false);

  const optedOutIds = new Set((optedOut || []).map((p) => p.user_id));

  // Filter subscriptions: active member + not opted out
  const eligibleSubs = subs.filter(
    (sub) => activeMemberIds.has(sub.user_id) && !optedOutIds.has(sub.user_id)
  );

  if (eligibleSubs.length === 0) return;

  // Log notification for each eligible user (deduplicated)
  const eligibleUserIds = [...new Set(eligibleSubs.map((s) => s.user_id))];
  const logEntries = eligibleUserIds.map((userId) => ({
    user_id: userId,
    notification_type: notificationType,
    title: payload.title,
    body: payload.body,
    data: payload.data || null,
  }));
  await supabaseAdmin.from('notification_log').insert(logEntries);

  await Promise.allSettled(eligibleSubs.map((sub) => sendToSubscription(sub, payload)));
}

/**
 * Send notification to all coaches (users with role='coach' in auth metadata).
 * No preference check — coaches always receive operational notifications.
 */
export async function sendToCoaches(
  payload: PushPayload,
  notificationType: string
): Promise<void> {
  // Get all users with coach role from auth metadata
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error || !users) return;

  const coachIds = users
    .filter((u) => u.user_metadata?.role === 'coach')
    .map((u) => u.id);

  if (coachIds.length === 0) return;

  // Get push subscriptions for coaches
  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, user_id')
    .in('user_id', coachIds);

  if (!subs || subs.length === 0) return;

  // Log notification for each coach
  const uniqueCoachIds = [...new Set(subs.map((s) => s.user_id))];
  const logEntries = uniqueCoachIds.map((userId) => ({
    user_id: userId,
    notification_type: notificationType,
    title: payload.title,
    body: payload.body,
    data: payload.data || null,
  }));
  await supabaseAdmin.from('notification_log').insert(logEntries);

  await Promise.allSettled(subs.map((sub) => sendToSubscription(sub, payload)));
}
