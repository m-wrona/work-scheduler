export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
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
  holidays: number[];
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
      typeof emp.lastName === 'string'
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
    config.schedule.holidays.every((holiday: number) => typeof holiday === 'number')
  );
}

export function isValidHoliday(holiday: number): boolean {
  return typeof holiday === 'number' && holiday >= 1 && holiday <= 31;
}
