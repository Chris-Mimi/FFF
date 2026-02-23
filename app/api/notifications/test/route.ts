import { NextRequest, NextResponse } from 'next/server';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  const result = await requireCoach(request);
  if (isAuthError(result)) return result;
  const user = result;

  // Diagnostic info
  const diag: Record<string, unknown> = {
    userId: user.id,
    vapidConfigured: !!(
      process.env.VAPID_SUBJECT &&
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY
    ),
    vapidSubject: process.env.VAPID_SUBJECT || 'MISSING',
    vapidPublicKeyPrefix: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.slice(0, 12) || 'MISSING',
    vapidPrivateKeySet: !!process.env.VAPID_PRIVATE_KEY,
  };

  // Look up subscriptions
  const { data: subs, error: subError } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, user_id')
    .eq('user_id', user.id);

  diag.subscriptionCount = subs?.length ?? 0;
  diag.subscriptionError = subError?.message || null;
  diag.subscriptions = (subs || []).map((s) => ({
    id: s.id,
    endpointPrefix: s.endpoint.slice(0, 60),
    p256dhPrefix: s.p256dh.slice(0, 12),
    authPrefix: s.auth.slice(0, 8),
  }));

  if (!subs || subs.length === 0) {
    return NextResponse.json({ ...diag, result: 'NO_SUBSCRIPTIONS' });
  }

  // Configure VAPID
  if (diag.vapidConfigured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
  } else {
    return NextResponse.json({ ...diag, result: 'VAPID_NOT_CONFIGURED' });
  }

  // Try sending to each subscription
  const results = [];
  for (const sub of subs) {
    try {
      const sendResult = await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({
          title: 'Test Notification',
          body: 'Push notifications are working!',
          data: { type: 'test' },
        })
      );
      results.push({
        subId: sub.id,
        status: 'OK',
        httpStatus: sendResult.statusCode,
        headers: sendResult.headers,
      });
    } catch (error: unknown) {
      const err = error as { statusCode?: number; body?: string; message?: string };
      results.push({
        subId: sub.id,
        status: 'FAILED',
        httpStatus: err.statusCode,
        body: err.body,
        message: err.message,
      });
    }
  }

  diag.sendResults = results;
  return NextResponse.json(diag);
}
