import type { WorkSchedulerConfig, Employee } from '../types/config';
import type {
  MonthlySchedulePlan,
  ScheduleDay,
  DayShift,
  PlannerOptions,
  ScheduleGenerationResult,
} from '../types/schedule';
import { getWorkingDaysInMonth } from './calendar';
import { createPlannerOptions } from '../types/schedule';

export function generateMonthlySchedule(
  config: WorkSchedulerConfig,
  year: number = new Date().getFullYear(),
  options: PlannerOptions = {}
): ScheduleGenerationResult {
  const plannerOptions = createPlannerOptions(options);

  const month = config.schedule.month;
  const monthInfo = getWorkingDaysInMonth(month, year);
  const days: ScheduleDay[] = [];
  const totalDays = monthInfo.totalDays;

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month - 1, day);

    const scheduleDay: ScheduleDay = {
      date: date,
      weekDay: date.getDay(),
      shift: assignShiftsForDay(
        config.employees,
        plannerOptions.employeesPerShift,
        day - 1, // Use day index for rotation
        plannerOptions.rotateShifts,
        plannerOptions.customRotation
      )
    };

    days.push(scheduleDay);
  }

  const schedule: MonthlySchedulePlan = {
    month,
    year,
    days,
  };

  return {
    schedule,
    errors: [],
    warnings: []
  };
}

/**
 * Assign employees to shifts for a specific day
 */
function assignShiftsForDay(
  employees: Employee[],
  employeesPerShift: number,
  dayIndex: number,
  rotateShifts: boolean,
  customRotation?: Employee[][]
): DayShift {
  if (customRotation && customRotation.length > 0) {
    const rotationIndex = dayIndex % customRotation.length;
    const dayEmployees = customRotation[rotationIndex] || [];

    return {
      dailyShift: dayEmployees.slice(0, employeesPerShift),
      nightShift: dayEmployees.slice(employeesPerShift, Math.min(employeesPerShift * 2, dayEmployees.length))
    };
  }

  if (rotateShifts) {
    // Simple rotation: shift employees by day index
    const rotatedEmployees = rotateEmployeeArray(employees, dayIndex);

    return {
      dailyShift: rotatedEmployees.slice(0, employeesPerShift),
      nightShift: rotatedEmployees.slice(employeesPerShift, Math.min(employeesPerShift * 2, rotatedEmployees.length))
    };
  }

  // No rotation: use first employees for day shift, next for night shift
  return {
    dailyShift: employees.slice(0, employeesPerShift),
    nightShift: employees.slice(employeesPerShift, Math.min(employeesPerShift * 2, employees.length))
  };
}

/**
 * Rotate an array of employees by a given offset
 */
function rotateEmployeeArray(employees: Employee[], offset: number): Employee[] {
  if (employees.length === 0) return [];

  const rotated = [...employees];
  const actualOffset = offset % employees.length;

  return [
    ...rotated.slice(actualOffset),
    ...rotated.slice(0, actualOffset)
  ];
}
