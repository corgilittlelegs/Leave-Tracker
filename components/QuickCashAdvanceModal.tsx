import React, { useState, useMemo } from 'react';
import { X, Banknote, Trash2, Plus, AlertCircle, Calendar } from 'lucide-react';
import { CashAdvance } from '../types';

interface QuickCashAdvanceModalProps {
  dateStr: string; // YYYY-MM-DD
  cashAdvances: CashAdvance[];
  onClose: () => void;
  onAddAdvance: (amount: number, date: string, description: string) => void;
  onDeleteAdvance: (id: string) => void;
}

export const QuickCashAdvanceModal: React.FC<QuickCashAdvanceModalProps> = ({
  dateStr,
  cashAdvances,
  onClose,
  onAddAdvance,
  onDeleteAdvance,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Format YYYY-MM-DD to readable date
  const readableDate = useMemo(() => {
    try {
      const parts = dateStr.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }, [dateStr]);

  // Filter existing advances for this specific date
  const existingAdvances = useMemo(() => {
    return cashAdvances.filter((adv) => adv.date === dateStr);
  }, [cashAdvances, dateStr]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid cash advance amount.');
      return;
    }

    onAddAdvance(parsedAmount, dateStr, description.trim() || 'Cash Advance');
    setAmount('');
    setDescription('');
    // We don't automatically close so the user can see it added or add another, but let's close it or keep it open.
    // Usually, closing on success is best, but keeping it open so they see "existing advances" update is also cool.
    // Let's close it so the flow is quick and simple!
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      {/* Backdrop click close */}
      <div className="fixed inset-0" onClick={onClose}></div>

      {/* Modal Container */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
          <div className="flex items-center gap-2">
            <div className="bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-lg text-amber-600 dark:text-amber-400">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white">Quick Cash Advance</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Record wages paid in advance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-850 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          
          {/* Selected Date Indicator */}
          <div className="flex items-center gap-2 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-950 rounded-xl p-3 text-xs sm:text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            <Calendar className="w-4.5 h-4.5 text-indigo-500" />
            <span>{readableDate}</span>
          </div>

          {/* List of Existing Advances for this Date */}
          {existingAdvances.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Existing Advances on this Day
              </h4>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {existingAdvances.map((adv) => (
                  <div
                    key={adv.id}
                    className="flex items-center justify-between bg-slate-50 dark:bg-slate-850/55 border border-slate-150 dark:border-slate-800/80 rounded-lg p-2.5 text-xs font-medium"
                  >
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-800 dark:text-slate-200">₹{adv.amount.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{adv.description}</p>
                    </div>
                    <button
                      onClick={() => onDeleteAdvance(adv.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors cursor-pointer"
                      title="Delete advance"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Advance Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label htmlFor="quick-advance-amount" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Advance Amount (₹)
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-slate-400 dark:text-slate-500 text-sm">₹</span>
                </div>
                <input
                  type="number"
                  name="amount"
                  id="quick-advance-amount"
                  required
                  min="1"
                  step="any"
                  placeholder="e.g. 500"
                  className="block w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 pl-7 pr-3 py-2 text-slate-800 dark:text-white placeholder:text-slate-455 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-xs sm:text-sm font-medium"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="quick-advance-desc" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                name="description"
                id="quick-advance-desc"
                placeholder="e.g. For festival, emergency, etc."
                className="block w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 px-3 py-2 text-slate-800 dark:text-white placeholder:text-slate-455 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-xs sm:text-sm font-medium"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {error && (
              <div className="flex items-start gap-1.5 text-rose-600 dark:text-rose-400 text-xs mt-1 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-lg p-2.5 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg text-xs font-semibold text-slate-650 dark:text-slate-350 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Advance</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
