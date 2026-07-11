import React from 'react';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { DAYS_OF_WEEK, MONTH_NAMES } from '../constants';
import { AttendanceStatus } from '../types';

interface AttendanceCalendarProps {
  currentDate: Date;
  today: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  attendance: Record<string, AttendanceStatus>;
  onDateClick: (dateStr: string) => void;
  isReadOnly?: boolean;
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  currentDate,
  today,
  onPrevMonth,
  onNextMonth,
  attendance,
  onDateClick,
  isReadOnly = false,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  // Normalize today for comparison
  const normalizedToday = new Date(today);
  normalizedToday.setHours(0, 0, 0, 0);

  const getStatusColor = (status: AttendanceStatus | undefined, isImplicit: boolean) => {
    switch (status) {
      case 'PRESENT':
        return isImplicit 
          ? `bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50 ${isReadOnly ? '' : 'hover:bg-emerald-200 dark:hover:bg-emerald-950/60'}` // Implicit look
          : `bg-emerald-500 dark:bg-emerald-600 text-white border-emerald-600 dark:border-emerald-700 ${isReadOnly ? '' : 'hover:bg-emerald-600 dark:hover:bg-emerald-500'}`; // Explicit look
      case 'ABSENT':
        return `bg-rose-500 dark:bg-rose-600 text-white border-rose-600 dark:border-rose-700 ${isReadOnly ? '' : 'hover:bg-rose-600 dark:hover:bg-rose-500'}`;
      default:
        return `bg-slate-50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/50 ${isReadOnly ? '' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'}`;
    }
  };

  const getStatusLabel = (status: AttendanceStatus | undefined, isImplicit: boolean) => {
    switch (status) {
      case 'PRESENT': return isImplicit ? 'AUTO' : 'P';
      case 'ABSENT': return 'A';
      default: return '';
    }
  };

  const renderDays = () => {
    const days = [];
    
    // Empty cells for days before start of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 sm:h-14"></div>);
    }

    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayDate = new Date(year, month, day);
      
      const isPastOrToday = dayDate <= normalizedToday;
      const rawStatus = attendance[dateStr];
      
      // Logic: If unmarked and past/today, assume PRESENT (Implicit)
      let displayStatus: AttendanceStatus = 'UNMARKED';
      let isImplicit = false;

      if (rawStatus) {
        displayStatus = rawStatus;
      } else if (isPastOrToday) {
        displayStatus = 'PRESENT';
        isImplicit = true;
      }

      const isToday = new Date().toDateString() === dayDate.toDateString();

      days.push(
        <button
          key={dateStr}
          onClick={() => !isReadOnly && onDateClick(dateStr)}
          disabled={isReadOnly}
          className={`
            relative h-10 sm:h-14 rounded-lg border text-sm sm:text-base font-medium transition-all
            flex items-center justify-center flex-col
            ${getStatusColor(displayStatus, isImplicit)}
            ${isToday ? 'ring-2 ring-indigo-400 dark:ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : ''}
            ${isReadOnly ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}
          `}
        >
          <span>{day}</span>
          {displayStatus !== 'UNMARKED' && (
            <span className={`text-[10px] uppercase font-bold mt-[-2px] sm:mt-0 ${isImplicit ? 'opacity-60' : 'opacity-80'}`}>
              {getStatusLabel(displayStatus, isImplicit)}
            </span>
          )}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 overflow-hidden">
      {/* Calendar Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <span>{MONTH_NAMES[month]} {year}</span>
          {isReadOnly && (
            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs px-2 py-0.5 rounded-full font-medium">
              <Lock className="w-3.5 h-3.5" /> Closed
            </span>
          )}
        </h2>
        <div className="flex space-x-2">
          <button onClick={onPrevMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-colors cursor-pointer">
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
          <button onClick={onNextMonth} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-colors cursor-pointer">
            <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {renderDays()}
        </div>
      </div>
      
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap justify-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600"></div>
          <span className="font-medium text-slate-600 dark:text-slate-300">Present (Marked)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50"></div>
          <span className="font-medium text-slate-600 dark:text-slate-300">Present (Auto)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-rose-500 border border-rose-600"></div>
          <span className="font-medium text-slate-600 dark:text-slate-300">Absent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50"></div>
          <span className="font-medium text-slate-600 dark:text-slate-300">Unmarked / Future</span>
        </div>
      </div>
    </div>
  );
};