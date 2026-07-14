import React, { useState } from 'react';
import { Calculator, Coins, Cloud, Sparkles, Check, Copy, AlertCircle, ArrowRight } from 'lucide-react';

interface WelcomeOnboardingModalProps {
  isOpen: boolean;
  defaultBaseSalary: number;
  defaultFreeLeaves: number;
  onComplete: (salary: number, leaves: number) => void;
  onLink: (syncCode: string) => Promise<{ success: boolean; error?: string }>;
}

export const WelcomeOnboardingModal: React.FC<WelcomeOnboardingModalProps> = ({
  isOpen,
  defaultBaseSalary,
  defaultFreeLeaves,
  onComplete,
  onLink,
}) => {
  const [activeTab, setActiveTab] = useState<'setup' | 'link'>('setup');
  
  // Setup Tab State
  const [salaryInput, setSalaryInput] = useState<string>('');
  const [leavesInput, setLeavesInput] = useState<string>('');
  const [salaryError, setSalaryError] = useState<string | null>(null);
  const [leavesError, setLeavesError] = useState<string | null>(null);

  // Link Tab State
  const [linkInput, setLinkInput] = useState<string>('');
  const [isLinking, setIsLinking] = useState<boolean>(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSalaryError(null);
    setLeavesError(null);

    const salVal = salaryInput.trim();
    const leavesVal = leavesInput.trim();

    let hasError = false;

    if (!salVal) {
      setSalaryError('Salary cannot be empty.');
      hasError = true;
    }
    const salaryNum = parseInt(salVal, 10);
    if (isNaN(salaryNum) || salaryNum < 0 || String(salaryNum) !== salVal) {
      setSalaryError('Please enter a valid positive integer.');
      hasError = true;
    }

    if (!leavesVal) {
      setLeavesError('Leaves count cannot be empty.');
      hasError = true;
    }
    const leavesNum = parseInt(leavesVal, 10);
    if (isNaN(leavesNum) || leavesNum < 0 || String(leavesNum) !== leavesVal) {
      setLeavesError('Please enter a valid positive integer.');
      hasError = true;
    }

    if (hasError) return;

    onComplete(salaryNum, leavesNum);
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);
    const targetCode = linkInput.toUpperCase().trim();
    if (!targetCode) return;

    setIsLinking(true);
    try {
      const res = await onLink(targetCode);
      if (res.success) {
        setLinkInput('');
      } else {
        setLinkError(res.error || 'Code not found. Please double-check.');
      }
    } catch (err) {
      setLinkError('Failed to verify sync code. Please try again.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleUseDefaults = () => {
    onComplete(defaultBaseSalary, defaultFreeLeaves);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
      {/* Modal Card */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col z-10 animate-zoom-in">
        
        {/* Welcome Header Hero Banner */}
        <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 px-6 py-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 opacity-15">
            <Calculator className="w-56 h-56 rotate-12" />
          </div>
          <div className="absolute -left-6 -bottom-6 opacity-10">
            <Coins className="w-36 h-36" />
          </div>
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl mb-3 border border-white/20 shadow-inner">
              <Sparkles className="w-8 h-8 text-amber-300 animate-pulse" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome to Aide</h2>
            <p className="text-indigo-100 text-xs sm:text-sm mt-1.5 max-w-xs sm:max-w-md font-medium">
              Track attendance, calculate monthly salaries, and manage cash advances transparently.
            </p>
          </div>
        </div>

        {/* Tabs Control */}
        <div className="flex border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/20 p-2 gap-1">
          <button
            onClick={() => {
              setActiveTab('setup');
              setLinkError(null);
            }}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'setup'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-100 dark:border-slate-700'
                : 'text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Configure New Tracker
          </button>
          <button
            onClick={() => {
              setActiveTab('link');
              setSalaryError(null);
              setLeavesError(null);
            }}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'link'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-100 dark:border-slate-700'
                : 'text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Link Existing Device
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-8 flex-1">
          {activeTab === 'setup' ? (
            <form onSubmit={handleSetupSubmit} className="space-y-5">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Set up your default preferences below. You can always update these parameters later in Settings.
              </p>

              <div>
                <label
                  htmlFor="setup-base-salary"
                  className="block text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider mb-1.5"
                >
                  Monthly Base Salary (₹)
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <span className="text-slate-400 dark:text-slate-500 text-sm font-semibold">₹</span>
                  </div>
                  <input
                    type="text"
                    name="salary"
                    id="setup-base-salary"
                    required
                    placeholder="e.g. 13000"
                    className={`block w-full rounded-xl bg-slate-50 dark:bg-slate-900 border pl-8 pr-4 py-2.5 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 text-sm outline-none transition-all font-semibold ${
                      salaryError
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
                        : 'border-slate-200 dark:border-slate-750 focus:border-indigo-500 focus:ring-indigo-500'
                    }`}
                    value={salaryInput}
                    onChange={(e) => {
                      setSalaryInput(e.target.value);
                      if (salaryError) setSalaryError(null);
                    }}
                  />
                </div>
                {salaryError && (
                  <p className="text-[11px] text-rose-500 mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {salaryError}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="setup-free-leaves"
                  className="block text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider mb-1.5"
                >
                  Allowed Paid Leaves / Month
                </label>
                <input
                  type="text"
                  name="leaves"
                  id="setup-free-leaves"
                  required
                  placeholder="e.g. 2"
                  className={`block w-full rounded-xl bg-slate-50 dark:bg-slate-900 border px-4 py-2.5 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 text-sm outline-none transition-all font-semibold ${
                    leavesError
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-slate-200 dark:border-slate-750 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                  value={leavesInput}
                  onChange={(e) => {
                    setLeavesInput(e.target.value);
                    if (leavesError) setLeavesError(null);
                  }}
                />
                {leavesError && (
                  <p className="text-[11px] text-rose-500 mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {leavesError}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Create Tracker & Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLinkSubmit} className="space-y-5">
              <div className="flex items-start gap-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-950 rounded-2xl p-4 text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                <Cloud className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Sync across multiple devices</p>
                  <p className="mt-0.5 text-[11px] opacity-90">
                    If you are already tracking data on a different phone or desktop, enter that device's Sync Code here to sync them automatically.
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="setup-link-code"
                  className="block text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider mb-1.5"
                >
                  Enter Sync Code
                </label>
                <input
                  type="text"
                  name="sync-code"
                  id="setup-link-code"
                  required
                  placeholder="e.g. MP-ABCD-EFGH"
                  className={`block w-full rounded-xl bg-slate-50 dark:bg-slate-900 border px-4 py-2.5 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 text-sm font-mono outline-none transition-all uppercase ${
                    linkError
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-slate-200 dark:border-slate-750 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                  value={linkInput}
                  onChange={(e) => {
                    setLinkInput(e.target.value);
                    if (linkError) setLinkError(null);
                  }}
                  disabled={isLinking}
                />
                {linkError && (
                  <p className="text-[11px] text-rose-500 mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {linkError}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLinking || !linkInput.trim()}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:bg-slate-850 dark:disabled:text-slate-600 text-white font-bold rounded-xl text-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:scale-100 shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLinking ? (
                    <span>Verifying Code...</span>
                  ) : (
                    <>
                      <span>Link Device</span>
                      <Cloud className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Fallback Option */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col items-center">
            <button
              type="button"
              onClick={handleUseDefaults}
              className="text-xs text-slate-450 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-semibold cursor-pointer underline decoration-dotted underline-offset-4"
            >
              Or start with defaults (₹{defaultBaseSalary.toLocaleString()} salary, {defaultFreeLeaves} paid leaves)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
