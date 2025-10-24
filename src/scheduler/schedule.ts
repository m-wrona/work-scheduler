import type { Employee, WorkSchedulerConfig } from "../types/config";
import type { MonthSchedule } from "./calendar";
import type { EmployeeShift, Schedule, Shift } from "./model";
import type { Rule } from "./rules";
import { Rules } from "./rules";
import { newEmployeeShift, cloneShift } from "./model";


export function createSchedule(
    cfg: WorkSchedulerConfig,
    schedule: MonthSchedule,
    rule: Rule[] = Rules,
): Schedule {
    const employees: EmployeeShift[] = cfg.employees.map(e => newEmployeeShift(e));
    const shifts: Map<Date, Shift> = new Map<Date, Shift>();

    // for (const date in schedule.workingDaysList) {
    // shifts.set(date, createShift(date, employees, cfg));
    // }

    return {
        employees: employees,
        days: shifts,
        nights: shifts,
    };
}

export function nextShift(
    cfg: WorkSchedulerConfig,
    schedule: MonthSchedule,
    dayIdx: number,
    prevShifts: Shift[],
    prevEmployees: Map<string, EmployeeShift>,
    rule: Rule[] = Rules,
    maxTries: number = 10,
): Shift[] | null {
    const employees: Map<string, EmployeeShift> = new Map(
        [...prevEmployees.entries()].
            map(([key, value]) => [
                key,
                newEmployeeShift(value.employee)
            ])
    );

    return prevShifts;
}

export function createShift(
    date: Date,
    employees: Map<string, EmployeeShift>,
    cfg: WorkSchedulerConfig,
): EmployeeShift[] {

    var shift: EmployeeShift[] = [];

    for (const employee of employees.values()) {
        if (shift.length >= cfg.shifts.employeesPerShift) {
            break;
        }

        if (employee.nextNotSoonerThan === null || employee.nextNotSoonerThan >= date) {
            employee.lastDate = date;
            employee.nextNotSoonerThan = new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate() + cfg.shifts.daysFreeBetweenShifts,
            );
            employee.nextNotLaterThan = new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate() + cfg.shifts.maxDaysFreeBetweenShifts,
            );
            shift.push(employee);
        }


    }

    return shift;
}



