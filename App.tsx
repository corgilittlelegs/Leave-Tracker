import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, CalendarCheck, CalendarX, Calculator, Coins, Download, Sliders, Lock, Cloud, Copy, Check, RefreshCw, AlertCircle, Trash2, Banknote, FileText, Moon, Sun, ChevronDown, Settings, X } from 'lucide-react';
import { AttendanceCalendar } from './components/AttendanceCalendar';
import { StatCard } from './components/StatCard';
import { SalaryVisualization } from './components/SalaryVisualization';
const MonthlySummaryModal = React.lazy(() =>
  import('./components/MonthlySummaryModal').then(module => ({ default: module.MonthlySummaryModal }))
);
const QuickCashAdvanceModal = React.lazy(() =>
  import('./components/QuickCashAdvanceModal').then(module => ({ default: module.QuickCashAdvanceModal }))
);
const WelcomeOnboardingModal = React.lazy(() =>
  import('./components/WelcomeOnboardingModal').then(module => ({ default: module.WelcomeOnboardingModal }))
);
const PWAUpdatePrompt = React.lazy(() =>
  import('./components/PWAUpdatePrompt').then(module => ({ default: module.PWAUpdatePrompt }))
);
import { AttendanceRecord, AttendanceStatus, MonthStats, CashAdvance } from './types';
import { APP_VERSION, BASE_SALARY, FREE_ABSENTS_PER_MONTH, MONTH_NAMES } from './constants';
import { generateUniqueSyncCode, saveTrackerData, subscribeToTracker, checkSyncCodeExists, updateSingleAttendance, addCashAdvance, deleteCashAdvance, updateConfig } from './firebase';
import { calculateMonthStats, calculateBalancesChain, readJSON } from './utils';

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
  const [attendance, setAttendance] = useState<AttendanceRecord>(() =>
    readJSON<AttendanceRecord>('maid-attendance-data', {})
  );
  const [isSummaryOpen, setIsSummaryOpen] = useState<boolean>(false);
  const [isActionsOpen, setIsActionsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [longPressedDate, setLongPressedDate] = useState<string | null>(null);
  const [cashAdvances, setCashAdvances] = useState<CashAdvance[]>(() =>
    readJSON<CashAdvance[]>('maid-cash-advances', [])
  );
  const [settlements, setSettlements] = useState<{ [monthStr: string]: number }>(() =>
    readJSON<{ [monthStr: string]: number }>('maid-settlements', {})
  );

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

  // Stable reference for "today" that only changes when the calendar date actually
  // rolls over (avoids inconsistencies mid-render while still refreshing across midnight
  // in a long-lived PWA session).
  const [actualToday, setActualToday] = useState<Date>(() => new Date());

  useEffect(() => {
    const refreshToday = () => {
      setActualToday(prev => {
        const now = new Date();
        return now.toDateString() === prev.toDateString() ? prev : now;
      });
    };
    document.addEventListener('visibilitychange', refreshToday);
    const interval = setInterval(refreshToday, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', refreshToday);
      clearInterval(interval);
    };
  }, []);

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

  // --- Onboarding State ---
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    const completed = localStorage.getItem('maid-setup-completed') === 'true';
    const hasSyncCode = !!localStorage.getItem('maid-sync-code');
    return !completed && !hasSyncCode;
  });

  // --- PWA Installation State & Hooks ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to PWA install prompt: ${outcome}`);
    setDeferredPrompt(null);
  };

  const handleCompleteOnboarding = async (salary: number, leaves: number) => {
    setBaseSalary(salary);
    setFreeAbsentsPerMonth(leaves);
    setSalaryInput(String(salary));
    setLeavesInput(String(leaves));

    localStorage.setItem('maid-base-salary', String(salary));
    localStorage.setItem('maid-free-absents', String(leaves));
    localStorage.setItem('maid-setup-completed', 'true');

    // Ensure sync code is generated (triggers Firestore collection init)
    if (!syncCode) {
      const newCode = await generateUniqueSyncCode();
      setSyncCode(newCode);
      localStorage.setItem('maid-sync-code', newCode);
    }

    setShowOnboarding(false);
  };

  const handleLinkOnboarding = async (linkedSyncCode: string): Promise<{ success: boolean; error?: string }> => {
    if (linkedSyncCode === syncCode) {
      return { success: false, error: 'Already connected to this Sync Code!' };
    }
    try {
      const exists = await checkSyncCodeExists(linkedSyncCode);
      if (exists) {
        localStorage.setItem('maid-sync-code', linkedSyncCode);
        localStorage.setItem('maid-setup-completed', 'true');
        setSyncCode(linkedSyncCode);
        setIsSyncReady(false);
        setShowOnboarding(false);
        return { success: true };
      } else {
        return { success: false, error: 'Code not found. Please double-check.' };
      }
    } catch (err) {
      return { success: false, error: 'Failed to verify code. Please try again.' };
    }
  };

  // Close the settings drawer / actions menu on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (isSettingsOpen) setIsSettingsOpen(false);
      else if (isActionsOpen) setIsActionsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, isActionsOpen]);

  // 1. Local Storage Cache saving (for offline resilience)
  useEffect(() => {
    localStorage.setItem('maid-attendance-data', JSON.stringify(attendance));
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

  useEffect(() => {
    localStorage.setItem('maid-settlements', JSON.stringify(settlements));
  }, [settlements]);

  // 2. Make sure we have a valid syncCode on start
  useEffect(() => {
    if (syncCode) return;
    let cancelled = false;
    generateUniqueSyncCode().then((newCode) => {
      if (cancelled) return;
      setSyncCode(newCode);
      localStorage.setItem('maid-sync-code', newCode);
    });
    return () => {
      cancelled = true;
    };
  }, [syncCode]);

  // 3. Firestore real-time listener to sync remote changes
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
        const remoteSettlements = data.settlements || {};

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

        setSettlements(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(remoteSettlements)) {
            return remoteSettlements;
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
          cashAdvances,
          settlements
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

  // 4. Save settings configurations back to Firestore (debounced to avoid constant writing)
  useEffect(() => {
    if (!isSyncReady || !syncCode) return;

    const timer = setTimeout(() => {
      updateConfig(syncCode, baseSalary, freeAbsentsPerMonth);
    }, 500);

    return () => clearTimeout(timer);
  }, [baseSalary, freeAbsentsPerMonth, isSyncReady, syncCode]);

  useEffect(() => {
    if (!isSyncReady || !syncCode) return;

    const timer = setTimeout(() => {
      saveTrackerData(syncCode, { settlements });
    }, 500);

    return () => clearTimeout(timer);
  }, [settlements, isSyncReady, syncCode]);

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

  const handleGenerateNewCode = async () => {
    const newCode = await generateUniqueSyncCode();
    localStorage.setItem('maid-sync-code', newCode);
    setSyncCode(newCode);
    setIsSyncReady(false);
    setIsDisconnecting(false);
  };

  const handleAddAdvance = (amount: number, date: string, description: string, type: 'ADVANCE' | 'PAYOUT' = 'ADVANCE') => {
    const newAdvance: CashAdvance = {
      id: crypto.randomUUID(),
      amount,
      date,
      description,
      type
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
      deleteCashAdvance(syncCode, id);
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

    const csvContent = rows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `MaidAttendance_${period}_${year}_${period === 'month' ? MONTH_NAMES[month] : 'Full'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- Settlements Banner Logic ---
  const [partialPaidInput, setPartialPaidInput] = useState<string>('');
  const [showPartialInput, setShowPartialInput] = useState<boolean>(false);

  // --- Calculations ---
  const stats: MonthStats = useMemo(() => {
    return calculateMonthStats(currentDate, attendance, baseSalary, freeAbsentsPerMonth, actualToday);
  }, [currentDate, attendance, baseSalary, freeAbsentsPerMonth, actualToday]);

  const balanceInfo = useMemo(() => {
    return calculateBalancesChain(currentDate, attendance, cashAdvances, settlements, baseSalary, freeAbsentsPerMonth, actualToday);
  }, [currentDate, attendance, cashAdvances, settlements, baseSalary, freeAbsentsPerMonth, actualToday]);

  const outstandingBalance = balanceInfo.outstandingBalance;
  const currentMonthPayouts = balanceInfo.currentMonthPayouts;
  const unsettledMonths = balanceInfo.unsettledMonths;

  const earliestUnsettledMonth = useMemo(() => {
    return unsettledMonths[0] || null;
  }, [unsettledMonths]);

  useEffect(() => {
    setShowPartialInput(false);
    setPartialPaidInput('');
  }, [earliestUnsettledMonth]);

  const earliestUnsettledNetDue = useMemo(() => {
    if (!earliestUnsettledMonth) return 0;
    const [yr, mth] = earliestUnsettledMonth.split('-').map(Number);
    const date = new Date(yr, mth - 1, 1);
    const mStats = calculateMonthStats(date, attendance, baseSalary, freeAbsentsPerMonth, actualToday);
    const chain = calculateBalancesChain(date, attendance, cashAdvances, settlements, baseSalary, freeAbsentsPerMonth, actualToday);
    const prefix = earliestUnsettledMonth;
    const mAdvances = cashAdvances
      .filter(adv => adv.date.startsWith(prefix) && (!adv.type || adv.type === 'ADVANCE'))
      .reduce((sum, adv) => sum + adv.amount, 0);
    const mPayouts = cashAdvances
      .filter(adv => adv.date.startsWith(prefix) && adv.type === 'PAYOUT')
      .reduce((sum, adv) => sum + adv.amount, 0);

    return Math.max(0, Math.round(mStats.finalSalary) - mAdvances + chain.outstandingBalance - mPayouts);
  }, [earliestUnsettledMonth, attendance, cashAdvances, settlements, baseSalary, freeAbsentsPerMonth, actualToday]);

  const handleSettleFully = () => {
    if (!earliestUnsettledMonth) return;
    setSettlements(prev => ({
      ...prev,
      [earliestUnsettledMonth]: earliestUnsettledNetDue
    }));
  };

  const handleSettleZero = () => {
    if (!earliestUnsettledMonth) return;
    setSettlements(prev => ({
      ...prev,
      [earliestUnsettledMonth]: 0
    }));
  };

  const handleSettlePartial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!earliestUnsettledMonth) return;
    const amt = parseInt(partialPaidInput, 10);
    if (isNaN(amt) || amt < 0) return;
    setSettlements(prev => ({
      ...prev,
      [earliestUnsettledMonth]: amt
    }));
    setPartialPaidInput('');
    setShowPartialInput(false);
  };

  // --- Cash Advance Calculations ---
  const totalMonthlyCashAdvances = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // 1-indexed
    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;

    return cashAdvances
      .filter(adv => adv.date.startsWith(prefix) && (!adv.type || adv.type === 'ADVANCE'))
      .reduce((sum, adv) => sum + adv.amount, 0);
  }, [cashAdvances, currentDate]);

  const netPayable = useMemo(() => {
    return Math.max(0, Math.round(stats.finalSalary) - totalMonthlyCashAdvances + outstandingBalance - currentMonthPayouts);
  }, [stats.finalSalary, totalMonthlyCashAdvances, outstandingBalance, currentMonthPayouts]);


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
                <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Aide</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Attendance & Salary Tracker</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
                {deferredPrompt && (
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all shadow-xs shrink-0 cursor-pointer"
                    title="Install Aide App"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Install App</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Configurations & Sync"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-100 dark:border-indigo-900 shadow-sm hidden sm:inline-block">
                    Base: ₹{baseSalary.toLocaleString()}
                </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 print:hidden">
        
        {earliestUnsettledMonth && (
          <div className="bg-indigo-600 dark:bg-indigo-900 border border-indigo-500/30 rounded-2xl shadow-lg p-5 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in print:hidden">
            <div className="flex items-start gap-3">
              <div className="bg-indigo-700/60 p-2.5 rounded-xl text-indigo-100 shrink-0">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-bold tracking-tight">
                  {MONTH_NAMES[Number(earliestUnsettledMonth.split('-')[1]) - 1]} {earliestUnsettledMonth.split('-')[0]} is closed.
                </h4>
                <p className="text-xs text-indigo-100 leading-relaxed font-medium">
                  Did you pay the worker their net due of <span className="font-bold text-white font-mono bg-indigo-700/40 px-1.5 py-0.5 rounded">₹{earliestUnsettledNetDue.toLocaleString()}</span>?
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              {!showPartialInput ? (
                <>
                  <button
                    onClick={handleSettleFully}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-indigo-700 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    Yes, Paid Fully
                  </button>
                  <button
                    onClick={() => setShowPartialInput(true)}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl text-xs border border-indigo-400/50 transition-colors cursor-pointer"
                  >
                    Paid Partially
                  </button>
                  <button
                    onClick={handleSettleZero}
                    className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-indigo-200 hover:text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    No, Carry Forward
                  </button>
                </>
              ) : (
                <form onSubmit={handleSettlePartial} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative rounded-xl shadow-xs">
                    <span className="absolute left-3 top-2 text-indigo-300 text-xs font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="Amount paid"
                      value={partialPaidInput}
                      onChange={(e) => setPartialPaidInput(e.target.value)}
                      className="pl-7 pr-3 py-1.5 w-full sm:w-36 rounded-xl bg-indigo-700/60 border border-indigo-400 text-white placeholder-indigo-300 outline-none text-xs font-bold font-mono focus:ring-1 focus:ring-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-indigo-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPartialInput(false)}
                      className="px-3.5 py-1.5 bg-indigo-700 text-indigo-200 hover:text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Header Stats Section */}
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                    Dashboard for {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <div className="relative w-fit">
                    <button 
                      onClick={() => setIsActionsOpen(!isActionsOpen)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all hover:scale-[1.02] shadow-xs cursor-pointer"
                    >
                        <span>Actions</span>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isActionsOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isActionsOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-30" 
                          onClick={() => setIsActionsOpen(false)}
                        />
                        <div className="absolute left-0 md:left-auto md:right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-lg py-1.5 z-40 origin-top-left md:origin-top-right">
                          <button
                            onClick={() => {
                              setIsSummaryOpen(true);
                              setIsActionsOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left transition-colors cursor-pointer font-medium"
                          >
                            <FileText className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                            <span>Print Slip</span>
                          </button>
                          <button
                            onClick={() => {
                              const today = new Date();
                              const y = today.getFullYear();
                              const m = String(today.getMonth() + 1).padStart(2, '0');
                              const d = String(today.getDate()).padStart(2, '0');
                              setLongPressedDate(`${y}-${m}-${d}`);
                              setIsActionsOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left transition-colors cursor-pointer font-medium font-semibold"
                          >
                            <Banknote className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                            <span>Record Advance / Payout</span>
                          </button>
                          <div className="border-t border-slate-100 dark:border-slate-700/60 my-1" />
                          <button
                            onClick={() => {
                              downloadCSV('month');
                              setIsActionsOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left transition-colors cursor-pointer"
                          >
                            <Download className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <span>Export Month</span>
                          </button>
                          <button
                            onClick={() => {
                              downloadCSV('year');
                              setIsActionsOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-left transition-colors cursor-pointer"
                          >
                            <Download className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <span>Export Year</span>
                          </button>
                        </div>
                      </>
                    )}
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
                subtext={
                  outstandingBalance > 0 || currentMonthPayouts > 0
                    ? `Inc. ₹${outstandingBalance.toLocaleString()} carry & -₹${currentMonthPayouts.toLocaleString()} payout`
                    : "Accrued minus advances"
                }
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
                onDateLongPress={setLongPressedDate}
                isReadOnly={isPastMonth}
             />
          </div>

          {/* Right: Charts & Breakdown (Takes up 1 col) */}
          <div className="space-y-6">
            <SalaryVisualization stats={stats} freeAbsentsPerMonth={freeAbsentsPerMonth} />
            
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

                    {outstandingBalance > 0 && (
                      <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-semibold">
                        <span>Previous Outstanding</span>
                        <span className="font-medium">+₹{outstandingBalance.toLocaleString()}</span>
                      </div>
                    )}

                    {currentMonthPayouts > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span>Outstanding Balance Paid</span>
                        <span className="font-medium">-₹{currentMonthPayouts.toLocaleString()}</span>
                      </div>
                    )}
                    
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

      <React.Suspense fallback={null}>
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
          outstandingBalance={outstandingBalance}
          currentMonthPayouts={currentMonthPayouts}
        />
      </React.Suspense>

      <React.Suspense fallback={null}>
        <WelcomeOnboardingModal
          isOpen={showOnboarding}
          defaultBaseSalary={BASE_SALARY}
          defaultFreeLeaves={FREE_ABSENTS_PER_MONTH}
          onComplete={handleCompleteOnboarding}
          onLink={handleLinkOnboarding}
        />
      </React.Suspense>

      {/* Settings Sliding Drawer */}
      <div className={`fixed inset-0 z-50 overflow-hidden print:hidden transition-all duration-300 ${isSettingsOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'}`}>
        {/* Backdrop */}
        <div 
          className={`absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 ${isSettingsOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsSettingsOpen(false)}
        />
        
        <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
          <div className={`w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
              
              {/* Header */}
              <div className="px-6 py-5 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-[spin_4s_linear_infinite]" />
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Configurations & Sync</h2>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 rounded-md">
                      v{APP_VERSION}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 1. Salary & Policy Configuration */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-500" />
                    Salary & Policy
                  </h3>
                  
                  <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/25 border border-slate-150 dark:border-slate-800/80 rounded-xl p-4">
                    <div>
                      <label htmlFor="drawer-base-salary-input" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Monthly Base Salary (₹)
                      </label>
                      <div className="relative rounded-lg shadow-xs">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <span className="text-slate-400 dark:text-slate-500 text-sm">₹</span>
                        </div>
                        <input
                          type="text"
                          name="base-salary"
                          id="drawer-base-salary-input"
                          className={`block w-full rounded-lg bg-white dark:bg-slate-900 border pl-7 pr-3 py-2 text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-1 text-sm outline-none transition-all font-medium ${salaryError ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500'}`}
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
                      <label htmlFor="drawer-free-leaves-input" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Allowed Paid Leaves / Month
                      </label>
                      <input
                        type="text"
                        name="free-leaves"
                        id="drawer-free-leaves-input"
                        className={`block w-full rounded-lg bg-white dark:bg-slate-900 border px-3 py-2 text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-1 text-sm outline-none transition-all font-medium ${leavesError ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500'}`}
                        placeholder="e.g. 2"
                        value={leavesInput}
                        onChange={(e) => handleLeavesInputChange(e.target.value)}
                      />
                      {leavesError && (
                        <p className="text-[11px] text-rose-500 mt-1 font-medium">{leavesError}</p>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-lg p-3 space-y-1">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">How this is calculated:</p>
                      <p>• Daily rate: <code className="font-mono text-indigo-600 dark:text-indigo-400">₹Salary / Days</code> (₹{baseSalary.toLocaleString()} / {stats.totalDays} = ₹{stats.dailyRate.toFixed(2)}/day).</p>
                      <p>• Days until today are assumed <span className="font-semibold text-emerald-600 dark:text-emerald-400">Present</span> by default.</p>
                      <p>• Up to <span className="font-semibold text-slate-800 dark:text-slate-200">{freeAbsentsPerMonth} days</span> of marked absences are fully paid leaves.</p>
                    </div>
                  </div>
                </div>

                {/* 2. Cloud Sync & Backup */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-indigo-500" />
                    Cloud Sync & Backup
                  </h3>
                  
                  <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/25 border border-slate-150 dark:border-slate-800/80 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Status</span>
                      <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-2.5 py-0.5 rounded-full shadow-2xs">
                        <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {isSyncing ? 'Syncing' : 'Live'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-lg p-3 space-y-2">
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
                      <p className="text-sm font-mono font-bold text-slate-700 dark:text-slate-300 tracking-wider text-center py-1 bg-slate-50 dark:bg-slate-850/80 border border-slate-200/60 dark:border-slate-700/50 rounded-md select-all">
                        {syncCode || 'Generating...'}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
                        Share this code with your other devices to sync real-time!
                      </p>
                    </div>

                    {/* Link other device form */}
                    <form onSubmit={handleLinkDevice} className="space-y-2 pt-2 border-t border-slate-200/65 dark:border-slate-800/80">
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Link with another device
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={linkInput}
                          onChange={(e) => setLinkInput(e.target.value)}
                          placeholder="e.g. MP-ABCD-EFGH"
                          className="block w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-700 dark:text-white font-mono placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                        />
                        <button
                          type="submit"
                          disabled={isSyncing || !linkInput.trim()}
                          className="px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-850 dark:disabled:text-slate-600 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
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
                    <div className="pt-2 flex justify-between items-center text-[11px] border-t border-slate-200/65 dark:border-slate-800/80">
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
                </div>

                {/* 3. App Installation */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-indigo-500" />
                    App Installation
                  </h3>
                  
                  <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/25 border border-slate-150 dark:border-slate-800/80 rounded-xl p-4">
                    {isInstalled ? (
                      <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 p-3 rounded-lg text-xs font-medium">
                        <Check className="w-4 h-4 shrink-0" />
                        <div>
                          <p className="font-bold">Aide is installed!</p>
                          <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">Running in standalone app mode.</p>
                        </div>
                      </div>
                    ) : deferredPrompt ? (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          Install Aide on your device for quick access, offline support, and a full-screen experience.
                        </p>
                        <button
                          type="button"
                          onClick={handleInstallClick}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs sm:text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          Install Aide App
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          To install this app on your device:
                        </p>
                        <ul className="text-[11px] text-slate-550 dark:text-slate-400 space-y-1.5 list-disc pl-4">
                          <li><strong>iOS / Safari:</strong> Tap the Share button and select <span className="font-semibold text-slate-700 dark:text-slate-300">"Add to Home Screen"</span>.</li>
                          <li><strong>Chrome / Edge / Safari (Mac):</strong> Look for the Install icon in your address bar or browser menu.</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-850 flex justify-end">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* Quick Cash Advance Modal */}
      {longPressedDate && (
        <React.Suspense fallback={null}>
          <QuickCashAdvanceModal
            dateStr={longPressedDate}
            cashAdvances={cashAdvances}
            outstandingBalance={outstandingBalance}
            onClose={() => setLongPressedDate(null)}
            onAddAdvance={handleAddAdvance}
            onDeleteAdvance={handleDeleteAdvance}
          />
        </React.Suspense>
      )}

      {/* PWA Update Prompt */}
      <React.Suspense fallback={null}>
        <PWAUpdatePrompt />
      </React.Suspense>
    </div>
  );
};

export default App;