import config from './config.json';
import type { WorkSchedulerConfig } from './src/types/config';
import { isValidConfig } from './src/types/config';

// Type the config
const typedConfig: WorkSchedulerConfig = config;

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
console.log(`- Week starts: ${typedConfig.schedule.weekStart}`);

console.log('\nFull Configuration Object:');
console.log(JSON.stringify(typedConfig, null, 2));