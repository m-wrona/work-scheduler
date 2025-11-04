import { shiftPattern } from '../rules';
import type { EmployeeShift } from '../model';
import type { WorkSchedulerConfig } from '../../types/config';
import type { MonthSchedule } from '../calendar';
import { newEmployeeShift } from '../model';

describe('shiftPattern', () => {
    let employee: { id: number; firstName: string; lastName: string };
    let cfg: WorkSchedulerConfig;
    let schedule: MonthSchedule;
    let day: Date;
    const night = false;

    beforeEach(() => {
        employee = { id: 1, firstName: 'John', lastName: 'Doe' };
        cfg = {
            employees: [employee],
            workingHours: { defaultDailyHours: 8, units: 'hours' },
            shifts: {
                defaultShiftLength: 12,
                units: 'hours',
                employeesPerShift: 1,
                daysFreeBetweenShifts: 1,
                maxDaysFreeBetweenShifts: 5,
                weekendsFreeInMonth: 2,
            },
            schedule: {
                timezone: 'UTC',
                year: 2025,
                month: 1,
                holidays: [],
            },
        };
        schedule = {
            month: 1,
            year: 2025,
            workingDays: 22,
            totalWorkingHours: 176,
            shiftsNumber: 14,
            workingDaysList: [],
            holidays: [],
            monthlyBreakdown: [],
        };
        day = new Date(2025, 0, 10);
    });

    it('should return true when shiftPattern is empty', () => {
        const employeeShift: EmployeeShift = {
            ...newEmployeeShift(employee),
            shiftPattern: [],
        };

        const result = shiftPattern(employeeShift, cfg, schedule, day, night);

        expect(result).toBe(true);
    });

    it('should return true when shiftPattern has 1 shift', () => {
        const employeeShift: EmployeeShift = {
            ...newEmployeeShift(employee),
            shiftPattern: [true],
        };

        const result = shiftPattern(employeeShift, cfg, schedule, day, night);

        expect(result).toBe(true);
    });

    it('should return true when shiftPattern has 2 shifts', () => {
        const employeeShift: EmployeeShift = {
            ...newEmployeeShift(employee),
            shiftPattern: [true, true],
        };

        const result = shiftPattern(employeeShift, cfg, schedule, day, night);

        expect(result).toBe(true);
    });

    it('should return true when shiftPattern has 3 different shifts', () => {
        const employeeShift: EmployeeShift = {
            ...newEmployeeShift(employee),
            shiftPattern: [true, false, true],
        };

        const result = shiftPattern(employeeShift, cfg, schedule, day, night);

        expect(result).toBe(true);
    });

    it('should return false when shiftPattern has 3 consecutive day shifts (false)', () => {
        const employeeShift: EmployeeShift = {
            ...newEmployeeShift(employee),
            shiftPattern: [false, false, false],
        };

        const result = shiftPattern(employeeShift, cfg, schedule, day, night);

        expect(result).toBe(false);
    });

    it('should return false when shiftPattern has 3 consecutive night shifts (true)', () => {
        const employeeShift: EmployeeShift = {
            ...newEmployeeShift(employee),
            shiftPattern: [true, true, true],
        };

        const result = shiftPattern(employeeShift, cfg, schedule, day, night);

        expect(result).toBe(false);
    });

    it('should return true when shiftPattern has 2 consecutive day shifts followed by a night shift', () => {
        const employeeShift: EmployeeShift = {
            ...newEmployeeShift(employee),
            shiftPattern: [false, false, true],
        };

        const result = shiftPattern(employeeShift, cfg, schedule, day, night);

        expect(result).toBe(true);
    });

    it('should return true when shiftPattern has 2 consecutive night shifts followed by a day shift', () => {
        const employeeShift: EmployeeShift = {
            ...newEmployeeShift(employee),
            shiftPattern: [true, true, false],
        };

        const result = shiftPattern(employeeShift, cfg, schedule, day, night);

        expect(result).toBe(true);
    });

    it('should return false when shiftPattern has more than 3 consecutive same shifts', () => {
        const employeeShift: EmployeeShift = {
            ...newEmployeeShift(employee),
            shiftPattern: [false, false, false, false],
        };

        const result = shiftPattern(employeeShift, cfg, schedule, day, night);

        expect(result).toBe(false);
    });

    it('should return true when shiftPattern has alternating shifts', () => {
        const employeeShift: EmployeeShift = {
            ...newEmployeeShift(employee),
            shiftPattern: [true, false, true, false],
        };

        const result = shiftPattern(employeeShift, cfg, schedule, day, night);

        expect(result).toBe(true);
    });

    it('should handle complex pattern with valid sequences', () => {
        const employeeShift: EmployeeShift = {
            ...newEmployeeShift(employee),
            shiftPattern: [false, false, true, true, false, true, true, true],
        };

        const result = shiftPattern(employeeShift, cfg, schedule, day, night);

        expect(result).toBe(false);
    });

    it('should return false when pattern length exactly equals 3 at the end', () => {
        const employeeShift: EmployeeShift = {
            ...newEmployeeShift(employee),
            shiftPattern: [true, true, true],
        };

        const result = shiftPattern(employeeShift, cfg, schedule, day, night);

        expect(result).toBe(false);
    });

    it('should handle mixed pattern with breaks in sequence', () => {
        const employeeShift: EmployeeShift = {
            ...newEmployeeShift(employee),
            shiftPattern: [true, true, false, true, true],
        };

        const result = shiftPattern(employeeShift, cfg, schedule, day, night);

        expect(result).toBe(true);
    });

    it('should return false for long mismatching pattern', () => {
        const employeeShift: EmployeeShift = {
            ...newEmployeeShift(employee),
            shiftPattern: [true, false, false, false, true, false, true, false],
        };

        const result = shiftPattern(employeeShift, cfg, schedule, day, night);

        expect(result).toBe(false);
    });

});

