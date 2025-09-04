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
        config.shifts.employeesPerShift,
        config.shifts.daysFreeBetweenShifts,
        date, // Pass the current date
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
  daysFreeAfterShift: number,
  currentDate: Date,
): DayShift {
  // Check which employees are available for this date
  const availableEmployees = employees.filter(emp => {
    if (!emp.nextShiftDate) {
      return true; 
    }
    return currentDate >= emp.nextShiftDate;
  });

  // Check if we have enough employees for both shifts
  const requiredEmployees = employeesPerShift * 2; // day + night shift
  if (availableEmployees.length < requiredEmployees) {
    throw new Error(
      `Not enough available employees for day ${currentDate.getDate()}. ` +
      `Required: ${requiredEmployees}, Available: ${availableEmployees.length}`
    );
  }

  const dailyShiftEmployees = availableEmployees.slice(0, employeesPerShift);
  const nightShiftEmployees = availableEmployees.slice(employeesPerShift, employeesPerShift * 2);

  const nextAllowedDate = new Date(currentDate);
  nextAllowedDate.setDate(currentDate.getDate() + daysFreeAfterShift + 1);

  dailyShiftEmployees.forEach(emp => {
    emp.nextShiftDate = nextAllowedDate;
  });

  nightShiftEmployees.forEach(emp => {
    emp.nextShiftDate = nextAllowedDate;
  });

  return {
    dailyShift: dailyShiftEmployees,
    nightShift: nightShiftEmployees
  };
}

