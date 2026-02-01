'use client';

import { Dispatch, SetStateAction } from 'react';
import {
  calculatePreviousDay,
  calculateNextDay,
  calculatePreviousWeek,
  calculateNextWeek,
  calculatePreviousMonth,
  calculateNextMonth,
  getTodayDate
} from '@/utils/logbook/dateNavigation';

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
    setSelectedDate(calculatePreviousDay(selectedDate));
  };

  const nextDay = () => {
    setSelectedDate(calculateNextDay(selectedDate));
  };

  const previousWeek = () => {
    setSelectedDate(calculatePreviousWeek(selectedDate));
  };

  const nextWeek = () => {
    setSelectedDate(calculateNextWeek(selectedDate));
  };

  const previousMonth = () => {
    setSelectedDate(calculatePreviousMonth(selectedDate));
  };

  const nextMonth = () => {
    setSelectedDate(calculateNextMonth(selectedDate));
  };

  const goToToday = () => {
    setSelectedDate(getTodayDate());
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
