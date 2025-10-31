import type { WorkSchedulerConfig } from "../types/config";
import type { MonthSchedule } from "./calendar";
import type { EmployeeShift } from "./model";

export type Rule = (
    employeeShift: EmployeeShift,
    cfg: WorkSchedulerConfig,
    schedule: MonthSchedule,
    day: Date,
    night: boolean,
) => boolean;

export const Rules: Rule[] = [
    workingHoursWithinLimits,
    shiftPattern,
];

export function workingHoursWithinLimits(
    employeeShift: EmployeeShift,
    cfg: WorkSchedulerConfig,
    schedule: MonthSchedule,
    day: Date,
    night: boolean,
): boolean {
    const monthIndex = day.getMonth() + 1;
    const year = day.getUTCFullYear();
    const hoursPerMonth = employeeShift.hoursPerMonth.get(day.getMonth()) || 0;
    const monthStats = schedule.monthlyBreakdown.find(m => m.month === monthIndex && m.year === year);

    return hoursPerMonth <= monthStats!.totalWorkingHours &&
        employeeShift.hours <= schedule.totalWorkingHours;
}

export function shiftPattern(
    employeeShift: EmployeeShift,
    cfg: WorkSchedulerConfig,
    schedule: MonthSchedule,
    day: Date,
    night: boolean,
): boolean {
    const patternLength = 3;

    if (employeeShift.shiftPattern.length < patternLength) {
        return true;
    }

    let lastShift = employeeShift.shiftPattern[0];
    let pattern = 0;


    for (const shift of employeeShift.shiftPattern) {
        if (pattern >= patternLength) {
            // more than 2 shifts of the same type in a row (i.e. DDD or NNN)
            break;
        }

        if (lastShift == shift) {
            pattern++;
        } else {
            pattern = 1;
            lastShift = shift;
        }
    }

    return pattern < patternLength;
}
