import { AttendanceRecord, MonthStats, CashAdvance } from './types';

/**
 * Safely reads and parses a JSON value from localStorage, falling back to
 * `fallback` if the key is absent or the stored value is corrupt.
 */
export function readJSON<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;
  try {
    return JSON.parse(saved) as T;
  } catch (e) {
    console.error(`Failed to parse localStorage key "${key}"`, e);
    return fallback;
  }
}

/**
 * Calculates attendance and salary statistics for a specific month.
 * 
 * @param currentDate The currently viewed date (used to determine month and year)
 * @param attendance The attendance registry mapping date strings (YYYY-MM-DD) to status
 * @param baseSalary The user's configured monthly base salary
 * @param freeAbsentsPerMonth The user's allowed paid leaves per month
 * @param actualToday Stable date reference representing "today"
 */
/**
 * Resolves the effective start date (YYYY-MM) for calculations.
 * If configStartDate is set, use it. Otherwise, fallback to the earliest month with any data.
 */
export function getEffectiveStartDate(
  configStartDate: string | undefined,
  attendance: AttendanceRecord,
  cashAdvances: CashAdvance[],
  settlements: { [monthStr: string]: number } | undefined
): string {
  if (configStartDate) return configStartDate;

  const allMonthKeysSet = new Set<string>();

  Object.keys(attendance).forEach(dateStr => {
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      allMonthKeysSet.add(`${parts[0]}-${parts[1]}`);
    }
  });

  cashAdvances.forEach(adv => {
    const parts = adv.date.split('-');
    if (parts.length >= 2) {
      allMonthKeysSet.add(`${parts[0]}-${parts[1]}`);
    }
  });

  if (settlements) {
    Object.keys(settlements).forEach(monthKey => {
      allMonthKeysSet.add(monthKey);
    });
  }

  const allMonths = Array.from(allMonthKeysSet).sort();
  if (allMonths.length > 0) {
    return allMonths[0]; // Earliest month with data
  }

  // Fallback to current calendar month
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Calculates attendance and salary statistics for a specific month.
 * 
 * @param currentDate The currently viewed date (used to determine month and year)
 * @param attendance The attendance registry mapping date strings (YYYY-MM-DD) to status
 * @param baseSalary The user's configured monthly base salary
 * @param freeAbsentsPerMonth The user's allowed paid leaves per month
 * @param actualToday Stable date reference representing "today"
 * @param effectiveStartDate The effective start date (YYYY-MM) before which the app is inactive
 */
export function calculateMonthStats(
  currentDate: Date,
  attendance: AttendanceRecord,
  baseSalary: number,
  freeAbsentsPerMonth: number,
  actualToday: Date,
  effectiveStartDate: string
): MonthStats {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  // If this month is before the onboarding start month, return 0 stats
  if (currentMonthStr < effectiveStartDate) {
    return {
      totalDays,
      daysWorked: 0,
      absentDays: 0,
      deductibleAbsents: 0,
      dailyRate: 0,
      finalSalary: 0
    };
  }
  
  // Per day rate logic: Based on *current* active month total days
  const dailyRate = totalDays > 0 ? baseSalary / totalDays : 0;

  let daysWorked = 0;
  let absentDays = 0;
  
  // Normalize today to start of day for comparison
  const comparisonToday = new Date(actualToday);
  comparisonToday.setHours(0, 0, 0, 0);

  // Iterate through all days of the specific month to count status
  for (let i = 1; i <= totalDays; i++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const dDate = new Date(year, month, i);
    const status = attendance[dStr];
    
    const isPastOrToday = dDate <= comparisonToday;

    if (isPastOrToday) {
       // Logic: Assume present up to current date unless marked absent
       if (status === 'ABSENT') {
          absentDays++;
       } else {
          // Either explicitly PRESENT or Implicitly PRESENT (Unmarked)
          daysWorked++;
       }
    } else {
       // Future days: Only count if explicitly marked
       if (status === 'PRESENT') daysWorked++;
       if (status === 'ABSENT') absentDays++;
    }
  }
  
  const paidLeaveDays = Math.min(absentDays, freeAbsentsPerMonth);
  const payableDays = daysWorked + paidLeaveDays;
  
  const finalSalary = payableDays * dailyRate;
  const deductibleAbsents = Math.max(0, absentDays - freeAbsentsPerMonth);

  return {
    totalDays,
    daysWorked,
    absentDays,
    deductibleAbsents,
    dailyRate,
    finalSalary
  };
}

/**
 * Calculates outstanding balances carried forward, target month's payouts,
 * and identifies any unsettled past months.
 */
export function calculateBalancesChain(
  targetDate: Date,
  attendance: AttendanceRecord,
  cashAdvances: CashAdvance[],
  settlements: { [monthStr: string]: number } | undefined,
  baseSalary: number,
  freeAbsentsPerMonth: number,
  actualToday: Date,
  effectiveStartDate: string
): {
  outstandingBalance: number; // Carried over into the target month
  currentMonthPayouts: number; // Total PAYOUT transactions recorded in target month
  unsettledMonths: string[]; // List of YYYY-MM keys of all past months that are unsettled
} {
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth(); // 0-indexed

  const allMonthKeysSet = new Set<string>();
  
  // Fill all months from effectiveStartDate up to targetMonth
  const [firstYear, firstMonth] = effectiveStartDate.split('-').map(Number);
  let tempDate = new Date(firstYear, firstMonth - 1, 1);
  const stopDate = new Date(targetYear, targetMonth, 1);
  while (tempDate < stopDate) {
    const yr = tempDate.getFullYear();
    const mth = String(tempDate.getMonth() + 1).padStart(2, '0');
    allMonthKeysSet.add(`${yr}-${mth}`);
    tempDate.setMonth(tempDate.getMonth() + 1);
  }

  // Add other months with actual data, only if they are >= effectiveStartDate
  Object.keys(attendance).forEach(dateStr => {
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const monthKey = `${parts[0]}-${parts[1]}`;
      if (monthKey >= effectiveStartDate) {
        allMonthKeysSet.add(monthKey);
      }
    }
  });

  cashAdvances.forEach(adv => {
    const parts = adv.date.split('-');
    if (parts.length >= 2) {
      const monthKey = `${parts[0]}-${parts[1]}`;
      if (monthKey >= effectiveStartDate) {
        allMonthKeysSet.add(monthKey);
      }
    }
  });

  if (settlements) {
    Object.keys(settlements).forEach(monthKey => {
      if (monthKey >= effectiveStartDate) {
        allMonthKeysSet.add(monthKey);
      }
    });
  }

  // Sort chronologically
  const chronologicalMonths = Array.from(allMonthKeysSet).sort();

  let runningOutstanding = 0;
  const unsettledMonths: string[] = [];
  let currentMonthPayouts = 0;

  const targetMonthStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;

  for (const monthStr of chronologicalMonths) {
    const [year, month1Indexed] = monthStr.split('-').map(Number);
    const month0Indexed = month1Indexed - 1;
    const currentLoopDate = new Date(year, month0Indexed, 1);

    // Sum payouts and advances for this month loop
    const monthAdvances = cashAdvances.filter(adv => adv.date.startsWith(monthStr));
    const totalAdvances = monthAdvances
      .filter(adv => !adv.type || adv.type === 'ADVANCE')
      .reduce((sum, adv) => sum + adv.amount, 0);
    const totalPayouts = monthAdvances
      .filter(adv => adv.type === 'PAYOUT')
      .reduce((sum, adv) => sum + adv.amount, 0);

    if (monthStr === targetMonthStr) {
      currentMonthPayouts = totalPayouts;
      // We do not add the target month's own stats to runningOutstanding yet, 
      // because target month is currently active/selected.
      break;
    }

    // This is a past month relative to the target month.
    // Calculate stats for this past month
    const stats = calculateMonthStats(currentLoopDate, attendance, baseSalary, freeAbsentsPerMonth, actualToday, effectiveStartDate);
    const grossAccrued = stats.finalSalary;
    
    // Total due at the end of this past month
    const totalDue = grossAccrued - totalAdvances + runningOutstanding - totalPayouts;

    // Check settlement
    const isSettled = settlements && (monthStr in settlements);
    const settledAmount = isSettled ? (settlements[monthStr] ?? 0) : 0;

    if (!isSettled) {
      // It's unsettled. Add to list of unsettled months.
      unsettledMonths.push(monthStr);
    }

    // Compute outstanding carried forward to the next month in the chain
    runningOutstanding = Math.max(0, totalDue - settledAmount);
  }

  return {
    outstandingBalance: runningOutstanding,
    currentMonthPayouts,
    unsettledMonths
  };
}
