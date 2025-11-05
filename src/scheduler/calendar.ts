/**
 * Calculate working days and hours for a given month
 */

import { parseHolidayDate, type Employee } from '../types/config';

export interface EmployeeMonthStats {
  employee: Employee;
  workingDays: number;
  totalWorkingHours: number;
  shiftsNumber: number;
  holidays: Date[];
}

export interface MonthStats {
  month: number;
  year: number;
  workingDays: number;
  totalWorkingHours: number;
  shiftsNumber: number;
  workingDaysList: Date[];
  holidays: Date[];
  employeeMonthStats: EmployeeMonthStats[];
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

/**
 * Calculate employee statistics for a given month
 */
function calculateEmployeeMonthStats(
  employee: Employee,
  month: number,
  year: number,
  startDay: Date,
  endDay: Date,
  holidayDates: Date[],
  holidayDateStrings: Set<string>,
  dailyHours: number,
  shiftLength: number,
): EmployeeMonthStats {
  // Parse employee's personal holidays
  const employeeHolidayDates: Date[] = [];
  const employeeHolidayStrings = new Set<string>();

  if (employee.holidays) {
    for (const holidayStr of employee.holidays) {
      const holidayDate = parseHolidayDate(holidayStr, year);
      if (holidayDate && holidayDate.getTime() >= startDay.getTime() && holidayDate.getTime() < endDay.getTime()) {
        employeeHolidayDates.push(holidayDate);
        employeeHolidayStrings.add(holidayDate.toISOString().slice(0, 10));
      }
      // Also check if holiday falls in next year (for schedules spanning year boundary)
      const nextYearHoliday = parseHolidayDate(holidayStr, year + 1);
      if (nextYearHoliday && nextYearHoliday.getTime() >= startDay.getTime() && nextYearHoliday.getTime() < endDay.getTime()) {
        employeeHolidayDates.push(nextYearHoliday);
        employeeHolidayStrings.add(nextYearHoliday.toISOString().slice(0, 10));
      }
    }
  }

  let workingDays = 0;
  const employeeHolidays: Date[] = [];

  for (
    let currentDate = new Date(startDay);
    currentDate.getTime() < endDay.getTime();
    currentDate.setUTCDate(currentDate.getUTCDate() + 1)
  ) {
    const currentDateString = currentDate.toISOString().slice(0, 10);
    const dayOfWeek = currentDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const isHoliday = holidayDateStrings.has(currentDateString);
    const isEmployeeHoliday = employeeHolidayStrings.has(currentDateString);
    const currentMonth = currentDate.getUTCMonth() + 1;
    const currentYear = currentDate.getUTCFullYear();

    // Only process days within this month
    if (currentMonth !== month || currentYear !== year) {
      continue;
    }

    // Employee working day: weekday, not a general holiday, and not employee's personal holiday
    if (!isHoliday && !isEmployeeHoliday && dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDays++;
    }

    if (isEmployeeHoliday) {
      const holidayDate = employeeHolidayDates.find(h => h.toISOString().slice(0, 10) === currentDateString);
      if (holidayDate && !employeeHolidays.some(h => h.getTime() === holidayDate.getTime())) {
        employeeHolidays.push(holidayDate);
      }
    }
  }

  const totalWorkingHours = workingDays * dailyHours;
  const shiftsNumber = Math.floor(totalWorkingHours / shiftLength);

  return {
    employee,
    workingDays,
    totalWorkingHours,
    shiftsNumber,
    holidays: employeeHolidays,
  };
}

export function createMonthSchedule(
  month: number,
  year: number,
  monthsCount: number = 2,
  dailyHours: number = 8,
  shiftLength: number = 12,
  holidays: string[] = [], // Date strings in DD.MM format
  employees: Employee[] = [],
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
        employeeMonthStats: [],
      });
    }
    const monthStats = monthlyStats.get(monthKey)!;

    if (!isHoliday && dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDaysCount++;
      monthStats.workingDays++;
    }

    if (isHoliday) {
      const holidayDate = holidayDates.find(h => h.toISOString().slice(0, 10) === currentDateString);
      if (holidayDate && !monthStats.holidays.some(h => h.getTime() === holidayDate.getTime())) {
        monthStats.holidays.push(holidayDate);
      }
    }

    const workingDayDate = new Date(currentDate);
    workingDays.push(workingDayDate);
    monthStats.workingDaysList.push(workingDayDate);
  }

  const totalWorkingHours = workingDaysCount * dailyHours;

  // Calculate per-month hours, shifts, and employee stats
  const monthlyBreakdown: MonthStats[] = Array.from(monthlyStats.values())
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map(stats => {
      // Calculate employee stats for this month
      const employeeMonthStats = employees.map(employee =>
        calculateEmployeeMonthStats(
          employee,
          stats.month,
          stats.year,
          startDay,
          endDay,
          holidayDates,
          holidayDateStrings,
          dailyHours,
          shiftLength,
        )
      );

      return {
        ...stats,
        totalWorkingHours: stats.workingDays * dailyHours,
        shiftsNumber: Math.floor(stats.workingDays * dailyHours / shiftLength),
        employeeMonthStats,
      };
    });

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

export function getEmployeeMonthStats(
  schedule: MonthSchedule, 
  month: number, 
  year: number, 
  employeeId: number,
): EmployeeMonthStats | undefined {
  return schedule.monthlyBreakdown
    .find(m => m.month === month && m.year === year)
    ?.employeeMonthStats
    .find(e => e.employee.id === employeeId);
}