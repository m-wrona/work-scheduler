import type { WorkSchedulerConfig } from './types/config';
import { parseHolidayDate } from './types/config';
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
    // Use UTC to match how dates are stored in the schedule
    const date = new Date(Date.UTC(year, month - 1, dayNumber));
    const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
    
    // Check if this date is a holiday by comparing with parsed holiday dates
    const dateString = date.toISOString().slice(0, 10);
    const isHoliday = config.schedule.holidays.some(holidayStr => {
      const holidayDate = parseHolidayDate(holidayStr, year);
      if (!holidayDate) return false;
      
      // Also check if the holiday might be in a different month/year within the schedule range
      // Check with current year
      const holidayDateString = holidayDate.toISOString().slice(0, 10);
      if (holidayDateString === dateString) return true;
      
      // Check with next year (for schedules spanning year boundary)
      const nextYearHoliday = parseHolidayDate(holidayStr, year + 1);
      if (nextYearHoliday && nextYearHoliday.toISOString().slice(0, 10) === dateString) return true;
      
      return false;
    });
    
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
  const headerRow: (string | { value: string; classes: string })[] = ['Name', ...dayNumbers.map(d => ({ value: d.toString(), classes: getDayClasses(d) })), 'Total Hours'];
  
  // Create employee schedule data
  const employeeSchedules = config.employees.map((emp, index) => {
    const employeeName = `${index + 1}. ${emp.firstName} ${emp.lastName}`;
    const dayShifts = new Array(daysInMonth).fill('');
    let shiftCount = 0;
    
    // Fill in the shifts for each day
    schedule.days.forEach(day => {
      // Use UTC methods to match how dates are stored
      const dayNumber = day.date.getUTCDate();
      const dayIndex = dayNumber - 1;
      
      // Check if employee is in daily shift
      const isInDailyShift = day.shift.dailyShift.some(shift => shift.employee.id === emp.id);
      // Check if employee is in night shift  
      const isInNightShift = day.shift.nightShift.some(shift => shift.employee.id === emp.id);
      
      if (isInDailyShift) {
        dayShifts[dayIndex] = 'D';
        shiftCount++;
      } else if (isInNightShift) {
        dayShifts[dayIndex] = 'N';
        shiftCount++;
      }
    });
    
    // Calculate total hours (shift count * shift length)
    const totalHours = (shiftCount * config.shifts.defaultShiftLength).toFixed(2);
    
    return [employeeName, ...dayShifts, totalHours];
  });
  
  // Generate HTML table
  let html = '<table>\n';
  
  // Header row
  html += '  <thead>\n    <tr>\n';
  headerRow.forEach((cell, index) => {
    if (index === 0) {
      html += `      <th>${cell}</th>\n`;
    } else if (typeof cell === 'string') {
      // Last column (Total Hours)
      html += `      <th class="total-hours-header">${cell}</th>\n`;
    } else {
      const cellData = cell as { value: string; classes: string };
      const classAttr = cellData.classes ? ` class="${cellData.classes}"` : '';
      html += `      <th${classAttr}>${cellData.value}</th>\n`;
    }
  });
  html += '    </tr>\n  </thead>\n';
  
  // Data rows
  html += '  <tbody>\n';
  const totalHoursColumnIndex = daysInMonth + 1; // Name column + all day columns
  employeeSchedules.forEach(row => {
    html += '    <tr>\n';
    row.forEach((cell, index) => {
      let classAttr = '';
      if (index === 0) {
        classAttr = 'class="employee-name"';
      } else if (index === totalHoursColumnIndex) {
        // Last column (Total Hours)
        classAttr = 'class="total-hours"';
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
        .total-hours-header {
            background-color: #4a90e2;
            color: white;
            font-weight: bold;
        }
        .total-hours {
            background-color: #e8f4f8;
            font-weight: bold;
            color: #2c3e50;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        tr:nth-child(even) .total-hours {
            background-color: #d4e9f0;
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
  // Group shifts by month/year (supports ranges spanning two months)
  const shiftsByMonth = new Map<string, Shift[]>();
  for (const s of shifts) {
    // Use UTC methods to match how dates are stored
    const y = s.date.getUTCFullYear();
    const m = s.date.getUTCMonth() + 1; // 1-12
    const key = `${y}-${m}`;
    if (!shiftsByMonth.has(key)) shiftsByMonth.set(key, []);
    shiftsByMonth.get(key)!.push(s);
  }

  // For each month, aggregate per-day and prepare table HTML
  const monthlySections: { year: number; month: number; tableHtml: string; summaryHtml: string }[] = [];
  for (const [, monthShifts] of shiftsByMonth) {
    // Aggregate shifts by date within this month
    const perDay = new Map<string, { date: Date; daily: EmployeeShifts[]; night: EmployeeShifts[] }>();
    for (const shift of monthShifts) {
      const dateKey = shift.date.toISOString().slice(0, 10);
      if (!perDay.has(dateKey)) {
        perDay.set(dateKey, { date: shift.date, daily: [], night: [] });
      }
      const entry = perDay.get(dateKey)!;
      const employeeShifts: EmployeeShifts[] = shift.employees.map(e => ({ employee: e.employee }));
      if (shift.night) {
        entry.night.push(...employeeShifts);
      } else {
        entry.daily.push(...employeeShifts);
      }
    }

    const daysForHtml: ScheduleDay[] = [...perDay.values()]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(entry => {
        const shift: DayShift = { dailyShift: entry.daily, nightShift: entry.night };
        return {
          date: entry.date,
          weekDay: entry.date.getUTCDay(), // Use UTC to match date storage
          shift,
        } as ScheduleDay;
      });

    const sampleDate = monthShifts[0]!.date;
    // Use UTC methods to match how dates are stored
    const month = sampleDate.getUTCMonth() + 1;
    const year = sampleDate.getUTCFullYear();
    const monthlyPlan: MonthlySchedulePlan = {
      month,
      year,
      days: daysForHtml,
    };

    const htmlResult: ScheduleGenerationResult = {
      schedule: monthlyPlan,
      warnings: [],
      errors: [],
    };

    const tableHtml = generateHTMLScheduleTable(htmlResult, config);
    
    // Find matching month stats from monthlyBreakdown
    const monthStats = monthSchedule.monthlyBreakdown.find(
      stats => stats.month === month && stats.year === year
    );
    
    // Generate summary HTML for this month using monthStats
    const summaryHtml = monthStats ? `
      <div class="summary">
        <div class="summary-item"><span class="summary-label">Working days (Mon-Fri):</span> ${monthStats.workingDays}</div>
        <div class="summary-item"><span class="summary-label">Holidays:</span> ${monthStats.holidays.length > 0 ? monthStats.holidays.map(h => h.toString()).join(', ') : 'None'}</div>
        <div class="summary-item"><span class="summary-label">Total working hours:</span> ${monthStats.totalWorkingHours} hours</div>
        <div class="summary-item"><span class="summary-label">Shifts number:</span> ${monthStats.shiftsNumber}</div>
        <div class="summary-item"><span class="summary-label">1st day of schedule:</span> ${monthStats.workingDaysList[0]?.toISOString() || 'N/A'}</div>
        <div class="summary-item"><span class="summary-label">Last day of schedule:</span> ${monthStats.workingDaysList[monthStats.workingDaysList.length - 1]?.toISOString() || 'N/A'}</div>
      </div>
    ` : `
      <div class="summary">
        <div class="summary-item"><span class="summary-label">Warning:</span> Month statistics not found</div>
      </div>
    `;
    
    monthlySections.push({ year: monthlyPlan.year, month: monthlyPlan.month, tableHtml, summaryHtml });
  }

  // Sort sections chronologically
  monthlySections.sort((a, b) => a.year - b.year || a.month - b.month);

  // Build a single HTML document containing all monthly tables
  const first = monthlySections[0];
  const last = monthlySections[monthlySections.length - 1];
  const titleRange = first && last
    ? `${first.month}/${first.year} - ${last.month}/${last.year}`
    : `${monthSchedule.month}/${monthSchedule.year}`;

  const combinedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Work Schedule - ${titleRange}</title>
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
        h2 {
            color: #333;
            text-align: center;
            margin: 30px 0 10px 0;
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
        .total-hours-header {
            background-color: #4a90e2;
            color: white;
            font-weight: bold;
        }
        .total-hours {
            background-color: #e8f4f8;
            font-weight: bold;
            color: #2c3e50;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        tr:nth-child(even) .total-hours {
            background-color: #d4e9f0;
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
        .summary {
            background-color: white;
            padding: 20px;
            margin: 0 auto 30px auto;
            max-width: 800px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-radius: 5px;
        }
        .summary-item {
            margin: 10px 0;
            font-size: 14px;
        }
        .summary-label {
            font-weight: bold;
            color: #555;
        }
    </style>
  </head>
  <body>
    <h1>Work Schedule - ${titleRange}</h1>
    ${monthlySections.map(s => `
      <h2>${s.month}/${s.year}</h2>
      ${s.summaryHtml}
      ${s.tableHtml}
    `).join('\n')}
  </body>
  </html>`;

  const outName = first && last
    ? `schedule-${first.month}-${first.year}_to_${last.month}-${last.year}.html`
    : `schedule-${monthSchedule.month}-${monthSchedule.year}.html`;
  const outPath = join(process.cwd(), outName);
  writeFileSync(outPath, combinedHtml, 'utf8');
  console.log(`\n✅ HTML schedule table saved to: ${outPath}`);
}
