import type { Employee } from './config';

export interface DayShift {
  dailyShift: Employee[];
  nightShift: Employee[];
}

export interface ScheduleDay {
  date: Date;
  weekDay: number;
  shifts?: DayShift;
}

export interface MonthlySchedulePlan {
  month: number;
  year: number;
  days: ScheduleDay[];
  totalWorkingDays: number;
  totalEmployees: number;
  config: {
    dailyHours: number;
    shiftLength: number;
    timezone: string;
  };
}

export interface ScheduleGenerationOptions {
  employeesPerShift?: number;
  rotateShifts?: boolean;
  customRotation?: Employee[][];
}

export interface ScheduleGenerationResult {
  schedule: MonthlySchedulePlan;
  warnings: string[];
  statistics: {
    totalShifts: number;
    averageShiftsPerEmployee: number;
    shiftsPerEmployee: Record<number, number>;
  };
}
