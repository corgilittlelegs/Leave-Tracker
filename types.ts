export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'UNMARKED';

export interface AttendanceRecord {
  [dateString: string]: AttendanceStatus;
}

export interface CashAdvance {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
}

export interface MonthStats {
  totalDays: number;
  daysWorked: number;
  absentDays: number;
  deductibleAbsents: number;
  dailyRate: number;
  finalSalary: number;
}
