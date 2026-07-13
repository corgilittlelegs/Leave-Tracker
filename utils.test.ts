import { describe, it, expect } from 'vitest';
import { calculateMonthStats, calculateBalancesChain } from './utils';
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

describe('calculateBalancesChain', () => {
  const baseSalary = 30000;
  const freeAbsents = 2;
  const actualToday = new Date(2026, 6, 15); // July 15, 2026

  it('returns 0 values if there is no historical data', () => {
    const targetDate = new Date(2026, 6, 1); // July 2026
    const res = calculateBalancesChain(targetDate, {}, [], {}, baseSalary, freeAbsents, actualToday);
    
    expect(res.outstandingBalance).toBe(0);
    expect(res.currentMonthPayouts).toBe(0);
    expect(res.unsettledMonths).toEqual([]);
  });

  it('calculates outstanding balances correctly across multiple months', () => {
    // Let's create history: May and June 2026.
    // In May, worker earned 30000 (auto-present). Cash advance was 2000. Net due = 28000.
    // May is unsettled (no entry in settlements). So 28000 carries forward to June.
    // In June, worker earned 30000 (auto-present). Cash advance was 1000.
    // Also, there was a payout in June of 5000 (paying off part of May's balance).
    // Total due at end of June = 30000 (June earned) - 1000 (June advance) + 28000 (May outstanding) - 5000 (June payout) = 52000.
    // Let's say June is settled with a payment of 40000 (e.g. settlements['2026-06'] = 40000).
    // Carried over to July should be: 52000 - 40000 = 12000.
    //
    // Also, during July, there is a payout of 4000.
    
    const attendance: AttendanceRecord = {};
    const cashAdvances = [
      { id: '1', amount: 2000, date: '2026-05-10', description: 'May advance', type: 'ADVANCE' as const },
      { id: '2', amount: 1000, date: '2026-06-05', description: 'June advance', type: 'ADVANCE' as const },
      { id: '3', amount: 5000, date: '2026-06-12', description: 'Part payout of May', type: 'PAYOUT' as const },
      { id: '4', amount: 4000, date: '2026-07-04', description: 'July payout', type: 'PAYOUT' as const }
    ];

    const settlements = {
      '2026-06': 40000 // settled June with 40000. May '2026-05' is unsettled.
    };

    const targetDate = new Date(2026, 6, 1); // July 2026
    const res = calculateBalancesChain(targetDate, attendance, cashAdvances, settlements, baseSalary, freeAbsents, actualToday);

    // May (2026-05):
    // Days in May: 31.
    // Earned: 30000. Advances: 2000. Payouts: 0. Running: 0.
    // Due: 28000.
    // Settled: Unsettled. Running outstanding carries forward = 28000.
    // Unsettled list contains: '2026-05'
    //
    // June (2026-06):
    // Days in June: 30.
    // Earned: 30000. Advances: 1000. Payouts: 5000.
    // Due: 30000 - 1000 + 28000 - 5000 = 52000.
    // Settled: 40000.
    // Carries forward to July = 52000 - 40000 = 12000.
    //
    // July target:
    // outstandingBalance = 12000.
    // currentMonthPayouts = 4000.
    // unsettledMonths = ['2026-05']

    expect(res.outstandingBalance).toBe(12000);
    expect(res.currentMonthPayouts).toBe(4000);
    expect(res.unsettledMonths).toEqual(['2026-05']);
  });
});
