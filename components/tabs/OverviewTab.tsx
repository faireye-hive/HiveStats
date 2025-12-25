
import React from 'react';
import { TrendingUp, UserCheck, Zap, Activity, Award } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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

      <div className="card-blur p-8 rounded-3xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] group-hover:bg-emerald-500/10 transition-all"></div>
        <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500" /> HP growth Trajectory (30 Days)
        </h3>
        <div className="h-[340px]">
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
    </div>
  );
};
