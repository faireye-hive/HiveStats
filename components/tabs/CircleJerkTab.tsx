
import React from 'react';
import { RefreshCcw, UserMinus, UserPlus } from 'lucide-react';
import { AnalyticsData } from '../../types';

interface CircleJerkTabProps {
  analytics: AnalyticsData;
}

export const CircleJerkTab: React.FC<CircleJerkTabProps> = ({ analytics }) => {
  return (
    <div className="space-y-8 animate-in zoom-in duration-500">
      <div className="card-blur p-8 rounded-3xl relative overflow-hidden border-amber-500/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px]"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h3 className="text-2xl font-black flex items-center gap-3">
              <RefreshCcw className="w-7 h-7 text-amber-500" /> CircleJerk Forensics
            </h3>
            <p className="text-sm text-slate-500 mt-1 font-medium">Quantifying mutual voting clusters and reciprocity.</p>
          </div>
          <div className="flex items-center gap-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
             <div className="text-center">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Cluster Size</p>
                <p className="text-3xl font-black text-amber-500">{analytics.circleJerk.filter(u => u.given > 0 && u.received > 0).length}</p>
             </div>
             <div className="w-px h-10 bg-slate-800"></div>
             <div className="text-center">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Balance Index</p>
                <p className="text-3xl font-black text-slate-200">
                  {analytics.meanBalanceIndex.toFixed(0)}%
                </p>
             </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-800 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
              <tr>
                <th className="py-6 px-8">Member</th>
                <th className="py-6 px-8 text-center">Gave ($)</th>
                <th className="py-6 px-8 text-center">Received ($)</th>
                <th className="py-6 px-8 text-right">Reciprocity</th>
              </tr>
            </thead>
            <tbody>
              {analytics.circleJerk.map((u) => (
                <tr key={u.name} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-all group">
                  <td className="py-5 px-8">
                    <div className="flex items-center gap-3">
                      <img src={`https://images.hive.blog/u/${u.name}/avatar`} className="w-10 h-10 rounded-full border-2 border-slate-800" alt="" />
                      <span className="text-sm font-bold text-slate-100 group-hover:text-amber-500">@{u.name}</span>
                    </div>
                  </td>
                  <td className="py-5 px-8 text-center">
                    <span className="text-sm font-mono text-emerald-400 font-black">${u.given.toFixed(3)}</span>
                  </td>
                  <td className="py-5 px-8 text-center">
                    <span className="text-sm font-mono text-blue-400 font-black">${u.received.toFixed(3)}</span>
                  </td>
                  <td className="py-5 px-8 text-right">
                    <div className="flex flex-col items-end">
                      <div className={`text-2xl font-black ${u.balance > 85 ? 'text-amber-400' : 'text-slate-400'}`}>
                        {u.balance.toFixed(0)}%
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        {u.given > u.received ? <UserMinus className="w-3 h-3 text-rose-500" /> : <UserPlus className="w-3 h-3 text-emerald-500" />}
                        <span className="text-[9px] text-slate-600 font-black uppercase">
                          {u.given > u.received ? 'Accumulator' : 'Beneficiary'}
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
