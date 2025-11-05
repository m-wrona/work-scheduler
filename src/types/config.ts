export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  holidays?: string[]; // Date strings in DD.MM format
}

export interface WorkingHours {
  defaultDailyHours: number;
  units: string;
}

export interface Shifts {
  defaultShiftLength: number;
  units: string;
  employeesPerShift: number;
  daysFreeBetweenShifts: number;
  maxDaysFreeBetweenShifts: number;
  weekendsFreeInMonth: number;
}

export interface Schedule {
  timezone: string;
  year: number;
  month: number;
  holidays: string[]; // Date strings in DD.MM format
}

export interface WorkSchedulerConfig {
  employees: Employee[];
  workingHours: WorkingHours;
  shifts: Shifts;
  schedule: Schedule;
}

// Type guard to validate config
export function isValidConfig(config: any): config is WorkSchedulerConfig {
  return (
    config &&
    Array.isArray(config.employees) &&
    config.employees.every((emp: Employee) => 
      typeof emp.id === 'number' &&
      typeof emp.firstName === 'string' &&
      typeof emp.lastName === 'string' &&
      (emp.holidays === undefined || 
       (Array.isArray(emp.holidays) && emp.holidays.every((holiday: string) => isValidHoliday(holiday))))
    ) &&
    config.workingHours &&
    typeof config.workingHours.defaultDailyHours === 'number' &&
    typeof config.workingHours.units === 'string' &&
    config.shifts &&
    typeof config.shifts.defaultShiftLength === 'number' &&
    typeof config.shifts.units === 'string' &&
    typeof config.shifts.employeesPerShift === 'number' &&
    typeof config.shifts.daysFreeBetweenShifts === 'number' &&
    typeof config.shifts.maxDaysFreeBetweenShifts === 'number' &&
    typeof config.shifts.weekendsFreeInMonth === 'number' &&
    config.schedule &&
    typeof config.schedule.timezone === 'string' &&
    typeof config.schedule.year === 'number' &&
    typeof config.schedule.month === 'number' &&
    typeof config.schedule.holidays === 'object' &&
    Array.isArray(config.schedule.holidays) &&
    config.schedule.holidays.every((holiday: string) => typeof holiday === 'string' && /^\d{1,2}\.\d{1,2}$/.test(holiday))
  );
}

export function isValidHoliday(holiday: string): boolean {
  return typeof holiday === 'string' && /^\d{1,2}\.\d{1,2}$/.test(holiday);
}

/**
 * Parse a holiday date string in DD.MM format
 * @param holidayString Date string in DD.MM format
 * @param year Year to use for the date
 * @returns Date object or null if invalid
 */
export function parseHolidayDate(holidayString: string, year: number): Date | null {
  const parts = holidayString.split('.');
  if (parts.length !== 2) return null;
  
  const dayStr = parts[0];
  const monthStr = parts[1];
  
  if (!dayStr || !monthStr) return null;
  
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  
  if (isNaN(day) || isNaN(month) || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  
  const date = new Date(Date.UTC(year, month - 1, day));
  // Validate the date is correct (e.g., not 31 Feb)
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  
  return date;
}
