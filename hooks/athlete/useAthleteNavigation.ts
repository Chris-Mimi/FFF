'use client';

import { Dispatch, SetStateAction } from 'react';

export interface NavigationHandlers {
  previousDay: () => void;
  nextDay: () => void;
  previousWeek: () => void;
  nextWeek: () => void;
  previousMonth: () => void;
  nextMonth: () => void;
  goToToday: () => void;
}

export function useAthleteNavigation(
  selectedDate: Date,
  setSelectedDate: Dispatch<SetStateAction<Date>>
): NavigationHandlers {
  const previousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const previousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const previousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
  };

  return {
    previousDay,
    nextDay,
    previousWeek,
    nextWeek,
    previousMonth,
    nextMonth,
    goToToday,
  };
}
