import { createShift, sortEmployeeShifts, isAvailable } from '../schedule';
import type { Employee } from '../../types/config';
import type { EmployeeShift } from '../model';
import { newEmployeeShift } from '../model';

describe('sortEmployeeShifts', () => {
    let employee1: Employee;
    let employee2: Employee;
    let employee3: Employee;
    let employee4: Employee;
    let employee5: Employee;
    let employee6: Employee;

    beforeEach(() => {
        employee1 = { id: 1, firstName: 'John', lastName: 'Doe' };
        employee2 = { id: 2, firstName: 'Jane', lastName: 'Smith' };
        employee3 = { id: 3, firstName: 'Bob', lastName: 'Johnson' };
        employee4 = { id: 4, firstName: 'Alice', lastName: 'Brown' };
        employee5 = { id: 5, firstName: 'Charlie', lastName: 'Wilson' };
        employee6 = { id: 6, firstName: 'Diana', lastName: 'Davis' };
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
            expect(result[0]).toBe(shift1);
            expect(result[1]).toBe(shift2);
            expect(result[2]).toBe(shift3);
        });

        it('sort by no shift first then by last date', () => {
            const shift1 = newEmployeeShift(employee1);
            shift1.lastDate = new Date(2025, 0, 5);
            shift1.lastShiftNight = false;
            shift1.nextNotSoonerThan = new Date(2025, 0, 7);
            shift1.nextNotLaterThan = new Date(2025, 0, 10);
            
            const shift2 = newEmployeeShift(employee2);
            shift2.lastDate = new Date(2025, 0, 1);
            shift2.nextNotSoonerThan = new Date(2025, 0, 3);
            shift2.nextNotLaterThan = new Date(2025, 0, 5);
            
            const shift3 = newEmployeeShift(employee3);
            shift3.lastDate = new Date(2025, 0, 4);
            shift3.lastShiftNight = false;
            shift3.nextNotSoonerThan = new Date(2025, 0, 6);
            shift3.nextNotLaterThan = new Date(2025, 0, 10);

            const shift4 = newEmployeeShift(employee4);

            const employeeShifts = new Map<string, EmployeeShift>([
                ['1', shift1],
                ['2', shift2],
                ['3', shift3],
                ['4', shift4],
            ]);

            const result = sortEmployeeShifts(employeeShifts, false);

            expect(result).toHaveLength(4);
            expect(result[0]).toBe(shift4);
            expect(result[1]).toBe(shift2);
            expect(result[2]).toBe(shift3);
            expect(result[3]).toBe(shift1);
        });

    });

    describe('night shifts', () => {

        it('sort by last date first then by no shift', () => {
            const shift1 = newEmployeeShift(employee1);
            shift1.lastDate = new Date(2025, 0, 5);
            shift1.nextNotSoonerThan = new Date(2025, 0, 7);
            shift1.nextNotLaterThan = new Date(2025, 0, 10);
            
            const shift2 = newEmployeeShift(employee2);
            shift2.lastDate = new Date(2025, 0, 1);
            shift2.nextNotSoonerThan = new Date(2025, 0, 3);
            shift2.nextNotLaterThan = new Date(2025, 0, 5);
            
            const shift3 = newEmployeeShift(employee3);
            shift3.lastDate = new Date(2025, 0, 4);
            shift3.nextNotSoonerThan = new Date(2025, 0, 6);
            shift3.nextNotLaterThan = new Date(2025, 0, 10);

            const shift4 = newEmployeeShift(employee4);

            const employeeShifts = new Map<string, EmployeeShift>([
                ['1', shift1],
                ['2', shift2],
                ['3', shift3],
                ['4', shift4],
            ]);

            const result = sortEmployeeShifts(employeeShifts, true);

            expect(result).toHaveLength(4);
            expect(result[0]).toBe(shift2);
            expect(result[1]).toBe(shift3);
            expect(result[2]).toBe(shift1);
            expect(result[3]).toBe(shift4);
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
