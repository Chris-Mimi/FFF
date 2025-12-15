// Test NEW ISO week calculation
const calculateWorkoutWeek = (date: Date): string => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const isoYear = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4DayOfWeek = jan4.getUTCDay() || 7;
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4 + (4 - jan4DayOfWeek)));
  const weekNo = Math.floor((d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return `${isoYear}-W${String(weekNo).padStart(2, '0')}`;
};

// Test dates
const testDates = [
  '2025-12-01', // Should be W49
  '2025-12-03', // Should be W49
  '2025-12-08', // Should be W50
];

console.log('Expected: Dec 1&3=W49, Dec 8=W50\n');
testDates.forEach(dateStr => {
  const date = new Date(dateStr + 'T12:00:00');
  const week = calculateWorkoutWeek(date);
  console.log(`${dateStr} → ${week}`);
});
