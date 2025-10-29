import type { Employee, WorkSchedulerConfig } from "../types/config";
import type { MonthSchedule } from "./calendar";
import type { EmployeeShift, Schedule, Shift } from "./model";
import type { Rule } from "./rules";
import { Rules } from "./rules";
import { newEmployeeShift, cloneEmployeeShift } from "./model";


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
    employeeShifts: Map<string, EmployeeShift>,
    rules: Rule[] = Rules,
    night: boolean = false,
    maxTries: number = 10,
): Shift[] | null {
    if (dayIdx >= schedule.workingDaysList.length) {
        return prevShifts;
    }

    const date = schedule.workingDaysList[dayIdx]!
    const nextEmployeeShifts: Map<string, EmployeeShift> = new Map(
        [...employeeShifts.entries()].
            map(([key, value]) => [
                key,
                cloneEmployeeShift(value)
            ])
    );

    planning: for (let i = 0; i < maxTries; i++) {
        const availEmployees = createShift(
            date,
            employeeShifts,
            cfg,
            schedule,
            rules,
            false,
        )

        if (availEmployees!.length != cfg.shifts.employeesPerShift) {
            // not able to plan a shift for given state 
            break;
        }

        for (const e of availEmployees) {
            for (const rule of rules) {
                if (!rule(e, cfg, schedule)) {
                    continue planning;
                }
            }
        }

        for (const e of availEmployees) {
            nextEmployeeShifts.set(e.employee.id.toString(), e);
        }

        const shift: Shift = {
            date: date,
            employees: availEmployees,
            night: night,
        };

        return nextShift(
            cfg,
            schedule,
            dayIdx + 1,
            [...prevShifts, shift],
            nextEmployeeShifts,
            rules,
            night,
            maxTries,
        );
    }

    return null;
}

export function createShift(
    date: Date,
    employeeShifts: Map<string, EmployeeShift>,
    cfg: WorkSchedulerConfig,
    schedule: MonthSchedule,
    rules: Rule[],
    night: boolean,
): EmployeeShift[] {

    var shift: EmployeeShift[] = [];

    const employeeOrder = sortEmployeeShifts(employeeShifts, night);

    for (const employeeShift of employeeOrder) {
        if (shift.length >= cfg.shifts.employeesPerShift) {
            break;
        }

        const available = employeeShift.nextNotSoonerThan === null || date >= employeeShift.nextNotSoonerThan
        if (!available) {
            continue;
        }

        const e = cloneEmployeeShift(employeeShift);
        e.lastDate = date;
        e.nextNotSoonerThan = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate() + cfg.shifts.daysFreeBetweenShifts + 1,
        );
        e.nextNotLaterThan = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate() + cfg.shifts.maxDaysFreeBetweenShifts,
        );
        e.hours += cfg.shifts.defaultShiftLength;

        const ruleOK = rules.every(rule => rule(employeeShift, cfg, schedule));
        if (ruleOK) {
            shift.push(employeeShift);
        }

    }

    return shift;
}

export function sortEmployeeShifts(employeeShifts: Map<string, EmployeeShift>, night: boolean): EmployeeShift[] {
    if (!night) {
        return [...employeeShifts.values()];
    }
    
    return [...employeeShifts.values()].
        sort((a: EmployeeShift, b: EmployeeShift) =>
            a.nextNotSoonerThan === null && b.nextNotSoonerThan === null ? 0 :
                a.nextNotSoonerThan === null ? 1 :
                    b.nextNotSoonerThan === null ? -1 :
                        a.nextNotSoonerThan.getTime() - b.nextNotSoonerThan.getTime()
        );
}

