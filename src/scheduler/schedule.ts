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
    maxTries: number = 20,
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

    let employeeOrder = sortEmployeeShifts(employeeShifts, night);
    planning: for (let i = 0; i < maxTries; i++) {
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
            employeeOrder = shuffleArray(employeeOrder);
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

    return prevShifts;
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

export function sortEmployeeShifts(employeeShifts: Map<string, EmployeeShift>, night: boolean): EmployeeShift[] {
    let remaining = [...employeeShifts.values()];
    const order: EmployeeShift[] = [];

    if (!night) {
        order.push(...remaining.filter(e => e.lastDate === null));
        remaining = remaining.filter(e => e.lastDate !== null);
    }

    order.push(...remaining.sort(workingHoursComparator));

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

export function workingHoursComparator(a: EmployeeShift, b: EmployeeShift): number {
    if (a.hours !== null && b.hours !== null) {
        return a.hours - b.hours;
    }
    if (a.hours !== null && b.hours === null) {
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
