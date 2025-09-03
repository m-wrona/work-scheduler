import type { WorkSchedulerConfig, Employee } from '../types/config';
import type { 
  MonthlySchedulePlan, 
  ScheduleDay, 
  DayShift, 
  ScheduleGenerationOptions, 
  ScheduleGenerationResult 
} from '../types/schedule';
import { getWorkingDaysInMonth } from './scheduleCalculator';

export function generateMonthlySchedule(
  config: WorkSchedulerConfig,
  year: number = new Date().getFullYear(),
  options: ScheduleGenerationOptions = {}
): ScheduleGenerationResult {
  const {
    employeesPerShift = 1,
    rotateShifts = true,
    customRotation
  } = options;

  const warnings: string[] = [];
  const month = config.schedule.month;
  
  // Get working days for the month
  const monthInfo = getWorkingDaysInMonth(month, year);
  
  // Create array of all days in the month
  const days: ScheduleDay[] = [];
  const totalDays = monthInfo.totalDays;
  
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 5;
    
    const scheduleDay: ScheduleDay = {
      date,
      isWorkingDay
    };
    
    // Add shift assignments for working days
    if (isWorkingDay) {
      scheduleDay.shifts = assignShiftsForDay(
        config.employees,
        employeesPerShift,
        day - 1, // Use day index for rotation
        rotateShifts,
        customRotation
      );
    }
    
    days.push(scheduleDay);
  }
  
  // Create the schedule plan
  const schedule: MonthlySchedulePlan = {
    month,
    year,
    days,
    totalWorkingDays: monthInfo.workingDays,
    totalEmployees: config.employees.length,
    config: {
      dailyHours: config.workingHours.defaultDailyHours,
      shiftLength: config.shifts.defaultShiftLength,
      timezone: config.schedule.timezone
    }
  };
  
  // Calculate statistics
  const statistics = calculateScheduleStatistics(schedule);
  
  // Add warnings if needed
  if (config.employees.length < employeesPerShift * 2) {
    warnings.push(`Not enough employees (${config.employees.length}) to fill all shifts (need at least ${employeesPerShift * 2})`);
  }
  
  return {
    schedule,
    warnings,
    statistics
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
    // Use custom rotation pattern
    const rotationIndex = dayIndex % customRotation.length;
    const dayEmployees = customRotation[rotationIndex] || [];
    
    return {
      dailyShift: dayEmployees.slice(0, employeesPerShift),
      nightShift: dayEmployees.slice(employeesPerShift, employeesPerShift * 2)
    };
  }
  
  if (rotateShifts) {
    // Simple rotation: shift employees by day index
    const rotatedEmployees = rotateEmployeeArray(employees, dayIndex);
    
    return {
      dailyShift: rotatedEmployees.slice(0, employeesPerShift),
      nightShift: rotatedEmployees.slice(employeesPerShift, employeesPerShift * 2)
    };
  }
  
  // No rotation: use first employees for day shift, next for night shift
  return {
    dailyShift: employees.slice(0, employeesPerShift),
    nightShift: employees.slice(employeesPerShift, employeesPerShift * 2)
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

/**
 * Calculate statistics for the generated schedule
 */
function calculateScheduleStatistics(schedule: MonthlySchedulePlan) {
  const shiftsPerEmployee: Record<number, number> = {};
  
  // Initialize counters for each employee
  schedule.days.forEach(day => {
    if (day.isWorkingDay && day.shifts) {
      [...day.shifts.dailyShift, ...day.shifts.nightShift].forEach(employee => {
        shiftsPerEmployee[employee.id] = (shiftsPerEmployee[employee.id] || 0) + 1;
      });
    }
  });
  
  const totalShifts = Object.values(shiftsPerEmployee).reduce((sum, count) => sum + count, 0);
  const averageShiftsPerEmployee = schedule.totalEmployees > 0 
    ? totalShifts / schedule.totalEmployees 
    : 0;
  
  return {
    totalShifts,
    averageShiftsPerEmployee,
    shiftsPerEmployee
  };
}

/**
 * Generate a balanced schedule with equal distribution of shifts
 */
export function generateBalancedSchedule(
  config: WorkSchedulerConfig,
  year: number = new Date().getFullYear(),
  employeesPerShift: number = 1
): ScheduleGenerationResult {
  const month = config.schedule.month;
  const monthInfo = getWorkingDaysInMonth(month, year);
  
  // Calculate how many shifts each employee should have
  const totalShifts = monthInfo.workingDays * 2; // 2 shifts per day (day + night)
  const shiftsPerEmployee = Math.floor(totalShifts / config.employees.length);
  const extraShifts = totalShifts % config.employees.length;
  
  // Create a balanced rotation pattern
  const rotationPattern: Employee[][] = [];
  let employeeIndex = 0;
  
  for (let day = 0; day < monthInfo.workingDays; day++) {
    const dayShift: Employee[] = [];
    const nightShift: Employee[] = [];
    
    // Assign day shift
    for (let i = 0; i < employeesPerShift; i++) {
      dayShift.push(config.employees[employeeIndex % config.employees.length]);
      employeeIndex++;
    }
    
    // Assign night shift
    for (let i = 0; i < employeesPerShift; i++) {
      nightShift.push(config.employees[employeeIndex % config.employees.length]);
      employeeIndex++;
    }
    
    rotationPattern.push([...dayShift, ...nightShift]);
  }
  
  return generateMonthlySchedule(config, year, {
    employeesPerShift,
    rotateShifts: false,
    customRotation: rotationPattern
  });
}

/**
 * Export schedule to a readable format
 */
export function exportScheduleToText(schedule: MonthlySchedulePlan): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  let output = `Schedule for ${monthNames[schedule.month - 1]} ${schedule.year}\n`;
  output += `Total Working Days: ${schedule.totalWorkingDays}\n`;
  output += `Total Employees: ${schedule.totalEmployees}\n\n`;
  
  schedule.days.forEach(day => {
    const dateStr = day.date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
    
    if (day.isWorkingDay && day.shifts) {
      const dayShiftNames = day.shifts.dailyShift.map(emp => `${emp.firstName} ${emp.lastName}`).join(', ');
      const nightShiftNames = day.shifts.nightShift.map(emp => `${emp.firstName} ${emp.lastName}`).join(', ');
      
      output += `${dateStr}:\n`;
      output += `  Day Shift: ${dayShiftNames}\n`;
      output += `  Night Shift: ${nightShiftNames}\n\n`;
    } else {
      output += `${dateStr}: Weekend\n\n`;
    }
  });
  
  return output;
}
