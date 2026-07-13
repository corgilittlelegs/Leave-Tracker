import React, { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, Sparkles } from 'lucide-react';

export const PWAUpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW registered successfully');
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);

  // When needRefresh changes, reset dismissal states
  useEffect(() => {
    if (needRefresh) {
      setIsDismissed(false);
      setIsClosing(false);
    }
  }, [needRefresh]);

  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsDismissed(true);
      setIsClosing(false);
      setNeedRefresh(false);
    }, 250); // matches duration of slide-down animation
  };

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  if (!needRefresh || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[100] pointer-events-none print:hidden">
      <div 
        className={`pointer-events-auto w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800/80 p-4 flex flex-col gap-3 ${
          isClosing ? 'animate-slide-down' : 'animate-slide-up'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <div className="relative flex shrink-0 items-center justify-center bg-indigo-50 dark:bg-indigo-950/40 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/50">
              <RefreshCw className="w-5 h-5 animate-spin [animation-duration:8s]" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
              </span>
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1">
                <span>Update Available</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                A newer version of Aide is available with recent fixes and updates.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100/60 dark:border-slate-800/50">
          <button
            onClick={handleDismiss}
            className="px-3.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Later
          </button>
          <button
            onClick={handleUpdate}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] sm:text-xs font-bold shadow-xs hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span>Update Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
