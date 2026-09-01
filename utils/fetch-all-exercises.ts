/**
 * Paginated reads of the `exercises` catalogue.
 *
 * Every read of this table is unfiltered — the app always wants the whole
 * library — so it sits directly in front of PostgREST's 1000-row response cap.
 * At the cap the request SUCCEEDS: it just returns the first 1000 rows in
 * whatever order was asked for, with no error anywhere. The symptoms would be
 * the Movement Library quietly losing its alphabetical tail and the Planner /
 * analysis frequency maps under-counting — invisible until someone noticed a
 * movement had gone missing.
 *
 * The table was at 716 rows when this was written (S408/S409). Rather than
 * repeat a pagination loop at eight call sites, they all go through here.
 *
 * See `memory-bank/claude-rules.md` — "Never `.from(growing_table).select()`
 * without a narrowing filter or pagination".
 */

import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';

const PAGE = 1000;

/**
 * Fetch every row of `exercises`, transparently paginating past the 1000-row cap.
 *
 * Returns the same `{ data, error }` shape as a plain Supabase select, so call
 * sites inside a `Promise.all([...])` can swap straight over.
 *
 * @param columns  PostgREST column list, e.g. `'name, display_name, acronym'`
 * @param orderBy  Optional column to order by (ascending), e.g. `'name'`
 */
export async function fetchAllExercises<T = Record<string, unknown>>(
  columns: string,
  orderBy?: string
): Promise<{ data: T[] | null; error: PostgrestError | null }> {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE) {
    const base = supabase.from('exercises').select(columns);
    const query = orderBy ? base.order(orderBy) : base;
    const { data, error } = await query.range(from, from + PAGE - 1);

    if (error) return { data: null, error };
    if (!data || data.length === 0) break;

    rows.push(...(data as T[]));
    if (data.length < PAGE) break;
  }

  return { data: rows, error: null };
}
