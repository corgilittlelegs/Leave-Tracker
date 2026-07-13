import React, { useMemo, useState } from 'react';
import { X, Printer, Download, Calendar, Banknote, Shield, CheckCircle, FileText, User, CreditCard } from 'lucide-react';
import { AttendanceRecord, CashAdvance, MonthStats } from '../types';
import { MONTH_NAMES } from '../constants';

interface MonthlySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  attendance: AttendanceRecord;
  stats: MonthStats;
  baseSalary: number;
  cashAdvances: CashAdvance[];
  totalMonthlyCashAdvances: number;
  netPayable: number;
  freeAbsentsPerMonth: number;
  syncCode: string | null;
  outstandingBalance: number;
  currentMonthPayouts: number;
}

export const MonthlySummaryModal: React.FC<MonthlySummaryModalProps> = ({
  isOpen,
  onClose,
  currentDate,
  attendance,
  stats,
  baseSalary,
  cashAdvances,
  totalMonthlyCashAdvances,
  netPayable,
  freeAbsentsPerMonth,
  syncCode,
  outstandingBalance,
  currentMonthPayouts,
}) => {
  const [maidName, setMaidName] = useState<string>('');
  const [employerName, setEmployerName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const monthName = MONTH_NAMES[currentMonth];

  // Filter cash advances for the current month
  const activeMonthAdvances = useMemo(() => {
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    return cashAdvances.filter((adv) => adv.date.startsWith(monthPrefix));
  }, [cashAdvances, currentYear, currentMonth]);

  // Generate day-by-day attendance list
  const daysInMonthList = useMemo(() => {
    const days: Array<{
      dayNum: number;
      dateStr: string;
      dayName: string;
      status: 'PRESENT_MARKED' | 'PRESENT_AUTO' | 'ABSENT_CHARGED' | 'ABSENT_PAID' | 'FUTURE';
      statusText: string;
      amount: number;
    }> = [];

    const totalDays = stats.totalDays;
    const today = new Date();
    const comparisonToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Keep track of absent count to determine paid leave vs charged absent
    let absentCounter = 0;

    for (let i = 1; i <= totalDays; i++) {
      const dDate = new Date(currentYear, currentMonth, i);
      const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayName = dDate.toLocaleDateString('en-US', { weekday: 'short' });
      const record = attendance[dStr];

      const isPastOrToday = dDate <= comparisonToday;
      let status: 'PRESENT_MARKED' | 'PRESENT_AUTO' | 'ABSENT_CHARGED' | 'ABSENT_PAID' | 'FUTURE' = 'PRESENT_AUTO';
      let statusText = 'Present (Auto)';
      let amount = stats.dailyRate;

      if (isPastOrToday) {
        if (record === 'ABSENT') {
          absentCounter++;
          if (absentCounter <= freeAbsentsPerMonth) {
            status = 'ABSENT_PAID';
            statusText = 'Absent (Paid Leave)';
            amount = stats.dailyRate;
          } else {
            status = 'ABSENT_CHARGED';
            statusText = 'Absent (Charged)';
            amount = 0;
          }
        } else if (record === 'PRESENT') {
          status = 'PRESENT_MARKED';
          statusText = 'Present (Marked)';
          amount = stats.dailyRate;
        } else {
          status = 'PRESENT_AUTO';
          statusText = 'Present (Auto)';
          amount = stats.dailyRate;
        }
      } else {
        // Future days
        if (record === 'PRESENT') {
          status = 'PRESENT_MARKED';
          statusText = 'Present (Marked)';
          amount = stats.dailyRate;
        } else if (record === 'ABSENT') {
          absentCounter++;
          if (absentCounter <= freeAbsentsPerMonth) {
            status = 'ABSENT_PAID';
            statusText = 'Absent (Paid Leave)';
            amount = stats.dailyRate;
          } else {
            status = 'ABSENT_CHARGED';
            statusText = 'Absent (Charged)';
            amount = 0;
          }
        } else {
          status = 'FUTURE';
          statusText = 'Unmarked / Upcoming';
          amount = 0;
        }
      }

      days.push({
        dayNum: i,
        dateStr: dStr,
        dayName,
        status,
        statusText,
        amount: Math.round(amount),
      });
    }

    return days;
  }, [currentYear, currentMonth, attendance, stats, freeAbsentsPerMonth]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto print:p-0 print:bg-white print:absolute print:inset-0 animate-fade-in">
      
      {/* Modal Card wrapper - print styles force it to occupy the whole screen with no rounded corners/shadows */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden print:shadow-none print:border-none print:max-h-full print:rounded-none print:w-full print:h-full animate-zoom-in">
        
        {/* Header - Hidden during print */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 dark:bg-indigo-950/50 p-1.5 rounded-lg text-indigo-700 dark:text-indigo-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Monthly Pay Slip Creator</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Customize, review and print summary for the maid</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Customizer Panel - Hidden during print */}
        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-slate-100 dark:border-slate-800/80 px-6 py-4 shrink-0 print:hidden">
          <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-2.5">
            1. Slip Personalization (Optional)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Maid Name
              </label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. Geeta Bai"
                  value={maidName}
                  onChange={(e) => setMaidName(e.target.value)}
                  className="pl-8 block w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 font-medium"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Employer / House
              </label>
              <div className="relative">
                <Shield className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. Sharma Family (Flat 402)"
                  value={employerName}
                  onChange={(e) => setEmployerName(e.target.value)}
                  className="pl-8 block w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 font-medium"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Payment Method
              </label>
              <div className="relative">
                <CreditCard className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="pl-8 block w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-800 font-medium cursor-pointer"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI / GPay / PhonePe">UPI (GPay / PhonePe)</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable slip container - Perfectly styled for full page high contrast layout */}
        <div className="flex-1 overflow-y-auto p-8 print:p-0 print:overflow-visible bg-white dark:bg-slate-900">
          <div className="max-w-3xl mx-auto space-y-6 print:max-w-full">
            
            {/* Slip Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-800 dark:border-slate-700 pb-4 gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">
                  Aide Attendance & Salary Statement
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Generated via Aide • Secure Cloud Sync ID: <span className="font-mono text-indigo-600 dark:text-indigo-400 print:text-slate-800 font-bold">{syncCode || 'OFFLINE'}</span>
                </p>
              </div>
              <div className="bg-slate-900 dark:bg-slate-800 text-white px-4 py-2 rounded-lg text-center shrink-0 print:border print:border-slate-800 print:text-black print:bg-white">
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 print:text-slate-600">Month Statement</p>
                <p className="text-sm font-bold">{monthName} {currentYear}</p>
              </div>
            </div>

            {/* Custom Information Info Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/40 print:bg-white print:border-slate-300">
              <div className="space-y-1">
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Payee Information</h4>
                <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                  <p><span className="font-semibold text-slate-500">Maid Name:</span> <span className="font-bold text-slate-800 dark:text-slate-100">{maidName || '__________________'}</span></p>
                  <p><span className="font-semibold text-slate-500">Employer / House:</span> <span className="font-bold text-slate-800 dark:text-slate-100">{employerName || '__________________'}</span></p>
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Statement Details</h4>
                <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                  <p><span className="font-semibold text-slate-500">Preferred Pay:</span> <span className="font-bold text-slate-800 dark:text-slate-100">{paymentMethod}</span></p>
                  <p><span className="font-semibold text-slate-500">Statement Date:</span> <span className="font-bold text-slate-800 dark:text-slate-100">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
                </div>
              </div>
            </div>

            {/* Core Calculations Block */}
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2">1. Attendance & Pay Breakdown</h3>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300 print:bg-slate-100">
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-right">Details</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-600 dark:text-slate-400">
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">Monthly Base Salary</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">Flat rate</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800 dark:text-slate-100">₹{baseSalary.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">Daily Wage Rate</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">₹{baseSalary.toLocaleString()} / {stats.totalDays} days</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-800 dark:text-slate-200 font-medium">₹{stats.dailyRate.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">Days Worked</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">{stats.daysWorked} days</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">+₹{Math.round(stats.daysWorked * stats.dailyRate).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">Allowed Paid Leaves (Utilized)</td>
                      <td className="py-2.5 px-3 text-right text-indigo-600 dark:text-indigo-400 font-bold">
                        {Math.min(stats.absentDays, freeAbsentsPerMonth)} of {freeAbsentsPerMonth} days allowed
                      </td>
                      <td className="py-2.5 px-3 text-right text-indigo-600 dark:text-indigo-400 font-bold">
                        +₹{Math.round(Math.min(stats.absentDays, freeAbsentsPerMonth) * stats.dailyRate).toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">Deductible Leaves (Charged Absents)</td>
                      <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400 font-bold">{stats.deductibleAbsents} days deducted</td>
                      <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400 font-bold">
                        -₹{Math.round(stats.deductibleAbsents * stats.dailyRate).toLocaleString()}
                      </td>
                    </tr>
                     <tr className="bg-slate-50/50 dark:bg-slate-900/30 print:bg-white font-semibold text-slate-800 dark:text-slate-200">
                      <td className="py-2.5 px-3">Gross Accrued Pay</td>
                      <td className="py-2.5 px-3 text-right text-slate-500">Payable Days: {stats.daysWorked + Math.min(stats.absentDays, freeAbsentsPerMonth)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800 dark:text-slate-100">₹{Math.round(stats.finalSalary).toLocaleString()}</td>
                    </tr>
                    <tr className="text-amber-700 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/20 print:bg-white font-semibold">
                      <td className="py-2.5 px-3">Less: Total Cash Advances</td>
                      <td className="py-2.5 px-3 text-right">In-month advances requested</td>
                      <td className="py-2.5 px-3 text-right font-bold">-₹{totalMonthlyCashAdvances.toLocaleString()}</td>
                    </tr>
                    {outstandingBalance > 0 && (
                      <tr className="text-indigo-700 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20 print:bg-white font-semibold">
                        <td className="py-2.5 px-3">Previous Outstanding Balance</td>
                        <td className="py-2.5 px-3 text-right">Unpaid balance from past months</td>
                        <td className="py-2.5 px-3 text-right font-bold">+₹{outstandingBalance.toLocaleString()}</td>
                      </tr>
                    )}
                    {currentMonthPayouts > 0 && (
                      <tr className="text-emerald-700 dark:text-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/20 print:bg-white font-semibold">
                        <td className="py-2.5 px-3">Less: Outstanding Balance Paid</td>
                        <td className="py-2.5 px-3 text-right">Payments made against past balance</td>
                        <td className="py-2.5 px-3 text-right font-bold">-₹{currentMonthPayouts.toLocaleString()}</td>
                      </tr>
                    )}
                    <tr className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 font-extrabold text-sm border-t-2 border-emerald-600 dark:border-emerald-500 print:bg-white">
                      <td className="py-3 px-3">Net Due Amount Payable</td>
                      <td className="py-3 px-3 text-right uppercase text-[10px] tracking-wider text-emerald-800 dark:text-emerald-400">Final Take-Home</td>
                      <td className="py-3 px-3 text-right text-emerald-700 dark:text-emerald-300 text-lg">₹{netPayable.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cash Advances Sub-section */}
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2">2. In-Month Advances Statement</h3>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {activeMonthAdvances.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-900/30 print:bg-white">
                    No cash advances requested or paid out during {monthName} {currentYear}.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300 print:bg-slate-100">
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Reason / Description</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-600 dark:text-slate-400">
                       {activeMonthAdvances.map((adv) => {
                        const parts = adv.date.split('-');
                        const formatted = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
                          .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        return (
                          <tr key={adv.id}>
                            <td className="py-2 px-3 font-mono text-slate-500 dark:text-slate-500">{formatted}</td>
                            <td className="py-2 px-3 text-slate-800 dark:text-slate-200">
                              <span>{adv.description || (adv.type === 'PAYOUT' ? 'Outstanding Balance Payout' : 'Cash Advance')}</span>
                              {adv.type === 'PAYOUT' && (
                                <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-350 print:border print:border-emerald-500">
                                  Payout
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-700 dark:text-slate-200">₹{adv.amount.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-slate-50 dark:bg-slate-900/30 font-bold text-slate-800 dark:text-slate-200 print:bg-white">
                        <td colSpan={2} className="py-2 px-3 text-right">Total Advance Deducted</td>
                        <td className="py-2 px-3 text-right text-amber-700 dark:text-amber-400 font-mono">₹{totalMonthlyCashAdvances.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Daily Attendance Ledger Pagebreak-friendly compact grid */}
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-2">3. Day-by-Day Attendance Audit</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {daysInMonthList.map((day) => {
                  let statusBg = 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800';
                  let textCol = 'text-slate-700 dark:text-slate-300';
                  let dotCol = 'bg-slate-400 dark:bg-slate-500';

                  if (day.status === 'PRESENT_MARKED') {
                    statusBg = 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50';
                    textCol = 'text-emerald-950 dark:text-emerald-200';
                    dotCol = 'bg-emerald-500';
                  } else if (day.status === 'PRESENT_AUTO') {
                    statusBg = 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-950/30';
                    textCol = 'text-emerald-900 dark:text-emerald-300/80';
                    dotCol = 'bg-emerald-300';
                  } else if (day.status === 'ABSENT_CHARGED') {
                    statusBg = 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50';
                    textCol = 'text-rose-950 dark:text-rose-200';
                    dotCol = 'bg-rose-500';
                  } else if (day.status === 'ABSENT_PAID') {
                    statusBg = 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50';
                    textCol = 'text-indigo-950 dark:text-indigo-200';
                    dotCol = 'bg-indigo-500';
                  } else if (day.status === 'FUTURE') {
                    statusBg = 'bg-slate-50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800';
                    textCol = 'text-slate-400 dark:text-slate-500';
                    dotCol = 'bg-slate-200 dark:bg-slate-700';
                  }

                  return (
                    <div
                      key={day.dayNum}
                      className={`border rounded-lg p-2 flex flex-col justify-between h-[52px] ${statusBg} transition-all`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="font-mono text-slate-800 dark:text-slate-300">{day.dayNum} {day.dayName}</span>
                        <div className={`w-2 h-2 rounded-full ${dotCol}`}></div>
                      </div>
                      <div className="flex items-end justify-between mt-0.5">
                        <span className={`text-[9px] font-medium truncate max-w-[90px] ${textCol}`}>{day.statusText}</span>
                        <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 font-mono">₹{day.amount}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Signature Area */}
            <div className="pt-8 border-t border-dashed border-slate-300 dark:border-slate-700 mt-12">
              <div className="grid grid-cols-2 gap-12">
                <div className="text-center">
                  <div className="border-b border-slate-400 dark:border-slate-600 h-10 w-48 mx-auto"></div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-2">Employer Signature</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Approved & Disbursed</p>
                </div>
                <div className="text-center">
                  <div className="border-b border-slate-400 dark:border-slate-600 h-10 w-48 mx-auto"></div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-2">Employee / Maid Signature</p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Received & Verified</p>
                </div>
              </div>
            </div>

            {/* Bottom Footer watermark */}
            <p className="text-center text-[9px] text-slate-450 dark:text-slate-500 pt-8 italic print:pt-4">
              * This is a computer-generated attendance ledger and pay statement managed via Aide.
            </p>

          </div>
        </div>

      </div>
    </div>
  );
};
