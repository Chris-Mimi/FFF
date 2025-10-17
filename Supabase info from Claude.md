Method 1: Using the Table Editor (UI)

  1. Open your Supabase project → Go to Table Editor
  2. Find the row you want to copy
  3. Click the three dots (⋮) at the end of the row
  4. Select "Duplicate row" - This creates an exact copy
  5. Edit the new row as needed (especially the ID if it's auto-generated)

  Method 2: Using SQL Editor

  1. Go to SQL Editor in Supabase
  2. Run a query like this:

  -- Copy a specific row
  INSERT INTO exercises (name, category, description, video_url, tags)
  SELECT name, category, description, video_url, tags
  FROM exercises
  WHERE id = 'your-row-id-here';

  Or to duplicate and modify:

  INSERT INTO exercises (name, category, description, video_url, tags)
  SELECT
    'New Exercise Name',  -- Change the name
    category,
    description,
    video_url,
    tags
  FROM exercises
  WHERE name = 'Exercise to Copy';

  Method 3: Copy Multiple Rows

  -- Copy all exercises from one category to create variations
  INSERT INTO exercises (name, category, description, video_url, tags)
  SELECT
    name || ' (Variation)',  -- Adds "(Variation)" to the name
    'New Category',
    description,
    video_url,
    tags
  FROM exercises
  WHERE category = 'Warm-up';

  For your exercises table specifically, since it has auto-generated id, created_at, and updated_at fields, the best approach is
   Method 1 (UI duplicate) or Method 2 (SQL without including those auto fields).

Step-by-step instructions:

  1. Go to your Supabase dashboard (https://supabase.com/dashboard)
  2. Click on your project (xvrefulklquuizbpkppb)
  3. Click "SQL Editor" in the left sidebar
  4. Click "+ New query" button (top right)
  5. Copy ONLY the SQL code (NOT the green ```sql lines):
    - Start copying from -- Create tracks table
    - End copying at the last ; after ('Other', 'Custom or mixed format');
  6. Paste it into the SQL editor
  7. Click "Run" button (or press Ctrl+Enter / Cmd+Enter)

  What to copy - starting from the first -- line until the last );



