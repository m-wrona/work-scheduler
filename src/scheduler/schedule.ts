import type { WorkSchedulerConfig } from "../types/config";
import type { MonthSchedule } from "./calendar";
import type { EmployeeShift, Schedule, Shift } from "./model";
import type { Rule } from "./rules";
import { Rules } from "./rules";
import { cloneEmployeeShift } from "./model";


export function nextShift(
    cfg: WorkSchedulerConfig,
    schedule: MonthSchedule,
    dayIdx: number,
    prevShifts: Shift[],
    employeeShifts: Map<string, EmployeeShift>,
    rules: Rule[] = Rules,
    night: boolean = false,
    maxTries: number = 1,
    shuffle: boolean = true,
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
        let employeeOrder = sortEmployeeShifts(employeeShifts, night, shuffle);
        const shiftEmployees = createShift(
            date,
            employeeOrder,
            cfg,
            schedule,
            rules,
            night,
        )

        if (shiftEmployees == null) {
            // not able to plan a shift for given state 
            // employeeOrder = shuffleArray(employeeOrder);
            continue planning;
        }

        for (const e of shiftEmployees) {
            nextEmployeeShifts.set(e.employee.id.toString(), e);
        }

        const shift: Shift = {
            date: date,
            employees: shiftEmployees,
            night: night,
        };

        const nextEmployeeShift = nextShift(
            cfg,
            schedule,
            night ? dayIdx + 1 : dayIdx,
            [...prevShifts, shift],
            nextEmployeeShifts,
            rules,
            !night,
            maxTries,
        );

        if (nextEmployeeShift !== null) {
            return nextEmployeeShift;
        }
    }

    return null;
}

export function createShift(
    date: Date,
    employeeOrder: EmployeeShift[],
    cfg: WorkSchedulerConfig,
    schedule: MonthSchedule,
    rules: Rule[],
    night: boolean,
): EmployeeShift[] | null {
    const shift: EmployeeShift[] = [];

    for (const employeeShift of employeeOrder) {
        if (shift.length >= cfg.shifts.employeesPerShift) {
            return shift;
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
        e.hoursPerMonth.set(date.getMonth(), (e.hoursPerMonth.get(date.getMonth()) || 0) + cfg.shifts.defaultShiftLength);
        e.lastShiftNight = night;
        e.shiftPattern.push(night);

        const ruleOK = rules.every(rule => rule(e, cfg, schedule, date, night));
        if (ruleOK) {
            shift.push(e);
        }

    }

    return null;
}

export function sortEmployeeShifts(employeeShifts: Map<string, EmployeeShift>, night: boolean, shuffle: boolean = false): EmployeeShift[] {
    let remaining = [...employeeShifts.values()];
    let order: EmployeeShift[] = [];

    if (night) {
        order.push(...remaining.filter(e => e.lastDate !== null));
        remaining = remaining.filter(e => e.lastDate === null);
    } else {
        order.push(...remaining.filter(e => e.lastDate === null));
        remaining = remaining.filter(e => e.lastDate !== null);
    }

    if (shuffle) {
        order = shuffleArray(order);
    } else {
        order = order.sort(workingHoursComparator);
    }
    order.push(...remaining.sort(workingHoursComparator));

    return order;
}

export function isAvailable(employeeShift: EmployeeShift, date: Date, night: boolean): boolean {
    if (night && employeeShift.lastDate !== null && !employeeShift.lastShiftNight) {
        const nextDay = new Date(employeeShift.lastDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const normalizedNextDay = new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate());

        if (normalizedDate.getTime() === normalizedNextDay.getTime()) {
            return true;
        }
    }

    if (employeeShift.nextNotSoonerThan !== null) {
        const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const normalizedNotSoonerThan = new Date(
            date.getFullYear(),
            employeeShift.nextNotSoonerThan.getMonth(),
            employeeShift.nextNotSoonerThan.getDate()
        );

        return normalizedDate >= normalizedNotSoonerThan;
    }

    return true;
}

export function workingHoursComparator(a: EmployeeShift, b: EmployeeShift): number {
    if (a.hours !== null && b.hours !== null) {
        if (a.hours === b.hours) {
            return lastDateComparator(a, b);
        }
        return a.hours - b.hours;
    }
    if (a.hours !== null && b.hours === null) {
        return -1;
    }
    return 1;
}

export function lastDateComparator(a: EmployeeShift, b: EmployeeShift): number {
    if (a.lastDate !== null && b.lastDate !== null) {
        return a.lastDate.getTime() - b.lastDate.getTime();
    }
    if (a.lastDate !== null && b.lastDate === null) {
        return -1;
    }
    return 1;
}

/**
 * Shuffles an array using the Fisher-Yates algorithm.
 * Returns a new array, leaving the original unchanged.
 */
export function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffled[i]!;
        shuffled[i] = shuffled[j]!;
        shuffled[j] = temp;
    }
    return shuffled;
}
