# Supabase Delete Cheatsheet

**Purpose:** SQL queries for bulk deletes and finding duplicates — things the Table Editor UI can't do easily.

For single account deletions, use the Table Editor UI instead (see below).

---

## Single Account Deletion (Use Table Editor UI)

**When:** Deleting one test account or cleaning up a single user.

**Steps:**
1. **Table Editor > `members`** — Find by email, click row, delete
2. **Table Editor > `athlete_profiles`** — Find by email, click row, delete
3. **Authentication > Users** — Find by email, click user, delete

That's it. Related data (bookings, subscriptions, etc.) should cascade delete automatically.

---

## Find Duplicates (SQL)

**When:** You see the same person appearing multiple times in a list.

```sql
-- Find duplicate athlete profiles
SELECT email, full_name, COUNT(*) as count
FROM athlete_profiles
GROUP BY email, full_name
HAVING COUNT(*) > 1;
```

---

## Delete Duplicates (SQL)

**When:** Bulk removing duplicates, keeping the newest record.

**WARNING:** Must partition by BOTH email AND full_name — family members share the same email!

```sql
-- Delete duplicate athlete profiles, keep newest
DELETE FROM athlete_profiles
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY email, full_name ORDER BY created_at DESC) as rn
    FROM athlete_profiles
  ) ranked
  WHERE rn > 1
);
```

---

## Check for Orphaned Records (SQL)

**When:** Suspecting leftover data after deletions.
If: Success: no rows returned - ok

```sql
-- Find orphaned bookings (member was deleted but booking remains)
SELECT * FROM bookings WHERE member_id NOT IN (SELECT id FROM members);

-- Find orphaned subscriptions
SELECT * FROM subscriptions WHERE member_id NOT IN (SELECT id FROM members);
```
