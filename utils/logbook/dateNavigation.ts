/**
 * Pure date arithmetic functions for logbook navigation
 */

export function calculatePreviousDay(date: Date): Date {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() - 1);
  return newDate;
}

export function calculateNextDay(date: Date): Date {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + 1);
  return newDate;
}

export function calculatePreviousWeek(date: Date): Date {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() - 7);
  return newDate;
}

export function calculateNextWeek(date: Date): Date {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + 7);
  return newDate;
}

export function calculatePreviousMonth(date: Date): Date {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() - 1);
  return newDate;
}

export function calculateNextMonth(date: Date): Date {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + 1);
  return newDate;
}

export function getTodayDate(): Date {
  return new Date();
}
