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
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-start justify-between transition-all hover:shadow-md">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 truncate">{label}</p>
        <h3 className="text-2xl font-bold text-slate-800 dark:text-white truncate">{value}</h3>
        {subtext && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 line-clamp-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10 dark:bg-opacity-20 shrink-0 ml-3`}>
        <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
    </div>
  );
};
