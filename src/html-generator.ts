import type { WorkSchedulerConfig } from './types/config';
import type { ScheduleGenerationResult, ScheduleDay, DayShift, EmployeeShifts, MonthlySchedulePlan } from './types/schedule';
import type { Shift } from './scheduler/model';
import type { MonthSchedule } from './scheduler/calendar';
import { writeFileSync } from 'fs';
import { join } from 'path';

export function generateHTMLScheduleTable(scheduleResult: ScheduleGenerationResult, config: WorkSchedulerConfig): string {
  const { schedule } = scheduleResult;
  const month = schedule.month;
  const year = schedule.year;
  
  // Get all days in the month
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  // Helper function to get day classes for a specific date
  const getDayClasses = (dayNumber: number): string => {
    const date = new Date(year, month - 1, dayNumber);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const isHoliday = config.schedule.holidays.includes(dayNumber);
    
    let classes = [];
    
    if (isHoliday) {
      classes.push('holiday');
    } else if (dayOfWeek === 0) { // Sunday
      classes.push('sunday');
    } else if (dayOfWeek === 6) { // Saturday
      classes.push('saturday');
    }
    
    return classes.length > 0 ? classes.join(' ') : '';
  };
  
  // Create header row with day classes
  const headerRow: (string | { value: string; classes: string })[] = ['Name', ...dayNumbers.map(d => ({ value: d.toString(), classes: getDayClasses(d) }))];
  
  // Create employee schedule data
  const employeeSchedules = config.employees.map((emp, index) => {
    const employeeName = `${index + 1}. ${emp.firstName} ${emp.lastName}`;
    const dayShifts = new Array(daysInMonth).fill('');
    
    // Fill in the shifts for each day
    schedule.days.forEach(day => {
      const dayNumber = day.date.getDate();
      const dayIndex = dayNumber - 1;
      
      // Check if employee is in daily shift
      const isInDailyShift = day.shift.dailyShift.some(shift => shift.employee.id === emp.id);
      // Check if employee is in night shift  
      const isInNightShift = day.shift.nightShift.some(shift => shift.employee.id === emp.id);
      
      if (isInDailyShift) {
        dayShifts[dayIndex] = 'D';
      } else if (isInNightShift) {
        dayShifts[dayIndex] = 'N';
      }
    });
    
    return [employeeName, ...dayShifts];
  });
  
  // Generate HTML table
  let html = '<table>\n';
  
  // Header row
  html += '  <thead>\n    <tr>\n';
  headerRow.forEach((cell, index) => {
    if (index === 0) {
      html += `      <th>${cell}</th>\n`;
    } else {
      const cellData = cell as { value: string; classes: string };
      const classAttr = cellData.classes ? ` class="${cellData.classes}"` : '';
      html += `      <th${classAttr}>${cellData.value}</th>\n`;
    }
  });
  html += '    </tr>\n  </thead>\n';
  
  // Data rows
  html += '  <tbody>\n';
  employeeSchedules.forEach(row => {
    html += '    <tr>\n';
    row.forEach((cell, index) => {
      let classAttr = '';
      if (index === 0) {
        classAttr = 'class="employee-name"';
      } else {
        // Apply day classes to data cells (index is the day number since column 0 is employee name)
        const dayNumber = index;
        const dayClasses = getDayClasses(dayNumber);
        if (dayClasses) {
          classAttr = `class="${dayClasses}"`;
        }
      }
      html += `      <td ${classAttr}>${cell}</td>\n`;
    });
    html += '    </tr>\n';
  });
  html += '  </tbody>\n';
  html += '</table>';
  
  return html;
}

export function printHTMLScheduleTable(scheduleResult: ScheduleGenerationResult, config: WorkSchedulerConfig): void {
  const htmlTable = generateHTMLScheduleTable(scheduleResult, config);
  
  // Create a complete HTML document
  const htmlDocument = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Work Schedule - ${scheduleResult.schedule.month}/${scheduleResult.schedule.year}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        table {
            border-collapse: collapse;
            margin: 0 auto;
            background-color: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        th, td {
            padding: 8px;
            text-align: center;
            border: 1px solid #ddd;
        }
        th {
            background-color: #f0f0f0;
            font-weight: bold;
        }
        .employee-name {
            font-weight: bold;
            text-align: left;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        tr:hover {
            background-color: #f0f8ff;
        }
        th.saturday, td.saturday {
            background-color: #90EE90;
            color: #006400;
        }
        th.sunday, td.sunday {
            background-color: #FFA500;
            color: #8B4513;
        }
        th.holiday, td.holiday {
            background-color: #FFB6C1;
            color: #8B008B;
        }
    </style>
</head>
<body>
    <h1>Work Schedule - ${scheduleResult.schedule.month}/${scheduleResult.schedule.year}</h1>
    ${htmlTable}
</body>
</html>`;

  // Save HTML table to file
  const fileName = `schedule-${scheduleResult.schedule.month}-${scheduleResult.schedule.year}.html`;
  const filePath = join(process.cwd(), fileName);
  writeFileSync(filePath, htmlDocument, 'utf8');

  console.log(`\n✅ HTML schedule table saved to: ${filePath}`);
}

// Helper to adapt Shift[] to MonthlySchedulePlan and print HTML
export function printHTMLFromShifts(shifts: Shift[], config: WorkSchedulerConfig, monthSchedule: MonthSchedule): void {
  // Aggregate shifts by date
  const shiftsByDate = new Map<string, { date: Date; daily: EmployeeShifts[]; night: EmployeeShifts[] }>();

  shifts.forEach(shift => {
    const key = shift.date.toISOString().slice(0, 10);
    if (!shiftsByDate.has(key)) {
      shiftsByDate.set(key, { date: shift.date, daily: [], night: [] });
    }
    const entry = shiftsByDate.get(key)!;
    const employeeShifts: EmployeeShifts[] = shift.employees.map(e => ({ employee: e.employee }));
    if (shift.night) {
      entry.night.push(...employeeShifts);
    } else {
      entry.daily.push(...employeeShifts);
    }
  });

  const daysForHtml: ScheduleDay[] = [...shiftsByDate.values()]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(entry => {
      const shift: DayShift = { dailyShift: entry.daily, nightShift: entry.night };
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

  printHTMLScheduleTable(htmlResult, config);
}
