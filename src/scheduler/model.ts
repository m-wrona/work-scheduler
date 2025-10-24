import type { Employee } from "../types/config";

export interface Shift {
    date: Date;
    employees: EmployeeShift[];
    night: boolean;
}

export interface EmployeeShift {
    employee: Employee;
    lastDate: Date | null;
    nextNotSoonerThan: Date | null;
    nextNotLaterThan: Date | null;
    hours: number;
}

export interface Schedule {
    employees: EmployeeShift[];
    days: Map<Date, Shift>;
    nights: Map<Date, Shift>;
}

export function cloneShift(shift: Shift): Shift {
    return {
        date: shift.date,
        employees: shift.employees.map(e => cloneEmployeeShift(e)),
        night: shift.night,
    };
}

export function cloneEmployeesShift(employeeShift: EmployeeShift[]): EmployeeShift[] {
    return employeeShift.map(e => cloneEmployeeShift(e));
}

export function cloneEmployeeShift(employeeShift: EmployeeShift): EmployeeShift {
    return {
        employee: employeeShift.employee,
        lastDate: employeeShift.lastDate,
        nextNotSoonerThan: employeeShift.nextNotSoonerThan,
        nextNotLaterThan: employeeShift.nextNotLaterThan,
        hours: employeeShift.hours,
    };
}

export function newEmployeeShift(employee: Employee): EmployeeShift {
    return {
        employee: employee,
        lastDate: null,
        nextNotSoonerThan: null,
        nextNotLaterThan: null,
        hours: 0,
    };
}