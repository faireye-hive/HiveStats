
import React from 'react';
import { HandCoins, ArrowUpRight, ArrowDownLeft, ShieldCheck, Frown } from 'lucide-react';
import { AnalyticsData } from '../../types';

interface DelegationTabProps {
  analytics: AnalyticsData;
}

export const DelegationTab: React.FC<DelegationTabProps> = ({ analytics }) => {
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-blur p-8 rounded-3xl border-l-4 border-l-blue-500">
            <div className="flex items-center gap-3 mb-4">
                <ArrowUpRight className="w-4 h-4 text-blue-400" />
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Delegated Outflow</span>
            </div>
            <p className="text-3xl font-black text-white">{analytics.totalDelegatedOut.toLocaleString(undefined, { maximumFractionDigits: 1 })} HP</p>
        </div>
        <div className="card-blur p-8 rounded-3xl border-l-4 border-l-emerald-500">
            <div className="flex items-center gap-3 mb-4">
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Leased Inflow</span>
            </div>
            <p className="text-3xl font-black text-white">{analytics.totalDelegatedIn.toLocaleString(undefined, { maximumFractionDigits: 1 })} HP</p>
        </div>
      </div>

      <div className="card-blur p-8 rounded-3xl border-slate-800/50">
        <h3 className="text-2xl font-black flex items-center gap-3 mb-8">
          <HandCoins className="w-7 h-7 text-blue-500" /> Stake Lease Audit
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-800 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
              <tr>
                <th className="py-6 px-8">Delegatee</th>
                <th className="py-6 px-8 text-center">Amount (HP)</th>
                <th className="py-6 px-8 text-center">ROI (30d)</th>
                <th className="py-6 px-8 text-right">Reciprocity Index</th>
              </tr>
            </thead>
            <tbody>
              {analytics.delegationROI.map((d: any) => (
                <tr key={d.delegatee} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-all">
                  <td className="py-5 px-8">
                    <div className="flex items-center gap-3">
                      <img src={`https://images.hive.blog/u/${d.delegatee}/avatar`} className="w-10 h-10 rounded-full border-2 border-slate-800" alt="" />
                      <span className="text-sm font-bold text-slate-100">@{d.delegatee}</span>
                    </div>
                  </td>
                  <td className="py-5 px-8 text-center">
                    <span className="text-sm font-mono text-slate-300 font-bold">{d.hp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </td>
                  <td className="py-5 px-8 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-mono text-emerald-400 font-black">${d.returnedValue.toFixed(3)}</span>
                      <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{d.voteCount} mutual votes</span>
                    </div>
                  </td>
                  <td className="py-5 px-8 text-right">
                    {d.returnedValue > 0 ? (
                      <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[10px] font-black uppercase">Mutual Active</span>
                    ) : (
                      <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-400 text-[10px] font-black uppercase">No Reciprocity</span>
                    )}
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
