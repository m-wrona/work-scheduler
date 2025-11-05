import type { WorkSchedulerConfig } from "../types/config";
import { getEmployeeMonthStats, type MonthSchedule } from "./calendar";
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
    nextShiftIsNotLaterThan,
    noShiftInHolidays,
    shiftPattern,
];

export function workingHoursWithinLimits(
    employeeShift: EmployeeShift,
    cfg: WorkSchedulerConfig,
    schedule: MonthSchedule,
    day: Date,
    night: boolean,
): boolean {
    const monthKey = day.getUTCMonth(); // 0-11 for hoursPerMonth map key
    const hoursPerMonth = employeeShift.hoursPerMonth.get(monthKey) || 0;

    const employeeSchedule = getEmployeeMonthStats(
        schedule,
        day.getUTCMonth() + 1,
        day.getUTCFullYear(),
        employeeShift.employee.id,
    )!;

    if (employeeSchedule.holidays.length > 0) {
        return hoursPerMonth <= employeeSchedule.totalWorkingHours;
    }

    return hoursPerMonth <= employeeSchedule.totalWorkingHours + cfg.shifts.defaultShiftLength;
}

export function noShiftInHolidays(
    employeeShift: EmployeeShift,
    cfg: WorkSchedulerConfig,
    schedule: MonthSchedule,
    day: Date,
    night: boolean,
): boolean {
    const employeeSchedule = getEmployeeMonthStats(
        schedule,
        day.getUTCMonth() + 1,
        day.getUTCFullYear(),
        employeeShift.employee.id,
    )!;

    return !employeeSchedule.holidays.some(h => h.getTime() === day.getTime());
}

export function nextShiftIsNotLaterThan(
    employeeShift: EmployeeShift,
    cfg: WorkSchedulerConfig,
    schedule: MonthSchedule,
    day: Date,
    night: boolean,
): boolean {
    if (employeeShift.nextNotLaterThan === null) {
        return true;
    }

    const dayNormalized = new Date(Date.UTC(
        day.getUTCFullYear(),
        day.getUTCMonth(),
        day.getUTCDate()
    ));
    const notLaterDate = new Date(Date.UTC(
        employeeShift.nextNotLaterThan.getUTCFullYear(),
        employeeShift.nextNotLaterThan.getUTCMonth(),
        employeeShift.nextNotLaterThan.getUTCDate()
    ));

    return dayNormalized.getTime() < notLaterDate.getTime();
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
