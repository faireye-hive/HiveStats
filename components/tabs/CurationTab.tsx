
import React from 'react';
import { Calculator, Activity, Info, Layers, Heart } from 'lucide-react';
import { AnalyticsData, DashboardData } from '../../types';

interface CurationTabProps {
  analytics: AnalyticsData;
  headBlock: number;
}

export const CurationTab: React.FC<CurationTabProps> = ({ analytics, headBlock }) => {
  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-500">
      <div className="card-blur p-10 rounded-3xl border-l-4 border-l-rose-500 relative overflow-hidden bg-rose-500/5 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Calculator className="w-32 h-32 text-rose-500" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shadow-inner">
              <Activity className="w-7 h-7 text-rose-500" />
            </div>
            <div>
              <h3 className="text-3xl font-black text-white">Pending Curation Forecast</h3>
              <p className="text-slate-500 font-medium">Projection of curation rewards currently maturing (7-day window).</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
            <div className="flex flex-col">
              <span className="text-[11px] text-rose-400 font-black uppercase tracking-[0.2em] mb-2">Total Projected Yield</span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-white">${analytics.pendingHBD.toFixed(3)}</span>
                <span className="text-lg font-bold text-slate-500">HBD</span>
              </div>
              <p className="mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <Info className="w-3 h-3" /> Real-time calculation based on rshares portion.
              </p>
            </div>
            
            <div className="bg-slate-900/40 p-8 rounded-2xl border border-slate-800 flex items-center justify-between">
               <div className="text-center flex-1">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Active Claims</p>
                  <p className="text-4xl font-black text-slate-200">{analytics.pendingClaimsCount}</p>
               </div>
               <div className="w-px h-16 bg-slate-800"></div>
               <div className="text-center flex-1">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Avg Claim Value</p>
                  <p className="text-4xl font-black text-emerald-500">
                    ${analytics.pendingClaimsCount > 0 ? (analytics.pendingHBD / analytics.pendingClaimsCount).toFixed(3) : '0.00'}
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card-blur rounded-3xl overflow-hidden shadow-2xl border-slate-800/50">
        <div className="p-8 border-b border-slate-800 bg-slate-900/10">
           <h4 className="text-lg font-black flex items-center gap-3">
             <Layers className="w-5 h-5 text-slate-400" /> Active Curation Ledger (Maturing Assets)
           </h4>
        </div>
        <div className="overflow-x-auto max-h-[700px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 text-[10px] text-slate-500 uppercase font-black tracking-widest z-10">
              <tr>
                <th className="py-6 px-10">Content Info</th>
                <th className="py-6 px-10 text-center">Vote Weight (%)</th>
                <th className="py-6 px-10 text-right">Potential Cut (Est)</th>
              </tr>
            </thead>
            <tbody>
              {analytics.uniquePendingVotes
                .sort((a, b) => (headBlock - a.block) - (headBlock - b.block))
                .map((v, idx) => {
                  // Fixed: Access amount property on HAFAsset object instead of treating it as a string
                  const totalPending = parseInt(v.op.value.pending_payout.amount) / Math.pow(10, v.op.value.pending_payout.precision || 3);
                  const shareRatio = Math.abs(v.op.value.rshares) / Math.abs(v.op.value.total_vote_weight || 1);
                  const yourShare = (totalPending * 0.5) * shareRatio;
                  
                  const displayPercent = (Math.abs(v.op.value.weight || 0) / 100).toFixed(1);
                  const blocksLeft = 201600 - (headBlock - v.block);
                  const daysLeft = Math.max(0, Math.floor(blocksLeft / 28800));
                  
                  return (
                    <tr key={`${v.trx_id}-${idx}`} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-all group">
                      <td className="py-5 px-10">
                        <div className="flex items-center gap-4">
                          <img src={`https://images.hive.blog/u/${v.op.value.author}/avatar`} className="w-12 h-12 rounded-xl border-2 border-slate-800" alt="" />
                          <div className="flex flex-col">
                            <p className="text-base font-black text-slate-100">@{v.op.value.author}</p>
                            <p className="text-[11px] text-slate-500 font-mono truncate max-w-[280px]">/{v.op.value.permlink}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-10 text-center">
                        <span className="text-sm font-black text-slate-400">{displayPercent}%</span>
                      </td>
                      <td className="py-5 px-10 text-right">
                        <div className="flex flex-col items-end">
                          <div className="text-xl font-black text-white group-hover:text-rose-400">
                            ${yourShare.toFixed(4)}
                          </div>
                          <p className="text-[10px] text-slate-600 font-bold uppercase mt-1">
                            Payout in {daysLeft}D {Math.floor((blocksLeft % 28800) / 1200)}H
                          </p>
                        </div>
                      </td>
                    </tr>
                  );
              })}
            </tbody>
          </table>
          {analytics.pendingClaimsCount === 0 && (
            <div className="py-32 text-center">
               <Heart className="w-16 h-16 text-slate-800 mx-auto mb-4 animate-pulse" />
               <p className="text-slate-500 font-bold uppercase tracking-widest">No Active Maturing Claims</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
