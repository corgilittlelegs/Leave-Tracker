import React from 'react';
import { MonthStats } from '../types';

interface SalaryVisualizationProps {
  stats: MonthStats;
  freeAbsentsPerMonth: number;
}

export const SalaryVisualization: React.FC<SalaryVisualizationProps> = ({ stats, freeAbsentsPerMonth }) => {
  const { totalDays, daysWorked, absentDays, deductibleAbsents } = stats;
  
  const paidLeaves = Math.min(absentDays, freeAbsentsPerMonth);
  const remainingDays = Math.max(0, totalDays - daysWorked - absentDays);
  
  const totalTracked = daysWorked + absentDays;
  const attendanceRate = totalTracked > 0 ? Math.round((daysWorked / totalTracked) * 100) : 100;
  const monthProgress = Math.round((totalTracked / totalDays) * 100);

  // Percentages for the stacked bar
  const workedPct = (daysWorked / totalDays) * 100;
  const paidLeavePct = (paidLeaves / totalDays) * 100;
  const unpaidAbsentPct = (deductibleAbsents / totalDays) * 100;
  const remainingPct = (remainingDays / totalDays) * 100;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Monthly Overview</h3>
        <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
          Stats
        </span>
      </div>

      {/* Meaningful Metrics */}
      <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 rounded-lg p-3">
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold block">Attendance Rate</span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-slate-800 dark:text-white">{attendanceRate}%</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">present</span>
          </div>
        </div>
        <div className="space-y-0.5 border-l border-slate-200 dark:border-slate-700 pl-3">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold block">Month Tracked</span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-slate-800 dark:text-white">{monthProgress}%</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{totalTracked}/{totalDays}d</span>
          </div>
        </div>
      </div>

      {/* Custom Sleek Stacked Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span className="text-slate-500 dark:text-slate-400">Month Progress Track</span>
          <span className="text-slate-400 dark:text-slate-500">{totalDays} days total</span>
        </div>
        <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex shadow-inner border border-slate-200/50 dark:border-slate-700/50">
          {daysWorked > 0 && (
            <div 
              style={{ width: `${workedPct}%` }} 
              className="bg-emerald-500 h-full transition-all duration-300"
              title={`Worked: ${daysWorked} days`}
            />
          )}
          {paidLeaves > 0 && (
            <div 
              style={{ width: `${paidLeavePct}%` }} 
              className="bg-amber-400 h-full transition-all duration-300"
              title={`Paid Leaves: ${paidLeaves} days`}
            />
          )}
          {deductibleAbsents > 0 && (
            <div 
              style={{ width: `${unpaidAbsentPct}%` }} 
              className="bg-rose-500 h-full transition-all duration-300"
              title={`Unpaid Absences: ${deductibleAbsents} days`}
            />
          )}
          {remainingDays > 0 && (
            <div 
              style={{ width: `${remainingPct}%` }} 
              className="bg-slate-200 dark:bg-slate-600 h-full transition-all duration-300"
              title={`Remaining: ${remainingDays} days`}
            />
          )}
        </div>
      </div>

      {/* Legend list - space saving but highly readable */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded bg-emerald-500 shrink-0"></span>
            <span className="text-slate-500 dark:text-slate-400 truncate">Worked</span>
          </div>
          <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">{daysWorked}d</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded bg-amber-400 shrink-0"></span>
            <span className="text-slate-500 dark:text-slate-400 truncate">Paid Leave</span>
          </div>
          <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">{paidLeaves}d</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded bg-rose-500 shrink-0"></span>
            <span className="text-slate-500 dark:text-slate-400 truncate">Unpaid Abs.</span>
          </div>
          <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">{deductibleAbsents}d</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded bg-slate-200 dark:bg-slate-600 shrink-0"></span>
            <span className="text-slate-500 dark:text-slate-400 truncate">Remaining</span>
          </div>
          <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">{remainingDays}d</span>
        </div>
      </div>
    </div>
  );
};
