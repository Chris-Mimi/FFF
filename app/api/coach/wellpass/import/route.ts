import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import { parseWellpassWorkbook } from '@/lib/coach/wellpassExcelParser';
import { loadScoringData, computeMetrics, decideBlock } from '@/lib/coach/wellpassScoring';
import type { WellpassImportResult } from '@/types/wellpass';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MAX_FILE_BYTES = 10 * 1024 * 1024;

// ISO 8601 week year — the year the week "belongs to" (contains the Thursday).
const isoWeekYear = (dateStr: string): number => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1, d));
  target.setUTCDate(target.getUTCDate() + 3 - ((target.getUTCDay() + 6) % 7));
  return target.getUTCFullYear();
};

export async function POST(request: NextRequest) {
  try {
    const coach = await requireCoach(request);
    if (isAuthError(coach)) return coach;

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let parsed;
    try {
      parsed = parseWellpassWorkbook(buffer);
    } catch (e) {
      console.error('[wellpass-import] parse error:', e);
      return NextResponse.json({ error: 'Failed to parse Excel file' }, { status: 400 });
    }

    if (parsed.weeks.length === 0) {
      return NextResponse.json({ error: 'No "Wk NN" sheets with data found' }, { status: 400 });
    }

    const wellpassNames = new Set<string>();
    for (const wk of parsed.weeks) {
      for (const row of wk.rows) wellpassNames.add(row.wellpass_name);
    }

    const result: WellpassImportResult = {
      weeks_imported: parsed.weeks.length,
      rows_inserted: 0,
      identities_created: 0,
      identities_linked: 0,
      identities_unmatched: [],
      suggested_block: [],
    };

    const { data: existingIdentities } = await supabaseAdmin
      .from('wellpass_identities')
      .select('id, wellpass_name, tracked')
      .in('wellpass_name', Array.from(wellpassNames));

    const identityByName = new Map<string, { id: string; tracked: boolean }>();
    for (const row of existingIdentities ?? []) {
      identityByName.set(row.wellpass_name, { id: row.id, tracked: row.tracked });
    }

    const toCreate = Array.from(wellpassNames).filter((n) => !identityByName.has(n));
    if (toCreate.length > 0) {
      const { data: created, error } = await supabaseAdmin
        .from('wellpass_identities')
        .insert(toCreate.map((wellpass_name) => ({ wellpass_name, tracked: false })))
        .select('id, wellpass_name, tracked');
      if (error) {
        console.error('[wellpass-import] insert identities error:', error);
        return NextResponse.json({ error: 'Failed to create identities' }, { status: 500 });
      }
      for (const row of created ?? []) {
        identityByName.set(row.wellpass_name, { id: row.id, tracked: row.tracked });
        result.identities_created++;
      }
    }

    const checkinRows: {
      wellpass_identity_id: string;
      year: number;
      week_number: number;
      week_start: string;
      week_end: string;
      checkin_count: number;
    }[] = [];

    for (const wk of parsed.weeks) {
      const year = isoWeekYear(wk.week_start);
      for (const row of wk.rows) {
        const identity = identityByName.get(row.wellpass_name);
        if (!identity) continue;
        checkinRows.push({
          wellpass_identity_id: identity.id,
          year,
          week_number: wk.week_number,
          week_start: wk.week_start,
          week_end: wk.week_end,
          checkin_count: row.checkin_count,
        });
      }
    }

    if (checkinRows.length > 0) {
      const { error: upsertErr } = await supabaseAdmin
        .from('wellpass_weekly_checkins')
        .upsert(checkinRows, { onConflict: 'wellpass_identity_id,year,week_number' });
      if (upsertErr) {
        console.error('[wellpass-import] upsert checkins error:', upsertErr);
        return NextResponse.json({ error: 'Failed to save weekly counts' }, { status: 500 });
      }
      result.rows_inserted = checkinRows.length;
    }

    // Zero-fill tracked identities that are MISSING from each individual week
    // of the imported Excel. The check is PER-WEEK — an athlete present in W20
    // but absent from W21 must still get a W21=0 row, otherwise the block
    // recompute would read their stale W20 value as the "latest" and miss the
    // signal that they've stopped checking in. Uses ignoreDuplicates so any
    // pre-existing real value for the same (identity, year, week) is preserved.
    const { data: allTrackedIdentities } = await supabaseAdmin
      .from('wellpass_identities')
      .select('id')
      .eq('tracked', true);
    const allTrackedIds: string[] = (allTrackedIdentities ?? []).map((i) => i.id);

    if (allTrackedIds.length > 0) {
      const zeroRows: typeof checkinRows = [];
      for (const wk of parsed.weeks) {
        const year = isoWeekYear(wk.week_start);
        const idsInWeek = new Set<string>();
        for (const row of wk.rows) {
          const id = identityByName.get(row.wellpass_name)?.id;
          if (id) idsInWeek.add(id);
        }
        for (const idId of allTrackedIds) {
          if (!idsInWeek.has(idId)) {
            zeroRows.push({
              wellpass_identity_id: idId,
              year,
              week_number: wk.week_number,
              week_start: wk.week_start,
              week_end: wk.week_end,
              checkin_count: 0,
            });
          }
        }
      }
      if (zeroRows.length > 0) {
        const { error: zErr } = await supabaseAdmin
          .from('wellpass_weekly_checkins')
          .upsert(zeroRows, { onConflict: 'wellpass_identity_id,year,week_number', ignoreDuplicates: true });
        if (zErr) {
          console.error('[wellpass-import] zero-fill error:', zErr);
          // Non-fatal — continue with whatever rows landed.
        }
      }
    }

    // Auto-link unlinked identities by name match against members.name.
    // Normalizes both sides (lowercase + collapse internal whitespace + trim)
    // so known typos like Petr Bezdek's double-space don't silently fail.
    // Two passes: (1) exact normalized match, (2) reverse-word-order fallback
    // for the German export convention "Lastname Firstname" vs our app's
    // "Firstname Lastname" (e.g. "Keip Andreas" ↔ "Andreas Keip", or
    // "Fenster Martina" ↔ "Martina Fenster" — S361). Runs every import so
    // newly-registered athletes get linked retroactively.
    const normalizeName = (n: string) => n.trim().replace(/\s+/g, ' ').toLowerCase();
    const reverseNormalize = (n: string) =>
      normalizeName(n.trim().split(/\s+/).reverse().join(' '));

    const identityIds = Array.from(identityByName.values()).map((i) => i.id);
    if (identityIds.length > 0) {
      const { data: existingLinks } = await supabaseAdmin
        .from('wellpass_identity_members')
        .select('wellpass_identity_id')
        .in('wellpass_identity_id', identityIds);
      const linkedIds = new Set((existingLinks ?? []).map((l) => l.wellpass_identity_id));

      const unlinkedByNorm = new Map<string, { wellpassName: string; identityId: string }>();
      for (const [name, identity] of identityByName) {
        if (linkedIds.has(identity.id)) continue;
        unlinkedByNorm.set(normalizeName(name), { wellpassName: name, identityId: identity.id });
      }

      if (unlinkedByNorm.size > 0) {
        const { data: allMembers } = await supabaseAdmin
          .from('members')
          .select('id, name');
        if (allMembers) {
          const newLinks: { wellpass_identity_id: string; member_id: string }[] = [];

          // Pass 1: exact normalized match. Members that don't match fall
          // through to pass 2 below.
          const unmatchedMembers: { id: string; name: string }[] = [];
          for (const m of allMembers) {
            if (!m.name) continue;
            const norm = normalizeName(m.name);
            const target = unlinkedByNorm.get(norm);
            if (target) {
              newLinks.push({ wellpass_identity_id: target.identityId, member_id: m.id });
              unlinkedByNorm.delete(norm); // first match wins
            } else {
              unmatchedMembers.push({ id: m.id, name: m.name });
            }
          }

          // Pass 2: reverse-word-order fallback. Build a map keyed on the
          // reversed form of each STILL-unlinked Wellpass name and try matching
          // remaining members against it.
          if (unmatchedMembers.length > 0 && unlinkedByNorm.size > 0) {
            const unlinkedByReverseNorm = new Map<string, { wellpassName: string; identityId: string }>();
            for (const target of unlinkedByNorm.values()) {
              unlinkedByReverseNorm.set(reverseNormalize(target.wellpassName), target);
            }
            for (const m of unmatchedMembers) {
              const norm = normalizeName(m.name);
              const target = unlinkedByReverseNorm.get(norm);
              if (target) {
                newLinks.push({ wellpass_identity_id: target.identityId, member_id: m.id });
                unlinkedByReverseNorm.delete(norm);
                unlinkedByNorm.delete(normalizeName(target.wellpassName));
              }
            }
          }

          if (newLinks.length > 0) {
            await supabaseAdmin
              .from('wellpass_identity_members')
              .insert(newLinks)
              .then(({ error }) => {
                if (error) console.error('[wellpass-import] auto-link error:', error);
              });
          }
        }
      }
    }

    // Compute the algorithm's block SUGGESTIONS for everyone tracked. This is
    // data-only: it does NOT change wellpass_booking_restricted (blocking is 100%
    // manual). It surfaces tracked identities under the threshold that the coach
    // hasn't already blocked, as a starting list for manual review.
    const suggestScope = Array.from(new Set([...identityIds, ...allTrackedIds]));
    result.suggested_block = await computeBlockSuggestions(suggestScope);

    const { data: finalLinks } = await supabaseAdmin
      .from('wellpass_identity_members')
      .select('wellpass_identity_id')
      .in('wellpass_identity_id', identityIds);
    result.identities_linked = new Set((finalLinks ?? []).map((r) => r.wellpass_identity_id)).size;

    for (const [name, identity] of identityByName) {
      if (!identity.tracked) result.identities_unmatched.push(name);
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error('[wellpass-import] unexpected error:', e);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}

// Recompute block status using the three-gate redesign (S377):
//   - 4-week login sum vs 3 × min  (recent dormancy)
//   - 12-week login sum vs 9 × min (annual pace)
//   - 13-week login:attendance ratio vs 1.5 (shared identities only)
// Paused identities are skipped — pause is a hard override and booking-create
// already checks pause separately.
// Suggestion-only: computes the algorithm verdict for each tracked, non-paused
// identity and returns those it would block that are NOT already blocked. It does
// NOT write wellpass_booking_restricted — blocking is 100% manual (S380), so a
// resync never undoes the coach's hand-set blocks/unblocks.
async function computeBlockSuggestions(touchedIdentityIds: string[]): Promise<
  { wellpass_name: string; member_names: string[]; reason: string | null }[]
> {
  const suggestions: { wellpass_name: string; member_names: string[]; reason: string | null }[] = [];
  // Identities the algorithm would block this sync — used to re-arm the amber
  // "review" badge (clear the coach's previous triage) so a still-slacking
  // household resurfaces each week instead of staying acknowledged forever.
  const reflagIds: string[] = [];

  const { data: identities } = await supabaseAdmin
    .from('wellpass_identities')
    .select('id, wellpass_name, min_checkins_required, tracked, exemption_mode, paused_at')
    .eq('tracked', true)
    .in('id', touchedIdentityIds);

  if (!identities || identities.length === 0) return suggestions;

  const consideredIds = identities.filter((i) => !i.paused_at).map((i) => i.id);
  if (consideredIds.length === 0) return suggestions;

  // Bulk-load linked members for all considered identities.
  const { data: allLinks } = await supabaseAdmin
    .from('wellpass_identity_members')
    .select('wellpass_identity_id, member_id, members!inner(id, name, athlete_subscription_status, wellpass_booking_restricted)')
    .in('wellpass_identity_id', consideredIds);

  type LinkedMember = {
    id: string;
    name: string;
    athlete_subscription_status: 'trial' | 'active' | 'past_due' | 'expired';
    wellpass_booking_restricted: boolean;
  };

  const linksByIdentity = new Map<string, { member_id: string; m: LinkedMember }[]>();
  const memberToIdentityIds = new Map<string, string[]>();
  for (const link of allLinks ?? []) {
    const raw = (link as { members: unknown }).members;
    const m = (Array.isArray(raw) ? raw[0] : raw) as LinkedMember | undefined;
    if (!m) continue;
    const arr = linksByIdentity.get(link.wellpass_identity_id) ?? [];
    arr.push({ member_id: link.member_id, m });
    linksByIdentity.set(link.wellpass_identity_id, arr);
    const idArr = memberToIdentityIds.get(link.member_id) ?? [];
    if (!idArr.includes(link.wellpass_identity_id)) idArr.push(link.wellpass_identity_id);
    memberToIdentityIds.set(link.member_id, idArr);
  }

  const { loginsByIdentity, attendancesByIdentity } = await loadScoringData(
    supabaseAdmin,
    consideredIds,
    memberToIdentityIds
  );

  const now = new Date();

  for (const identity of identities) {
    if (identity.paused_at) continue;

    const linkRows = linksByIdentity.get(identity.id) ?? [];
    if (linkRows.length === 0) continue;

    let exempt: boolean;
    if (identity.exemption_mode === 'always_exempt') exempt = true;
    else if (identity.exemption_mode === 'always_enforce') exempt = false;
    else exempt = linkRows.some((l) => l.m.athlete_subscription_status === 'active');

    const isShared = linkRows.length > 1;
    const logins = loginsByIdentity.get(identity.id) ?? [];
    const attendances = attendancesByIdentity.get(identity.id) ?? [];
    const metrics = computeMetrics(logins, attendances, identity, isShared, now);
    const verdict = decideBlock(metrics, identity, exempt, isShared);

    // Suggest only what the algorithm would block AND the coach hasn't already
    // blocked. We never write the flag — manual blocks/unblocks are authoritative.
    if (!verdict.shouldBlock) continue;
    // Re-arm the review badge for everyone the rules flag this sync, even if the
    // coach already blocked them (a no-op there — blocked rows show "blocked").
    reflagIds.push(identity.id);
    const alreadyBlocked = linkRows.some((l) => l.m.wellpass_booking_restricted === true);
    if (alreadyBlocked) continue;

    const memberNames = linkRows.map((l) => l.m.name).filter((n): n is string => Boolean(n));
    suggestions.push({
      wellpass_name: identity.wellpass_name,
      member_names: memberNames,
      reason: verdict.reason,
    });
  }

  if (reflagIds.length > 0) {
    const { error: reflagErr } = await supabaseAdmin
      .from('wellpass_identities')
      .update({ review_cleared: false })
      .in('id', reflagIds);
    if (reflagErr) console.error('[wellpass-import] re-flag review error:', reflagErr);
  }

  return suggestions;
}
