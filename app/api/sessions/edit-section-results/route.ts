import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

interface SectionMigration { fromKey: string; toKey: string }
interface FieldClear { sectionKey: string; columns: string[] }

// Columns the coach edit-cleanup is allowed to null (scoring fields only).
const CLEARABLE_COLUMNS = new Set([
  'weight_result', 'weight_result_2', 'weight_result_3',
  'scaling_level', 'scaling_level_2', 'scaling_level_3',
]);

/**
 * POST /api/sessions/edit-section-results
 * Coach-only, service role. Applies the athlete-data cleanup that happens when a
 * coach edits a WOD in the workout modal: rename-detection section_id migrations,
 * deletion of scores/lift-records on removed sections, and nulling of scoring
 * columns whose scoring_fields flag flipped true→false.
 *
 * Why this is a server route: `wod_section_results` and `lift_records` are under
 * owner/family RLS, so running these writes from the coach's browser token
 * silently matches 0 rows (the S344 ghost-score class). Every write here is
 * checked and any failure returns 500 so the caller can surface it instead of
 * reporting a false success.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireCoach(request);
    if (isAuthError(user)) return user;

    const body = await request.json();
    const wodId: string | undefined = body.wodId;
    const migrations: SectionMigration[] = body.migrations || [];
    const deleteSectionKeys: string[] = body.deleteSectionKeys || [];
    const deleteLiftRecordIds: string[] = body.deleteLiftRecordIds || [];
    const fieldClears: FieldClear[] = body.fieldClears || [];

    if (!wodId) {
      return NextResponse.json({ error: 'wodId required' }, { status: 400 });
    }

    // 1. Rename-detection migrations: move WSRs to the new section_id. Must run
    //    before the field-clears below, which target the migrated key.
    for (const m of migrations) {
      if (!m.fromKey || !m.toKey) continue;
      const { error } = await supabaseAdmin
        .from('wod_section_results')
        .update({ section_id: m.toKey, updated_at: new Date().toISOString() })
        .eq('wod_id', wodId)
        .eq('section_id', m.fromKey);
      if (error) {
        console.error('Section migration error:', error);
        return NextResponse.json({ error: 'Failed to migrate section results' }, { status: 500 });
      }
    }

    // 2. Delete scores on removed sections.
    if (deleteSectionKeys.length > 0) {
      const { error } = await supabaseAdmin
        .from('wod_section_results')
        .delete()
        .eq('wod_id', wodId)
        .in('section_id', deleteSectionKeys);
      if (error) {
        console.error('Section results delete error:', error);
        return NextResponse.json({ error: 'Failed to delete section results' }, { status: 500 });
      }
    }

    // 3. Delete lift records for removed lift tuples.
    if (deleteLiftRecordIds.length > 0) {
      const { error } = await supabaseAdmin
        .from('lift_records')
        .delete()
        .in('id', deleteLiftRecordIds);
      if (error) {
        console.error('Lift records delete error:', error);
        return NextResponse.json({ error: 'Failed to delete lift records' }, { status: 500 });
      }
    }

    // 4. Null scoring columns whose scoring_fields flag flipped true→false.
    for (const fc of fieldClears) {
      const cols = (fc.columns || []).filter(c => CLEARABLE_COLUMNS.has(c));
      if (cols.length === 0 || !fc.sectionKey) continue;
      const cleared: Record<string, null> = {};
      for (const c of cols) cleared[c] = null;
      const { error } = await supabaseAdmin
        .from('wod_section_results')
        .update(cleared)
        .eq('wod_id', wodId)
        .eq('section_id', fc.sectionKey);
      if (error) {
        console.error('Scoring-field clear error:', error);
        return NextResponse.json({ error: 'Failed to clear scoring fields' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('edit-section-results error:', error);
    return NextResponse.json({ error: 'Failed to update section results' }, { status: 500 });
  }
}
