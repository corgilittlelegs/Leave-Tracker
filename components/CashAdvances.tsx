import React, { useState, useMemo } from 'react';
import { Banknote, Plus, Trash2, AlertCircle } from 'lucide-react';
import { CashAdvance } from '../types';
import { MONTH_NAMES } from '../constants';

interface CashAdvancesProps {
  cashAdvances: CashAdvance[];
  currentDate: Date;
  onAddAdvance: (amount: number, date: string, description: string) => void;
  onDeleteAdvance: (id: string) => void;
}

export const CashAdvances: React.FC<CashAdvancesProps> = ({
  cashAdvances,
  currentDate,
  onAddAdvance,
  onDeleteAdvance,
}) => {
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed
  const currentMonthStr = MONTH_NAMES[currentMonth];

  const todayStr = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, []);

  const isFutureMonth = useMemo(() => {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    return currentYear > todayYear || (currentYear === todayYear && currentMonth > todayMonth);
  }, [currentYear, currentMonth]);

  const maxDate = useMemo(() => {
    // Last day of the currently viewed month
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const lastDayStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    
    // The maximum permitted date is the lesser of the last day of the active month OR today's date
    return todayStr < lastDayStr ? todayStr : lastDayStr;
  }, [currentYear, currentMonth, todayStr]);

  const minDate = useMemo(() => {
    return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
  }, [currentYear, currentMonth]);

  // Helper to format date object to YYYY-MM-DD in local timezone
  const getInitialFormDate = () => {
    if (isFutureMonth) {
      return todayStr;
    }
    const today = new Date();
    if (today.getFullYear() === currentYear && today.getMonth() === currentMonth) {
      return todayStr;
    } else {
      const m = String(currentMonth + 1).padStart(2, '0');
      return `${currentYear}-${m}-01`;
    }
  };

  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(getInitialFormDate);
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Update date field if the active month changes
  React.useEffect(() => {
    setDate(getInitialFormDate());
    if (isFutureMonth) {
      setShowForm(false);
    }
  }, [currentDate, isFutureMonth]);

  // Filter advances belonging to the currently selected month
  const activeMonthAdvances = useMemo(() => {
    const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    return cashAdvances.filter((adv) => adv.date.startsWith(monthPrefix));
  }, [cashAdvances, currentYear, currentMonth]);

  const totalMonthlyAdvances = useMemo(() => {
    return activeMonthAdvances.reduce((sum, adv) => sum + adv.amount, 0);
  }, [activeMonthAdvances]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid cash advance amount.');
      return;
    }

    if (!date) {
      setError('Please select a valid date.');
      return;
    }

    // Verify the date is actually in the currently selected month/year
    const selectedDateObj = new Date(date);
    if (
      selectedDateObj.getFullYear() !== currentYear ||
      selectedDateObj.getMonth() !== currentMonth
    ) {
      setError(`Date must be within ${currentMonthStr} ${currentYear}.`);
      return;
    }

    // Verify date is not in the future
    if (date > todayStr) {
      setError('Future dates are not allowed for cash advances.');
      return;
    }

    onAddAdvance(parsedAmount, date, description.trim());
    setAmount('');
    setDescription('');
    setError(null);
    setShowForm(false);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg">
            <Banknote className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Cash Advances</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Record cash asked in between</p>
          </div>
        </div>
        {!isFutureMonth && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-100 dark:border-indigo-900 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {showForm ? 'Cancel' : 'Record'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-lg p-3.5 space-y-3">
          <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Record Cash Advance
          </h4>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="e.g. 500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="block w-full rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Date
              </label>
              <input
                type="date"
                required
                min={minDate}
                max={maxDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all font-medium font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Medical bill, festival advance"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="block w-full rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          {error && (
            <div className="flex items-start gap-1 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-md p-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            Save Advance
          </button>
        </form>
      )}

      {/* Advance List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/50 pb-1.5">
          <span>Monthly Details ({currentMonthStr})</span>
          <span className="font-bold text-slate-700 dark:text-slate-300">Total: ₹{totalMonthlyAdvances.toLocaleString()}</span>
        </div>

        {activeMonthAdvances.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4 italic">
            No cash advances recorded for this month.
          </p>
        ) : (
          <div className="max-h-[180px] overflow-y-auto space-y-1.5 pr-1">
            {activeMonthAdvances.map((adv) => {
              // Parse date accurately
              const dateParts = adv.date.split('-');
              const displayDate = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]))
                .toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
              const isConfirming = confirmDeleteId === adv.id;

              return (
                <div
                  key={adv.id}
                  className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-lg p-2 transition-all hover:bg-slate-100/70 dark:hover:bg-slate-800/50"
                >
                  <div className="space-y-0.5 flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">₹{adv.amount.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{displayDate}</span>
                    </div>
                    {adv.description && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{adv.description}</p>
                    )}
                  </div>
                  {isConfirming ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium mr-1">Delete?</span>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteAdvance(adv.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-1.5 py-0.5 text-[10px] bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded transition-colors cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-1.5 py-0.5 text-[10px] bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-semibold rounded transition-colors cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(adv.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer shrink-0"
                      title="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
