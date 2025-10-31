/**
 * Calculate working days and hours for a given month
 */

import { parseHolidayDate } from '../types/config';

export interface MonthStats {
  month: number;
  year: number;
  workingDays: number;
  totalWorkingHours: number;
  shiftsNumber: number;
  workingDaysList: Date[];
  holidays: Date[];
}

export interface MonthSchedule {
  month: number;
  year: number;
  workingDays: number;
  totalWorkingHours: number;
  shiftsNumber: number;
  workingDaysList: Date[];
  holidays: Date[];
  monthlyBreakdown: MonthStats[];
}

export function createMonthSchedule(
  month: number,
  year: number,
  monthsCount: number = 2,
  dailyHours: number = 8,
  shiftLength: number = 12,
  holidays: string[] = [], // Date strings in DD.MM format
): MonthSchedule {
  // Parse holiday date strings to Date objects, filtering by the date range
  const startDay = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDay = new Date(Date.UTC(year, month + monthsCount - 1, 1, 0, 0, 0, 0));
  
  const holidayDates: Date[] = [];
  for (const holidayStr of holidays) {
    // Try parsing with the config year, but also check if it might be next year (for year-end holidays)
    const holidayDate = parseHolidayDate(holidayStr, year);
    if (holidayDate && holidayDate.getTime() >= startDay.getTime() && holidayDate.getTime() < endDay.getTime()) {
      holidayDates.push(holidayDate);
    }
    // Also check if holiday falls in next year (for schedules spanning year boundary)
    const nextYearHoliday = parseHolidayDate(holidayStr, year + 1);
    if (nextYearHoliday && nextYearHoliday.getTime() >= startDay.getTime() && nextYearHoliday.getTime() < endDay.getTime()) {
      holidayDates.push(nextYearHoliday);
    }
  }
  
  // Create a Set for efficient holiday lookup by date string (YYYY-MM-DD)
  const holidayDateStrings = new Set(
    holidayDates.map(h => h.toISOString().slice(0, 10))
  );

  const workingDays: Date[] = [];
  let workingDaysCount = 0;

  // Track per-month statistics
  const monthlyStats = new Map<string, MonthStats>();
  
  for (
    let currentDate = new Date(startDay);
    currentDate.getTime() < endDay.getTime();
    currentDate.setUTCDate(currentDate.getUTCDate() + 1)
  ) {
    const currentDateString = currentDate.toISOString().slice(0, 10);
    const dayOfWeek = currentDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const isHoliday = holidayDateStrings.has(currentDateString);
    
    // Get month/year key for per-month tracking
    const currentMonth = currentDate.getUTCMonth() + 1;
    const currentYear = currentDate.getUTCFullYear();
    const monthKey = `${currentYear}-${currentMonth}`;
    
    // Initialize month stats if not exists
    if (!monthlyStats.has(monthKey)) {
      monthlyStats.set(monthKey, {
        month: currentMonth,
        year: currentYear,
        workingDays: 0,
        totalWorkingHours: 0,
        shiftsNumber: 0,
        workingDaysList: [],
        holidays: [],
      });
    }
    const monthStats = monthlyStats.get(monthKey)!;
    
    if (!isHoliday && dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDaysCount++;
      monthStats.workingDays++;
      const workingDayDate = new Date(currentDate);
      workingDays.push(workingDayDate);
      monthStats.workingDaysList.push(workingDayDate);
    }
    
    // Track holidays per month
    if (isHoliday) {
      const holidayDate = holidayDates.find(h => h.toISOString().slice(0, 10) === currentDateString);
      if (holidayDate && !monthStats.holidays.some(h => h.getTime() === holidayDate.getTime())) {
        monthStats.holidays.push(holidayDate);
      }
    }
  }

  const totalWorkingHours = workingDaysCount * dailyHours;
  
  // Calculate per-month hours and shifts
  const monthlyBreakdown: MonthStats[] = Array.from(monthlyStats.values())
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map(stats => ({
      ...stats,
      totalWorkingHours: stats.workingDays * dailyHours,
      shiftsNumber: Math.floor(stats.workingDays * dailyHours / shiftLength),
    }));

  return {
    month,
    year,
    workingDays: workingDaysCount,
    totalWorkingHours: totalWorkingHours,
    shiftsNumber: Math.floor(totalWorkingHours / shiftLength),
    workingDaysList: workingDays,
    holidays: holidayDates,
    monthlyBreakdown,
  };
}

/**
 * Get current year (helper function)
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Get all days in a given month (including weekends)
 */
export function getAllDaysInMonth(month: number, year: number): Date[] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const totalDays = lastDay.getDate();

  const allDays: Date[] = [];
  for (let day = 1; day <= totalDays; day++) {
    allDays.push(new Date(year, month - 1, day));
  }

  return allDays;
}
