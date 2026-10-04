import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import { berlinToday } from '@/lib/bookingRules';
import { planTenCardCarryOver, renewTenCard } from '@/lib/tenCardRenewal';

// Service-role: write to ten_card_archive + reset members.ten_card_* (a potentially
// shared parent row). Per the S344 rule, coach mutations on athlete-owned state
// bypass RLS server-side.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const {
      memberId,
      preview,
      newPurchaseDate,
      newExpiryDate,
      newTotal,
      newSessionsUsed,
      newNotes,
    } = (await request.json()) as {
      memberId?: string;
      preview?: boolean;         // true = return the carry-over plan only, write nothing
      newPurchaseDate?: string;  // YYYY-MM-DD; defaults to first carried session, else today
      newExpiryDate?: string;    // YYYY-MM-DD; defaults to today + 12 months
      newTotal?: number;         // defaults to current card's total
      newSessionsUsed?: number;  // defaults to the carried-over count
      newNotes?: string;         // notes to set on the NEW active card (old notes are archived)
    };
    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    if (preview) {
      return NextResponse.json(await planTenCardCarryOver(supabaseAdmin, memberId));
    }

    try {
      const newCard = await renewTenCard(supabaseAdmin, memberId, {
        paidOn: berlinToday(),
        newPurchaseDate,
        newExpiryDate,
        newTotal,
        newSessionsUsed,
        newNotes,
      });
      return NextResponse.json({ success: true, newCard });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      // A shared family card lives on the HOLDER's row; closing on a sharer's row
      // creates a duplicate card the holder-rollup ignores (Lenny Kleinert / Katja
      // Brückner incident).
      if (msg === 'SHARER') {
        return NextResponse.json(
          { error: 'This member shares another member\'s 10-card. Close and renew it on the card holder\'s account instead.' },
          { status: 400 }
        );
      }
      if (msg === 'NO_CARD') {
        return NextResponse.json({ error: 'Member has no active 10-card to close' }, { status: 400 });
      }
      console.error('close-ten-card failed:', err);
      return NextResponse.json(
        { error: msg.startsWith('RESET_FAILED') ? 'Card archived but member reset failed — contact support' : 'Failed to close card' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('close-ten-card error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
