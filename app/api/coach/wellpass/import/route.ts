import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCoach, isAuthError } from '@/lib/auth-api';
import { parseWellpassWorkbook } from '@/lib/coach/wellpassExcelParser';
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
      blocks_applied: [],
      blocks_cleared: [],
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

    // Recompute block status for everyone tracked — covers both identities that
    // appeared in this import AND tracked identities that may have just received
    // a 0-row for a week they were absent from.
    const recomputeScope = Array.from(new Set([...identityIds, ...allTrackedIds]));
    const blocksDelta = await recomputeBlockStatus(recomputeScope);
    result.blocks_applied = blocksDelta.applied;
    result.blocks_cleared = blocksDelta.cleared;

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

async function recomputeBlockStatus(touchedIdentityIds: string[]): Promise<{
  applied: { wellpass_name: string; member_names: string[] }[];
  cleared: { wellpass_name: string; member_names: string[] }[];
}> {
  const applied: { wellpass_name: string; member_names: string[] }[] = [];
  const cleared: { wellpass_name: string; member_names: string[] }[] = [];

  const { data: identities } = await supabaseAdmin
    .from('wellpass_identities')
    .select('id, wellpass_name, min_checkins_required, tracked, exemption_mode')
    .eq('tracked', true)
    .in('id', touchedIdentityIds);

  if (!identities || identities.length === 0) return { applied, cleared };

  for (const identity of identities) {
    const { data: latestWeek } = await supabaseAdmin
      .from('wellpass_weekly_checkins')
      .select('checkin_count')
      .eq('wellpass_identity_id', identity.id)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestWeek) continue;

    const { data: links } = await supabaseAdmin
      .from('wellpass_identity_members')
      .select('member_id, members!inner(id, name, athlete_subscription_status, wellpass_booking_restricted)')
      .eq('wellpass_identity_id', identity.id);

    if (!links || links.length === 0) continue;

    type LinkedMember = {
      id: string;
      name: string;
      athlete_subscription_status: 'trial' | 'active' | 'past_due' | 'expired';
      wellpass_booking_restricted: boolean;
    };
    const linkRows = links.map((l) => {
      const raw = (l as { members: unknown }).members;
      const m = (Array.isArray(raw) ? raw[0] : raw) as LinkedMember | undefined;
      return { member_id: l.member_id, m };
    });

    let exempt: boolean;
    if (identity.exemption_mode === 'always_exempt') exempt = true;
    else if (identity.exemption_mode === 'always_enforce') exempt = false;
    else {
      exempt = linkRows.some((l) => l.m?.athlete_subscription_status === 'active');
    }

    const shouldBlock = !exempt && latestWeek.checkin_count < identity.min_checkins_required;

    const memberIds = linkRows.map((l) => l.member_id);
    const memberNames: string[] = linkRows.map((l) => l.m?.name).filter((n): n is string => Boolean(n));

    const { error: updateErr } = await supabaseAdmin
      .from('members')
      .update({ wellpass_booking_restricted: shouldBlock })
      .in('id', memberIds);

    if (updateErr) {
      console.error('[wellpass-recompute] update error for', identity.wellpass_name, updateErr);
      continue;
    }

    const wasBlocked = linkRows.some((l) => l.m?.wellpass_booking_restricted === true);

    if (shouldBlock && !wasBlocked) {
      applied.push({ wellpass_name: identity.wellpass_name, member_names: memberNames });
    } else if (!shouldBlock && wasBlocked) {
      cleared.push({ wellpass_name: identity.wellpass_name, member_names: memberNames });
    }
  }

  return { applied, cleared };
}
