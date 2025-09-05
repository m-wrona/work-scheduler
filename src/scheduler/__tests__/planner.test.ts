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
      nextShiftDate: undefined
    }));

    currentDate = new Date(2024, 0, 1); // January 1, 2024
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

    it('should update nextShiftDate for assigned employees', () => {
      const daysFreeAfterShift = 2;
      const result = assignShiftsForDay(employees, 2, daysFreeAfterShift, currentDate);

      const expectedNextDate = new Date(currentDate);
      expectedNextDate.setDate(currentDate.getDate() + daysFreeAfterShift + 1);

      // Check that assigned employees have their nextShiftDate updated
      result.dailyShift.forEach(emp => {
        expect(emp.nextShiftDate).toEqual(expectedNextDate);
      });

      result.nightShift.forEach(emp => {
        expect(emp.nextShiftDate).toEqual(expectedNextDate);
      });

      // Check that unassigned employees still have undefined nextShiftDate
      expect(employees[4]?.nextShiftDate).toBeUndefined(); // Charlie
      expect(employees[5]?.nextShiftDate).toBeUndefined(); // Diana
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

      const expectedNextDate = new Date(currentDate);
      expectedNextDate.setDate(currentDate.getDate() + 1); // 0 + 1 = 1 day later

      result.dailyShift.forEach(emp => {
        expect(emp.nextShiftDate).toEqual(expectedNextDate);
      });
    });
  });

  describe('employee availability filtering', () => {
    it('should only assign available employees (no nextShiftDate restriction)', () => {
      // All employees are available (nextShiftDate is undefined)
      const result = assignShiftsForDay(employees, 2, 1, currentDate);
      
      expect(result.dailyShift).toHaveLength(2);
      expect(result.nightShift).toHaveLength(2);
    });

    it('should skip employees with nextShiftDate in the future', () => {
      // Set some employees as unavailable
      const futureDate = new Date(currentDate);
      futureDate.setDate(currentDate.getDate() + 2);
      
      employees[0]!.nextShiftDate = futureDate; // John unavailable
      employees[1]!.nextShiftDate = futureDate; // Jane unavailable

      const result = assignShiftsForDay(employees, 2, 1, currentDate);

      // Should skip John and Jane, assign Bob, Alice, Charlie, Diana
      expect(result.dailyShift[0]?.employee.id).toBe(3); // Bob
      expect(result.dailyShift[1]?.employee.id).toBe(4); // Alice
      expect(result.nightShift[0]?.employee.id).toBe(5); // Charlie
      expect(result.nightShift[1]?.employee.id).toBe(6); // Diana
    });

    it('should include employees with nextShiftDate on or before current date', () => {
      // Set some employees as available
      const pastDate = new Date(currentDate);
      pastDate.setDate(currentDate.getDate() - 1);
      
      employees[0]!.nextShiftDate = pastDate; // John available (past date)
      employees[1]!.nextShiftDate = currentDate; // Jane available (same date)

      const result = assignShiftsForDay(employees, 2, 1, currentDate);

      expect(result.dailyShift[0]?.employee.id).toBe(1); // John
      expect(result.dailyShift[1]?.employee.id).toBe(2); // Jane
    });

    it('should handle mixed availability correctly', () => {
      // Set up mixed availability
      const futureDate = new Date(currentDate);
      futureDate.setDate(currentDate.getDate() + 2);
      const pastDate = new Date(currentDate);
      pastDate.setDate(currentDate.getDate() - 1);

      employees[0]!.nextShiftDate = futureDate; // John unavailable
      employees[1]!.nextShiftDate = pastDate;   // Jane available
      employees[2]!.nextShiftDate = undefined;  // Bob available
      employees[3]!.nextShiftDate = currentDate; // Alice available

      const result = assignShiftsForDay(employees, 2, 1, currentDate);

      // Should assign Jane, Bob, Alice, Charlie (skipping John)
      expect(result.dailyShift[0]?.employee.id).toBe(2); // Jane
      expect(result.dailyShift[1]?.employee.id).toBe(3); // Bob
      expect(result.nightShift[0]?.employee.id).toBe(4); // Alice
      expect(result.nightShift[1]?.employee.id).toBe(5); // Charlie
    });
  });

  describe('error handling', () => {
    it('should throw error when not enough available employees', () => {
      // Make most employees unavailable
      const futureDate = new Date(currentDate);
      futureDate.setDate(currentDate.getDate() + 2);
      
      employees.forEach(emp => {
        emp.nextShiftDate = futureDate;
      });

      expect(() => {
        assignShiftsForDay(employees, 2, 1, currentDate);
      }).toThrow('Not enough available employees for day 1. Required: 4, Available: 0');
    });

    it('should throw error when exactly one employee short', () => {
      // Make 3 employees available (need 4 for 2 per shift)
      const futureDate = new Date(currentDate);
      futureDate.setDate(currentDate.getDate() + 2);
      
      employees[0]!.nextShiftDate = futureDate; // John unavailable
      employees[1]!.nextShiftDate = futureDate; // Jane unavailable
      employees[2]!.nextShiftDate = futureDate; // Bob unavailable
      // Alice, Charlie, Diana are available

      expect(() => {
        assignShiftsForDay(employees, 2, 1, currentDate);
      }).toThrow('Not enough available employees for day 1. Required: 4, Available: 3');
    });

    it('should include correct date in error message', () => {
      const testDate = new Date(2024, 5, 15); // June 15, 2024
      const futureDate = new Date(testDate);
      futureDate.setDate(testDate.getDate() + 2);
      
      employees.forEach(emp => {
        emp.nextShiftDate = futureDate;
      });

      expect(() => {
        assignShiftsForDay(employees, 2, 1, testDate);
      }).toThrow('Not enough available employees for day 15. Required: 4, Available: 0');
    });
  });

  describe('edge cases', () => {
    it('should handle empty employees array', () => {
      expect(() => {
        assignShiftsForDay([], 1, 1, currentDate);
      }).toThrow('Not enough available employees for day 1. Required: 2, Available: 0');
    });

    it('should handle single employee with sufficient availability', () => {
      const singleEmployee = [employees[0]!];
      
      expect(() => {
        assignShiftsForDay(singleEmployee, 1, 1, currentDate);
      }).toThrow('Not enough available employees for day 1. Required: 2, Available: 1');
    });

    it('should handle large daysFreeAfterShift values', () => {
      const largeDaysFree = 30;
      const result = assignShiftsForDay(employees, 2, largeDaysFree, currentDate);

      const expectedNextDate = new Date(currentDate);
      expectedNextDate.setDate(currentDate.getDate() + largeDaysFree + 1);

      result.dailyShift.forEach(emp => {
        expect(emp.nextShiftDate).toEqual(expectedNextDate);
      });
    });

    it('should not modify original employee objects except nextShiftDate', () => {
      const originalEmployees = JSON.parse(JSON.stringify(employees));
      
      assignShiftsForDay(employees, 2, 1, currentDate);

      // Check that employee data is unchanged
      employees.forEach((emp, index) => {
        expect(emp.employee).toEqual(originalEmployees[index].employee);
        expect(emp.shifts).toEqual(originalEmployees[index].shifts);
        // nextShiftDate may have changed for assigned employees
      });
    });
  });

  describe('sequential assignment', () => {
    it('should maintain strict sequential order without reordering', () => {
      // Create employees with specific IDs to test ordering
      const orderedEmployees: EmployeeShifts[] = [
        { employee: { id: 10, firstName: 'First', lastName: 'Employee' }, shifts: [], nextShiftDate: undefined },
        { employee: { id: 20, firstName: 'Second', lastName: 'Employee' }, shifts: [], nextShiftDate: undefined },
        { employee: { id: 30, firstName: 'Third', lastName: 'Employee' }, shifts: [], nextShiftDate: undefined },
        { employee: { id: 40, firstName: 'Fourth', lastName: 'Employee' }, shifts: [], nextShiftDate: undefined },
        { employee: { id: 50, firstName: 'Fifth', lastName: 'Employee' }, shifts: [], nextShiftDate: undefined },
        { employee: { id: 60, firstName: 'Sixth', lastName: 'Employee' }, shifts: [], nextShiftDate: undefined },
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
        daysFreeBetweenShifts: 1
      },
      schedule: {
        timezone: 'UTC',
        month: 1 // January
      }
    };
  });

  describe('basic functionality', () => {
    it('should generate schedule for 1 day with small planNextWorkingDays', () => {
      const result = generateMonthlySchedule(config, 2024, { planNextWorkingDays: 1 });

      expect(result.schedule.year).toBe(2024);
      expect(result.schedule.month).toBe(1);
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

      const result = generateMonthlySchedule(zeroRestConfig, 2024, { planNextWorkingDays: 2 });

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

    it('should use config month when no options provided', () => {
      const result = generateMonthlySchedule(config, 2024, { planNextWorkingDays: 1 });

      expect(result.schedule.month).toBe(1); // From config
      expect(result.schedule.year).toBe(2024);
    });

    it('should use provided year parameter', () => {
      const result = generateMonthlySchedule(config, 2023, { planNextWorkingDays: 1 });

      expect(result.schedule.year).toBe(2023);
      expect(result.schedule.month).toBe(1);
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

      const result = generateMonthlySchedule(zeroRestConfig, 2024, { planNextWorkingDays: 2 });

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
      const result = generateMonthlySchedule(config, 2024, { planNextWorkingDays: 1 });

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

      const result = generateMonthlySchedule(customConfig, 2024, { planNextWorkingDays: 2 });

      result.schedule.days.forEach(day => {
        expect(day.shift.dailyShift).toHaveLength(1);
        expect(day.shift.nightShift).toHaveLength(1);
      });
    });
  });

  describe('date handling', () => {
    it('should create correct dates for January 2024', () => {
      const result = generateMonthlySchedule(config, 2024, { planNextWorkingDays: 1 });

      expect(result.schedule.days[0]?.date.getFullYear()).toBe(2024);
      expect(result.schedule.days[0]?.date.getMonth()).toBe(0); // January is 0
      expect(result.schedule.days[0]?.date.getDate()).toBe(1);
    });

    it('should set correct weekDay values', () => {
      const result = generateMonthlySchedule(config, 2024, { planNextWorkingDays: 1 });

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
          { id: 2, firstName: 'Jane', lastName: 'Smith' },
        ], // Only 2 employees, need 4 for 2 per shift
        shifts: {
          ...config.shifts,
          employeesPerShift: 2
        }
      };

      expect(() => {
        generateMonthlySchedule(insufficientConfig, 2024, { planNextWorkingDays: 1 });
      }).toThrow('Not enough available employees for day 1');
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

      const result = generateMonthlySchedule(insufficientConfig, 2024, { planNextWorkingDays: 1 });
      
      expect(result.schedule.days).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle zero planNextWorkingDays', () => {
      const result = generateMonthlySchedule(config, 2024, { planNextWorkingDays: 0 });

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

      const result = generateMonthlySchedule(febConfig, 2024, { planNextWorkingDays: 1 });

      expect(result.schedule.month).toBe(2);
      expect(result.schedule.days[0]?.date.getMonth()).toBe(1); // February is 1
    });

    it('should maintain employee object references in shifts', () => {
      const result = generateMonthlySchedule(config, 2024, { planNextWorkingDays: 1 });

      const day = result.schedule.days[0]!;
      
      // Check that employee objects are properly referenced
      expect(day.shift.dailyShift[0]?.employee.firstName).toBe('John');
      expect(day.shift.dailyShift[0]?.employee.lastName).toBe('Doe');
      expect(day.shift.dailyShift[0]?.employee.id).toBe(1);
    });
  });

  describe('integration with createPlannerOptions', () => {
    it('should use createPlannerOptions internally', () => {
      const result = generateMonthlySchedule(config, 2024, { planNextWorkingDays: 1 });

      // The function should work with the options created by createPlannerOptions
      expect(result.schedule.days).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle options with only planNextWorkingDays specified', () => {
      const result = generateMonthlySchedule(config, 2024, { planNextWorkingDays: 1 });

      expect(result.schedule.days).toHaveLength(1);
      expect(result.schedule.year).toBe(2024);
      expect(result.schedule.month).toBe(1); // From config
    });
  });
});
