-- S421 — Toolkit "Pacing" tab: reference times for parts of workouts
-- (e.g. 400 m run, 30 Up-Downs) so the coach can judge how long the fastest
-- and slowest athletes need when writing a for-time WOD. Replaces the
-- "Endurance scores for reference" note in Aids.
--
-- Coach-only, same RLS pattern as coach_member_notes (S407): no athlete policy,
-- so athletes and anon get zero rows.

CREATE TABLE IF NOT EXISTS pacing_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid REFERENCES exercises(id) ON DELETE SET NULL,
  movement text NOT NULL,            -- Exercise Library name at the time it was picked
  amount text,                       -- '30 reps', '500 m'; NULL when the name already says it ('Run 400m')
  amount_female text,                -- set only when ♀ and ♂ do different amounts
  amount_male text,
  category text NOT NULL DEFAULT 'Other',
  note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pacing_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES pacing_tasks(id) ON DELETE CASCADE,
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  legacy_name text,                  -- only for ex-athletes imported from the old note; new scores always have member_id
  time_seconds integer NOT NULL CHECK (time_seconds > 0),
  position text CHECK (position IN ('start', 'end', 'first', 'last')),
  scaling text,
  score_date date,
  note text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT pacing_scores_has_athlete CHECK (member_id IS NOT NULL OR legacy_name IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS pacing_scores_task_id_idx ON pacing_scores(task_id);

ALTER TABLE pacing_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacing_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches manage pacing tasks" ON pacing_tasks;
CREATE POLICY "Coaches manage pacing tasks"
ON pacing_tasks FOR ALL
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'coach')
WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'coach');

DROP POLICY IF EXISTS "Coaches manage pacing scores" ON pacing_scores;
CREATE POLICY "Coaches manage pacing scores"
ON pacing_scores FOR ALL
USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'coach')
WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'coach');
