import { createShift } from '../schedule';
import type { Employee, WorkSchedulerConfig } from '../../types/config';
import type { EmployeeShift } from '../model';
import { newEmployeeShift } from '../model';

describe('createShift', () => {
    let employees: Map<string, EmployeeShift>;
    let config: WorkSchedulerConfig;
    let currentDate: Date;

    beforeEach(() => {
        const testEmployees: Employee[] = [
            { id: 1, firstName: 'John', lastName: 'Doe' },
            { id: 2, firstName: 'Jane', lastName: 'Smith' },
            { id: 3, firstName: 'Bob', lastName: 'Johnson' },
            { id: 4, firstName: 'Alice', lastName: 'Brown' },
            { id: 5, firstName: 'Charlie', lastName: 'Wilson' },
            { id: 6, firstName: 'Diana', lastName: 'Davis' },
        ];

        employees = new Map();
        testEmployees.forEach(emp => {
            employees.set(emp.id.toString(), newEmployeeShift(emp));
        });

        config = {
            employees: testEmployees,
            workingHours: {
                defaultDailyHours: 12,
                units: 'hours'
            },
            shifts: {
                defaultShiftLength: 12,
                units: 'hours',
                employeesPerShift: 2,
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

        currentDate = new Date(2025, 8, 1);
    });

    describe('basic functionality', () => {
        it('should create shift with correct number of employees', () => {
            const result = createShift(currentDate, employees, config);

            expect(result).toHaveLength(2);
        });

        it('should assign employees in order from the map', () => {
            const result = createShift(currentDate, employees, config);

            expect(result[0]?.employee.id).toBe(1); // John
            expect(result[1]?.employee.id).toBe(2); // Jane
        });

        it('should update employee shift data correctly', () => {
            const result = createShift(currentDate, employees, config);

            result.forEach(emp => {
                expect(emp.lastDate).toEqual(currentDate);
                expect(emp.nextNotSoonerThan).toEqual(new Date(2025, 8, 3));
                expect(emp.nextNotLaterThan).toEqual(new Date(2025, 8, 5));
                expect(emp.hours).toBe(12);
            });
        });

    });

    describe('availability filtering', () => {
        it('should skip employees with nextNotSoonerThan in the future', () => {
            const futureDate = new Date(currentDate);
            futureDate.setDate(currentDate.getDate() + 2);

            employees.get('1')!.nextNotSoonerThan = futureDate; // John unavailable
            employees.get('2')!.nextNotSoonerThan = futureDate; // Jane unavailable

            const result = createShift(currentDate, employees, config);

            expect(result).toHaveLength(2);
            expect(result[0]?.employee.id).toBe(3); // Bob (skipped John and Jane)
            expect(result[1]?.employee.id).toBe(4); // Alice
        });

        it('should include employees with nextNotSoonerThan on or before current date', () => {
            const pastDate = new Date(currentDate);
            pastDate.setDate(currentDate.getDate());

            employees.get('1')!.nextNotSoonerThan = pastDate; // John available (past date)
            employees.get('2')!.nextNotSoonerThan = currentDate; // Jane available (same date)

            const result = createShift(currentDate, employees, config);

            expect(result).toHaveLength(2);
            expect(result[0]?.employee.id).toBe(1); // John
            expect(result[1]?.employee.id).toBe(2); // Jane
        });

        it('should include employees with null nextNotSoonerThan', () => {
            // All employees have null nextNotSoonerThan by default
            const result = createShift(currentDate, employees, config);

            expect(result).toHaveLength(2);
            expect(result[0]?.employee.id).toBe(1); // John
            expect(result[1]?.employee.id).toBe(2); // Jane
        });

        it('should handle mixed availability correctly', () => {
            const futureDate = new Date(currentDate);
            futureDate.setDate(currentDate.getDate() + 2);
            const pastDate = new Date(currentDate);
            pastDate.setDate(currentDate.getDate() - 1);

            employees.get('1')!.nextNotSoonerThan = futureDate; // John unavailable
            employees.get('2')!.nextNotSoonerThan = pastDate; // Jane available
            employees.get('3')!.nextNotSoonerThan = null; // Bob available
            employees.get('4')!.nextNotSoonerThan = currentDate; // Alice available

            const result = createShift(currentDate, employees, config);

            expect(result).toHaveLength(2);
            expect(result[0]?.employee.id).toBe(2); // Jane (skipped John)
            expect(result[1]?.employee.id).toBe(3); // Bob
        });
    });

    describe('shift capacity limits', () => {
        it('should stop when employeesPerShift limit is reached', () => {
            const customConfig = {
                ...config,
                shifts: {
                    ...config.shifts,
                    employeesPerShift: 1
                }
            };

            const result = createShift(currentDate, employees, customConfig);

            expect(result).toHaveLength(1);
            expect(result[0]?.employee.id).toBe(1); // Only John assigned
        });

        it('should return fewer employees when not enough available', () => {
            // Make most employees unavailable
            const futureDate = new Date(currentDate);
            futureDate.setDate(currentDate.getDate() + 2);

            employees.get('1')!.nextNotSoonerThan = futureDate; // John unavailable
            employees.get('2')!.nextNotSoonerThan = futureDate; // Jane unavailable
            employees.get('3')!.nextNotSoonerThan = futureDate; // Bob unavailable
            employees.get('4')!.nextNotSoonerThan = futureDate; // Alice unavailable
            employees.get('5')!.nextNotSoonerThan = futureDate; // Charlie unavailable
            // Only Diana is available

            const result = createShift(currentDate, employees, config);

            expect(result).toHaveLength(1); // Only Diana available
            expect(result[0]?.employee.id).toBe(6); // Diana
        });

        it('should return empty array when no employees available', () => {
            // Make all employees unavailable
            const futureDate = new Date(currentDate);
            futureDate.setDate(currentDate.getDate() + 2);

            employees.forEach(emp => {
                emp.nextNotSoonerThan = futureDate;
            });

            const result = createShift(currentDate, employees, config);

            expect(result).toHaveLength(0);
        });
    });

    describe('date calculations', () => {
        it('should calculate nextNotSoonerThan correctly with different daysFreeBetweenShifts', () => {
            const customConfig = {
                ...config,
                shifts: {
                    ...config.shifts,
                    daysFreeBetweenShifts: 3
                }
            };

            const result = createShift(currentDate, employees, customConfig);

            const expectedDate = new Date(2025, 8, 5); // currentDate + 3 days
            result.forEach(emp => {
                expect(emp.nextNotSoonerThan).toEqual(expectedDate);
            });
        });

        it('should calculate nextNotLaterThan correctly with different maxDaysFreeBetweenShifts', () => {
            const customConfig = {
                ...config,
                shifts: {
                    ...config.shifts,
                    maxDaysFreeBetweenShifts: 7
                }
            };

            const result = createShift(currentDate, employees, customConfig);

            const expectedDate = new Date(2025, 8, 8); // currentDate + 7 days
            result.forEach(emp => {
                expect(emp.nextNotLaterThan).toEqual(expectedDate);
            });
        });

        it('should handle zero daysFreeBetweenShifts', () => {
            const customConfig = {
                ...config,
                shifts: {
                    ...config.shifts,
                    daysFreeBetweenShifts: 0
                }
            };

            const result = createShift(currentDate, employees, customConfig);

            const expectedDate = new Date(2025, 8, 2); // currentDate + 0 days = same date
            result.forEach(emp => {
                expect(emp.nextNotSoonerThan).toEqual(expectedDate);
            });
        });

        it('should handle different shift lengths', () => {
            const customConfig = {
                ...config,
                shifts: {
                    ...config.shifts,
                    defaultShiftLength: 12
                }
            };

            const result = createShift(currentDate, employees, customConfig);

            result.forEach(emp => {
                expect(emp.hours).toBe(12);
            });
        });
    });

    describe('edge cases', () => {
        it('should handle empty employees map', () => {
            const emptyEmployees = new Map<string, EmployeeShift>();
            const result = createShift(currentDate, emptyEmployees, config);

            expect(result).toHaveLength(0);
        });

        it('should handle employeesPerShift of zero', () => {
            const customConfig = {
                ...config,
                shifts: {
                    ...config.shifts,
                    employeesPerShift: 0
                }
            };

            const result = createShift(currentDate, employees, customConfig);

            expect(result).toHaveLength(0);
        });

        it('should handle large employeesPerShift values', () => {
            const customConfig = {
                ...config,
                shifts: {
                    ...config.shifts,
                    employeesPerShift: 10 // More than available employees
                }
            };

            const result = createShift(currentDate, employees, customConfig);

            expect(result).toHaveLength(6); // All 6 employees assigned
        });

        it('should not modify original employee objects in the map', () => {
            const originalEmployees = new Map();
            employees.forEach((emp, key) => {
                originalEmployees.set(key, {
                    employee: emp.employee,
                    lastDate: emp.lastDate,
                    nextNotSoonerThan: emp.nextNotSoonerThan,
                    nextNotLaterThan: emp.nextNotLaterThan,
                    hours: emp.hours,
                });
            });

            createShift(currentDate, employees, config);

            // Check that assigned employees were not modified
            const assignedEmployee = employees.get('1')!;
            expect(assignedEmployee.lastDate).toBeNull();
            expect(assignedEmployee.hours).toBe(0);

            // Check that unassigned employees were not modified
            const unassignedEmployee = employees.get('3')!;
            expect(unassignedEmployee.lastDate).toBeNull();
            expect(unassignedEmployee.hours).toBe(0);
        });
    });

    describe('month boundary handling', () => {
        it('should handle month boundaries correctly', () => {
            const monthEndDate = new Date(2025, 8, 30); 
            const result = createShift(monthEndDate, employees, config);

            const expectedNextNotSoonerThan = new Date(2025, 9, 2); 
            const expectedNextNotLaterThan = new Date(2025, 9, 4); 

            result.forEach(emp => {
                expect(emp.nextNotSoonerThan).toEqual(expectedNextNotSoonerThan);
                expect(emp.nextNotLaterThan).toEqual(expectedNextNotLaterThan);
            });
        });

        it('should handle year boundaries correctly', () => {
            const yearEndDate = new Date(2024, 11, 31); 
            const result = createShift(yearEndDate, employees, config);

            const expectedNextNotSoonerThan = new Date(2025, 0, 2); 
            const expectedNextNotLaterThan = new Date(2025, 0, 4); 

            result.forEach(emp => {
                expect(emp.nextNotSoonerThan).toEqual(expectedNextNotSoonerThan);
                expect(emp.nextNotLaterThan).toEqual(expectedNextNotLaterThan);
            });
        });
    });
});
