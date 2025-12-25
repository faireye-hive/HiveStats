
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Hexagon, Loader2, AlertCircle, PieChart as PieChartIcon, Clock
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis } from 'recharts';
import { hiveService } from './services/hiveService';
import { 
  DashboardData, HAFVoteOperation, HAFAuthorRewardOperation, 
  HAFCurationRewardOperation, HAFBenefactorRewardOperation, 
  HAFWitnessRewardOperation, HiveAsset, AnalyticsData 
} from './types';

// Tab Components
import { OverviewTab } from './components/tabs/OverviewTab';
import { RewardsTab } from './components/tabs/RewardsTab';
import { CurationTab } from './components/tabs/CurationTab';
import { CircleJerkTab } from './components/tabs/CircleJerkTab';
import { DelegationTab } from './components/tabs/DelegationTab';

const App: React.FC = () => {
  const [username, setUsername] = useState('sm-silva');
  const [searchInput, setSearchInput] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'rewards' | 'curation' | 'circlejerk' | 'delegation'>('overview');

    const parseAssetValue = useCallback((asset: HiveAsset): number => {

    if (!asset) return 0;
    if (typeof asset === 'string') return parseFloat(asset.split(' ')[0]) || 0;
    return parseInt(asset.amount) / Math.pow(10, asset.precision || 3);
  }, []);

  const fetchData = useCallback(async (targetUser: string) => {
    setLoading(true);
    setError(null);
    try {
      const [account, globalProps, followCount, history, delegations] = await Promise.all([
        hiveService.getAccount(targetUser),
        hiveService.getGlobalProps(),
        hiveService.getFollowCount(targetUser),
        hiveService.getAccountHistory(targetUser),
        hiveService.getVestingDelegations(targetUser)
      ]);

      const headBlock = globalProps.head_block_number;
      const blocks30Days = 28800 * 30;
      const fromBlock30 = Math.max(0, headBlock - blocks30Days);
      
      const [votes, rewards] = await Promise.all([
        hiveService.getHAFOperations(targetUser, headBlock - 201600, [72], 120),
        hiveService.getHAFOperations(targetUser, fromBlock30, [51, 52, 63, 64], 400) 
      ]);

      setData({
        account, followCount, hp: hiveService.calculateHP(account.vesting_shares, globalProps),
        history, votes: votes as HAFVoteOperation[],
        authorRewards: rewards.filter(op => op.op.type === 'author_reward_operation') as HAFAuthorRewardOperation[],
        benefactorRewards: rewards.filter(op => op.op.type === 'comment_benefactor_reward_operation') as HAFBenefactorRewardOperation[],
        witnessRewards: rewards.filter(op => op.op.type === 'witness_reward_operation') as HAFWitnessRewardOperation[],
        curationRewards: rewards.filter(op => op.op.type === 'curation_reward_operation') as HAFCurationRewardOperation[],
        vestsToHpRatio: hiveService.getVestsToHpRatio(globalProps),
        headBlock, delegations
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load Hive data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(username); }, [fetchData, username]);

  const analytics = useMemo(() => {
    if (!data) return null;
    
    let authorHBD = 0, authorHP = 0, curationHP = 0, pendingHBD = 0, pendingClaimsCount = 0;
    const dailyMap: Record<number, { day: number, author: number, curator: number }> = {};
    const pipelineMap: Record<number, number> = {};
    const cjMap: Record<string, { given: number, received: number, name: string }> = {};
    const blocks7Days = 201600;

    // Rewards Processing
    [...data.authorRewards, ...data.benefactorRewards, ...data.witnessRewards].forEach(r => {
      const val = parseAssetValue(r.op.type === 'witness_reward_operation' ? (r as any).op.value.shares : (r as any).op.value.vesting_payout) * data.vestsToHpRatio;
      authorHP += val;
      if ('hbd_payout' in r.op.value) authorHBD += parseAssetValue(r.op.value.hbd_payout);
      const day = Math.floor((data.headBlock - r.block) / 28800);
      if (day >= 0 && day < 30) {
        if (!dailyMap[day]) dailyMap[day] = { day, author: 0, curator: 0 };
        dailyMap[day].author += val;
      }
    });

    data.curationRewards.forEach(r => {
      const val = parseAssetValue(r.op.value.reward) * data.vestsToHpRatio;
      curationHP += val;
      const day = Math.floor((data.headBlock - r.block) / 28800);
      if (day >= 0 && day < 30) {
        if (!dailyMap[day]) dailyMap[day] = { day, author: 0, curator: 0 };
        dailyMap[day].curator += val;
      }
    });

    // Pending Curation (Deduplicated)
    const dedup: Record<string, HAFVoteOperation> = {};
    data.votes.forEach(v => {
      const key = `${v.op.value.author}/${v.op.value.permlink}`;
      if (v.op.value.voter === username && (data.headBlock - v.block) < blocks7Days) {
        if (!dedup[key] || dedup[key].block < v.block) dedup[key] = v;
      }
    });

    const uniquePendingVotes = Object.values(dedup);
    uniquePendingVotes.forEach(v => {
      // Use helper to avoid split on never error
      const totalPending = parseAssetValue(v.op.value.pending_payout);
      const share = (totalPending * 0.5) * (Math.abs(v.op.value.rshares) / Math.abs(v.op.value.total_vote_weight || 1));
      pendingHBD += share;
      pendingClaimsCount++;
      const days = Math.floor(Math.max(0, (v.block + blocks7Days) - data.headBlock) / 28800);
      if (days <= 7) pipelineMap[days] = (pipelineMap[days] || 0) + share;
    });

    // Social metrics
    data.votes.forEach(v => {
      const isOut = v.op.value.voter === username;
      // Use helper to avoid split on never error
      const totalPending = parseAssetValue(v.op.value.pending_payout);
      const share = (totalPending * 0.5) * (Math.abs(v.op.value.rshares) / Math.abs(v.op.value.total_vote_weight || 1));
      const target = isOut ? v.op.value.author : v.op.value.voter;
      if (!cjMap[target]) cjMap[target] = { given: 0, received: 0, name: target };
      if (isOut) cjMap[target].given += share; else cjMap[target].received += share;
    });

    let runningHP = data.hp - (authorHP + curationHP);
    const dailyData = Array.from({ length: 30 }, (_, i) => {
      const d = 29 - i;
      const b = dailyMap[d] || { author: 0, curator: 0 };
      runningHP += (b.author + b.curator);
      return { 
        name: d === 0 ? 'Today' : `${d}d`, 
        stake: Number(runningHP.toFixed(2)),
        author: Number(b.author.toFixed(2)),
        curator: Number(b.curator.toFixed(2))
      };
    });

    const circleJerk = Object.values(cjMap).map(u => {
      const maxVal = Math.max(u.given, u.received);
      const minVal = Math.min(u.given, u.received);
      // Refined: Ratio of reciprocity (min / max). 
      // High balance indicates high mutual voting (circlejerk risk).
      const balance = maxVal > 0 ? (minVal / maxVal) * 100 : 0;
      return { ...u, balance };
    }).filter(u => (u.given + u.received) > 0.01)
      .sort((a, b) => (b.given + b.received) - (a.given + a.received))
      .slice(0, 50);

        // APR Calculations
    const curationAPR = (curationHP / Math.max(1, data.hp)) * (365 / 30) * 100;
    const authorAPR = (authorHP / Math.max(1, data.hp)) * (365 / 30) * 100;

    // Mana Calculation
    const max_mana = 100;
    const last_mana = Number(data.account.voting_power)/100;
    const last_update = data.account.voting_manabar.last_update_time;
    const now = Math.floor(Date.now() / 1000);
    const delta = now - last_update;
    const regenerated = (delta * max_mana) / 432000;
    const actual_mana = Math.min(max_mana, last_mana + regenerated);
    const manaPercent = actual_mana;

    return {
      authorHBD, authorHP, curationHP, pendingHBD, pendingClaimsCount, uniquePendingVotes,
      dailyData, circleJerk, meanBalanceIndex: circleJerk.length > 0 ? circleJerk.reduce((a, b) => a + b.balance, 0) / circleJerk.length : 0,
      totalDelegatedOut: (data.delegations || []).reduce((a, d) => a + (parseAssetValue(d.vesting_shares) * data.vestsToHpRatio), 0),
      totalDelegatedIn: parseAssetValue(data.account.received_vesting_shares) * data.vestsToHpRatio,
      pipelineData: Array.from({ length: 8 }, (_, i) => ({ name: `+${i}d`, value: Number((pipelineMap[i] || 0).toFixed(3)) })),
      delegationROI: (data.delegations || []).map(d => ({ delegatee: d.delegatee, hp: parseAssetValue(d.vesting_shares) * data.vestsToHpRatio, returnedValue: cjMap[d.delegatee]?.received || 0, voteCount: data.votes.filter(v => v.op.value.voter === d.delegatee && v.op.value.author === username).length })),
      distribution: [{ name: 'Author', value: authorHP, color: '#10b981' }, { name: 'Curation', value: curationHP, color: '#3b82f6' }, { name: 'HBD', value: authorHBD, color: '#f59e0b' }],
      estDailyAuthor: authorHP / 30, estDailyCuration: curationHP / 30,
      curationAPR, authorAPR, manaPercent
    } as AnalyticsData;
  }, [data, username, parseAssetValue]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-red-500/30">
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 hive-gradient rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
            <Hexagon className="text-white w-6 h-6 fill-white/10" />
          </div>
          <div><h1 className="text-xl font-bold tracking-tight">Hivelytics</h1><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Intelligence & Forensics</p></div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (searchInput.trim()) { setUsername(searchInput.trim().toLowerCase().replace('@', '')); } }} className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input type="text" placeholder="Hive Username..." className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} /></div>
        </form>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {['overview', 'rewards', 'curation', 'circlejerk', 'delegation'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all capitalize ${activeTab === tab ? 'hive-gradient text-white shadow-lg shadow-red-500/20' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>{tab}</button>
          ))}
        </div>
      </header>

      <main className="pt-28 pb-12 px-6 max-w-[1600px] mx-auto">
        {error && <div className="mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-2xl flex items-center gap-3 text-red-400"><AlertCircle className="w-5 h-5" /><p className="font-medium">{error}</p></div>}
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]"><Loader2 className="w-12 h-12 text-red-500 animate-spin" /><p className="mt-4 text-slate-400 animate-pulse font-medium">Synchronizing Streams...</p></div>
        ) : data && analytics ? (
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-4 space-y-8">
              <div className="card-blur p-8 rounded-3xl text-center relative overflow-hidden group">
                <img 
                  src={`https://images.hive.blog/u/${username}/avatar`} 
                  alt={username} 
                  className="w-24 h-24 rounded-full border-4 border-slate-800 mx-auto mb-4 object-cover ring-2 ring-red-500/20" 
                  onError={(e) => (e.target as any).src = `https://images.hive.blog/u/${username}/avatar`} 
                />
                <h2 className="text-2xl font-bold">@{data.account.name}</h2>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-[10px] font-black uppercase">Reputation {hiveService.calculateReputation(data.account.reputation)}</div>
                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800"><p className="text-xl font-bold text-white">{data.followCount.follower_count}</p><p className="text-[10px] text-slate-500 font-bold uppercase">Followers</p></div>
                  <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800"><p className="text-xl font-bold text-white">{data.account.post_count}</p><p className="text-[10px] text-slate-500 font-bold uppercase">Activity</p></div>
                </div>
              </div>

                                           {/* Reward Distribution Chart */}
              <div className="card-blur p-8 rounded-3xl">
                <h3 className="font-bold mb-6 flex items-center gap-2"><PieChartIcon className="w-4 h-4 text-emerald-400" /> Global Portfolio (30d)</h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {analytics.distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff', fontSize: '11px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {analytics.distribution.map(item => (
                    <div key={item.name} className="flex justify-between items-center p-2 bg-slate-900/40 rounded-xl border border-slate-800/40">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-[10px] font-medium text-slate-400">{item.name}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-200">{item.value.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>

{/* Curation Pipeline Forensics */}
              <div className="card-blur p-8 rounded-3xl border-t-2 border-t-rose-500/30 shadow-lg shadow-rose-500/5">
                <div className="flex justify-between items-start mb-6">
                    <h3 className="font-bold flex items-center gap-2 text-rose-400"><Clock className="w-4 h-4" /> Daily Pipeline Distribution</h3>
                    <div className="text-right">
                        <p className="text-lg font-black text-rose-400">${analytics.pendingHBD.toFixed(3)}</p>
                        <p className="text-[8px] text-slate-500 font-bold uppercase">Expected 7-day Inflow</p>
                    </div>
                </div>
                <div className="h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.pipelineData}>
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {analytics.pipelineData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`rgba(244, 63, 94, ${0.3 + (index * 0.1)})`} />
                        ))}
                      </Bar>
                      <XAxis dataKey="name" fontSize={8} axisLine={false} tickLine={false} stroke="#475569" />
                      <Tooltip 
                         cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                         contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }}
                         itemStyle={{ fontSize: '10px' }}
                         formatter={(val: number) => [`$${val.toFixed(3)}`, 'Payout']}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-4 text-[10px] text-slate-500 text-center leading-relaxed">
                    Analyzing active curation windows. Projected yields from posts currently maturing.
                </p>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-8 space-y-8">
              {activeTab === 'overview' && <OverviewTab analytics={analytics} hp={data.hp} />}
              {activeTab === 'rewards' && <RewardsTab analytics={analytics} data={data} />}
              {activeTab === 'curation' && <CurationTab analytics={analytics} headBlock={data.headBlock} />}
              {activeTab === 'circlejerk' && <CircleJerkTab analytics={analytics} />}
              {activeTab === 'delegation' && <DelegationTab analytics={analytics} />}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default App;
