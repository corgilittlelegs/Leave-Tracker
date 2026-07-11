import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  colorClass: string;
  subtext?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, colorClass, subtext }) => {
  const getAccentClasses = (cls: string) => {
    if (cls.includes('indigo')) {
      return {
        hoverBorder: 'hover:border-indigo-500/40 dark:hover:border-indigo-500/30',
        topLine: 'bg-indigo-500',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        bgColor: 'bg-indigo-500/10 dark:bg-indigo-500/20'
      };
    }
    if (cls.includes('amber')) {
      return {
        hoverBorder: 'hover:border-amber-500/40 dark:hover:border-amber-500/30',
        topLine: 'bg-amber-500',
        iconColor: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-500/10 dark:bg-amber-500/20'
      };
    }
    if (cls.includes('emerald')) {
      return {
        hoverBorder: 'hover:border-emerald-500/40 dark:hover:border-emerald-500/30',
        topLine: 'bg-emerald-500',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/20'
      };
    }
    return {
      hoverBorder: 'hover:border-slate-400/40 dark:hover:border-slate-500/30',
      topLine: 'bg-slate-500',
      iconColor: 'text-slate-600 dark:text-slate-400',
      bgColor: 'bg-slate-500/10 dark:bg-slate-500/20'
    };
  };

  const accent = getAccentClasses(colorClass);

  return (
    <div className={`
      relative overflow-hidden group
      backdrop-blur-md bg-white/70 dark:bg-slate-900/60 
      rounded-xl p-3.5 sm:p-5 shadow-xs border border-slate-200/50 dark:border-slate-800/40 
      flex items-start justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-md
      ${accent.hoverBorder}
    `}>
      {/* Decorative top accent line on hover */}
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${accent.topLine} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 mb-0.5 uppercase tracking-wider truncate">{label}</p>
        <h3 className="text-lg sm:text-2xl font-extrabold text-slate-850 dark:text-white truncate tracking-tight">{value}</h3>
        {subtext && (
          <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 font-medium">
            {subtext}
          </p>
        )}
      </div>
      <div className={`p-2 sm:p-3 rounded-lg ${accent.bgColor} ${accent.iconColor} shrink-0 ml-2 transition-transform duration-300 group-hover:scale-110`}>
        <Icon className="w-4.5 h-4.5 sm:w-6 sm:h-6" />
      </div>
    </div>
  );
};
