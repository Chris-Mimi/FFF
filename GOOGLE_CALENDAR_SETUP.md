# Google Calendar Integration Setup

This guide walks you through setting up Google Calendar integration for publishing workouts.

## Prerequisites

- A Google account with access to Google Cloud Console
- Your gym's Google Calendar already created
- Admin access to the codebase and environment variables

---

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name: "Forge Fitness Calendar Integration"
4. Click **Create**

---

## Step 2: Enable Google Calendar API

1. In your new project, go to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click **Google Calendar API** → **Enable**

---

## Step 3: Create Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Fill in:
   - **Service account name**: `forge-calendar-publisher`
   - **Service account ID**: (auto-generated)
   - **Description**: "Service account for publishing workouts to gym calendar"
4. Click **Create and Continue**
5. Skip granting roles (click **Continue**)
6. Skip granting user access (click **Done**)

---

## Step 4: Generate Service Account Key

1. In **Credentials**, find your new service account under **Service Accounts**
2. Click on the service account email
3. Go to the **Keys** tab
4. Click **Add Key** → **Create new key**
5. Select **JSON** format
6. Click **Create**
7. A JSON file will download - **keep this file secure!**

---

## Step 5: Share Calendar with Service Account

1. Open [Google Calendar](https://calendar.google.com/)
2. Find your gym calendar in the left sidebar
3. Click the three dots next to it → **Settings and sharing**
4. Scroll to **Share with specific people**
5. Click **Add people**
6. Paste the service account email (from the JSON file, looks like: `forge-calendar-publisher@project-name.iam.gserviceaccount.com`)
7. Set permission to **Make changes to events**
8. Click **Send**
9. Copy the **Calendar ID** (found under "Integrate calendar" section, looks like: `abc123@group.calendar.google.com` or your email)

---

## Step 6: Add Environment Variables

Open your `.env.local` file and add these three variables:

```bash
# Google Calendar Integration
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@project-name.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID="your-calendar-id@group.calendar.google.com"
```

### How to get these values from your JSON file:

1. **GOOGLE_SERVICE_ACCOUNT_EMAIL**: Copy the `client_email` field
2. **GOOGLE_PRIVATE_KEY**: Copy the entire `private_key` field (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)
   - **Important**: Keep the `\n` characters as-is (they represent newlines)
3. **GOOGLE_CALENDAR_ID**: This is your calendar ID from Step 5

### Example `.env.local`:

```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL="forge-calendar-publisher@forge-fitness-12345.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID="abc123xyz@group.calendar.google.com"
```

---

## Step 7: Restart Development Server

After adding environment variables:

```bash
npm run dev
```

---

## Step 8: Run Database Migration

Execute the migration in Supabase SQL Editor:

```sql
-- File: supabase-publishing-columns.sql
-- Run this in your Supabase SQL Editor

-- Add publishing and Google Calendar integration columns to wods table
ALTER TABLE wods ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT FALSE;
ALTER TABLE wods ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE wods ADD COLUMN IF NOT EXISTS published_section_ids INTEGER[];
ALTER TABLE wods ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;
ALTER TABLE wods ADD COLUMN IF NOT EXISTS event_time TIME DEFAULT '09:00';
ALTER TABLE wods ADD COLUMN IF NOT EXISTS event_duration_minutes INTEGER DEFAULT 60;

-- Create index for querying published workouts
CREATE INDEX IF NOT EXISTS idx_wods_published ON wods(published, date) WHERE published = TRUE;
```

---

## Testing

1. Go to Coach Dashboard
2. Open or create a workout
3. Click **Publish** button
4. Select sections to publish
5. Set event time and duration
6. Click **Publish**
7. Check your Google Calendar - the event should appear!
8. Check Athlete Dashboard → **Workouts** tab - the workout should appear!

---

## Troubleshooting

### "Google Calendar is not configured" error

- Check that all three environment variables are set in `.env.local`
- Restart your development server after adding variables
- Verify the private key includes `\n` characters (not actual newlines)

### "Insufficient Permission" error

- Make sure you shared the calendar with the service account email
- Verify the permission is set to "Make changes to events"
- Wait a few minutes for permissions to propagate

### Calendar event not appearing

- Verify the `GOOGLE_CALENDAR_ID` matches your calendar ID
- Check that the calendar is visible in your Google Calendar
- Look for the event in the calendar's "All events" view (not just today)

### Service Account email not found

- Double-check you copied the service account email correctly from the JSON file
- Ensure the service account was created in the same Google Cloud project where you enabled the Calendar API

---

## Security Notes

- **Never commit** the `.env.local` file or the service account JSON file to git
- Keep the service account key secure
- Only share calendar access with the service account (don't give it broader permissions)
- The service account can only access calendars explicitly shared with it

---

## Production Deployment

For production (e.g., Vercel, Netlify):

1. Go to your hosting platform's environment variables settings
2. Add the same three variables:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_CALENDAR_ID`
3. Redeploy your application

**Important**: Some platforms (like Vercel) may require you to escape newlines differently. If you have issues, try replacing `\n` with actual newlines or vice versa.
