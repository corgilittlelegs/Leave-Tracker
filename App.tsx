import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, CalendarCheck, CalendarX, Calculator, Coins, Download, Sliders, Lock, Cloud, Copy, Check, RefreshCw, AlertCircle, Trash2, Banknote, FileText, Moon, Sun } from 'lucide-react';
import { AttendanceCalendar } from './components/AttendanceCalendar';
import { StatCard } from './components/StatCard';
import { SalaryVisualization } from './components/SalaryVisualization';
import { CashAdvances } from './components/CashAdvances';
import { MonthlySummaryModal } from './components/MonthlySummaryModal';
import { AttendanceRecord, AttendanceStatus, MonthStats, CashAdvance } from './types';
import { BASE_SALARY, FREE_ABSENTS_PER_MONTH, MONTH_NAMES } from './constants';
import { generateSyncCode, saveTrackerData, subscribeToTracker, checkSyncCodeExists, updateSingleAttendance, addCashAdvance, deleteCashAdvance, updateConfig } from './firebase';
import { calculateMonthStats } from './utils';

const App: React.FC = () => {
  // --- Dark Mode State ---
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // --- State ---
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [attendance, setAttendance] = useState<AttendanceRecord>({});
  const [isSummaryOpen, setIsSummaryOpen] = useState<boolean>(false);
  const [cashAdvances, setCashAdvances] = useState<CashAdvance[]>(() => {
    const saved = localStorage.getItem('maid-cash-advances');
    return saved ? JSON.parse(saved) : [];
  });

  // Configurable base salary and paid leaves per month
  const [baseSalary, setBaseSalary] = useState<number>(() => {
    const saved = localStorage.getItem('maid-base-salary');
    return saved ? Number(saved) : BASE_SALARY;
  });
  const [freeAbsentsPerMonth, setFreeAbsentsPerMonth] = useState<number>(() => {
    const saved = localStorage.getItem('maid-free-absents');
    return saved ? Number(saved) : FREE_ABSENTS_PER_MONTH;
  });

  // Local string inputs to ensure smooth backspacing/typing
  const [salaryInput, setSalaryInput] = useState<string>(() => {
    const saved = localStorage.getItem('maid-base-salary');
    return saved ? saved : BASE_SALARY.toString();
  });
  const [leavesInput, setLeavesInput] = useState<string>(() => {
    const saved = localStorage.getItem('maid-free-absents');
    return saved ? saved : FREE_ABSENTS_PER_MONTH.toString();
  });

  // Use a stable reference for "today" to avoid hydration mismatches or inconsistencies during render cycles
  const actualToday = useMemo(() => new Date(), []);

  // Compute if the displayed month is a past month relative to current actual month
  const isPastMonth = useMemo(() => {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const todayYear = actualToday.getFullYear();
    const todayMonth = actualToday.getMonth();

    return currentYear < todayYear || (currentYear === todayYear && currentMonth < todayMonth);
  }, [currentDate, actualToday]);

  // --- Firebase Cloud Sync State ---
  const [syncCode, setSyncCode] = useState<string>(() => {
    return localStorage.getItem('maid-sync-code') || '';
  });
  const [isSyncReady, setIsSyncReady] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [linkInput, setLinkInput] = useState<string>('');
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const [leavesError, setLeavesError] = useState<string | null>(null);

  // 1. Initial Local Storage Cache loading
  useEffect(() => {
    const saved = localStorage.getItem('maid-attendance-data');
    if (saved) {
      try {
        setAttendance(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved attendance", e);
      }
    }
    const savedAdvances = localStorage.getItem('maid-cash-advances');
    if (savedAdvances) {
      try {
        setCashAdvances(JSON.parse(savedAdvances));
      } catch (e) {
        console.error("Failed to parse saved cash advances", e);
      }
    }
  }, []);

  // 2. Local Storage Cache saving (for offline resilience)
  useEffect(() => {
    if (Object.keys(attendance).length > 0) {
      localStorage.setItem('maid-attendance-data', JSON.stringify(attendance));
    }
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem('maid-cash-advances', JSON.stringify(cashAdvances));
  }, [cashAdvances]);

  useEffect(() => {
    localStorage.setItem('maid-base-salary', String(baseSalary));
  }, [baseSalary]);

  useEffect(() => {
    localStorage.setItem('maid-free-absents', String(freeAbsentsPerMonth));
  }, [freeAbsentsPerMonth]);

  // 3. Make sure we have a valid syncCode on start
  useEffect(() => {
    if (!syncCode) {
      const newCode = generateSyncCode();
      setSyncCode(newCode);
      localStorage.setItem('maid-sync-code', newCode);
    }
  }, [syncCode]);

  // 4. Firestore real-time listener to sync remote changes
  useEffect(() => {
    if (!syncCode) return;

    setIsSyncing(true);
    setSyncError(null);

    const unsubscribe = subscribeToTracker(syncCode, (data) => {
      setIsSyncing(false);
      if (data) {
        // Remote data exists. Conditionally update state only if different.
        const remoteAtt = data.attendance || {};
        const remoteSal = data.baseSalary ?? BASE_SALARY;
        const remoteLeaves = data.freeAbsentsPerMonth ?? FREE_ABSENTS_PER_MONTH;
        const remoteAdvances = data.cashAdvances || [];

        setAttendance(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(remoteAtt)) {
            return remoteAtt;
          }
          return prev;
        });

        setBaseSalary(prev => {
          if (prev !== remoteSal) {
            setSalaryInput(String(remoteSal));
            return remoteSal;
          }
          return prev;
        });

        setFreeAbsentsPerMonth(prev => {
          if (prev !== remoteLeaves) {
            setLeavesInput(String(remoteLeaves));
            return remoteLeaves;
          }
          return prev;
        });

        setCashAdvances(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(remoteAdvances)) {
            return remoteAdvances;
          }
          return prev;
        });

        setIsSyncReady(true);
      } else {
        // Document does not exist in Firestore yet (newly generated code).
        // Save local state to Firestore as the starting source of truth.
        saveTrackerData(syncCode, {
          attendance,
          baseSalary,
          freeAbsentsPerMonth,
          cashAdvances
        }).then(() => {
          setIsSyncReady(true);
        }).catch((err) => {
          console.error("Error setting initial document:", err);
          setIsSyncReady(true);
        });
      }
    });

    return () => unsubscribe();
  }, [syncCode]);

  // 5. Save settings configurations back to Firestore (debounced to avoid constant writing)
  useEffect(() => {
    if (!isSyncReady || !syncCode) return;

    const timer = setTimeout(() => {
      updateConfig(syncCode, baseSalary, freeAbsentsPerMonth);
    }, 500);

    return () => clearTimeout(timer);
  }, [baseSalary, freeAbsentsPerMonth, isSyncReady, syncCode]);

  const handleSalaryInputChange = (val: string) => {
    setSalaryInput(val);
    if (val.trim() === '') {
      setSalaryError('Salary cannot be empty.');
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0 || String(num) !== val.trim()) {
      setSalaryError('Please enter a valid positive integer.');
    } else {
      setSalaryError(null);
      setBaseSalary(num);
    }
  };

  const handleLeavesInputChange = (val: string) => {
    setLeavesInput(val);
    if (val.trim() === '') {
      setLeavesError('Leaves count cannot be empty.');
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0 || String(num) !== val.trim()) {
      setLeavesError('Please enter a valid positive integer.');
    } else {
      setLeavesError(null);
      setFreeAbsentsPerMonth(num);
    }
  };

  // --- Handlers for Firebase Sync ---
  const handleCopySyncCode = () => {
    if (!syncCode) return;
    navigator.clipboard.writeText(syncCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLinkDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCode = linkInput.toUpperCase().trim();
    if (!targetCode) return;

    if (targetCode === syncCode) {
      setSyncError("Already connected to this Sync Code!");
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const exists = await checkSyncCodeExists(targetCode);
      if (exists) {
        localStorage.setItem('maid-sync-code', targetCode);
        setSyncCode(targetCode);
        setLinkInput('');
        setIsSyncReady(false);
      } else {
        setIsSyncing(false);
        setSyncError("Code not found. Please double-check the code from your other device.");
      }
    } catch (err) {
      setIsSyncing(false);
      setSyncError("Failed to check code. Please try again.");
    }
  };

  const handleGenerateNewCode = () => {
    const newCode = generateSyncCode();
    localStorage.setItem('maid-sync-code', newCode);
    setSyncCode(newCode);
    setIsSyncReady(false);
    setIsDisconnecting(false);
  };

  const handleAddAdvance = (amount: number, date: string, description: string) => {
    const newAdvance: CashAdvance = {
      id: Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
      amount,
      date,
      description
    };
    setCashAdvances(prev => [...prev, newAdvance]);
    if (isSyncReady && syncCode) {
      addCashAdvance(syncCode, newAdvance);
    }
  };

  const handleDeleteAdvance = (id: string) => {
    const targetAdvance = cashAdvances.find(adv => adv.id === id);
    if (!targetAdvance) return;
    setCashAdvances(prev => prev.filter(adv => adv.id !== id));
    if (isSyncReady && syncCode) {
      deleteCashAdvance(syncCode, targetAdvance);
    }
  };

  // --- Handlers ---
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const toggleAttendance = (dateStr: string) => {
    if (isPastMonth) return;
    
    const current = attendance[dateStr] || 'UNMARKED';
    let next: AttendanceStatus = 'UNMARKED';
    if (current === 'UNMARKED') next = 'ABSENT';
    else if (current === 'ABSENT') next = 'PRESENT';
    else if (current === 'PRESENT') next = 'UNMARKED';

    setAttendance(prev => {
      const newData = { ...prev };
      if (next === 'UNMARKED') {
        delete newData[dateStr];
      } else {
        newData[dateStr] = next;
      }
      return newData;
    });

    if (isSyncReady && syncCode) {
      updateSingleAttendance(syncCode, dateStr, next);
    }
  };

  const downloadCSV = (period: 'month' | 'year') => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    let start: Date;
    let end: Date;

    if (period === 'month') {
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 0);
    } else {
      start = new Date(year, 0, 1);
      // Determine end of year
      end = new Date(year, 11, 31);
    }

    const rows = [['Date', 'Day', 'Status', 'Type']];
    const loopDate = new Date(start);
    const todayNormalized = new Date(actualToday);
    todayNormalized.setHours(0,0,0,0);

    while (loopDate <= end) {
      const y = loopDate.getFullYear();
      const m = String(loopDate.getMonth() + 1).padStart(2, '0');
      const d = String(loopDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      
      const rawStatus = attendance[dateStr];
      const dayName = loopDate.toLocaleDateString('en-US', { weekday: 'short' });
      
      let exportStatus = 'Unmarked';
      let type = '-';

      if (rawStatus) {
        exportStatus = rawStatus === 'PRESENT' ? 'Present' : 'Absent';
        type = 'Manual';
      } else if (loopDate <= todayNormalized) {
        exportStatus = 'Present';
        type = 'Auto';
      }

      rows.push([dateStr, dayName, exportStatus, type]);
      
      // Advance by 1 day
      loopDate.setDate(loopDate.getDate() + 1);
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(row => row.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MaidAttendance_${period}_${year}_${period === 'month' ? MONTH_NAMES[month] : 'Full'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Calculations ---
  const stats: MonthStats = useMemo(() => {
    return calculateMonthStats(currentDate, attendance, baseSalary, freeAbsentsPerMonth, actualToday);
  }, [currentDate, attendance, baseSalary, freeAbsentsPerMonth, actualToday]);

  // --- Cash Advance Calculations ---
  const totalMonthlyCashAdvances = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // 1-indexed
    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;

    return cashAdvances
      .filter(adv => adv.date.startsWith(prefix))
      .reduce((sum, adv) => sum + adv.amount, 0);
  }, [cashAdvances, currentDate]);

  const netPayable = useMemo(() => {
    return Math.max(0, Math.round(stats.finalSalary) - totalMonthlyCashAdvances);
  }, [stats.finalSalary, totalMonthlyCashAdvances]);


  // --- Render ---
  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-12 transition-colors duration-200">
      {/* Navbar */}
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 print:hidden transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">MaidPay</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Attendance & Salary Tracker</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
                </button>
                <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-100 dark:border-indigo-900 shadow-sm">
                    Base: ₹{baseSalary.toLocaleString()}
                </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 print:hidden">
        
        {/* Header Stats Section */}
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                    Dashboard for {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <div className="flex flex-row flex-wrap sm:flex-nowrap gap-2 w-full md:w-auto items-stretch justify-start">
                    <button 
                      onClick={() => setIsSummaryOpen(true)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all hover:scale-[1.02] shadow-xs cursor-pointer"
                    >
                        <FileText className="w-4 h-4" />
                        <span>Print Slip</span>
                    </button>
                    <button 
                      onClick={() => downloadCSV('month')}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-all hover:scale-[1.02] shadow-xs cursor-pointer"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export Month</span>
                    </button>
                    <button 
                      onClick={() => downloadCSV('year')}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white transition-all hover:scale-[1.02] shadow-xs cursor-pointer"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export Year</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard 
                label="Accrued Salary" 
                value={`₹${Math.round(stats.finalSalary).toLocaleString()}`} 
                icon={Wallet} 
                colorClass="bg-indigo-500 text-indigo-600"
                subtext={`For ${stats.daysWorked + Math.min(stats.absentDays, freeAbsentsPerMonth)} paid days`}
            />
            <StatCard 
                label="Cash Advances" 
                value={`₹${totalMonthlyCashAdvances.toLocaleString()}`} 
                icon={Banknote} 
                colorClass="bg-amber-500 text-amber-600"
                subtext="Total asked in between"
            />
            <StatCard 
                label="Net Due Pay" 
                value={`₹${netPayable.toLocaleString()}`} 
                icon={Wallet} 
                colorClass="bg-emerald-500 text-emerald-600"
                subtext="Accrued minus advances"
            />
            <StatCard 
                label="Days Worked" 
                value={`${stats.daysWorked} / ${stats.totalDays}`} 
                icon={CalendarCheck} 
                colorClass="bg-slate-500 text-slate-600"
                subtext={`Absent: ${stats.absentDays} (${stats.deductibleAbsents} charged)`}
            />
            </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Calendar (Takes up 2 cols) */}
          <div className="lg:col-span-2 space-y-6">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Attendance Register</h3>
                    {isPastMonth ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50 shadow-xs">
                        <Lock className="w-3 h-3" /> Closed & Saved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                      </span>
                    )}
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                    {isPastMonth ? "Historical records are read-only" : "Tap day to toggle status"}
                </span>
             </div>
             <AttendanceCalendar 
                currentDate={currentDate}
                today={actualToday}
                onNextMonth={handleNextMonth}
                onPrevMonth={handlePrevMonth}
                attendance={attendance}
                onDateClick={toggleAttendance}
                isReadOnly={isPastMonth}
             />

             {/* Salary & Policy Settings */}
             <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                   <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                   Salary & Policy Configuration
                </h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="base-salary-input" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Monthly Base Salary (₹)
                    </label>
                    <div className="relative rounded-lg shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-slate-400 dark:text-slate-500 sm:text-sm">₹</span>
                      </div>
                      <input
                        type="text"
                        name="base-salary"
                        id="base-salary-input"
                        className={`block w-full rounded-lg bg-white dark:bg-slate-900 border pl-7 pr-3 py-2 text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-1 sm:text-sm outline-none transition-all text-sm font-medium ${salaryError ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500'}`}
                        placeholder="e.g. 1300"
                        value={salaryInput}
                        onChange={(e) => handleSalaryInputChange(e.target.value)}
                      />
                    </div>
                    {salaryError && (
                      <p className="text-[11px] text-rose-500 mt-1 font-medium">{salaryError}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="free-leaves-input" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Allowed Paid Leaves / Month
                    </label>
                    <input
                      type="text"
                      name="free-leaves"
                      id="free-leaves-input"
                      className={`block w-full rounded-lg bg-white dark:bg-slate-900 border px-3 py-2 text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-1 sm:text-sm outline-none transition-all text-sm font-medium ${leavesError ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500'}`}
                      placeholder="e.g. 2"
                      value={leavesInput}
                      onChange={(e) => handleLeavesInputChange(e.target.value)}
                    />
                    {leavesError && (
                      <p className="text-[11px] text-rose-500 mt-1 font-medium">{leavesError}</p>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-lg p-3 border border-slate-100 dark:border-slate-800 space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">How this is calculated:</p>
                  <p>• Daily rate: <code className="font-mono text-indigo-600 dark:text-indigo-400">₹Salary / Days in month</code> (₹{baseSalary.toLocaleString()} / {stats.totalDays} days = ₹{stats.dailyRate.toFixed(2)}/day).</p>
                  <p>• Days until today are assumed <span className="font-semibold text-emerald-600 dark:text-emerald-400">Present</span> by default unless marked <span className="font-semibold text-rose-600 dark:text-rose-400">Absent</span>.</p>
                  <p>• Up to <span className="font-semibold text-slate-800 dark:text-slate-200">{freeAbsentsPerMonth} days</span> of marked absences are counted as fully paid leaves.</p>
                </div>
             </div>
          </div>

          {/* Right: Charts & Breakdown (Takes up 1 col) */}
          <div className="space-y-6">
            {/* Cloud Sync & Backup Card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded-lg">
                    <Cloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">Cloud Sync & Backup</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Continuous background sync</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 px-2.5 py-1 rounded-full">
                  <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {isSyncing ? 'Syncing' : 'Live'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Your device Sync Code</span>
                  <button 
                    onClick={handleCopySyncCode}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300 tracking-wider text-center py-1 bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 rounded-md select-all">
                  {syncCode || 'Generating...'}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
                  Share this code with your other devices to sync real-time!
                </p>
              </div>

              {/* Link other device form */}
              <form onSubmit={handleLinkDevice} className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Link with another device
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="e.g. MP-ABCD-EFGH"
                    className="block w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-700 dark:text-white font-mono placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={isSyncing || !linkInput.trim()}
                    className="px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-850 dark:disabled:text-slate-600 rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                  >
                    Link
                  </button>
                </div>
                {syncError && (
                  <div className="flex items-start gap-1 text-rose-600 dark:text-rose-400 text-[11px] mt-1 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-md p-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{syncError}</span>
                  </div>
                )}
              </form>

              {/* Disconnect / Reset option */}
              <div className="pt-2 flex justify-between items-center text-[11px]">
                {isDisconnecting ? (
                  <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 p-1.5 rounded-md w-full justify-between animate-fade-in">
                    <span className="text-rose-700 dark:text-rose-300 font-medium">Reset sync code?</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={handleGenerateNewCode}
                        className="px-2 py-0.5 bg-rose-600 text-white font-semibold rounded hover:bg-rose-700 transition-colors cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDisconnecting(false)}
                        className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="text-slate-400 dark:text-slate-500">Need a fresh start?</span>
                    <button
                      type="button"
                      onClick={() => setIsDisconnecting(true)}
                      className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors font-medium cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Disconnect Code
                    </button>
                  </>
                )}
              </div>
            </div>

            <SalaryVisualization stats={stats} freeAbsentsPerMonth={freeAbsentsPerMonth} />

            <CashAdvances
              cashAdvances={cashAdvances}
              currentDate={currentDate}
              baseSalary={baseSalary}
              onAddAdvance={handleAddAdvance}
              onDeleteAdvance={handleDeleteAdvance}
            />
            
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Calculation Detail</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Daily Rate</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">₹{stats.dailyRate.toFixed(2)}</span>
                    </div>
                    
                    <div className="border-t border-slate-100 dark:border-slate-700/50 my-2"></div>
                    
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Days Worked (Auto/Marked)</span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium">{stats.daysWorked}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Paid Leaves (Max {freeAbsentsPerMonth})</span>
                        <span className="font-semibold">+{Math.min(stats.absentDays, freeAbsentsPerMonth)}</span>
                    </div>
                    
                    <div className="flex justify-between font-medium text-slate-800 dark:text-slate-200 pt-1">
                        <span>Total Payable Days</span>
                        <span>{stats.daysWorked + Math.min(stats.absentDays, freeAbsentsPerMonth)}</span>
                    </div>

                    <div className="flex justify-between text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700/50 pt-2">
                        <span>Accrued Salary</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">₹{Math.round(stats.finalSalary).toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between text-amber-600 dark:text-amber-400">
                        <span>Cash Advances</span>
                        <span className="font-medium">-₹{totalMonthlyCashAdvances.toLocaleString()}</span>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-dashed border-slate-300 dark:border-slate-700 flex justify-between items-center">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Net Due Payment</span>
                        <span className="font-bold text-xl text-emerald-600 dark:text-emerald-400">₹{netPayable.toLocaleString()}</span>
                    </div>
                     <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
                        *Future unmarked days are not included
                    </p>
                </div>
            </div>
          </div>
        </div>
      </main>

      <MonthlySummaryModal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        currentDate={currentDate}
        attendance={attendance}
        stats={stats}
        baseSalary={baseSalary}
        cashAdvances={cashAdvances}
        totalMonthlyCashAdvances={totalMonthlyCashAdvances}
        netPayable={netPayable}
        freeAbsentsPerMonth={freeAbsentsPerMonth}
        syncCode={syncCode}
      />
    </div>
  );
};

export default App;