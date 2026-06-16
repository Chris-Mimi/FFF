/**
 * Shared birthday-greeting logic, used by both the athlete app (app/athlete) and
 * the book-a-class page (app/member/book) so the once-per-day dedup key is
 * identical across both surfaces — dismissing on one suppresses the other.
 *
 * DOB is a 'YYYY-MM-DD' string; we parse month/day directly (never
 * new Date('YYYY-MM-DD'), which UTC-shifts the day in Germany).
 */

const localToday = (now: Date) =>
  `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

export const birthdayGreetingKey = (userId: string, now: Date = new Date()): string =>
  `birthdayGreeting:${userId}:${localToday(now)}`;

/** True when the DOB's month + day match local today. */
export const isBirthdayToday = (dob: string | null | undefined, now: Date = new Date()): boolean => {
  if (!dob) return false;
  const parts = String(dob).split('-').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return false;
  return parts[1] === now.getMonth() + 1 && parts[2] === now.getDate();
};

/** Birthday today AND not already greeted today (localStorage). */
export const shouldGreetBirthday = (userId: string, dob: string | null | undefined): boolean => {
  if (!isBirthdayToday(dob)) return false;
  try {
    return window.localStorage.getItem(birthdayGreetingKey(userId)) !== '1';
  } catch {
    return true; // localStorage unavailable — greet anyway
  }
};

/** Mark today's greeting as shown so it doesn't re-pop on refresh/navigation. */
export const markBirthdayGreeted = (userId: string): void => {
  try { window.localStorage.setItem(birthdayGreetingKey(userId), '1'); } catch {}
};

/** German list join: ["Max"] -> "Max", ["Max","Lena"] -> "Max und Lena". */
export const joinNames = (names: string[]): string => {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} und ${names[names.length - 1]}`;
};

export interface BirthdayPerson { id: string; name: string; }

/**
 * From a household (the logged-in member + any family members), return everyone
 * whose birthday is today and who hasn't been greeted yet. Kids don't log in, so
 * this lets the parent's login surface a child's birthday too.
 */
export const collectBirthdayGreetings = (
  household: { id: string; date_of_birth?: string | null; display_name?: string | null; name?: string | null }[]
): BirthdayPerson[] =>
  household
    .filter(m => shouldGreetBirthday(m.id, m.date_of_birth))
    .map(m => ({ id: m.id, name: m.display_name || m.name || '' }));
