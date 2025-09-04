import type { WorkSchedulerConfig, Employee } from '../types/config';
import type {
  MonthlySchedulePlan,
  ScheduleDay,
  DayShift,
  PlannerOptions,
  ScheduleGenerationResult,
  EmployeeShifts,
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

  const employeeShifts: EmployeeShifts[] = config.employees.map(employee => ({
    employee: employee,
    shifts: [],
    nextShiftDate: undefined
  }));

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month - 1, day);

    const scheduleDay: ScheduleDay = {
      date: date,
      weekDay: date.getDay(),
      shift: assignShiftsForDay(
        employeeShifts,
        plannerOptions.employeesPerShift,
        day - 1, // Use day index for rotation
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

function assignShiftsForDay(
  employees: EmployeeShifts[],
  employeesPerShift: number,
  dayIndex: number,
): DayShift {

  return {
    dailyShift: [],
    nightShift: []
  };
}

