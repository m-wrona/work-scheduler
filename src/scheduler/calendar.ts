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
  holidays: Date[];
}

export function createMonthSchedule(
  month: number,
  year: number,
  monthsCount: number = 2,
  dailyHours: number = 8,
  shiftLength: number = 12,
  holidays: number[] = [],
): MonthSchedule {
  const workingDays: Date[] = [];
  let workingDaysCount = 0;
  const startDay = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDay = new Date(Date.UTC(year, month + monthsCount - 1, 1, 0, 0, 0, 0));
  let totalDays = 0;

  for (
    let currentDate = new Date(startDay);
    currentDate.getTime() < endDay.getTime();
    currentDate.setUTCDate(currentDate.getUTCDate() + 1)
  ) {
    const day = currentDate.getUTCDate();
    const dayOfWeek = currentDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    if (!holidays.includes(day) &&dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDaysCount++;
    }
    workingDays.push(new Date(currentDate));
  }

  const totalWorkingHours = workingDaysCount * dailyHours

  return {
    month,
    year,
    totalDays,
    workingDays: workingDaysCount,
    totalWorkingHours: totalWorkingHours,
    shiftsNumber: Math.floor(totalWorkingHours / shiftLength),
    workingDaysList: workingDays,
    holidays: holidays.map(day => new Date(Date.UTC(year, month - 1, day))),
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
