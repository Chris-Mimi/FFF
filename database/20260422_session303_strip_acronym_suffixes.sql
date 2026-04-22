-- Session 303: Strip parenthetical acronym suffixes from exercises.display_name
-- Background: "Barbell Bench Press (BP)" fails to match "Bench Press" extracted
-- from WOD Lifts section in Movement Tracking. 24 confirmed acronyms + 2 "(DUs)/(SUs)"
-- approved for stripping. Acronyms preserved in tags[] so search_vector still finds them.
-- Safe to re-run (idempotent — tags only appended if missing).
--
-- Run order:
--   1. This SQL in Supabase SQL Editor
--   2. Verify Step 3 returns 0 rows
--   3. Then Claude commits code edits to utils/movement-extraction.ts genericToCanonical map

-- Step 1: Strip acronym suffix from display_name + add acronym to tags (for search preservation)
WITH renames(exercise_id, new_display_name, new_tag) AS (
  VALUES
    ('c1239317-e51b-4500-b65c-20e09f13d0e7'::uuid, 'Barbell Back Squat',                      'bs'),
    ('923d1d78-aaac-440a-8cc7-3129e0706bc0'::uuid, 'Barbell Bench Press',                     'bp'),
    ('c0bd4670-17d2-4377-8f1f-04c1e8f51cf6'::uuid, 'Barbell Clean & Jerk',                    'c&j'),
    ('41fb398e-b795-42c8-bd18-c246349e14b8'::uuid, 'Barbell Front Squat',                     'fs'),
    ('e0dcd295-9d5e-4aed-9ac8-d509071e6bbb'::uuid, 'Barbell Hang Power Clean',                'hpc'),
    ('a5c5b4a0-66e2-409c-9ffc-58ef3e7f2dab'::uuid, 'Barbell Hang Power Snatch',               'hps'),
    ('26a58693-6cb7-4efe-bb04-387eebc57924'::uuid, 'Barbell Overhead Squat',                  'ohs'),
    ('045ca60b-6fbd-4f21-bc5b-67c3fd9b9ce9'::uuid, 'Barbell Power Clean',                     'pc'),
    ('9e15e26b-75e2-4348-ac93-e37c1ec6e1d4'::uuid, 'Barbell Push Jerk',                       'pj'),
    ('49d2203c-cf1a-47cd-b977-0a5b242a37e7'::uuid, 'Barbell Push Press',                      'pp'),
    ('c3e5c5e2-13e8-4cb9-9684-63bd22f373bc'::uuid, 'Barbell Split Jerk',                      'sj'),
    ('9ab73e75-6b86-427d-83c4-b0057fef1143'::uuid, 'Barbell Strict OH Press',                 'ohp'),
    ('0f506a7b-8376-49ea-81d2-90c39a348f3f'::uuid, 'KB Around The World',                     'atw'),
    ('ae789c4b-0bf8-4fd3-a1a8-7b81e8811040'::uuid, 'KB Clean & Press',                        'c&p'),
    ('f7c56062-8727-4315-91d6-38ff9ce11a11'::uuid, 'KB Crush-Grip Deadlift',                  'db'),
    ('a0715e46-4811-421c-a27e-420b95bdf04c'::uuid, 'KB Figure 8 Back to Front',               'b2f'),
    ('18b6e026-23b4-43b9-9830-80bc20d25eed'::uuid, 'KB Figure 8 Front to Back',               'f2b'),
    ('15859079-7f07-4a81-b4f2-60676024d1d6'::uuid, 'KB Swing American',                       'akbs'),
    ('9b21a777-2ba9-4645-8866-6ec27c46f182'::uuid, 'KB Swing Russian',                        'rkbs'),
    ('617e73b0-b86d-46d6-82dd-1d1abbabc52f'::uuid, 'KB Turkish Get-Up',                       'tgu'),
    ('23f23671-e74c-4742-85af-a01068125a33'::uuid, 'Romanian Deadlift',                       'rdl'),
    ('f3752451-857c-47d8-b9d5-4817f8b5c3f3'::uuid, 'Rings Top Support - Rings Turned Out',    'rto'),
    ('ff4bb05e-2049-41ef-a3c1-f0eacd4b9dc6'::uuid, 'Split Jerk',                              'sj'),
    ('7b59729a-173c-40c8-9ee8-47b0e125b9d6'::uuid, 'Toes-to-Bar Strict',                      't2b'),
    ('acc61e8f-cd1a-4edd-8b55-cac4e19dda75'::uuid, 'Jump Rope Double-Unders',                 'dus'),
    ('08c93b19-c205-47a4-bc9c-dc3856232178'::uuid, 'Jump Rope Single-Unders',                 'sus')
)
UPDATE exercises e
SET display_name = r.new_display_name,
    tags = CASE WHEN r.new_tag = ANY(e.tags) THEN e.tags ELSE array_append(e.tags, r.new_tag) END
FROM renames r
WHERE e.id = r.exercise_id;

-- Step 2: Add 'squat-university' tag to the 2 (SU) rows (display_name unchanged — SU stays visible)
UPDATE exercises
SET tags = CASE WHEN 'squat-university' = ANY(tags) THEN tags ELSE array_append(tags, 'squat-university') END
WHERE id IN (
  '377b203a-ac9e-4933-ab6f-84fe2e47afde',  -- 90° Ext. Rotation (SU)
  'ffa66508-4821-42ef-9523-6f7c56eff20f'   -- Prone Arm Circle (SU)
);

-- Step 3: Verify — should return 0 rows after the update
SELECT id, display_name, tags
FROM exercises
WHERE id IN (
  'c1239317-e51b-4500-b65c-20e09f13d0e7','923d1d78-aaac-440a-8cc7-3129e0706bc0',
  'c0bd4670-17d2-4377-8f1f-04c1e8f51cf6','41fb398e-b795-42c8-bd18-c246349e14b8',
  'e0dcd295-9d5e-4aed-9ac8-d509071e6bbb','a5c5b4a0-66e2-409c-9ffc-58ef3e7f2dab',
  '26a58693-6cb7-4efe-bb04-387eebc57924','045ca60b-6fbd-4f21-bc5b-67c3fd9b9ce9',
  '9e15e26b-75e2-4348-ac93-e37c1ec6e1d4','49d2203c-cf1a-47cd-b977-0a5b242a37e7',
  'c3e5c5e2-13e8-4cb9-9684-63bd22f373bc','9ab73e75-6b86-427d-83c4-b0057fef1143',
  '0f506a7b-8376-49ea-81d2-90c39a348f3f','ae789c4b-0bf8-4fd3-a1a8-7b81e8811040',
  'f7c56062-8727-4315-91d6-38ff9ce11a11','a0715e46-4811-421c-a27e-420b95bdf04c',
  '18b6e026-23b4-43b9-9830-80bc20d25eed','15859079-7f07-4a81-b4f2-60676024d1d6',
  '9b21a777-2ba9-4645-8866-6ec27c46f182','617e73b0-b86d-46d6-82dd-1d1abbabc52f',
  '23f23671-e74c-4742-85af-a01068125a33','f3752451-857c-47d8-b9d5-4817f8b5c3f3',
  'ff4bb05e-2049-41ef-a3c1-f0eacd4b9dc6','7b59729a-173c-40c8-9ee8-47b0e125b9d6',
  'acc61e8f-cd1a-4edd-8b55-cac4e19dda75','08c93b19-c205-47a4-bc9c-dc3856232178'
)
AND display_name ~ '\([^)]+\)\s*$';
