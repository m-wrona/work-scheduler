import { createShift, nextShift } from '../schedule';
import type { Employee, WorkSchedulerConfig } from '../../types/config';
import type { EmployeeShift, Shift } from '../model';
import type { MonthSchedule } from '../calendar';
import { workingHoursWithinLimits, type Rule } from '../rules';
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
            { id: 15, firstName: 'Mia', lastName: 'Yellow' },
            { id: 16, firstName: 'Noah', lastName: 'Brown' },
            { id: 17, firstName: 'Olivia', lastName: 'Green' },
            { id: 18, firstName: 'Paul', lastName: 'White' },
            { id: 19, firstName: 'Quinn', lastName: 'Black' },
            { id: 20, firstName: 'Ryan', lastName: 'Gray' },
            { id: 21, firstName: 'Sarah', lastName: 'Blue' },
            { id: 22, firstName: 'Thomas', lastName: 'Purple' },
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

        it('should update employees shift data after planning a shift', () => {
            const result = nextShift(config, schedule, 0, prevShifts, employees, rules, false, 1);

            expect(result).not.toBe(0);
            expect(result![0]?.date).toEqual(new Date(2025, 9, 1));
            expect(result![0]?.employees).toHaveLength(4);
            expect(result![0]?.night).toBe(false);

            const employeeShift = result![0]?.employees[0]!;
            expect(employeeShift.employee.id).toBe(1);
            expect(employeeShift.hours).toBe(12);
            expect(employeeShift.lastDate).toEqual(new Date(2025, 9, 1));
            expect(employeeShift.nextNotSoonerThan).toEqual(new Date(2025, 9, 3));
            expect(employeeShift.nextNotLaterThan).toEqual(new Date(2025, 9, 5));
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
                            lastShiftNight: false,
                        },
                        {
                            employee: employees.get('2')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                            lastShiftNight: false,
                        },
                        {
                            employee: employees.get('3')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                            lastShiftNight: false,
                        },
                        {
                            employee: employees.get('4')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                            lastShiftNight: false,
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
                            lastShiftNight: false,
                        },
                        {
                            employee: employees.get('2')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                            lastShiftNight: false,
                        },
                        {
                            employee: employees.get('3')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                            lastShiftNight: false,
                        },
                        {
                            employee: employees.get('4')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                            lastShiftNight: false,
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
                            lastShiftNight: false,
                        },
                        {
                            employee: employees.get('2')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                            lastShiftNight: false,
                        },
                        {
                            employee: employees.get('3')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                            lastShiftNight: false,
                        },
                        {
                            employee: employees.get('4')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                            lastShiftNight: false,
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
                            lastShiftNight: false,
                        },
                        {
                            employee: employees.get('2')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 2),
                            nextNotLaterThan: new Date(2025, 9, 6),
                            hours: 7.58,
                            lastShiftNight: false,
                        },
                        {
                            employee: employees.get('3')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                            lastShiftNight: false,
                        },
                        {
                            employee: employees.get('4')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                            lastShiftNight: false,
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
                            lastShiftNight: false,
                        },
                        {
                            employee: employees.get('2')!.employee,
                            lastDate: new Date(2025, 9, 1),
                            nextNotSoonerThan: new Date(2025, 9, 3),
                            nextNotLaterThan: new Date(2025, 9, 5),
                            hours: 7.58,
                            lastShiftNight: false,
                        },
                        {
                            employee: employees.get('3')!.employee,
                            lastDate: new Date(2025, 9, 2),
                            nextNotSoonerThan: new Date(2025, 9, 4),
                            nextNotLaterThan: new Date(2025, 9, 6),
                            hours: 7.58,
                            lastShiftNight: false,
                        },
                        {
                            employee: employees.get('4')!.employee,
                            lastDate: new Date(2025, 9, 3),
                            nextNotSoonerThan: new Date(2025, 9, 5),
                            nextNotLaterThan: new Date(2025, 9, 7),
                            hours: 7.58,
                            lastShiftNight: false,
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

            expect(result).toHaveLength(14);

            // 1st day
            expect(result![0]?.date).toEqual(new Date(2025, 9, 1));
            expect(result![0]?.employees).toHaveLength(4);
            expect(result![0]?.night).toBe(false);

            expect(result![0]?.employees[0]?.employee.id).toBe(1);
            expect(result![0]?.employees[1]?.employee.id).toBe(2);
            expect(result![0]?.employees[2]?.employee.id).toBe(3);
            expect(result![0]?.employees[3]?.employee.id).toBe(4);

            expect(result![1]?.date).toEqual(new Date(2025, 9, 1));
            expect(result![1]?.employees).toHaveLength(4);
            expect(result![1]?.night).toBe(true);

            expect(result![1]?.employees[0]?.employee.id).toBe(5);
            expect(result![1]?.employees[1]?.employee.id).toBe(6);
            expect(result![1]?.employees[2]?.employee.id).toBe(7);
            expect(result![1]?.employees[3]?.employee.id).toBe(8);

            // 2nd day
            expect(result![2]?.date).toEqual(new Date(2025, 9, 2));
            expect(result![2]?.employees).toHaveLength(4);
            expect(result![2]?.night).toBe(false);

            expect(result![2]?.employees[0]?.employee.id).toBe(9);
            expect(result![2]?.employees[1]?.employee.id).toBe(10);
            expect(result![2]?.employees[2]?.employee.id).toBe(11);
            expect(result![2]?.employees[3]?.employee.id).toBe(12);

            expect(result![3]?.date).toEqual(new Date(2025, 9, 2));
            expect(result![3]?.employees).toHaveLength(4);
            expect(result![3]?.night).toBe(true);

            expect(result![3]?.employees[0]?.employee.id).toBe(1);
            expect(result![3]?.employees[1]?.employee.id).toBe(2);
            expect(result![3]?.employees[2]?.employee.id).toBe(3);
            expect(result![3]?.employees[3]?.employee.id).toBe(4);

             // 3rd day
             expect(result![4]?.date).toEqual(new Date(2025, 9, 3));
             expect(result![4]?.employees).toHaveLength(4);
             expect(result![4]?.night).toBe(false);
 
             expect(result![4]?.employees[0]?.employee.id).toBe(5);
             expect(result![4]?.employees[1]?.employee.id).toBe(6);
             expect(result![4]?.employees[2]?.employee.id).toBe(7);
             expect(result![4]?.employees[3]?.employee.id).toBe(8);
 
             expect(result![5]?.date).toEqual(new Date(2025, 9, 3));
             expect(result![5]?.employees).toHaveLength(4);
             expect(result![5]?.night).toBe(true);
 
             expect(result![5]?.employees[0]?.employee.id).toBe(9);
             expect(result![5]?.employees[1]?.employee.id).toBe(10);
             expect(result![5]?.employees[2]?.employee.id).toBe(11);
             expect(result![5]?.employees[3]?.employee.id).toBe(12);
        });

    });

    describe('1 week schedule with rules', () => {

        beforeEach(() => {
            rules = [
                workingHoursWithinLimits,
            ];
        });


        it('should create day and night shift for 1st day', () => {
            const result = nextShift(config, schedule, 0, prevShifts, employees, rules, false, 1);

            const dayIdx = 0;
            expect(result).toHaveLength(14);

            for(const shift of result!) {
                console.log(`${shift.date.getDate()}(${shift.night ? 'night' : 'day'}): ${shift.employees.map(e => e.employee.id).join(', ')}`);
            }

        });

    });

});
