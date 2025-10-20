import { assignShiftsForDay, generateMonthlySchedule, createPlannerOptions } from '../planner';
import type { EmployeeShifts } from '../../types/schedule';
import type { Employee, WorkSchedulerConfig } from '../../types/config';

describe('assignShiftsForDay', () => {
  let employees: EmployeeShifts[];
  let currentDate: Date;

  beforeEach(() => {
    // Create test employees
    const testEmployees: Employee[] = [
      { id: 1, firstName: 'John', lastName: 'Doe' },
      { id: 2, firstName: 'Jane', lastName: 'Smith' },
      { id: 3, firstName: 'Bob', lastName: 'Johnson' },
      { id: 4, firstName: 'Alice', lastName: 'Brown' },
      { id: 5, firstName: 'Charlie', lastName: 'Wilson' },
      { id: 6, firstName: 'Diana', lastName: 'Davis' },
    ];

    employees = testEmployees.map(emp => ({
      employee: emp,
      shifts: [],
      nextDayShiftDate: undefined,
      nextNightShiftDate: undefined
    }));

    currentDate = new Date(2025, 9, 1);
  });

  describe('successful assignment', () => {
    it('should assign employees to day and night shifts in sequence order', () => {
      const result = assignShiftsForDay(employees, 2, 1, currentDate);

      // Check that we have the right number of employees per shift
      expect(result.dailyShift).toHaveLength(2);
      expect(result.nightShift).toHaveLength(2);

      // Check that employees are assigned in sequence order
      expect(result.dailyShift[0]?.employee.id).toBe(1); // John
      expect(result.dailyShift[1]?.employee.id).toBe(2); // Jane
      expect(result.nightShift[0]?.employee.id).toBe(3); // Bob
      expect(result.nightShift[1]?.employee.id).toBe(4); // Alice
    });

    it('should update nextDayShiftDate and nextNightShiftDate for assigned employees', () => {
      const daysFreeAfterShift = 2;
      const result = assignShiftsForDay(employees, 2, daysFreeAfterShift, currentDate);

      const nextDay = new Date(currentDate);
      nextDay.setDate(currentDate.getDate() + 1);

      const expectedNextAllowedDate = new Date(nextDay);
      expectedNextAllowedDate.setDate(nextDay.getDate() + daysFreeAfterShift + 1);

      // Check that day shift employees can work night shift tomorrow
      result.dailyShift.forEach(emp => {
        expect(emp.nextNightShiftDate?.getTime()).toBe(nextDay.getTime());
        expect(emp.nextDayShiftDate?.getTime()).toBe(expectedNextAllowedDate.getTime());
      });

      // Check that night shift employees need full rest period
      result.nightShift.forEach(emp => {
        expect(emp.nextDayShiftDate?.getTime()).toBe(expectedNextAllowedDate.getTime());
        expect(emp.nextNightShiftDate?.getTime()).toBe(expectedNextAllowedDate.getTime());
      });

      // With 2 employees per shift, we need 4 total employees
      // So Charlie (5) and Diana (6) should be unassigned
      expect(employees[4]?.nextDayShiftDate).toBeUndefined(); // Charlie
      expect(employees[4]?.nextNightShiftDate).toBeUndefined(); // Charlie
      expect(employees[5]?.nextDayShiftDate).toBeUndefined(); // Diana
      expect(employees[5]?.nextNightShiftDate).toBeUndefined(); // Diana
    });

    it('should work with different employeesPerShift values', () => {
      const result = assignShiftsForDay(employees, 1, 1, currentDate);

      expect(result.dailyShift).toHaveLength(1);
      expect(result.nightShift).toHaveLength(1);
      expect(result.dailyShift[0]?.employee.id).toBe(1); // John
      expect(result.nightShift[0]?.employee.id).toBe(2); // Jane
    });

    it('should work with zero daysFreeAfterShift', () => {
      const result = assignShiftsForDay(employees, 2, 0, currentDate);

      const nextDay = new Date(currentDate);
      nextDay.setDate(currentDate.getDate() + 1);

      const expectedNextAllowedDate = new Date(nextDay);
      expectedNextAllowedDate.setDate(nextDay.getDate() + 1); // 0 + 1 = 1 day later

      result.dailyShift.forEach(emp => {
        expect(emp.nextNightShiftDate).toEqual(nextDay);
        expect(emp.nextDayShiftDate).toEqual(expectedNextAllowedDate);
      });
    });
  });

  describe('day shift availability filtering', () => {
    it('should only assign available employees for day shift', () => {
      // All employees are available (nextDayShiftDate is undefined)
      const result = assignShiftsForDay(employees, 2, 1, currentDate);

      expect(result.dailyShift).toHaveLength(2);
      expect(result.nightShift).toHaveLength(2);
    });

    it('should skip employees with nextDayShiftDate in the future for day shift', () => {
      // Set some employees as unavailable for day shift
      const futureDayShift = new Date(currentDate);
      futureDayShift.setDate(currentDate.getDate() + 2);
      const futureNightShift = new Date(currentDate);
      futureNightShift.setDate(currentDate.getDate() + 3);

      employees[0]!.nextDayShiftDate = futureDayShift;  // John unavailable for day shift
      employees[0]!.nextNightShiftDate = futureNightShift; // John unavailable for night shift
      employees[1]!.nextDayShiftDate = futureDayShift; // Jane unavailable for day shift
      employees[1]!.nextNightShiftDate = futureNightShift; // Jane unavailable for night shift

      const result = assignShiftsForDay(employees, 2, 1, currentDate);

      // Should skip John and Jane for day shift, assign Bob and Alice
      expect(result.dailyShift[0]?.employee.id).toBe(3); // Bob
      expect(result.dailyShift[1]?.employee.id).toBe(4); // Alice

      // Night shift should still work normally
      expect(result.nightShift[0]?.employee.id).toBe(5); // Charlie
      expect(result.nightShift[1]?.employee.id).toBe(6); // Diana
    });

    it('should include employees with nextDayShiftDate on or before current date for day shift', () => {
      // Set some employees as available for day shift
      const pastDate = new Date(currentDate);
      pastDate.setDate(currentDate.getDate() - 1);

      employees[0]!.nextDayShiftDate = pastDate; // John available (past date)
      employees[1]!.nextDayShiftDate = currentDate; // Jane available (same date)

      const result = assignShiftsForDay(employees, 2, 1, currentDate);

      expect(result.dailyShift[0]?.employee.id).toBe(1); // John
      expect(result.dailyShift[1]?.employee.id).toBe(2); // Jane
    });
  });

  describe('night shift availability filtering', () => {
    it('should filter employees for night shift based on nextNightShiftDate', () => {
      // Set some employees as unavailable for night shift
      const futureDate = new Date(currentDate);
      futureDate.setDate(currentDate.getDate() + 2);

      employees[2]!.nextNightShiftDate = futureDate; // Bob unavailable for night shift
      employees[3]!.nextNightShiftDate = futureDate; // Alice unavailable for night shift

      const result = assignShiftsForDay(employees, 2, 1, currentDate);

      // Day shift should work normally
      expect(result.dailyShift[0]?.employee.id).toBe(1); // John
      expect(result.dailyShift[1]?.employee.id).toBe(2); // Jane
      // Night shift should skip Bob and Alice, assign Charlie and Diana
      expect(result.nightShift[0]?.employee.id).toBe(5); // Charlie
      expect(result.nightShift[1]?.employee.id).toBe(6); // Diana
    });

    it('should include employees with nextNightShiftDate on or before current date for night shift', () => {
      // Set some employees as available for night shift
      const pastDate = new Date(currentDate);
      pastDate.setDate(currentDate.getDate() - 1);

      employees[2]!.nextNightShiftDate = pastDate; // Bob available (past date)
      employees[3]!.nextNightShiftDate = currentDate; // Alice available (same date)

      const result = assignShiftsForDay(employees, 2, 1, currentDate);

      expect(result.nightShift[0]?.employee.id).toBe(3); // Bob
      expect(result.nightShift[1]?.employee.id).toBe(4); // Alice
    });
  });

  describe('day-night shift pattern', () => {
    it('should allow day shift employees to work night shift the next day', () => {
      const result = assignShiftsForDay(employees, 2, 1, currentDate);

      const nextDay = new Date(currentDate);
      nextDay.setDate(currentDate.getDate() + 1);

      // Day shift employees should be marked as available for night shift tomorrow
      result.dailyShift.forEach(emp => {
        expect(emp.nextNightShiftDate).toEqual(nextDay);
      });
    });

    it('should handle consecutive day assignments with proper night shift availability', () => {
      // First day assignment
      const day1Result = assignShiftsForDay(employees, 2, 1, currentDate);

      const nextDay = new Date(currentDate);
      nextDay.setDate(currentDate.getDate() + 1);

      // Day shift employees from day 1 should be available for night shift on day 2
      const availableForNightShift = employees.filter(emp => {
        if (!emp.nextNightShiftDate) return true;
        return nextDay >= emp.nextNightShiftDate;
      });

      // Should include the day shift employees from day 1
      const day1DayShiftIds = day1Result.dailyShift.map(emp => emp.employee.id);
      const availableNightShiftIds = availableForNightShift.map(emp => emp.employee.id);

      day1DayShiftIds.forEach(id => {
        expect(availableNightShiftIds).toContain(id);
      });
    });
  });

  describe('error handling', () => {
    it('should throw error when not enough available employees for day shift', () => {
      // Make most employees unavailable for day shift
      const futureDate = new Date(currentDate);
      futureDate.setDate(currentDate.getDate() + 2);

      employees.forEach(emp => {
        emp.nextDayShiftDate = futureDate;
      });

      expect(() => {
        assignShiftsForDay(employees, 2, 1, currentDate);
      }).toThrow('Not enough available employees for day shift on day 1. Required: 2, Available: 0');
    });

    it('should throw error when not enough available employees for night shift', () => {
      // Make most employees unavailable for night shift
      const futureDate = new Date(currentDate);
      futureDate.setDate(currentDate.getDate() + 2);

      employees.forEach(emp => {
        emp.nextNightShiftDate = futureDate;
      });

      expect(() => {
        assignShiftsForDay(employees, 2, 1, currentDate);
      }).toThrow('Not enough available employees for night shift on day 1. Required: 2, Available: 0');
    });

    it('should throw error when exactly one employee short for day shift', () => {
      // Make 1 employee available for day shift (need 2)
      const futureDate = new Date(currentDate);
      futureDate.setDate(currentDate.getDate() + 2);

      employees[0]!.nextDayShiftDate = futureDate; // John unavailable
      employees[1]!.nextDayShiftDate = futureDate; // Jane unavailable
      employees[2]!.nextDayShiftDate = futureDate; // Bob unavailable
      employees[3]!.nextDayShiftDate = futureDate; // Alice unavailable
      employees[4]!.nextDayShiftDate = futureDate; // Charlie unavailable
      // Alice, Charlie, Diana are available for day shift

      expect(() => {
        assignShiftsForDay(employees, 2, 1, currentDate);
      }).toThrow('Not enough available employees for day shift on day 1. Required: 2, Available: 1');
    });

    it('should include correct date in error message', () => {
      const testDate = new Date(2024, 5, 15); // June 15, 2024
      const futureDate = new Date(testDate);
      futureDate.setDate(testDate.getDate() + 2);

      employees.forEach(emp => {
        emp.nextDayShiftDate = futureDate;
      });

      expect(() => {
        assignShiftsForDay(employees, 2, 1, testDate);
      }).toThrow('Not enough available employees for day shift on day 15. Required: 2, Available: 0');
    });
  });

  describe('edge cases', () => {
    it('should handle empty employees array', () => {
      expect(() => {
        assignShiftsForDay([], 1, 1, currentDate);
      }).toThrow('Not enough available employees for day shift on day 1. Required: 1, Available: 0');
    });

    it('should handle single employee with insufficient availability', () => {
      const singleEmployee = [employees[0]!];

      expect(() => {
        assignShiftsForDay(singleEmployee, 2, 1, currentDate);
      }).toThrow('Not enough available employees for day shift on day 1. Required: 2, Available: 1');
    });

    it('should handle large daysFreeAfterShift values', () => {
      const largeDaysFree = 30;
      const result = assignShiftsForDay(employees, 2, largeDaysFree, currentDate);

      const nextDay = new Date(currentDate);
      nextDay.setDate(currentDate.getDate() + 1);

      const expectedNextAllowedDate = new Date(nextDay);
      expectedNextAllowedDate.setDate(nextDay.getDate() + largeDaysFree + 1);

      result.dailyShift.forEach(emp => {
        expect(emp.nextNightShiftDate).toEqual(nextDay);
        expect(emp.nextDayShiftDate).toEqual(expectedNextAllowedDate);
      });
    });

    it('should not modify original employee objects except shift dates', () => {
      const originalEmployees = JSON.parse(JSON.stringify(employees));

      assignShiftsForDay(employees, 2, 1, currentDate);

      // Check that employee data is unchanged
      employees.forEach((emp, index) => {
        expect(emp.employee).toEqual(originalEmployees[index].employee);
        expect(emp.shifts).toEqual(originalEmployees[index].shifts);
        // nextDayShiftDate and nextNightShiftDate may have changed for assigned employees
      });
    });
  });

  describe('sequential assignment', () => {
    it('should maintain strict sequential order without reordering', () => {
      // Create employees with specific IDs to test ordering
      const orderedEmployees: EmployeeShifts[] = [
        { employee: { id: 10, firstName: 'First', lastName: 'Employee' }, shifts: [], nextDayShiftDate: undefined, nextNightShiftDate: undefined },
        { employee: { id: 20, firstName: 'Second', lastName: 'Employee' }, shifts: [], nextDayShiftDate: undefined, nextNightShiftDate: undefined },
        { employee: { id: 30, firstName: 'Third', lastName: 'Employee' }, shifts: [], nextDayShiftDate: undefined, nextNightShiftDate: undefined },
        { employee: { id: 40, firstName: 'Fourth', lastName: 'Employee' }, shifts: [], nextDayShiftDate: undefined, nextNightShiftDate: undefined },
        { employee: { id: 50, firstName: 'Fifth', lastName: 'Employee' }, shifts: [], nextDayShiftDate: undefined, nextNightShiftDate: undefined },
        { employee: { id: 60, firstName: 'Sixth', lastName: 'Employee' }, shifts: [], nextDayShiftDate: undefined, nextNightShiftDate: undefined },
      ];

      const result = assignShiftsForDay(orderedEmployees, 2, 1, currentDate);

      // Verify strict sequential order
      expect(result.dailyShift[0]?.employee.id).toBe(10);
      expect(result.dailyShift[1]?.employee.id).toBe(20);
      expect(result.nightShift[0]?.employee.id).toBe(30);
      expect(result.nightShift[1]?.employee.id).toBe(40);
    });
  });
});

describe('createPlannerOptions', () => {
  it('should create default options with current year and month', () => {
    const options = createPlannerOptions();

    const now = new Date();
    expect(options.year).toBe(now.getFullYear());
    expect(options.month).toBe(now.getMonth() + 1);
    expect(options.planNextWorkingDays).toBeGreaterThan(0);
  });

  it('should use provided year and month', () => {
    const options = createPlannerOptions({ year: 2025, month: 9 });

    expect(options.year).toBe(2025);
    expect(options.month).toBe(9);
    expect(options.planNextWorkingDays).toBe(30);
  });

  it('should use provided planNextWorkingDays', () => {
    const options = createPlannerOptions({ planNextWorkingDays: 3 });

    expect(options.planNextWorkingDays).toBe(3);
  });

  it('should handle empty options object', () => {
    const options = createPlannerOptions({});

    const now = new Date();
    expect(options.year).toBe(now.getFullYear());
    expect(options.month).toBe(now.getMonth() + 1);
    expect(options.planNextWorkingDays).toBeGreaterThan(0);
  });
});

describe('generateMonthlySchedule', () => {
  let config: WorkSchedulerConfig;

  beforeEach(() => {
    config = {
      employees: [
        { id: 1, firstName: 'John', lastName: 'Doe' },
        { id: 2, firstName: 'Jane', lastName: 'Smith' },
        { id: 3, firstName: 'Bob', lastName: 'Johnson' },
        { id: 4, firstName: 'Alice', lastName: 'Brown' },
        { id: 5, firstName: 'Charlie', lastName: 'Wilson' },
        { id: 6, firstName: 'Diana', lastName: 'Davis' },
      ],
      workingHours: {
        defaultDailyHours: 8,
        units: 'hours'
      },
      shifts: {
        defaultShiftLength: 8,
        units: 'hours',
        employeesPerShift: 2,
        daysFreeBetweenShifts: 1,
        weekendsFreeInMonth: 1,
      },
      schedule: {
        timezone: 'UTC',
        year: 2025,
        month: 9,
        holidays: [],
      }
    };
  });

  describe('basic functionality', () => {
    it('should generate schedule for 1 day with small planNextWorkingDays', () => {
      const result = generateMonthlySchedule(config, { planNextWorkingDays: 1 });

      expect(result.schedule.year).toBe(2025);
      expect(result.schedule.month).toBe(9);
      expect(result.schedule.days).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);

      // Check first day
      expect(result.schedule.days[0]?.date.getDate()).toBe(1);
      expect(result.schedule.days[0]?.weekDay).toBe(1); // Monday
      expect(result.schedule.days[0]?.shift.dailyShift).toHaveLength(2);
      expect(result.schedule.days[0]?.shift.nightShift).toHaveLength(2);
    });

    it('should generate schedule for 2 days with zero rest period', () => {
      const zeroRestConfig = {
        ...config,
        shifts: {
          ...config.shifts,
          daysFreeBetweenShifts: 0 // No rest period
        }
      };

      const result = generateMonthlySchedule(zeroRestConfig, { planNextWorkingDays: 2 });

      expect(result.schedule.days).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);

      // Check all days have proper structure
      result.schedule.days.forEach((day, index) => {
        expect(day.date.getDate()).toBe(index + 1);
        expect(day.shift.dailyShift).toHaveLength(2);
        expect(day.shift.nightShift).toHaveLength(2);
      });
    });

  });

  describe('employee assignment patterns', () => {
    it('should assign different employees on consecutive days with zero rest period', () => {
      const zeroRestConfig = {
        ...config,
        shifts: {
          ...config.shifts,
          daysFreeBetweenShifts: 0 // No rest period
        }
      };

      const result = generateMonthlySchedule(zeroRestConfig, { planNextWorkingDays: 2 });

      const day1 = result.schedule.days[0]!;
      const day2 = result.schedule.days[1]!;

      // With zero rest period, same employees can work consecutive days
      const day1EmployeeIds = [
        ...day1.shift.dailyShift.map(emp => emp.employee.id),
        ...day1.shift.nightShift.map(emp => emp.employee.id)
      ];

      const day2EmployeeIds = [
        ...day2.shift.dailyShift.map(emp => emp.employee.id),
        ...day2.shift.nightShift.map(emp => emp.employee.id)
      ];

      // Should have overlap with zero rest period
      const overlap = day1EmployeeIds.filter(id => day2EmployeeIds.includes(id));
      expect(overlap.length).toBeGreaterThan(0);
    });

    it('should assign employees in sequential order on first day', () => {
      const result = generateMonthlySchedule(config, { planNextWorkingDays: 1 });

      const day = result.schedule.days[0]!;

      // First 2 employees should be on daily shift
      expect(day.shift.dailyShift[0]?.employee.id).toBe(1); // John
      expect(day.shift.dailyShift[1]?.employee.id).toBe(2); // Jane

      // Next 2 employees should be on night shift
      expect(day.shift.nightShift[0]?.employee.id).toBe(3); // Bob
      expect(day.shift.nightShift[1]?.employee.id).toBe(4); // Alice
    });

    it('should handle different employeesPerShift values', () => {
      const customConfig = {
        ...config,
        shifts: {
          ...config.shifts,
          employeesPerShift: 1,
          daysFreeBetweenShifts: 0 // No rest period for multiple days
        }
      };

      const result = generateMonthlySchedule(customConfig, { planNextWorkingDays: 2 });

      result.schedule.days.forEach(day => {
        expect(day.shift.dailyShift).toHaveLength(1);
        expect(day.shift.nightShift).toHaveLength(1);
      });
    });
  });

  describe('date handling', () => {
    it('should create correct dates', () => {
      const result = generateMonthlySchedule(config, { planNextWorkingDays: 1 });

      expect(result.schedule.days[0]?.date.getFullYear()).toBe(2025);
      expect(result.schedule.days[0]?.date.getMonth()).toBe(8);
      expect(result.schedule.days[0]?.date.getDate()).toBe(1);
    });

    it('should set correct weekDay values', () => {
      const result = generateMonthlySchedule(config, { planNextWorkingDays: 1 });

      // January 1, 2024 is a Monday (1)
      expect(result.schedule.days[0]?.weekDay).toBe(1); // Monday
    });
  });

  describe('error handling', () => {
    it('should throw error when not enough employees for shifts', () => {
      const insufficientConfig = {
        ...config,
        employees: [
          { id: 1, firstName: 'John', lastName: 'Doe' },
        ], // Only 2 employees, need 4 for 2 per shift
        shifts: {
          ...config.shifts,
          employeesPerShift: 2
        }
      };

      expect(() => {
        generateMonthlySchedule(insufficientConfig, { planNextWorkingDays: 1 });
      }).toThrow('Not enough available employees for day shift on day 1');
    });

    it('should handle single day when enough employees available', () => {
      const insufficientConfig = {
        ...config,
        employees: [
          { id: 1, firstName: 'John', lastName: 'Doe' },
          { id: 2, firstName: 'Jane', lastName: 'Smith' },
          { id: 3, firstName: 'Bob', lastName: 'Johnson' },
          { id: 4, firstName: 'Alice', lastName: 'Brown' },
        ], // Exactly 4 employees for 2 per shift
        shifts: {
          ...config.shifts,
          employeesPerShift: 2
        }
      };

      const result = generateMonthlySchedule(insufficientConfig, { planNextWorkingDays: 1 });

      expect(result.schedule.days).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle zero planNextWorkingDays', () => {
      const result = generateMonthlySchedule(config, { planNextWorkingDays: 0 });

      expect(result.schedule.days).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle different months correctly', () => {
      const febConfig = {
        ...config,
        schedule: {
          ...config.schedule,
          month: 2 // February
        }
      };

      const result = generateMonthlySchedule(febConfig, { planNextWorkingDays: 1 });

      expect(result.schedule.month).toBe(2);
      expect(result.schedule.days[0]?.date.getMonth()).toBe(1); // February is 1
    });

    it('should maintain employee object references in shifts', () => {
      const result = generateMonthlySchedule(config, { planNextWorkingDays: 1 });

      const day = result.schedule.days[0]!;

      // Check that employee objects are properly referenced
      expect(day.shift.dailyShift[0]?.employee.firstName).toBe('John');
      expect(day.shift.dailyShift[0]?.employee.lastName).toBe('Doe');
      expect(day.shift.dailyShift[0]?.employee.id).toBe(1);
    });
  });

  describe('integration with createPlannerOptions', () => {
    it('should use createPlannerOptions internally', () => {
      const result = generateMonthlySchedule(config, { planNextWorkingDays: 1 });

      // The function should work with the options created by createPlannerOptions
      expect(result.schedule.days).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle options with only planNextWorkingDays specified', () => {
      const result = generateMonthlySchedule(config, { planNextWorkingDays: 1 });

      expect(result.schedule.days).toHaveLength(1);
      expect(result.schedule.year).toBe(2025);
      expect(result.schedule.month).toBe(9);
    });
  });
});
