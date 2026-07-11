import { AttendanceRecord, MonthStats } from './types';

/**
 * Calculates attendance and salary statistics for a specific month.
 * 
 * @param currentDate The currently viewed date (used to determine month and year)
 * @param attendance The attendance registry mapping date strings (YYYY-MM-DD) to status
 * @param baseSalary The user's configured monthly base salary
 * @param freeAbsentsPerMonth The user's allowed paid leaves per month
 * @param actualToday Stable date reference representing "today"
 */
export function calculateMonthStats(
  currentDate: Date,
  attendance: AttendanceRecord,
  baseSalary: number,
  freeAbsentsPerMonth: number,
  actualToday: Date
): MonthStats {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  
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
