/**
 * Calculate working days and hours for a given month
 */

export interface MonthSchedule {
  month: number;
  year: number;
  totalDays: number;
  workingDays: number;
  totalWorkingHours: number;
  shiftsNumber: number;
  workingDaysList: Date[];
}

export function createMonthSchedule(
  month: number,
  year: number,
  dailyHours: number = 8,
  shiftLength: number = 12,
): MonthSchedule {
  const lastDay = new Date(year, month, 0); // 0 gives us the last day of the previous month

  const totalDays = lastDay.getDate();
  const workingDays: Date[] = [];
  let workingDaysCount = 0;

  // Iterate through each day of the month
  for (let day = 1; day <= totalDays; day++) {
    const currentDate = new Date(year, month - 1, day);
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Check if it's a working day (Monday = 1, Tuesday = 2, ..., Friday = 5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDaysCount++;
      workingDays.push(currentDate);
    }
  }

  const totalWorkingHours = workingDaysCount * dailyHours

  return {
    month,
    year,
    totalDays,
    workingDays: workingDaysCount,
    totalWorkingHours: totalWorkingHours,
    shiftsNumber: Math.floor(totalWorkingHours / shiftLength),
    workingDaysList: workingDays
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
