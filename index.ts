import config from './config.json';
import type { WorkSchedulerConfig } from './src/types/config';
import { isValidConfig } from './src/types/config';
import { calculateMonthlyWorkingHours, getCurrentYear } from './src/scheduler/scheduleCalculator';
import { generateMonthlySchedule, exportScheduleToText } from './src/scheduler/scheduleGenerator';

// Type the config
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
const monthSchedule = calculateMonthlyWorkingHours(
  typedConfig.schedule.month,
  currentYear,
  typedConfig.workingHours.defaultDailyHours,
  typedConfig.shifts.defaultShiftLength
);

console.log('\nMonthly Schedule Calculation:');
console.log('=============================');
console.log(`Month: ${monthSchedule.month}/${monthSchedule.year}`);
console.log(`Total days in month: ${monthSchedule.totalDays}`);
console.log(`Working days (Mon-Fri): ${monthSchedule.workingDays}`);
console.log(`Total working hours: ${monthSchedule.totalWorkingHours} hours`);
console.log(`Shifts number: ${monthSchedule.shiftsNumber}`);
// console.log(`Working days list: ${monthSchedule.workingDaysList.map(date => date.toLocaleDateString()).join(', ')}`);

// Generate monthly schedule plan

console.log('\nGenerating Monthly Schedule Plan:');
console.log('=================================');

const scheduleResult = generateMonthlySchedule(typedConfig, currentYear, {
  employeesPerShift: 1,
  rotateShifts: true
});

console.log(`Generated schedule for ${scheduleResult.schedule.month}/${scheduleResult.schedule.year}`);
console.log(`Total working days: ${scheduleResult.schedule.totalWorkingDays}`);
console.log(`Total employees: ${scheduleResult.schedule.totalEmployees}`);

if (scheduleResult.warnings.length > 0) {
  console.log('\nWarnings:');
  scheduleResult.warnings.forEach(warning => console.log(`- ${warning}`));
}

console.log('\nSchedule Statistics:');
console.log(`Total shifts: ${scheduleResult.statistics.totalShifts}`);
console.log(`Average shifts per employee: ${scheduleResult.statistics.averageShiftsPerEmployee.toFixed(2)}`);

console.log('\nShifts per employee:');
Object.entries(scheduleResult.statistics.shiftsPerEmployee).forEach(([employeeId, shiftCount]) => {
  const employee = typedConfig.employees.find(emp => emp.id === parseInt(employeeId));
  const name = employee ? `${employee.firstName} ${employee.lastName}` : `Employee ${employeeId}`;
  console.log(`- ${name}: ${shiftCount} shifts`);
});

console.log('\nDetailed Schedule:');
console.log(exportScheduleToText(scheduleResult.schedule));

