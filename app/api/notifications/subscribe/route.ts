import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, isAuthError } from '@/lib/auth-api';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  const result = await requireAuth(request);
  if (isAuthError(result)) return result;
  const user = result;

  try {
    const { subscription, userAgent } = await request.json();

    console.log('[subscribe] user:', user.id, user.email, 'role:', user.user_metadata?.role);

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      console.log('[subscribe] REJECTED: invalid subscription payload');
      return NextResponse.json(
        { error: 'Invalid push subscription' },
        { status: 400 }
      );
    }

    console.log('[subscribe] endpoint:', subscription.endpoint.slice(0, 60) + '...');

    // Upsert push subscription (ON CONFLICT endpoint)
    const { data: upsertData, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          user_agent: userAgent || null,
        },
        { onConflict: 'endpoint' }
      )
      .select('id, user_id');

    if (subError) {
      console.error('[subscribe] UPSERT ERROR:', subError);
      return NextResponse.json(
        { error: 'Failed to save subscription' },
        { status: 500 }
      );
    }

    console.log('[subscribe] UPSERT OK:', upsertData);

    // Ensure notification_preferences row exists with defaults
    await supabaseAdmin
      .from('notification_preferences')
      .upsert(
        { user_id: user.id },
        { onConflict: 'user_id', ignoreDuplicates: true }
      );

    return NextResponse.json({ success: true, debug: { userId: user.id, email: user.email } });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
