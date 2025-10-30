import { createShift, nextShift } from '../schedule';
import type { Employee, WorkSchedulerConfig } from '../../types/config';
import type { EmployeeShift, Shift } from '../model';
import type { MonthSchedule } from '../calendar';
import type { Rule } from '../rules';
import { newEmployeeShift } from '../model';

describe('nextShift', () => {
    let config: WorkSchedulerConfig;
    let schedule: MonthSchedule;
    let employees: Map<string, EmployeeShift>;
    let prevShifts: Shift[];
    let rules: Rule[];

    beforeEach(() => {
        const testEmployees: Employee[] = [
            { id: 1, firstName: 'John', lastName: 'Doe' },
            { id: 2, firstName: 'Jane', lastName: 'Smith' },
            { id: 3, firstName: 'Bob', lastName: 'Johnson' },
            { id: 4, firstName: 'Alice', lastName: 'Brown' },
            { id: 5, firstName: 'Charlie', lastName: 'Wilson' },
            { id: 6, firstName: 'Diana', lastName: 'Davis' },
            { id: 7, firstName: 'Eve', lastName: 'Green' },
            { id: 8, firstName: 'Frank', lastName: 'White' },
            { id: 9, firstName: 'Grace', lastName: 'Black' },
            { id: 10, firstName: 'Hank', lastName: 'Gray' },
            { id: 11, firstName: 'Ivy', lastName: 'Blue' },
            { id: 12, firstName: 'Jack', lastName: 'Purple' },
            { id: 13, firstName: 'Kate', lastName: 'Orange' },
            { id: 14, firstName: 'Liam', lastName: 'Pink' },
        ];

        config = {
            employees: testEmployees,
            workingHours: {
                defaultDailyHours: 7.58,
                units: 'hours'
            },
            shifts: {
                defaultShiftLength: 12,
                units: 'hours',
                employeesPerShift: 4,
                daysFreeBetweenShifts: 1,
                maxDaysFreeBetweenShifts: 4,
                weekendsFreeInMonth: 1,
            },
            schedule: {
                timezone: 'UTC',
                year: 2025,
                month: 9,
                holidays: [],
            }
        };

        schedule = {
            workingDaysList: [
                new Date(2025, 9, 1),
                new Date(2025, 9, 2),
                new Date(2025, 9, 3),
                new Date(2025, 9, 4),
                new Date(2025, 9, 5),
                new Date(2025, 9, 6),
                new Date(2025, 9, 7),
            ],
            month: 9,
            year: 2025,
            totalDays: 30,
            workingDays: 7,
            totalWorkingHours: 37.9,
            shiftsNumber: 3,
            holidays: [],
        };

        employees = new Map();
        testEmployees.forEach(emp => {
            employees.set(emp.id.toString(), newEmployeeShift(emp));
        });

        prevShifts = [];
        rules = []; // Empty rules for basic tests
    });

    describe('1 week schedule - no rules', () => {
        it('should create shift for 1st day', () => {
            const result = nextShift(config, schedule, 0, prevShifts, employees, rules, false, 1);

            expect(result).not.toBe(0);
            expect(result![0]?.date).toEqual(new Date(2025, 9, 1));
            expect(result![0]?.employees).toHaveLength(4);
            expect(result![0]?.night).toBe(false);

            expect(result![0]?.employees[0]?.employee.id).toBe(1);
            expect(result![0]?.employees[1]?.employee.id).toBe(2);
            expect(result![0]?.employees[2]?.employee.id).toBe(3);
            expect(result![0]?.employees[3]?.employee.id).toBe(4);
        });

        it('should create shift for 2nd day', () => {
            prevShifts = [
                {
                    date: new Date(2025, 9, 1),
                    employees: [
                        {
                            employee: employees.get('1')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                        },
                        {
                            employee: employees.get('2')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                        },
                        {
                            employee: employees.get('3')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                        },
                        {
                            employee: employees.get('4')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                        },
                    ],
                    night: false,
                },
            ]

            for (const e of prevShifts[0]!.employees) {
                employees.set(e.employee.id.toString(), e);
            }

            const dayIdx = 1;
            const result = nextShift(config, schedule, dayIdx, prevShifts, employees, rules, false, 1);

            expect(result).not.toBe(0);

            expect(result![dayIdx]?.date).toEqual(new Date(2025, 9, 2));
            expect(result![dayIdx]?.employees).toHaveLength(4);
            expect(result![dayIdx]?.night).toBe(false);

            expect(result![dayIdx]?.employees[0]?.employee.id).toBe(5);
            expect(result![dayIdx]?.employees[1]?.employee.id).toBe(6);
            expect(result![dayIdx]?.employees[2]?.employee.id).toBe(7);
            expect(result![dayIdx]?.employees[3]?.employee.id).toBe(8);
        });

        it('should add another shift in a week after min free days', () => {
            prevShifts = [
                {
                    date: new Date(2025, 9, 1),
                    employees: [
                        {
                            employee: employees.get('1')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                        },
                        {
                            employee: employees.get('2')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                        },
                        {
                            employee: employees.get('3')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                        },
                        {
                            employee: employees.get('4')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                        },
                    ],
                    night: false,
                },
            ]

            for (const e of prevShifts[0]!.employees) {
                employees.set(e.employee.id.toString(), e);
            }

            const dayIdx = 2;
            const shiftIdx = 1;
            const result = nextShift(config, schedule, dayIdx, prevShifts, employees, rules, false, 1);

            expect(result).not.toBe(0);

            expect(result![shiftIdx]?.date).toEqual(new Date(2025, 9, 3));
            expect(result![shiftIdx]?.employees).toHaveLength(4);
            expect(result![shiftIdx]?.night).toBe(false);

            expect(result![shiftIdx]?.employees[0]?.employee.id).toBe(1);
            expect(result![shiftIdx]?.employees[1]?.employee.id).toBe(2);
            expect(result![shiftIdx]?.employees[2]?.employee.id).toBe(3);
            expect(result![shiftIdx]?.employees[3]?.employee.id).toBe(4);
        });

        it('should add another shift in a week after max free days', () => {
            prevShifts = [
                {
                    date: new Date(2025, 9, 1),
                    employees: [
                        {
                            employee: employees.get('1')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                        },
                        {
                            employee: employees.get('2')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                        },
                        {
                            employee: employees.get('3')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                        },
                        {
                            employee: employees.get('4')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                        },
                    ],
                    night: false,
                },
            ]

            for (const e of prevShifts[0]!.employees) {
                employees.set(e.employee.id.toString(), e);
            }

            const dayIdx = 4;
            const shiftIdx = 1;
            const result = nextShift(config, schedule, dayIdx, prevShifts, employees, rules, false, 1);

            expect(result).not.toBe(0);

            expect(result![shiftIdx]?.date).toEqual(new Date(2025, 9, 5));
            expect(result![shiftIdx]?.employees).toHaveLength(4);
            expect(result![shiftIdx]?.night).toBe(false);

            expect(result![shiftIdx]?.employees[0]?.employee.id).toBe(1);
            expect(result![shiftIdx]?.employees[1]?.employee.id).toBe(2);
            expect(result![shiftIdx]?.employees[2]?.employee.id).toBe(3);
            expect(result![shiftIdx]?.employees[3]?.employee.id).toBe(4);
        });

        it('should create night shift after day shift if possible', () => {
            prevShifts = [
                {
                    date: new Date(2025, 9, 1),
                    employees: [
                        {
                            employee: employees.get('1')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 1),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                        },
                        {
                            employee: employees.get('2')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 2),
                            nextNotLaterThan: new Date(2025, 9, 6),
                            hours: 7.58,
                        },
                        {
                            employee: employees.get('3')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                        },
                        {
                            employee: employees.get('4')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                        },
                    ],
                    night: false,
                },
            ]

            for (const e of prevShifts[0]!.employees) {
                employees.set(e.employee.id.toString(), e);
            }

            const dayIdx = 1;
            const shiftIdx = 1;
            const result = nextShift(config, schedule, dayIdx, prevShifts, employees, rules, true, 1);

            expect(result).not.toBe(0);

            expect(result![shiftIdx]?.date).toEqual(new Date(2025, 9, 2));
            expect(result![shiftIdx]?.employees).toHaveLength(4);
            expect(result![shiftIdx]?.night).toBe(true);

            expect(result![shiftIdx]?.employees[0]?.employee.id).toBe(1);
            expect(result![shiftIdx]?.employees[1]?.employee.id).toBe(2);
            expect(result![shiftIdx]?.employees[2]?.employee.id).toBe(3);
            expect(result![shiftIdx]?.employees[3]?.employee.id).toBe(4);
        });

        it('should create night shift with free days in between', () => {
            prevShifts = [
                {
                    date: new Date(2025, 9, 1),
                    employees: [
                        {
                            employee: employees.get('1')!.employee,
                            lastDate: new Date(2025, 9, 2),
                            nextNotSoonerThan: new Date(2025, 9, 4),
                            nextNotLaterThan: new Date(2025, 9, 6),
                            hours: 7.58,
                        },
                        {
                            employee: employees.get('2')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                        },
                        {
                            employee: employees.get('3')!.employee,
                            lastDate: new Date(2025, 9, 2),
                            nextNotSoonerThan: new Date(2025, 9, 4),
                            nextNotLaterThan: new Date(2025, 9, 6),
                            hours: 7.58,
                        },
                        {
                            employee: employees.get('4')!.employee,
                            lastDate: new Date(2025, 9, 3),
                            nextNotSoonerThan: new Date(2025, 9, 5),
                            nextNotLaterThan: new Date(2025, 9, 7),
                            hours: 7.58,
                        },
                    ],
                    night: false,
                },
            ]

            for (const e of prevShifts[0]!.employees) {
                employees.set(e.employee.id.toString(), e);
            }

            const dayIdx = 2;
            const shiftIdx = 1;
            const result = nextShift(config, schedule, dayIdx, prevShifts, employees, rules, true, 1);

            expect(result![shiftIdx]?.date).toEqual(new Date(2025, 9, 3));
            expect(result![shiftIdx]?.employees).toHaveLength(4);
            expect(result![shiftIdx]?.night).toBe(true);

            expect(result![shiftIdx]?.employees[0]?.employee.id).toBe(2);
            expect(result![shiftIdx]?.employees[1]?.employee.id).toBe(1);
            expect(result![shiftIdx]?.employees[2]?.employee.id).toBe(3);
            expect(result![shiftIdx]?.employees[3]?.employee.id).toBe(5);
        });

        it('should create day and night shift for 1st day', () => {
            const result = nextShift(config, schedule, 0, prevShifts, employees, rules, false, 1);

            const dayIdx = 0;
            expect(result).toHaveLength(14);

            expect(result![dayIdx]?.date).toEqual(new Date(2025, 9, 1));
            expect(result![dayIdx]?.employees).toHaveLength(4);
            expect(result![dayIdx]?.night).toBe(false);

            expect(result![dayIdx]?.employees[0]?.employee.id).toBe(1);
            expect(result![dayIdx]?.employees[1]?.employee.id).toBe(2);
            expect(result![dayIdx]?.employees[2]?.employee.id).toBe(3);
            expect(result![dayIdx]?.employees[3]?.employee.id).toBe(4);

            const nightIdx = 1;
            expect(result![nightIdx]?.date).toEqual(new Date(2025, 9, 1));
            expect(result![nightIdx]?.employees).toHaveLength(4);
            expect(result![nightIdx]?.night).toBe(true);
nightIdx
            expect(result![nightIdx]?.employees[0]?.employee.id).toBe(1);
            expect(result![nightIdx]?.employees[1]?.employee.id).toBe(2);
            expect(result![nightIdx]?.employees[2]?.employee.id).toBe(3);
            expect(result![nightIdx]?.employees[3]?.employee.id).toBe(4);
        });

    });

});
