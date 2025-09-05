import type { WorkSchedulerConfig, Employee } from '../types/config';
import type {
  ScheduleDay,
  DayShift,
  ScheduleGenerationResult,
  EmployeeShifts,
} from '../types/schedule';
import type { MonthSchedule } from './calendar';
import { createMonthSchedule } from './calendar';

export interface PlannerOptions {
  year?: number;
  month?: number;
  planNextWorkingDays?: number;
  dailyHours?: number,
  shiftLength?: number,
  monthSchedule?: MonthSchedule;
}

export function createPlannerOptions(options: PlannerOptions = {}): Required<PlannerOptions> {
  const now = new Date();
  const year = options.year || now.getFullYear();
  const month = options.month || now.getMonth() + 1;
  const dailyHours = options.dailyHours || 8;
  const shiftLength = options.shiftLength || 12;
  const monthSchedule = options.monthSchedule || createMonthSchedule(month, year, dailyHours, shiftLength);

  return {
    year: options.year ?? year,
    month: options.month ?? month,
    planNextWorkingDays: options.planNextWorkingDays ?? monthSchedule.totalDays,
    dailyHours: options.dailyHours ?? dailyHours,
    shiftLength: options.shiftLength ?? shiftLength,
    monthSchedule: options.monthSchedule || monthSchedule,
  };
}

export function generateMonthlySchedule(
  config: WorkSchedulerConfig,
  options: PlannerOptions = {}
): ScheduleGenerationResult {
  const year = options.year || config.schedule.year;
  const month = options.month || config.schedule.month;
  const days: ScheduleDay[] = [];
  const plannerOptions = createPlannerOptions(options);

  const employeeShifts: EmployeeShifts[] = config.employees.map(employee => ({
    employee: employee,
    shifts: [],
    nextDayShiftDate: undefined,
    nextNightShiftDate: undefined
  }));

  for (let day = 1; day <= plannerOptions.planNextWorkingDays; day++) {
    const date = new Date(year, month - 1, day);

    const scheduleDay: ScheduleDay = {
      date: date,
      weekDay: date.getDay(),
      shift: assignShiftsForDay(
        employeeShifts,
        config.shifts.employeesPerShift,
        config.shifts.daysFreeBetweenShifts,
        date,
      )
    };

    days.push(scheduleDay);
  }

  return {
    schedule: {
      month,
      year,
      days,
    },
    errors: [],
    warnings: []
  };
}

export function assignShiftsForDay(
  employees: EmployeeShifts[],
  employeesPerShift: number,
  daysFreeAfterShift: number,
  currentDate: Date,
): DayShift {
  // First, assign day shift employees
  const availableForDayShift = employees.filter(emp => {
    if (!emp.nextDayShiftDate) {
      return true;
    }
    return currentDate >= emp.nextDayShiftDate;
  });

  if (availableForDayShift.length < employeesPerShift) {
    throw new Error(
      `Not enough available employees for day shift on day ${currentDate.getDate()}. ` +
      `Required: ${employeesPerShift}, Available: ${availableForDayShift.length}`
    );
  }

  const dailyShiftEmployees = availableForDayShift.slice(0, employeesPerShift);

  // Calculate the next day for night shift (tomorrow)
  const nightShiftDay = new Date(currentDate);
  nightShiftDay.setDate(currentDate.getDate() + 1);

  // Calculate the date when employees can work again after night shift
  const nextAllowedDate = new Date(nightShiftDay);
  nextAllowedDate.setDate(nightShiftDay.getDate() + daysFreeAfterShift + 1);

  // Update day shift employees - they can work night shift tomorrow
  dailyShiftEmployees.forEach(emp => {
    emp.nextNightShiftDate = nightShiftDay; // Can work night shift tomorrow
    emp.nextDayShiftDate = nextAllowedDate; // Can work day shift after days free
  });

  // Now assign night shift employees for today
  // Filter employees who can work night shift, excluding those already assigned to day shift
  const availableForNightShift = employees.filter(emp => {
    // Skip employees already assigned to day shift
    if (dailyShiftEmployees.includes(emp)) {
      return false;
    }
    // Check if they can work night shift today
    if (!emp.nextNightShiftDate) {
      return true;
    }
    return currentDate >= emp.nextNightShiftDate;
  });

  if (availableForNightShift.length < employeesPerShift) {
    throw new Error(
      `Not enough available employees for night shift on day ${currentDate.getDate()}. ` +
      `Required: ${employeesPerShift}, Available: ${availableForNightShift.length}`
    );
  }

  const nightShiftEmployees = availableForNightShift.slice(0, employeesPerShift);

  // Update night shift employees - they need days free after this shift
  nightShiftEmployees.forEach(emp => {
    emp.nextDayShiftDate = nextAllowedDate; // Can work day shift after days free
    emp.nextNightShiftDate = nextAllowedDate; // Can work night shift after days free
  });

  return {
    dailyShift: dailyShiftEmployees,
    nightShift: nightShiftEmployees
  };
}

