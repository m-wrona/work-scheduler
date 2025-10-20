import config from './config.json';
import type { WorkSchedulerConfig } from './src/types/config';
import { isValidConfig } from './src/types/config';
import { createMonthSchedule, getCurrentYear } from './src/scheduler/calendar';
import { generateMonthlySchedule } from './src/scheduler/planner';
import { Table } from 'console-table-printer';

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
// console.log(`Working days list: ${monthSchedule.workingDaysList.map(date => date.toLocaleDateString()).join(', ')}`);

// Generate monthly schedule plan

console.log('\nGenerating Monthly Schedule Plan:');
console.log('=================================');

const scheduleResult = generateMonthlySchedule(typedConfig, {
  year: currentYear,
  month: typedConfig.schedule.month,
  planNextWorkingDays: monthSchedule.totalDays
});

console.log(`Generated schedule for ${scheduleResult.schedule.month}/${scheduleResult.schedule.year}`);

// Print schedule as table
console.log('\n📅 Monthly Schedule:');
console.log('===================');

const scheduleTable = new Table({
  title: `Work Schedule - ${scheduleResult.schedule.month}/${scheduleResult.schedule.year}`,
  columns: [
    { name: 'date', title: 'Date', alignment: 'left' },
    { name: 'day', title: 'Day', alignment: 'left' },
    { name: 'dailyShift', title: 'Daily Shift', alignment: 'left' },
    { name: 'nightShift', title: 'Night Shift', alignment: 'left' }
  ]
});

scheduleResult.schedule.days.forEach(day => {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = dayNames[day.weekDay];
  const dateStr = day.date.toLocaleDateString('en-US', { 
    month: '2-digit', 
    day: '2-digit' 
  });
  
  const dailyShiftNames = day.shift.dailyShift
    .map(emp => `${emp.employee.firstName} ${emp.employee.lastName}`)
    .join(', ');
    
  const nightShiftNames = day.shift.nightShift
    .map(emp => `${emp.employee.firstName} ${emp.employee.lastName}`)
    .join(', ');

  scheduleTable.addRow({
    date: dateStr,
    day: dayName,
    dailyShift: dailyShiftNames || 'No one assigned',
    nightShift: nightShiftNames || 'No one assigned'
  });
});

scheduleTable.printTable();

if (scheduleResult.warnings.length > 0) {
  console.log('\nWarnings:');
  scheduleResult.warnings.forEach(warning => console.log(`- ${warning}`));
}

if (scheduleResult.errors.length > 0) {
  console.log('\nErrors:');
  scheduleResult.errors.forEach(err => console.log(`- ${err}`));
}


