# Add a Family Member directly in Supabase

**Use this when:** A parent (existing primary member) has a child who isn't registered in the app at all, and you want to link them as a family member without going through the parent's app login.

**Easier alternative:** Log in as the parent → Book Class page → "Add family member" → fill in the form. The app handles all the field defaults correctly. Only fall back to the Supabase Dashboard method below if logging in as the parent isn't practical.

---

## Steps

1. Open Supabase Dashboard → Table Editor → `members` table.
2. Find the **parent's** row (filter by name or email) and copy their `id` (UUID).
3. Click **Insert row** and fill in these fields:

| Field | Value |
|:---|:---|
| `account_type` | `family_member` |
| `primary_member_id` | parent's `id` (the UUID you just copied) |
| `name` | e.g. `Luisa Albrecht` |
| `display_name` | e.g. `Luisa Albrecht` (same as `name`) |
| `date_of_birth` | child's DOB, or leave NULL if unknown |
| `relationship` | `child` |
| `status` | `active` |

4. Leave everything else blank (`id`, `created_at`, `email`, `class_types`, etc.) — defaults will fill them in.
5. Save.

---

## Notes

- The new row gets **no `auth.users` entry**, which is correct. Family-member kids don't have their own login — the parent manages bookings on their behalf.
- Setting both `name` and `display_name` matters: coach-side reads in the app fall back via `display_name || name`, so leaving one blank can cause empty rows in coach views (Score Entry, 10-card modal, manual booking dropdown, etc.). Keep them in sync.
- Once saved, the kid will appear under the parent in their Book Class → "Family members" panel and the parent can immediately book sessions on their behalf.
- The Adults/Kids filter on the Attendance Reports panel will bucket this row as a kid via `account_type = 'family_member'` (independent of DOB or `class_types`).
