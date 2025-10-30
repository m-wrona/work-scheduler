import config from './config.json';
import type { WorkSchedulerConfig } from './src/types/config';
import { isValidConfig } from './src/types/config';
import { createMonthSchedule, getCurrentYear } from './src/scheduler/calendar';
import { generateMonthlySchedule } from './src/scheduler/planner';
import { Table } from 'console-table-printer';
import { printHTMLFromShifts } from './src/html-generator';
import { nextShift } from './src/scheduler/schedule';
import { newEmployeeShift } from './src/scheduler/model';

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
  2,
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

console.log('\nGenerating schedule:', monthSchedule.workingDaysList);

const shifts = nextShift(
  typedConfig, 
  monthSchedule, 
  0, 
  [], 
  new Map(typedConfig.employees.map(e => [e.id.toString(), newEmployeeShift(e)])), 
);

if (shifts === null) {
  console.error('Failed to generate schedule');
  process.exit(1);
}

// Generate HTML file from shifts
printHTMLFromShifts(shifts, typedConfig, monthSchedule);


