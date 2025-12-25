
import React from 'react';
import { TrendingUp, UserCheck, Zap, Activity, Award, BarChart3,Battery, Percent, Target } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { StatCard } from '../StatCard';
import { AnalyticsData } from '../../types';

interface OverviewTabProps {
  analytics: AnalyticsData;
  hp: number;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ analytics, hp }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Daily Author (Est)" 
          value={`${analytics.estDailyAuthor.toFixed(2)} HP`} 
          icon={<UserCheck className="w-5 h-5" />}
          subValue="30d average"
        />
        <StatCard 
          label="Daily Curator (Est)" 
          value={`${analytics.estDailyCuration.toFixed(2)} HP`} 
          icon={<Zap className="w-5 h-5" />}
          subValue="30d average"
        />
        <StatCard 
          label="7D Yield Forecast" 
          value={`$${analytics.pendingHBD.toFixed(2)}`} 
          icon={<Activity className="w-5 h-5" />}
          subValue="Maturing curation"
        />
        <StatCard 
          label="Stake Weight" 
          value={`${hp.toLocaleString(undefined, { maximumFractionDigits: 0 })} HP`} 
          icon={<Award className="w-5 h-5" />}
        />
      </div>


      {/* APR & Resource Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-blur p-6 rounded-2xl flex items-center gap-4 border-l-4 border-l-blue-500 shadow-lg transition-transform hover:scale-[1.02]">
          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
            <Percent className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Curation APR</p>
            <p className="text-2xl font-black text-white">{analytics.curationAPR.toFixed(2)}%</p>
            <p className="text-[10px] text-slate-600 font-bold">Annualized return</p>
          </div>
        </div>

        <div className="card-blur p-6 rounded-2xl flex items-center gap-4 border-l-4 border-l-emerald-500 shadow-lg transition-transform hover:scale-[1.02]">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
            <Target className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Author APR</p>
            <p className="text-2xl font-black text-white">{analytics.authorAPR.toFixed(2)}%</p>
            <p className="text-[10px] text-slate-600 font-bold">Annualized active reward</p>
          </div>
        </div>

        <div className="card-blur p-6 rounded-2xl flex items-center gap-4 border-l-4 border-l-red-500 shadow-lg transition-transform hover:scale-[1.02]">
          <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20">
            <Battery className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Voting Mana</p>
            <p className="text-2xl font-black text-white">{analytics.manaPercent.toFixed(1)}%</p>
            <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
               <div 
                 className="h-full bg-red-500 transition-all duration-500" 
                 style={{ width: `${analytics.manaPercent}%` }}
               ></div>
            </div>
          </div>
        </div>
      </div>

<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="card-blur p-8 rounded-3xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] group-hover:bg-emerald-500/10 transition-all"></div>
        <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" /> HP Growth Trajectory (30 Days)
        </h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics.dailyData}>
              <defs>
                <linearGradient id="colorStake" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} interval={4} />
              <YAxis 
                domain={['dataMin - 10', 'auto']}
                stroke="#475569" fontSize={10} axisLine={false} tickLine={false} 
                tickFormatter={(val) => val > 1000 ? `${(val / 1000).toFixed(1)}k` : val}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                formatter={(val: number) => [`${val.toLocaleString()} HP`, 'Balance']}
              />
              <Area type="monotone" dataKey="stake" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorStake)" />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>

        <div className="card-blur p-8 rounded-3xl relative overflow-hidden group">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-red-500" /> Reward Flow (Author vs Curation)
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} interval={4} />
                <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                <Legend iconType="circle" />
                <Bar dataKey="author" name="Author Rewards" stackId="a" fill="#10b981" />
                <Bar dataKey="curator" name="Curation Rewards" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      
    </div>
  );
};
