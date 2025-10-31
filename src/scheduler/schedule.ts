import type { Employee, WorkSchedulerConfig } from "../types/config";
import type { MonthSchedule } from "./calendar";
import type { EmployeeShift, Schedule, Shift } from "./model";
import type { Rule } from "./rules";
import { Rules } from "./rules";
import { newEmployeeShift, cloneEmployeeShift } from "./model";


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
        const shiftEmployees = createShift(
            date,
            employeeShifts,
            cfg,
            schedule,
            rules,
            night,
        )

        if (shiftEmployees!.length != cfg.shifts.employeesPerShift) {
            // not able to plan a shift for given state 
            // break;
        }

        for (const e of shiftEmployees) {
            nextEmployeeShifts.set(e.employee.id.toString(), e);
        }

        const shift: Shift = {
            date: date,
            employees: shiftEmployees,
            night: night,
        };

        return nextShift(
            cfg,
            schedule,
            night ? dayIdx + 1 : dayIdx,
            [...prevShifts, shift],
            nextEmployeeShifts,
            rules,
            !night,
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

        if (!isAvailable(employeeShift, date, night)) {
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
        e.lastShiftNight = night;

        const ruleOK = rules.every(rule => rule(employeeShift, cfg, schedule, date, night));
        if (ruleOK) {
            shift.push(e);
        }

    }

    return shift;
}

export function sortEmployeeShifts(employeeShifts: Map<string, EmployeeShift>, night: boolean): EmployeeShift[] {
    let remaining = [...employeeShifts.values()];
    const order: EmployeeShift[] = [];

    // if (night) {
    //     order.push(
    //         ...remaining
    //             .filter(e => e.lastShiftNight)
    //             .sort(nightEmployeeShiftComparator)
    //     );
    //     remaining = remaining.filter(e => !order.includes(e));
    // }

    if (!night) {
        order.push(...remaining.filter(e => e.lastDate === null));
        remaining = remaining.filter(e => e.lastDate !== null);
    }
    
    order.push(...remaining.sort(lastDateShiftComparator));
    
    return order;
}

export function isAvailable(employeeShift: EmployeeShift, date: Date, night: boolean): boolean {
    if (night && employeeShift.lastDate !== null && !employeeShift.lastShiftNight) {
        const nextDay = new Date(employeeShift.lastDate);
        nextDay.setDate(nextDay.getDate() + 1);
        if (date.getTime() === nextDay.getTime()) {
            return true;
        }
    }

    return employeeShift.nextNotSoonerThan === null || date >= employeeShift.nextNotSoonerThan;
}

export function nightEmployeeShiftComparator(a: EmployeeShift, b: EmployeeShift): number {
    if (a.nextNotSoonerThan !== null && b.nextNotSoonerThan !== null) {
        return a.nextNotSoonerThan.getTime() - b.nextNotSoonerThan.getTime();
    }
    return dailyEmployeeShiftComparator(a, b);
}

export function lastDateShiftComparator(a: EmployeeShift, b: EmployeeShift): number {
    if (a.lastDate !== null && b.lastDate !== null) {
        return a.lastDate.getTime() - b.lastDate.getTime();
    }
    if (a.lastDate !== null && b.lastDate === null) {
        return -1;
    }
    return 1;
}

export function dailyEmployeeShiftComparator(a: EmployeeShift, b: EmployeeShift): number {
    // nextNotLaterThan is the most important criterion, so we sort by it first
    if (a.nextNotLaterThan !== null && b.nextNotLaterThan !== null) {
        return a.nextNotLaterThan.getTime() - b.nextNotLaterThan.getTime();
    }
    if (a.nextNotLaterThan !== null && b.nextNotLaterThan === null) {
        return -1;
    }
    if (a.nextNotLaterThan === null && b.nextNotLaterThan !== null) {
        return 1;
    }

    if (a.nextNotSoonerThan === null && b.nextNotSoonerThan === null) {
        return 0;
    }
    if (a.nextNotSoonerThan !== null && b.nextNotSoonerThan === null) {
        return -1;
    }
    if (a.nextNotSoonerThan === null && b.nextNotSoonerThan !== null) {
        return 1;
    }
    return a.nextNotSoonerThan!.getTime() - b.nextNotSoonerThan!.getTime();
}



