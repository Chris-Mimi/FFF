-- S421 — Split Times: "when" becomes two choices.
--   round_phase: which round  (1st / middle / last / no rounds)
--   round_place: where in that round (first task / mid-round / last task)
-- Existing values are copied over from the old single `position` column, which
-- is left in place (no longer read or written by the app).

ALTER TABLE pacing_scores ADD COLUMN IF NOT EXISTS round_phase text
  CHECK (round_phase IN ('first', 'middle', 'last', 'single'));
ALTER TABLE pacing_scores ADD COLUMN IF NOT EXISTS round_place text
  CHECK (round_place IN ('first', 'middle', 'last'));

UPDATE pacing_scores SET round_phase = position
WHERE position IN ('first', 'last') AND round_phase IS NULL;

UPDATE pacing_scores SET round_place = CASE position WHEN 'start' THEN 'first' WHEN 'end' THEN 'last' END
WHERE position IN ('start', 'end') AND round_place IS NULL;
