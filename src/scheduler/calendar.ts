/**
 * Calculate working days and hours for a given month
 */

export interface MonthSchedule {
  month: number;
  year: number;
  totalDays: number;
  workingDays: number;
  totalWorkingHours: number;
  workingDaysList: Date[];
  shiftsNumber: number;
}

/**
 * Get the number of working days (Monday-Friday) in a given month
 */
export function getWorkingDaysInMonth(month: number, year: number): MonthSchedule {
  const firstDay = new Date(year, month - 1, 1); // month is 0-indexed in Date constructor
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
  
  return {
    month,
    year,
    totalDays,
    workingDays: workingDaysCount,
    totalWorkingHours: 0, // Will be calculated by the calling function
    shiftsNumber: 0, // Will be calculated by the calling function
    workingDaysList: workingDays
  };
}

/**
 * Calculate total working hours for a month based on daily working hours
 */
export function calculateMonthlyWorkingHours(
  month: number, 
  year: number, 
  dailyHours: number,
  shiftLength: number
): MonthSchedule {
  const monthSchedule = getWorkingDaysInMonth(month, year);
  monthSchedule.totalWorkingHours = monthSchedule.workingDays * dailyHours;
  monthSchedule.shiftsNumber = Math.floor(monthSchedule.totalWorkingHours / shiftLength);
  return monthSchedule;
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
