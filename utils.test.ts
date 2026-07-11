import { describe, it, expect } from 'vitest';
import { calculateMonthStats } from './utils';
import { AttendanceRecord } from './types';

describe('calculateMonthStats', () => {
  const baseSalary = 30000;
  const freeAbsents = 2;
  const july2026 = new Date(2026, 6, 15); // July has 31 days
  const actualToday = new Date(2026, 6, 15); // July 15, 2026

  it('calculates stats correctly for no absences (all days present/auto-present up to today)', () => {
    const attendance: AttendanceRecord = {};
    const stats = calculateMonthStats(july2026, attendance, baseSalary, freeAbsents, actualToday);
    
    // Up to July 15, there are 15 days of auto-presence. Future days are unmarked (0).
    expect(stats.totalDays).toBe(31);
    expect(stats.daysWorked).toBe(15);
    expect(stats.absentDays).toBe(0);
    expect(stats.deductibleAbsents).toBe(0);
    expect(stats.dailyRate).toBeCloseTo(30000 / 31, 2);
    expect(stats.finalSalary).toBeCloseTo((15 * 30000) / 31, 2);
  });

  it('handles absences within allowed paid leaves', () => {
    // 2 absences marked before today
    const attendance: AttendanceRecord = {
      '2026-07-05': 'ABSENT',
      '2026-07-10': 'ABSENT',
    };
    
    const stats = calculateMonthStats(july2026, attendance, baseSalary, freeAbsents, actualToday);
    
    // Worked days: 15 (past/today) - 2 (absences) = 13 days
    expect(stats.daysWorked).toBe(13);
    expect(stats.absentDays).toBe(2);
    expect(stats.deductibleAbsents).toBe(0); // 2 allowed leaves fully cover it
    // Payable days: 13 (worked) + 2 (paid leaves) = 15 days
    expect(stats.finalSalary).toBeCloseTo((15 * 30000) / 31, 2);
  });

  it('handles absences exceeding allowed paid leaves', () => {
    // 3 absences marked before today (allowed leaves is 2)
    const attendance: AttendanceRecord = {
      '2026-07-05': 'ABSENT',
      '2026-07-10': 'ABSENT',
      '2026-07-12': 'ABSENT',
    };
    
    const stats = calculateMonthStats(july2026, attendance, baseSalary, freeAbsents, actualToday);
    
    // Worked days: 15 - 3 = 12 days
    expect(stats.daysWorked).toBe(12);
    expect(stats.absentDays).toBe(3);
    expect(stats.deductibleAbsents).toBe(1); // 3 - 2 = 1 charged absence
    // Payable days: 12 (worked) + 2 (paid leaves) = 14 days
    expect(stats.finalSalary).toBeCloseTo((14 * 30000) / 31, 2);
  });

  it('counts explicit future presence or absence', () => {
    const attendance: AttendanceRecord = {
      '2026-07-20': 'PRESENT', // future present
      '2026-07-25': 'ABSENT',  // future absent (exceeds allowed since we have no other leaves)
    };
    
    const stats = calculateMonthStats(july2026, attendance, baseSalary, 0, actualToday);
    
    // Worked days: 15 (auto-present for past/today) + 1 (explicit future present) = 16 days
    expect(stats.daysWorked).toBe(16);
    expect(stats.absentDays).toBe(1);
    expect(stats.deductibleAbsents).toBe(1); // 0 allowed leaves
    expect(stats.finalSalary).toBeCloseTo((16 * 30000) / 31, 2);
  });

  it('returns zero stats if baseSalary is 0', () => {
    const stats = calculateMonthStats(july2026, {}, 0, freeAbsents, actualToday);
    expect(stats.dailyRate).toBe(0);
    expect(stats.finalSalary).toBe(0);
  });
});
