import config from './config.json';
import type { WorkSchedulerConfig } from './src/types/config';
import { isValidConfig } from './src/types/config';
import { createMonthSchedule, getCurrentYear } from './src/scheduler/calendar';
import { printHTMLFromShifts } from './src/html-generator';
import { nextShift } from './src/scheduler/schedule';
import { newEmployeeShift } from './src/scheduler/model';

const typedConfig: WorkSchedulerConfig = config;

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

console.log('\nSchedule Calculation:');
console.log('=============================');
console.log(`Month: ${monthSchedule.month}/${monthSchedule.year}`);
console.log(`Working days (Mon-Fri): ${monthSchedule.workingDays}`);
console.log(`Holidays: ${monthSchedule.holidays}`);
console.log(`Total working hours: ${monthSchedule.totalWorkingHours} hours`);
console.log(`Shifts number: ${monthSchedule.shiftsNumber}`);

console.log('First day of  schedule:', monthSchedule.workingDaysList[0]);
console.log('Last day of  schedule:', monthSchedule.workingDaysList[monthSchedule.workingDaysList.length - 1]);

console.log('\nMonthly Breakdown:');
console.log('==================');
monthSchedule.monthlyBreakdown.forEach((monthStats, index) => {
  console.log(`\nMonth ${index + 1}: ${monthStats.month}/${monthStats.year}`);
  console.log(`  Working days (Mon-Fri): ${monthStats.workingDays}`);
  console.log(`  Holidays: ${monthStats.holidays.length > 0 ? monthStats.holidays.map(h => h.toISOString().slice(0, 10)).join(', ') : 'None'}`);
  console.log(`  Total working hours: ${monthStats.totalWorkingHours} hours`);
  console.log(`  Shifts number: ${monthStats.shiftsNumber}`);
  console.log(`  First day: ${monthStats.workingDaysList[0]?.toISOString().slice(0, 10) || 'N/A'}`);
  console.log(`  Last day: ${monthStats.workingDaysList[monthStats.workingDaysList.length - 1]?.toISOString().slice(0, 10) || 'N/A'}`);
});

const shifts = nextShift(
  typedConfig, 
  monthSchedule, 
  0, 
  [], 
  new Map(typedConfig.employees.map(e => [e.id.toString(), newEmployeeShift(e)])), 
);

console.log(shifts[0]);

if (shifts === null) {
  console.error('Failed to generate schedule');
  process.exit(1);
}

printHTMLFromShifts(shifts, typedConfig, monthSchedule);


