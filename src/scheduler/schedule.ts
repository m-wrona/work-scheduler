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
    rules: Rule[] = Rules,
    night: boolean = false,
    maxTries: number = 10,
): Shift[] | null {
    if (dayIdx >= schedule.workingDaysList.length) {
        return prevShifts;
    }

    const date = schedule.workingDaysList[dayIdx]!

    const employees: Map<string, EmployeeShift> = new Map(
        [...prevEmployees.entries()].
            map(([key, value]) => [
                key,
                newEmployeeShift(value.employee)
            ])
    );

    planning: for (let i = 0; i < maxTries; i++) {
        const employeesShift = createShift(
            date,
            employees,
            cfg,
        )

        if (employeesShift!.length != cfg.shifts.employeesPerShift) {
            // not able to plan a shift for given state 
            break;
        }

        for (const employee of employeesShift) {
            for (const rule of rules) {
                if (!rule(employee, cfg, schedule)) {
                    continue planning;
                }
            }
        }

        const shift: Shift = {
            date: date,
            employees: employeesShift,
            night: night,
        };

        return nextShift(
            cfg,
            schedule,
            dayIdx + 1,
            [...prevShifts, shift],
            employees,
            rules,
            night,
            maxTries,
        );
    }

    return null;
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



