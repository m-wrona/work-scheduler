import type { Employee } from './config';

export interface EmployeeShifts {
  employee: Employee;
  shifts?: DayShift[];
  nextShiftDate?: Date;
}

export interface DayShift {
  dailyShift: EmployeeShifts[];
  nightShift: EmployeeShifts[];
}

export interface ScheduleDay {
  date: Date;
  weekDay: number;
  shift: DayShift;
}

export interface MonthlySchedulePlan {
  month: number;
  year: number;
  days: ScheduleDay[];
}

export interface ScheduleGenerationResult {
  schedule: MonthlySchedulePlan;
  warnings: string[];
  errors: string[];
}
