
import React from 'react';
import { Award, ArrowDownToLine, Gem, Layers } from 'lucide-react';
import { AnalyticsData, DashboardData } from '../../types';

interface RewardsTabProps {
  analytics: AnalyticsData;
  data: DashboardData;
}

export const RewardsTab: React.FC<RewardsTabProps> = ({ analytics, data }) => {
  const parseAssetValue = (asset: any): number => {
    if (!asset) return 0;
    if (typeof asset === 'string') return parseFloat(asset.split(' ')[0]) || 0;
    return parseInt(asset.amount) / Math.pow(10, asset.precision || 3);
  };

  const allRewards = [
    ...data.authorRewards, 
    ...data.curationRewards, 
    ...data.benefactorRewards, 
    ...data.witnessRewards
  ].sort((a, b) => b.block - a.block);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="card-blur p-10 rounded-3xl relative overflow-hidden bg-emerald-500/5 border-emerald-500/20">
        <div className="absolute top-0 right-0 p-8 opacity-5">
            <Award className="w-32 h-32" />
        </div>
        <div className="relative">
            <h3 className="text-3xl font-black text-white mb-8">30-Day Rewards Analysis</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="flex flex-col">
                    <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1">Net HP Income</span>
                    <p className="text-4xl font-black text-white leading-tight">
                        {(analytics.authorHP + analytics.curationHP).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        <span className="text-lg text-emerald-500 ml-2">HP</span>
                    </p>
                    <span className="text-[10px] text-slate-500 font-bold mt-1">Average {((analytics.authorHP + analytics.curationHP)/30).toFixed(2)} HP / Day</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">Passive (Curation)</span>
                    <p className="text-2xl font-black text-slate-200">{analytics.curationHP.toFixed(2)} HP</p>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mb-1">Active (Author/Bene)</span>
                    <p className="text-2xl font-black text-slate-200">{analytics.authorHP.toFixed(2)} HP</p>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] text-amber-500 font-black uppercase tracking-widest mb-1">Stable (HBD)</span>
                    <p className="text-2xl font-black text-slate-200">{analytics.authorHBD.toFixed(2)} HBD</p>
                </div>
            </div>
        </div>
      </div>

      <div className="card-blur rounded-3xl overflow-hidden shadow-2xl border-slate-800/50">
        <div className="p-8 border-b border-slate-800 bg-slate-900/10 flex items-center justify-between">
           <h4 className="text-lg font-black">Historical Reward Ledger</h4>
        </div>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 text-[10px] text-slate-500 uppercase font-black tracking-widest z-10">
              <tr>
                <th className="py-5 px-8">Class</th>
                <th className="py-5 px-8">Context</th>
                <th className="py-5 px-8 text-right">Distribution</th>
              </tr>
            </thead>
            <tbody>
              {allRewards.map((op, idx) => {
                const isAuthor = op.op.type === 'author_reward_operation';
                const isBene = op.op.type === 'comment_benefactor_reward_operation';
                const isWit = op.op.type === 'witness_reward_operation';
                
                const valHP = (isAuthor || isBene) ? parseAssetValue((op as any).op.value.vesting_payout) * data.vestsToHpRatio
                            : isWit ? parseAssetValue((op as any).op.value.shares) * data.vestsToHpRatio
                            : parseAssetValue((op as any).op.value.reward) * data.vestsToHpRatio;

                return (
                  <tr key={`${op.trx_id}-${idx}`} className="border-b border-slate-800/30 hover:bg-slate-800/40 transition-all">
                    <td className="py-5 px-8">
                      <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded ${isAuthor ? 'bg-emerald-500/10 text-emerald-400' : isWit ? 'bg-yellow-500/10 text-yellow-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {op.op.type.replace('_operation', '').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-5 px-8">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">@{ (op as any).op.value.author || (op as any).op.value.witness || (op as any).op.value.curator || 'protocol' }</span>
                        <span className="text-[10px] text-slate-500">Block #{op.block.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-5 px-8 text-right font-black">
                      +{valHP.toFixed(3)} HP
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
