import type { Employee } from './config';

export interface EmployeeShifts {
  employee: Employee;
  shifts?: DayShift[];
  nextShiftDate?: Date;
}

export interface DayShift {
  dailyShift: Employee[];
  nightShift: Employee[];
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

export interface PlannerOptions {
  employeesPerShift?: number;
  rotateShifts?: boolean;
  customRotation?: Employee[][];
}

export function createPlannerOptions(options: PlannerOptions = {}): Required<PlannerOptions> {
  return {
    employeesPerShift: options.employeesPerShift ?? 4,
    rotateShifts: options.rotateShifts ?? true,
    customRotation: options.customRotation ?? [],
  };
}
