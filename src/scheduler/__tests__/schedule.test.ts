import { createShift, sortEmployeeShifts, isAvailable } from '../schedule';
import type { Employee } from '../../types/config';
import type { EmployeeShift } from '../model';
import { newEmployeeShift } from '../model';

describe('sortEmployeeShifts', () => {
    let employee1: Employee;
    let employee2: Employee;
    let employee3: Employee;

    beforeEach(() => {
        employee1 = { id: 1, firstName: 'John', lastName: 'Doe' };
        employee2 = { id: 2, firstName: 'Jane', lastName: 'Smith' };
        employee3 = { id: 3, firstName: 'Bob', lastName: 'Johnson' };
    });

    describe('day shifts', () => {
        it('should return all values without sorting', () => {
            const shift1 = newEmployeeShift(employee1);
            const shift2 = newEmployeeShift(employee2);
            const shift3 = newEmployeeShift(employee3);

            const employeeShifts = new Map<string, EmployeeShift>([
                ['1', shift1],
                ['2', shift2],
                ['3', shift3],
            ]);

            const result = sortEmployeeShifts(employeeShifts, false);

            expect(result).toHaveLength(3);
            expect(result).toContain(shift1);
            expect(result).toContain(shift2);
            expect(result).toContain(shift3);
        });

    });

    describe('night shifts', () => {
        it('should sort by nextNotSoonerThan when both dates are present', () => {
            const shift1 = newEmployeeShift(employee1);
            const shift2 = newEmployeeShift(employee2);
            const shift3 = newEmployeeShift(employee3);

            shift1.nextNotSoonerThan = new Date(2025, 0, 10);
            shift2.nextNotSoonerThan = new Date(2025, 0, 5);
            shift3.nextNotSoonerThan = new Date(2025, 0, 1);

            const employeeShifts = new Map<string, EmployeeShift>([
                ['1', shift1],
                ['2', shift2],
                ['3', shift3],
            ]);

            const result = sortEmployeeShifts(employeeShifts, true);

            expect(result).toHaveLength(3);
            expect(result[0]).toBe(shift3); // earliest date
            expect(result[1]).toBe(shift2);
            expect(result[2]).toBe(shift1); // latest date
        });

        it('should place shifts with null nextNotSoonerThan at the end', () => {
            const shift1 = newEmployeeShift(employee1);
            const shift2 = newEmployeeShift(employee2);
            const shift3 = newEmployeeShift(employee3);

            shift1.nextNotSoonerThan = new Date(2025, 0, 5);
            shift2.nextNotSoonerThan = null;
            shift3.nextNotSoonerThan = new Date(2025, 0, 1);

            const employeeShifts = new Map<string, EmployeeShift>([
                ['1', shift1],
                ['2', shift2],
                ['3', shift3],
            ]);

            const result = sortEmployeeShifts(employeeShifts, true);

            expect(result).toHaveLength(3);
            expect(result[0]).toBe(shift3); // earliest date
            expect(result[1]).toBe(shift1);
            expect(result[2]).toBe(shift2); // null comes last
        });

        it('should handle multiple null values - preserve relative order', () => {
            const shift1 = newEmployeeShift(employee1);
            const shift2 = newEmployeeShift(employee2);
            const shift3 = newEmployeeShift(employee3);

            shift1.nextNotSoonerThan = null;
            shift2.nextNotSoonerThan = null;
            shift3.nextNotSoonerThan = new Date(2025, 0, 1);

            const employeeShifts = new Map<string, EmployeeShift>([
                ['1', shift1],
                ['2', shift2],
                ['3', shift3],
            ]);

            const result = sortEmployeeShifts(employeeShifts, true);

            expect(result).toHaveLength(3);
            expect(result[0]).toBe(shift3); // has date, comes first
            // Both nulls should come after, order preserved
            expect(result[1]).toBe(shift1);
            expect(result[2]).toBe(shift2);
        });

        it('should handle all null values - preserve relative order', () => {
            const shift1 = newEmployeeShift(employee1);
            const shift2 = newEmployeeShift(employee2);
            const shift3 = newEmployeeShift(employee3);

            shift1.nextNotSoonerThan = null;
            shift2.nextNotSoonerThan = null;
            shift3.nextNotSoonerThan = null;

            const employeeShifts = new Map<string, EmployeeShift>([
                ['1', shift1],
                ['2', shift2],
                ['3', shift3],
            ]);

            const result = sortEmployeeShifts(employeeShifts, true);

            expect(result).toHaveLength(3);
            // When all are null, comparison returns 0, so order is preserved
            expect(result[0]).toBe(shift1);
            expect(result[1]).toBe(shift2);
            expect(result[2]).toBe(shift3);
        });

        it('should handle same dates correctly', () => {
            const shift1 = newEmployeeShift(employee1);
            const shift2 = newEmployeeShift(employee2);
            const shift3 = newEmployeeShift(employee3);

            const sameDate = new Date(2025, 0, 5);
            shift1.nextNotSoonerThan = sameDate;
            shift2.nextNotSoonerThan = new Date(sameDate);
            shift3.nextNotSoonerThan = new Date(2025, 0, 1);

            const employeeShifts = new Map<string, EmployeeShift>([
                ['1', shift1],
                ['2', shift2],
                ['3', shift3],
            ]);

            const result = sortEmployeeShifts(employeeShifts, true);

            expect(result).toHaveLength(3);
            expect(result[0]).toBe(shift3); // earliest date
            // shift1 and shift2 have same date, order preserved
            expect(result[1]).toBe(shift1);
            expect(result[2]).toBe(shift2);
        });

        it('should handle empty map', () => {
            const employeeShifts = new Map<string, EmployeeShift>();

            const result = sortEmployeeShifts(employeeShifts, true);

            expect(result).toHaveLength(0);
        });

        it('should handle single shift', () => {
            const shift1 = newEmployeeShift(employee1);
            shift1.nextNotSoonerThan = new Date(2025, 0, 5);

            const employeeShifts = new Map<string, EmployeeShift>([
                ['1', shift1],
            ]);

            const result = sortEmployeeShifts(employeeShifts, true);

            expect(result).toHaveLength(1);
            expect(result[0]).toBe(shift1);
        });

        it('should handle complex scenario with mixed dates and nulls', () => {
            const shift1 = newEmployeeShift(employee1);
            const shift2 = newEmployeeShift(employee2);
            const shift3 = newEmployeeShift(employee3);

            shift1.nextNotSoonerThan = null;
            shift2.nextNotSoonerThan = new Date(2025, 0, 10);
            shift3.nextNotSoonerThan = new Date(2025, 0, 1);

            const employeeShifts = new Map<string, EmployeeShift>([
                ['1', shift1],
                ['2', shift2],
                ['3', shift3],
            ]);

            const result = sortEmployeeShifts(employeeShifts, true);

            expect(result).toHaveLength(3);
            expect(result[0]).toBe(shift3); // earliest date (Jan 1)
            expect(result[1]).toBe(shift2); // later date (Jan 10)
            expect(result[2]).toBe(shift1); // null comes last
        });
    });
});

describe('isAvailable', () => {
    let employee1: Employee;

    beforeEach(() => {
        employee1 = { id: 1, firstName: 'John', lastName: 'Doe' };
    });

    describe('day shifts', () => {
        it('should return true when nextNotSoonerThan is null', () => {
            const shift = newEmployeeShift(employee1);
            shift.nextNotSoonerThan = null;

            const date = new Date(2025, 0, 10);
            const result = isAvailable(shift, date, false);

            expect(result).toBe(true);
        });

        it('should return true when date is equal to nextNotSoonerThan', () => {
            const shift = newEmployeeShift(employee1);
            const date = new Date(2025, 0, 10);
            shift.nextNotSoonerThan = new Date(date);

            const result = isAvailable(shift, date, false);

            expect(result).toBe(true);
        });

        it('should return true when date is after nextNotSoonerThan', () => {
            const shift = newEmployeeShift(employee1);
            shift.nextNotSoonerThan = new Date(2025, 0, 5);

            const date = new Date(2025, 0, 10);
            const result = isAvailable(shift, date, false);

            expect(result).toBe(true);
        });

        it('should return false when date is before nextNotSoonerThan', () => {
            const shift = newEmployeeShift(employee1);
            shift.nextNotSoonerThan = new Date(2025, 0, 10);

            const date = new Date(2025, 0, 5);
            const result = isAvailable(shift, date, false);

            expect(result).toBe(false);
        });

        it('should ignore lastDate for day shifts', () => {
            const shift = newEmployeeShift(employee1);
            shift.lastDate = new Date(2025, 0, 15);
            shift.nextNotSoonerThan = null;

            const date = new Date(2025, 0, 1);
            const result = isAvailable(shift, date, false);

            expect(result).toBe(true);
        });
    });

    describe('night shifts', () => {
        describe('(no shifts before (lastDate is null)', () => {
            it('should return true when nextNotSoonerThan is null', () => {
                const shift = newEmployeeShift(employee1);
                shift.lastDate = null;
                shift.nextNotSoonerThan = null;

                const date = new Date(2025, 0, 10);
                const result = isAvailable(shift, date, true);

                expect(result).toBe(true);
            });

            it('should return true when date is equal to nextNotSoonerThan', () => {
                const shift = newEmployeeShift(employee1);
                shift.lastDate = null;
                const date = new Date(2025, 0, 10);
                shift.nextNotSoonerThan = new Date(date);

                const result = isAvailable(shift, date, true);

                expect(result).toBe(true);
            });

            it('should return true when date is after nextNotSoonerThan', () => {
                const shift = newEmployeeShift(employee1);
                shift.lastDate = null;
                shift.nextNotSoonerThan = new Date(2025, 0, 5);

                const date = new Date(2025, 0, 10);
                const result = isAvailable(shift, date, true);

                expect(result).toBe(true);
            });

            it('should return false when date is before nextNotSoonerThan', () => {
                const shift = newEmployeeShift(employee1);
                shift.lastDate = null;
                shift.nextNotSoonerThan = new Date(2025, 0, 10);

                const date = new Date(2025, 0, 5);
                const result = isAvailable(shift, date, true);

                expect(result).toBe(false);
            });
        });

        describe('shift before (when lastDate is not null)', () => {
            it('should return true for a night shift one day after daily shift', () => {
                const shift = newEmployeeShift(employee1);
                shift.lastDate = new Date(2025, 0, 10);
                shift.nextNotSoonerThan = new Date(2025, 0, 12);

                const date = new Date(2025, 0, 11);
                const result = isAvailable(shift, date, true);

                expect(result).toBe(true);
            });

            it('should return true when date is more than one day after last shift', () => {
                const shift = newEmployeeShift(employee1);
                shift.lastDate = new Date(2025, 0, 10);
                shift.nextNotSoonerThan = new Date(2025, 0, 12);

                const date = new Date(2025, 0, 12);
                const result = isAvailable(shift, date, true);

                expect(result).toBe(true);
            });

        });
    });
});
