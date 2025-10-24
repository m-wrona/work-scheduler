import type { WorkSchedulerConfig } from "../types/config";
import type { MonthSchedule } from "./calendar";
import type { EmployeeShift } from "./model";

export type Rule = (
    employeeShift: EmployeeShift,
    cfg: WorkSchedulerConfig,
    schedule: MonthSchedule,
) => boolean;

export const Rules: Rule[] = [
    workingHoursWithinLimits,
];

export function workingHoursWithinLimits(employeeShift: EmployeeShift, cfg: WorkSchedulerConfig, schedule: MonthSchedule): boolean {
    return employeeShift.hours <= schedule.totalWorkingHours;
}
