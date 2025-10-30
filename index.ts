import config from './config.json';
import type { WorkSchedulerConfig } from './src/types/config';
import { isValidConfig } from './src/types/config';
import { createMonthSchedule, getCurrentYear } from './src/scheduler/calendar';
import { generateMonthlySchedule } from './src/scheduler/planner';
import { Table } from 'console-table-printer';
import type { ScheduleGenerationResult, ScheduleDay, DayShift, EmployeeShifts, MonthlySchedulePlan } from './src/types/schedule';
import { printHTMLScheduleTable } from './src/html-generator';
import { nextShift } from './src/scheduler/schedule';

const typedConfig: WorkSchedulerConfig = config;

// console.log('\nFull Configuration Object:');
// console.log(JSON.stringify(typedConfig, null, 2));

// Validate config
if (!isValidConfig(typedConfig)) {
  console.error('Invalid configuration format!');
  process.exit(1);
}

console.log('Work Scheduler Configuration:');
console.log('============================');
console.log('\nEmployees:');
typedConfig.employees.forEach(employee => {
  console.log(`- ${employee.firstName} ${employee.lastName} (ID: ${employee.id})`);
});

console.log('\nWorking Hours:');
console.log(`- Default daily hours: ${typedConfig.workingHours.defaultDailyHours} ${typedConfig.workingHours.units}`);

console.log('\nShifts:');
console.log(`- Default shift length: ${typedConfig.shifts.defaultShiftLength} ${typedConfig.shifts.units}`);

console.log('\nSchedule Settings:');
console.log(`- Timezone: ${typedConfig.schedule.timezone}`);
console.log(`- Month: ${typedConfig.schedule.month}`);

// Calculate monthly schedule
const currentYear = getCurrentYear();
const monthSchedule = createMonthSchedule(
  typedConfig.schedule.month,
  currentYear,
  typedConfig.workingHours.defaultDailyHours,
  typedConfig.shifts.defaultShiftLength,
  typedConfig.schedule.holidays,
);

console.log('\nMonthly Schedule Calculation:');
console.log('=============================');
console.log(`Month: ${monthSchedule.month}/${monthSchedule.year}`);
console.log(`Total days in month: ${monthSchedule.totalDays}`);
console.log(`Working days (Mon-Fri): ${monthSchedule.workingDays}`);
console.log(`Holidays: ${monthSchedule.holidays}`);
console.log(`Total working hours: ${monthSchedule.totalWorkingHours} hours`);
console.log(`Shifts number: ${monthSchedule.shiftsNumber}`);


const shifts = nextShift(
  typedConfig, 
  monthSchedule, 
  0, 
  [], 
  new Map(typedConfig.employees.map(e => [e.id.toString(), { employee: e, hours: 0, lastDate: null, nextNotSoonerThan: null, nextNotLaterThan: null }])), 
);

if (shifts === null) {
  console.error('Failed to generate schedule');
  process.exit(1);
}

// Aggregate shifts by date to display daily and night shifts per day
const shiftsByDate = new Map<string, { date: Date; daily: string[]; night: string[] }>();

shifts.forEach(shift => {
  const key = shift.date.toISOString().slice(0, 10);
  if (!shiftsByDate.has(key)) {
    shiftsByDate.set(key, { date: shift.date, daily: [], night: [] });
  }
  const entry = shiftsByDate.get(key)!;
  const names = shift.employees.map(e => `${e.employee.firstName} ${e.employee.lastName}`);
  if (shift.night) {
    entry.night.push(...names);
  } else {
    entry.daily.push(...names);
  }
});

// Generate HTML using legacy generator by adapting Shift[] to MonthlySchedulePlan
const daysForHtml: ScheduleDay[] = [...shiftsByDate.values()]
  .sort((a, b) => a.date.getTime() - b.date.getTime())
  .map(entry => {
    const dailyShiftEmployees: EmployeeShifts[] = entry.daily.map(name => {
      const [firstName, lastName] = name.split(' ');
      const employee = typedConfig.employees.find(e => e.firstName === firstName && e.lastName === lastName)!;
      return { employee } as EmployeeShifts;
    });
    const nightShiftEmployees: EmployeeShifts[] = entry.night.map(name => {
      const [firstName, lastName] = name.split(' ');
      const employee = typedConfig.employees.find(e => e.firstName === firstName && e.lastName === lastName)!;
      return { employee } as EmployeeShifts;
    });
    const shift: DayShift = { dailyShift: dailyShiftEmployees, nightShift: nightShiftEmployees };
    return {
      date: entry.date,
      weekDay: entry.date.getDay(),
      shift,
    } as ScheduleDay;
  });

const monthlyPlan: MonthlySchedulePlan = {
  month: monthSchedule.month,
  year: monthSchedule.year,
  days: daysForHtml,
};

const htmlResult: ScheduleGenerationResult = {
  schedule: monthlyPlan,
  warnings: [],
  errors: [],
};

printHTMLScheduleTable(htmlResult, typedConfig);


