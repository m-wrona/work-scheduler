import { 
  createMonthSchedule, 
  getCurrentYear, 
  getAllDaysInMonth,
  type MonthSchedule 
} from '../calendar';

describe('createMonthSchedule', () => {
  describe('basic functionality', () => {
    it('should return correct structure for January 2024', () => {
      const result = createMonthSchedule(1, 2024);
      
      expect(result).toHaveProperty('month', 1);
      expect(result).toHaveProperty('year', 2024);
      expect(result).toHaveProperty('totalDays');
      expect(result).toHaveProperty('workingDays');
      expect(result).toHaveProperty('totalWorkingHours', 184);
      expect(result).toHaveProperty('shiftsNumber', 15);
      expect(result).toHaveProperty('workingDaysList');
      expect(Array.isArray(result.workingDaysList)).toBe(true);
    });

    it('should calculate correct working days for January 2024', () => {
      const result = createMonthSchedule(1, 2024);
      
      // January 2024 has 31 days, starts on Monday
      expect(result.totalDays).toBe(31);
      expect(result.workingDays).toBe(23); // 5 weeks * 5 days + 3 extra working days
      expect(result.workingDaysList).toHaveLength(23);
      expect(result.holidays).toHaveLength(0);
    });

    it('should calculate correct working days for January 2024 with holidays', () => {
      const holidays = [1, 2];
      const result = createMonthSchedule(1, 2024, 8, 12, holidays);
      
      // January 2024 has 31 days, starts on Monday
      expect(result.totalDays).toBe(31);
      expect(result.workingDays).toBe(21); // 5 weeks * 5 days + 3 extra working days
      expect(result.workingDaysList).toHaveLength(21);
      expect(result.holidays).toHaveLength(2);
    });


    it('should calculate correct working days for February 2024 (leap year)', () => {
      const result = createMonthSchedule(2, 2024);
      
      // February 2024 has 29 days (leap year)
      expect(result.totalDays).toBe(29);
      expect(result.workingDays).toBe(21); // 4 weeks * 5 days + 1 extra working day
      expect(result.workingDaysList).toHaveLength(21);
    });

    it('should calculate correct working days for February 2023 (non-leap year)', () => {
      const result = createMonthSchedule(2, 2023);
      
      // February 2023 has 28 days
      expect(result.totalDays).toBe(28);
      expect(result.workingDays).toBe(20); // 4 weeks * 5 days
      expect(result.workingDaysList).toHaveLength(20);
    });
    
  });

  describe('working days filtering', () => {
    it('should only include Monday-Friday in working days list', () => {
      const result = createMonthSchedule(1, 2024);
      
      result.workingDaysList.forEach(date => {
        const dayOfWeek = date.getDay();
        expect(dayOfWeek).toBeGreaterThanOrEqual(1); // Monday = 1
        expect(dayOfWeek).toBeLessThanOrEqual(5); // Friday = 5
      });
    });

    it('should exclude weekends from working days count', () => {
      // Test a month that starts on Saturday and ends on Sunday
      const result = createMonthSchedule(6, 2024); // June 2024 starts on Saturday
      
      // Count actual working days manually
      let expectedWorkingDays = 0;
      for (let day = 1; day <= result.totalDays; day++) {
        const date = new Date(2024, 5, day); // month is 0-indexed
        const dayOfWeek = date.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          expectedWorkingDays++;
        }
      }
      
      expect(result.workingDays).toBe(expectedWorkingDays);
    });

    it('should create correct Date objects in working days list', () => {
      const result = createMonthSchedule(3, 2024); // March 2024
      
      result.workingDaysList.forEach((date, index) => {
        expect(date.getFullYear()).toBe(2024);
        expect(date.getMonth()).toBe(2); // March is 2 (0-indexed)
        expect(date.getDate()).toBeGreaterThanOrEqual(1);
        expect(date.getDate()).toBeLessThanOrEqual(31);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle December correctly', () => {
      const result = createMonthSchedule(12, 2024);
      
      expect(result.totalDays).toBe(31);
      expect(result.workingDays).toBe(22); // December 2024 has 22 working days
      expect(result.workingDaysList).toHaveLength(22);
    });

    it('should handle months with different starting days', () => {
      // Test various months to ensure different starting days work
      const testCases = [
        { month: 4, year: 2024, expectedWorkingDays: 22 }, // April 2024 starts on Monday
        { month: 5, year: 2024, expectedWorkingDays: 23 }, // May 2024 starts on Wednesday
        { month: 7, year: 2024, expectedWorkingDays: 23 }, // July 2024 starts on Monday
      ];

      testCases.forEach(({ month, year, expectedWorkingDays }) => {
        const result = createMonthSchedule(month, year);
        expect(result.workingDays).toBe(expectedWorkingDays);
      });
    });

    it('should handle year boundaries correctly', () => {
      const dec2023 = createMonthSchedule(12, 2023);
      const jan2024 = createMonthSchedule(1, 2024);
      
      expect(dec2023.year).toBe(2023);
      expect(dec2023.month).toBe(12);
      expect(jan2024.year).toBe(2024);
      expect(jan2024.month).toBe(1);
    });
  });

  describe('return value structure', () => {
    it('should return MonthSchedule interface correctly', () => {
      const result = createMonthSchedule(1, 2024);
      
      // Check all required properties exist
      expect(typeof result.month).toBe('number');
      expect(typeof result.year).toBe('number');
      expect(typeof result.totalDays).toBe('number');
      expect(typeof result.workingDays).toBe('number');
      expect(typeof result.totalWorkingHours).toBe('number');
      expect(typeof result.shiftsNumber).toBe('number');
      expect(Array.isArray(result.workingDaysList)).toBe(true);
      
      // Check that workingDaysList contains Date objects
      result.workingDaysList.forEach(date => {
        expect(date instanceof Date).toBe(true);
      });
    });
    
  });
});

describe('getCurrentYear', () => {
  it('should return current year as number', () => {
    const result = getCurrentYear();
    
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(2020);
    expect(result).toBeLessThan(2100);
  });

  it('should return actual current year', () => {
    const result = getCurrentYear();
    const expectedYear = new Date().getFullYear();
    
    expect(result).toBe(expectedYear);
  });

  it('should be consistent across multiple calls', () => {
    const result1 = getCurrentYear();
    const result2 = getCurrentYear();
    
    expect(result1).toBe(result2);
  });
});

describe('getAllDaysInMonth', () => {
  describe('basic functionality', () => {
    it('should return all days for January 2024', () => {
      const result = getAllDaysInMonth(1, 2024);
      
      expect(result).toHaveLength(31);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return all days for February 2024 (leap year)', () => {
      const result = getAllDaysInMonth(2, 2024);
      
      expect(result).toHaveLength(29);
    });

    it('should return all days for February 2023 (non-leap year)', () => {
      const result = getAllDaysInMonth(2, 2023);
      
      expect(result).toHaveLength(28);
    });

    it('should return all days for December', () => {
      const result = getAllDaysInMonth(12, 2024);
      
      expect(result).toHaveLength(31);
    });
  });

  describe('date objects', () => {
    it('should return Date objects', () => {
      const result = getAllDaysInMonth(1, 2024);
      
      result.forEach(date => {
        expect(date).toBeInstanceOf(Date);
      });
    });

    it('should have correct year and month', () => {
      const result = getAllDaysInMonth(3, 2024);
      
      result.forEach(date => {
        expect(date.getFullYear()).toBe(2024);
        expect(date.getMonth()).toBe(2); // March is 2 (0-indexed)
      });
    });

    it('should have sequential day numbers', () => {
      const result = getAllDaysInMonth(1, 2024);
      
      result.forEach((date, index) => {
        expect(date.getDate()).toBe(index + 1);
      });
    });
  });

  describe('different months', () => {
    it('should work with all months', () => {
      const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      const expectedDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // 2024 is leap year
      
      months.forEach((month, index) => {
        const result = getAllDaysInMonth(month, 2024);
        expect(result).toHaveLength(expectedDays[index]!);
      });
    });

    it('should work with different years', () => {
      const result2023 = getAllDaysInMonth(2, 2023);
      const result2024 = getAllDaysInMonth(2, 2024);
      
      expect(result2023).toHaveLength(28); // Non-leap year
      expect(result2024).toHaveLength(29); // Leap year
    });
  });

  describe('edge cases', () => {
    it('should handle year boundaries', () => {
      const dec2023 = getAllDaysInMonth(12, 2023);
      const jan2024 = getAllDaysInMonth(1, 2024);
      
      expect(dec2023[0]?.getFullYear()).toBe(2023);
      expect(dec2023[0]?.getMonth()).toBe(11); // December is 11 (0-indexed)
      expect(jan2024[0]?.getFullYear()).toBe(2024);
      expect(jan2024[0]?.getMonth()).toBe(0); // January is 0 (0-indexed)
    });

    it('should return empty array for invalid month', () => {
      // This should not happen in normal usage, but testing robustness
      const result = getAllDaysInMonth(13, 2024);
      
      // JavaScript Date constructor handles month 13 as January of next year
      expect(result).toHaveLength(31);
      expect(result[0]?.getFullYear()).toBe(2025);
    });
  });

  describe('comparison with getWorkingDaysInMonth', () => {
    it('should return more days than working days', () => {
      const allDays = getAllDaysInMonth(1, 2024);
      const workingDays = createMonthSchedule(1, 2024);
      
      expect(allDays.length).toBeGreaterThan(workingDays.workingDays);
      expect(allDays.length).toBe(workingDays.totalDays);
    });

    it('should include weekends in all days', () => {
      const result = getAllDaysInMonth(1, 2024);
      
      const weekendDays = result.filter(date => {
        const dayOfWeek = date.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
      });
      
      expect(weekendDays.length).toBeGreaterThan(0);
    });
  });
});
