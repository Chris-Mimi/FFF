import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const baseSectionId = (sectionId: string) => sectionId.replace(/-content-\d+$/, '');

/**
 * POST /api/sessions/move-results  { fromWodId, toWodId }
 * Copy-over (handleCopyWOD) used to delete the replaced workout and every score on
 * it — S416: 21.09 lost 24 scores + 12 Back Squat lift records (cascade on the wod
 * delete). Now the scores move onto the new copy for every section the copy also
 * has. Lift records + workout logs move only when ALL scores moved; otherwise
 * `remaining > 0` tells the caller to keep the old workout so nothing is lost.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach(request);
    if (isAuthError(user)) return user;

    const { fromWodId, toWodId } = (await request.json()) as { fromWodId?: string; toWodId?: string };
    if (!fromWodId || !toWodId || fromWodId === toWodId) {
      return NextResponse.json({ error: 'fromWodId and toWodId required' }, { status: 400 });
    }

    const { data: toWod, error: toErr } = await supabaseAdmin
      .from('wods')
      .select('sections, publish_sections')
      .eq('id', toWodId)
      .single();
    if (toErr || !toWod) return NextResponse.json({ error: 'Target workout not found' }, { status: 404 });
    const toSectionIds = new Set(((toWod.sections || []) as { id: string }[]).map(s => s.id));

    const { data: results, error: rErr } = await supabaseAdmin
      .from('wod_section_results')
      .select('id, section_id')
      .eq('wod_id', fromWodId);
    if (rErr) throw rErr;

    const movable = (results || []).filter(r => toSectionIds.has(baseSectionId(r.section_id)));
    const remaining = (results || []).length - movable.length;

    if (movable.length > 0) {
      const { error: mErr } = await supabaseAdmin
        .from('wod_section_results')
        .update({ wod_id: toWodId })
        .in('id', movable.map(r => r.id));
      if (mErr) throw mErr;

      // Merge (never replace) so the moved scores render in the coach modal and on
      // the leaderboard — same rule as the score-entry save route (S410).
      const moved = [...new Set(movable.map(r => baseSectionId(r.section_id)))];
      const current: string[] = toWod.publish_sections || [];
      const merged = [...new Set([...current, ...moved])];
      if (merged.length !== current.length) {
        const { error: pErr } = await supabaseAdmin.from('wods').update({ publish_sections: merged }).eq('id', toWodId);
        if (pErr) throw pErr;
      }
    }

    if (remaining === 0) {
      const { error: lErr } = await supabaseAdmin.from('lift_records').update({ wod_id: toWodId }).eq('wod_id', fromWodId);
      if (lErr) throw lErr;
      const { error: wErr } = await supabaseAdmin.from('workout_logs').update({ wod_id: toWodId }).eq('wod_id', fromWodId);
      if (wErr) throw wErr;
    }

    return NextResponse.json({ moved: movable.length, remaining });
  } catch (error) {
    console.error('move-results error:', error);
    return NextResponse.json({ error: 'Failed to move results' }, { status: 500 });
  }
}
