
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  subValue?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, trend, subValue }) => {
  return (
    <div className="card-blur p-6 rounded-2xl flex flex-col justify-between transition-all hover:scale-[1.02] hover:shadow-xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-1">{label}</p>
          <h3 className="text-2xl font-bold text-white">{value}</h3>
          {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
        </div>
        <div className="p-3 bg-slate-800/50 rounded-xl text-red-500">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-xs font-semibold">
          <span className={trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}>
            {trend}
          </span>
          <span className="text-slate-500 ml-2">from last period</span>
        </div>
      )}
    </div>
  );
};
