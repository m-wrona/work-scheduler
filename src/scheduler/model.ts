import type { Employee } from "../types/config";

export interface Shift {
    date: Date;
    employees: EmployeeShift[];
    night: boolean;
}

export interface EmployeeShift {
    employee: Employee;
    lastDate: Date | null;
    lastShiftNight: boolean;
    nextNotSoonerThan: Date | null;
    nextNotLaterThan: Date | null;
    hours: number;
    hoursPerMonth : Map<number, number>;
    shiftPattern: boolean[];
}

export interface Schedule {
    employees: EmployeeShift[];
    days: Map<Date, Shift>;
    nights: Map<Date, Shift>;
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
        lastShiftNight: employeeShift.lastShiftNight,
        shiftPattern: [...employeeShift.shiftPattern],
        hoursPerMonth: new Map(employeeShift.hoursPerMonth),
    };  
}

export function newEmployeeShift(employee: Employee): EmployeeShift {
    return {
        employee: employee,
        lastDate: null,
        nextNotSoonerThan: null,
        nextNotLaterThan: null,
        hours: 0,
        lastShiftNight: false,
        shiftPattern: [],
        hoursPerMonth: new Map(),
    };
}
