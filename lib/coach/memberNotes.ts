import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Best-effort upsert of a coach-only park/block reason note (coach_member_notes,
 * coach-RLS only — athletes can't read it). Never throws: a failed note write must
 * not block the park/block/unblock action it accompanies. Pass a service-role
 * client. Upserts only the given field, leaving the other reason untouched.
 */
export async function setMemberNote(
  admin: SupabaseClient,
  memberId: string,
  field: 'park_reason' | 'block_reason',
  reason: string | null
): Promise<void> {
  const value = typeof reason === 'string' && reason.trim() ? reason.trim() : null;
  const { error } = await admin
    .from('coach_member_notes')
    .upsert(
      { member_id: memberId, [field]: value, updated_at: new Date().toISOString() },
      { onConflict: 'member_id' }
    );
  if (error) console.error(`setMemberNote(${field}) failed:`, error.message);
}
