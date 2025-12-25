
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  TrendingUp, 
  Users, 
  Wallet, 
  BarChart3, 
  Activity, 
  ExternalLink, 
  Hexagon,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  Heart,
  Award,
  Zap,
  DollarSign,
  PieChart as PieChartIcon,
  LayoutDashboard,
  Calendar,
  Layers,
  Clock,
  ChevronRight,
  UserCheck,
  RefreshCcw,
  UserMinus,
  UserPlus,
  Share2,
  TrendingDown,
  ShieldCheck,
  Frown,
  HandCoins,
  ArrowDownLeft,
  ArrowUpRight as ArrowUpRightIcon,
  Coins,
  Gem,
  ArrowDownToLine,
  ChevronDown,
  Info
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend, ComposedChart, Line
} from 'recharts';
import { hiveService } from './services/hiveService';
import { DashboardData, HAFVoteOperation, HAFAuthorRewardOperation, HAFCurationRewardOperation, HAFBenefactorRewardOperation, HiveAsset } from './types';
import { StatCard } from './components/StatCard';

const App: React.FC = () => {
  const [username, setUsername] = useState('sm-silva');
  const [searchInput, setSearchInput] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'rewards' | 'curation' | 'circlejerk' | 'delegation'>('overview');

  const parseAssetValue = (asset: HiveAsset): number => {
    if (!asset) return 0;
    if (typeof asset === 'string') {
      return parseFloat(asset.split(' ')[0]) || 0;
    }
    const amount = parseInt(asset.amount);
    if (isNaN(amount)) return 0;
    return amount / Math.pow(10, asset.precision || 3);
  };

  const estimateIndividualReward = (vote: HAFVoteOperation): number => {
    const totalPending = parseAssetValue(vote.op.value.pending_payout);
    const userRshares = Math.abs(vote.op.value.rshares || 0);
    const totalRshares = Math.abs(vote.op.value.total_vote_weight || 0);
    
    if (totalRshares === 0 || userRshares === 0) return 0;
    
    const shareRatio = userRshares / totalRshares;
    return (totalPending * 0.5) * shareRatio;
  };

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
      
      // Increased maxPages to 100 for rewards to ensure we get full 30 days history even for active users.
      // Included op 63 (comment_benefactor_reward_operation) to catch beneficiary income.
      const [votes, rewards] = await Promise.all([
        hiveService.getHAFOperations(targetUser, fromBlock30, [72], 60), 
        hiveService.getHAFOperations(targetUser, fromBlock30, [51, 52, 63], 100) 
      ]);

      const hp = hiveService.calculateHP(account.vesting_shares, globalProps);
      const ratio = hiveService.getVestsToHpRatio(globalProps);

      setData({
        account,
        followCount,
        hp,
        history,
        votes: votes as HAFVoteOperation[],
        authorRewards: rewards.filter(op => op.op.type === 'author_reward_operation') as HAFAuthorRewardOperation[],
        benefactorRewards: rewards.filter(op => op.op.type === 'comment_benefactor_reward_operation') as HAFBenefactorRewardOperation[],
        curationRewards: rewards.filter(op => op.op.type === 'curation_reward_operation') as HAFCurationRewardOperation[],
        vestsToHpRatio: ratio,
        headBlock,
        delegations
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load Hive data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(username);
  }, [fetchData, username]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      const formatted = searchInput.trim().toLowerCase().replace('@', '');
      setUsername(formatted);
      fetchData(formatted);
    }
  };

  const analytics = useMemo(() => {
    if (!data) return { authorHBD: 0, authorHP: 0, curationHP: 0, pendingHBD: 0, distribution: [], dailyData: [], pipelineData: [], estDailyAuthor: 0, estDailyCuration: 0, circleJerk: [], delegationROI: [], totalDelegatedOut: 0, totalDelegatedIn: 0, meanBalanceIndex: 0, pendingClaimsCount: 0 };
    
    let authorHBD = 0;
    let authorHP = 0;
    let curationHP = 0;
    let pendingHBD = 0;
    let pendingClaimsCount = 0;

    const dailyMap: Record<number, { day: number, author: number, curator: number }> = {};
    const pipelineMap: Record<number, number> = {};
    const cjMap: Record<string, { given: number, received: number, name: string }> = {};
    
    const latestRewardBlock = Math.max(...[...data.authorRewards, ...data.curationRewards, ...data.benefactorRewards].map(o => o.block), 0);
    const headBlock = data.headBlock || latestRewardBlock;
    const blocks7Days = 28800 * 7;

    data.authorRewards.forEach(reward => {
      const valHP = parseAssetValue(reward.op.value.vesting_payout) * data.vestsToHpRatio;
      authorHP += valHP;
      authorHBD += parseAssetValue(reward.op.value.hbd_payout);
      const dayIndex = Math.floor((latestRewardBlock - reward.block) / 28800);
      if (dayIndex >= 0 && dayIndex < 30) {
        if (!dailyMap[dayIndex]) dailyMap[dayIndex] = { day: dayIndex, author: 0, curator: 0 };
        dailyMap[dayIndex].author += valHP;
      }
    });

    data.benefactorRewards.forEach(reward => {
      const valHP = parseAssetValue(reward.op.value.vesting_payout) * data.vestsToHpRatio;
      authorHP += valHP; // Benefactor rewards contribute to Net Author/Stake gains
      authorHBD += parseAssetValue(reward.op.value.hbd_payout);
      const dayIndex = Math.floor((latestRewardBlock - reward.block) / 28800);
      if (dayIndex >= 0 && dayIndex < 30) {
        if (!dailyMap[dayIndex]) dailyMap[dayIndex] = { day: dayIndex, author: 0, curator: 0 };
        dailyMap[dayIndex].author += valHP;
      }
    });

    data.curationRewards.forEach(reward => {
      const valHP = parseAssetValue(reward.op.value.reward) * data.vestsToHpRatio;
      curationHP += valHP;
      const dayIndex = Math.floor((latestRewardBlock - reward.block) / 28800);
      if (dayIndex >= 0 && dayIndex < 30) {
        if (!dailyMap[dayIndex]) dailyMap[dayIndex] = { day: dayIndex, author: 0, curator: 0 };
        dailyMap[dayIndex].curator += valHP;
      }
    });

    data.votes.forEach(v => {
      const isOutgoing = v.op.value.voter === username;
      const share = estimateIndividualReward(v);
      const targetUser = isOutgoing ? v.op.value.author : v.op.value.voter;
      
      const isPending = (headBlock - v.block) < blocks7Days;

      if (isOutgoing) {
        if (isPending) {
          pendingHBD += share;
          pendingClaimsCount++;
          
          const blocksToPayout = Math.max(0, (v.block + blocks7Days) - headBlock);
          const daysUntilPayout = Math.floor(blocksToPayout / 28800);
          if (daysUntilPayout >= 0 && daysUntilPayout <= 7) {
            pipelineMap[daysUntilPayout] = (pipelineMap[daysUntilPayout] || 0) + share;
          }
        }

        if (targetUser !== username) {
          if (!cjMap[targetUser]) cjMap[targetUser] = { given: 0, received: 0, name: targetUser };
          cjMap[targetUser].given += share;
        }
      } else {
        if (targetUser === username) {
           if (!cjMap[v.op.value.voter]) cjMap[v.op.value.voter] = { given: 0, received: 0, name: v.op.value.voter };
           cjMap[v.op.value.voter].received += share;
        }
      }
    });

    const total30dRewards = authorHP + curationHP;
    const hpBaseline = data.hp - total30dRewards;
    let runningHP = hpBaseline;
    
    const dailyData = Array.from({ length: 30 }, (_, i) => {
      const dayIndex = 29 - i;
      const bucket = dailyMap[dayIndex] || { day: dayIndex, author: 0, curator: 0 };
      runningHP += (bucket.author + bucket.curator);
      
      return {
        name: dayIndex === 0 ? 'Today' : `${dayIndex}d ago`,
        author: Number(bucket.author.toFixed(2)),
        curator: Number(bucket.curator.toFixed(2)),
        stake: Number(runningHP.toFixed(2)),
        total: Number((bucket.author + bucket.curator).toFixed(2))
      };
    });

    const pipelineData = Array.from({ length: 8 }, (_, i) => ({
      name: i === 0 ? 'Expiring' : `+${i}d`,
      value: Number((pipelineMap[i] || 0).toFixed(3))
    }));

    const circleJerk = Object.values(cjMap)
      .map(u => {
        const totalVolume = u.given + u.received;
        const balance = totalVolume > 0 ? (Math.min(u.given, u.received) * 2 / totalVolume) * 100 : 0;
        return { ...u, balance };
      })
      .filter(u => u.given > 0.001 || u.received > 0.001)
      .sort((a, b) => b.given + b.received - (a.given + a.received))
      .slice(0, 50);

    const totalBalance = circleJerk.reduce((acc, u) => acc + u.balance, 0);
    const meanBalanceIndex = circleJerk.length > 0 ? totalBalance / circleJerk.length : 0;

    const totalDelegatedOut = (data.delegations || []).reduce((acc: number, d: any) => {
        return acc + (parseFloat(d.vesting_shares.split(' ')[0]) * data.vestsToHpRatio);
    }, 0);

    const totalDelegatedIn = parseFloat(data.account.received_vesting_shares.split(' ')[0]) * data.vestsToHpRatio;

    const delegationROI = (data.delegations || [])
      .map((d: any) => {
        const delegatee = d.delegatee;
        const vests = parseFloat(d.vesting_shares.split(' ')[0]);
        const hpValue = vests * data.vestsToHpRatio;
        const returnedVotes = cjMap[delegatee]?.received || 0;
        const count = data.votes.filter(v => v.op.value.voter === delegatee && v.op.value.author === username).length;
        
        return {
          delegatee,
          hp: hpValue,
          returnedValue: returnedVotes,
          voteCount: count,
          score: hpValue > 0 ? (returnedVotes / (hpValue * 0.0001)) : 0
        };
      })
      .sort((a: any, b: any) => b.returnedValue - a.returnedValue);

    const estDailyAuthor = authorHP / 30;
    const estDailyCuration = curationHP / 30;

    const distribution = [
      { name: 'Author Rewards', value: authorHP, color: '#10b981' },
      { name: 'Curation Rewards', value: curationHP, color: '#3b82f6' },
      { name: 'Liquid HBD', value: authorHBD, color: '#f59e0b' },
    ];

    return { 
      authorHBD, authorHP, curationHP, pendingHBD, distribution, dailyData, 
      pipelineData, estDailyAuthor, estDailyCuration, circleJerk, delegationROI,
      totalDelegatedOut, totalDelegatedIn, meanBalanceIndex, pendingClaimsCount
    };
  }, [data, username]);

  const profileImage = data?.account.posting_json_metadata 
    ? JSON.parse(data.account.posting_json_metadata)?.profile?.profile_image 
    : `https://images.hive.blog/u/${username}/avatar`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-red-500/30">
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 hive-gradient rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
            <Hexagon className="text-white w-6 h-6 fill-white/10" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Hivelytics</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Intelligence & Forensics</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Hive Username..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all placeholder:text-slate-600"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </form>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {['overview', 'rewards', 'curation', 'circlejerk', 'delegation'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all capitalize whitespace-nowrap ${activeTab === tab ? 'hive-gradient text-white shadow-lg shadow-red-500/20' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'}`}
            >
              {tab === 'circlejerk' ? 'CircleJerk 🔄' : tab === 'delegation' ? 'Delegation 🤝' : tab}
            </button>
          ))}
        </div>
      </header>

      <main className="pt-28 pb-12 px-6 max-w-[1600px] mx-auto">
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/50 rounded-2xl flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
            <p className="mt-4 text-slate-400 animate-pulse font-medium">Synchronizing HAF Streams (30D History)...</p>
          </div>
        ) : data ? (
          <div className="grid grid-cols-12 gap-8">
            {/* Sidebar Stats */}
            <div className="col-span-12 lg:col-span-4 space-y-8">
              <div className="card-blur p-8 rounded-3xl text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-red-500/20"></div>
                <div className="relative">
                  <img 
                    src={profileImage}
                    alt={username}
                    className="w-24 h-24 rounded-full border-4 border-slate-800 shadow-2xl mx-auto mb-4 object-cover ring-2 ring-red-500/20"
                    onError={(e) => (e.target as any).src = `https://images.hive.blog/u/${username}/avatar`}
                  />
                  <h2 className="text-2xl font-bold">@{data.account.name}</h2>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-[10px] font-black uppercase tracking-tighter">
                    Reputation {hiveService.calculateReputation(data.account.reputation)}
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                      <p className="text-xl font-bold text-white">{data.followCount.follower_count}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Followers</p>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                      <p className="text-xl font-bold text-white">{data.account.post_count}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Activity</p>
                    </div>
                  </div>
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

            {/* Main Content Area */}
            <div className="col-span-12 lg:col-span-8 space-y-8">
              {activeTab === 'overview' && (
                <>
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
                      label="Yield Expectancy" 
                      value={`$${analytics.pendingHBD.toFixed(2)}`} 
                      icon={<Activity className="w-5 h-5" />}
                      subValue="7d curation pipeline"
                    />
                    <StatCard 
                      label="Voting Power" 
                      value={`${data.hp.toLocaleString(undefined, { maximumFractionDigits: 0 })} HP`} 
                      icon={<Award className="w-5 h-5" />}
                      subValue="Stake Weight"
                    />
                  </div>

                  <div className="card-blur p-8 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[100px] group-hover:bg-emerald-500/10 transition-all"></div>
                    <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-500" /> HP Growth Trajectory (30 Days)
                    </h3>
                    <div className="h-[340px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorStake" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="name" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} interval={4} />
                          <YAxis 
                            domain={['dataMin - 5', 'auto']}
                            stroke="#475569" 
                            fontSize={10} 
                            axisLine={false} 
                            tickLine={false} 
                            tickFormatter={(val) => val > 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                            formatter={(val: number) => [`${val.toLocaleString()} HP`, 'Balance']}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="stake" 
                            stroke="#10b981" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorStake)" 
                            animationDuration={2000}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'curation' && (
                <div className="space-y-8 animate-in slide-in-from-right duration-500">
                  <div className="card-blur p-10 rounded-3xl border-l-4 border-l-rose-500 relative overflow-hidden bg-rose-500/5 shadow-2xl shadow-rose-500/5">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Heart className="w-32 h-32 text-rose-500" />
                    </div>
                    <div className="relative">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shadow-inner">
                          <Zap className="w-7 h-7 text-rose-500" />
                        </div>
                        <div>
                          <h3 className="text-3xl font-black text-white">Pending Curation Forecast</h3>
                          <p className="text-slate-500 font-medium">Projection of curation rewards currently maturing (last 7 days).</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-rose-400 font-black uppercase tracking-[0.2em] mb-2">Aggregate Projected Value</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black text-white">${analytics.pendingHBD.toFixed(3)}</span>
                            <span className="text-lg font-bold text-slate-500">HBD EQUIV.</span>
                          </div>
                          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-500">
                             <Info className="w-3.5 h-3.5" />
                             <span>Based on current rshares share relative to post total pool.</span>
                          </div>
                        </div>
                        
                        <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800 flex items-center justify-between shadow-xl">
                           <div>
                              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Active Claims Count</p>
                              <p className="text-3xl font-black text-slate-200">{analytics.pendingClaimsCount}</p>
                           </div>
                           <div className="w-px h-12 bg-slate-800"></div>
                           <div className="text-right">
                              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Portfolio Efficiency</p>
                              <p className="text-3xl font-black text-emerald-500">~{((analytics.pendingHBD / (data.hp * 0.0001 || 1)) * 100).toFixed(0)}%</p>
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card-blur rounded-3xl overflow-hidden shadow-2xl border-slate-800/50">
                    <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/10">
                       <h4 className="text-lg font-black flex items-center gap-3">
                         <Layers className="w-5 h-5 text-slate-500" /> Active Curation Ledger
                       </h4>
                       <span className="text-[10px] font-black bg-rose-500/20 text-rose-400 px-3 py-1 rounded-full uppercase tracking-widest">
                         Pending Window (7D)
                       </span>
                    </div>
                    <div className="overflow-x-auto max-h-[700px] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left">
                        <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 text-[10px] text-slate-500 uppercase font-black tracking-widest z-10">
                          <tr>
                            <th className="py-6 px-10">Asset / Author</th>
                            <th className="py-6 px-10 text-center">Vote Weight (%)</th>
                            <th className="py-6 px-10 text-right">Potential Cut (Est)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.votes
                            .filter(v => v.op.value.voter === username && (data.headBlock - v.block) < 201600)
                            .map((v, idx) => {
                              const yourShare = estimateIndividualReward(v);
                              const weightVal = v.op.value.weight || 0;
                              const displayPercent = (Math.abs(weightVal) / 100).toFixed(2);
                              
                              return (
                                <tr key={`${v.trx_id}-${idx}`} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-all group">
                                  <td className="py-5 px-10">
                                    <div className="flex items-center gap-4">
                                      <div className="relative">
                                         <img 
                                          src={`https://images.hive.blog/u/${v.op.value.author}/avatar`} 
                                          className="w-12 h-12 rounded-xl border-2 border-slate-800 shadow-xl group-hover:scale-110 transition-transform bg-slate-800" 
                                          alt="" 
                                          onError={(e) => (e.target as any).src = `https://images.hive.blog/u/${v.op.value.author}/avatar`}
                                         />
                                         <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-500 border-2 border-slate-900 flex items-center justify-center">
                                            <Heart className="w-2.5 h-2.5 text-white fill-white" />
                                         </div>
                                      </div>
                                      <div className="flex flex-col">
                                        <p className="text-base font-black text-slate-100 group-hover:text-rose-400 transition-colors">@{v.op.value.author}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <p className="text-[11px] text-slate-500 font-mono truncate max-w-[280px]">/{v.op.value.permlink}</p>
                                          <ExternalLink className="w-3 h-3 text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-5 px-10 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                       <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner border border-slate-700">
                                          <div className="h-full bg-rose-500 transition-all duration-1000" style={{ width: `${Math.min(100, parseFloat(displayPercent))}%` }}></div>
                                       </div>
                                       <span className="text-sm font-black text-slate-400">{displayPercent}%</span>
                                    </div>
                                  </td>
                                  <td className="py-5 px-10 text-right">
                                    <div className="flex flex-col items-end">
                                      <div className="text-xl font-black text-white transition-all group-hover:scale-105 group-hover:text-rose-400">
                                        ${yourShare.toFixed(4)}
                                      </div>
                                      <div className="flex items-center gap-2 mt-1">
                                        <p className="text-[10px] text-slate-600 font-black uppercase tracking-tighter">Pool: ${parseAssetValue(v.op.value.pending_payout).toFixed(2)}</p>
                                        <div className="w-1 h-1 rounded-full bg-slate-800"></div>
                                        <p className="text-[10px] text-slate-700 font-bold uppercase">Exp. In {Math.max(0, Math.floor((201600 - (data.headBlock - v.block)) / 28800))}D</p>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'rewards' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="card-blur p-8 rounded-3xl relative overflow-hidden bg-slate-900/20 border-emerald-500/20">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <ArrowDownToLine className="w-24 h-24" />
                    </div>
                    <div className="relative">
                        <div className="flex flex-col md:flex-row md:items-end gap-2 mb-8">
                            <h3 className="text-3xl font-black text-white">Rewards Analysis</h3>
                            <span className="text-slate-500 font-bold mb-1">Total gains for the last 30 days period</span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1">Net HP Gained</span>
                                <p className="text-4xl font-black text-white leading-tight">
                                    {(analytics.authorHP + analytics.curationHP).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    <span className="text-lg text-emerald-500 ml-2">HP</span>
                                </p>
                                <div className="mt-2 text-[10px] font-bold text-slate-500 bg-slate-800/50 w-fit px-2 py-0.5 rounded">
                                    AVG: {((analytics.authorHP + analytics.curationHP)/30).toFixed(2)} HP / DAY
                                </div>
                            </div>
                            
                            <div className="flex flex-col">
                                <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">Curation Yield</span>
                                <p className="text-2xl font-black text-slate-200">
                                    {analytics.curationHP.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    <span className="text-sm text-blue-400 ml-1">HP</span>
                                </p>
                                <span className="text-[10px] text-slate-500 font-bold">Passive Voting Return</span>
                            </div>

                            <div className="flex flex-col">
                                <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mb-1">Author Yield</span>
                                <p className="text-2xl font-black text-slate-200">
                                    {analytics.authorHP.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    <span className="text-sm text-emerald-500 ml-1">HP</span>
                                </p>
                                <span className="text-[10px] text-slate-500 font-bold">Content & Benefactor</span>
                            </div>

                            <div className="flex flex-col">
                                <span className="text-[10px] text-amber-500 font-black uppercase tracking-widest mb-1">HBD Liquidity</span>
                                <p className="text-2xl font-black text-slate-200">
                                    {analytics.authorHBD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    <span className="text-sm text-amber-500 ml-1">HBD</span>
                                </p>
                                <span className="text-[10px] text-slate-500 font-bold">Stable Portfolio Component</span>
                            </div>
                        </div>
                    </div>
                  </div>

                  <div className="card-blur rounded-3xl overflow-hidden shadow-2xl border-slate-800/50">
                    <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/10">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="w-6 h-6 text-slate-400" />
                        <div>
                          <h3 className="text-xl font-bold">Chronological Reward Ledger</h3>
                          <p className="text-xs text-slate-500">Atomic breakdown of every protocol-issued reward.</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/30 border border-slate-700 rounded-xl">
                        <span className="text-xs font-bold text-slate-400">Total Entries:</span>
                        <span className="text-xs font-black text-white">{data.authorRewards.length + data.curationRewards.length + data.benefactorRewards.length}</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left">
                        <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 text-[10px] text-slate-500 uppercase font-black tracking-widest z-10">
                          <tr>
                            <th className="py-5 px-8">Class</th>
                            <th className="py-5 px-8">Source Content / Target</th>
                            <th className="py-5 px-8 text-right">HP Distribution</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...data.authorRewards, ...data.curationRewards, ...data.benefactorRewards]
                            .sort((a, b) => b.block - a.block)
                            .map((op, idx) => {
                              const opType = op.op.type;
                              const isAuthor = opType === 'author_reward_operation';
                              const isBenefactor = opType === 'comment_benefactor_reward_operation';
                              const isCuration = opType === 'curation_reward_operation';
                              
                              const contextUser = isAuthor 
                                ? (op as HAFAuthorRewardOperation).op.value.author 
                                : isBenefactor 
                                  ? (op as HAFBenefactorRewardOperation).op.value.author
                                  : ((op as HAFCurationRewardOperation).op.value.author || (op as HAFCurationRewardOperation).op.value.comment_author || 'unknown');
                              
                              const permlink = (op as any).op.value.permlink || (op as any).op.value.comment_permlink;
                              const hpValue = (isAuthor || isBenefactor)
                                ? parseAssetValue((op as any).op.value.vesting_payout) * data.vestsToHpRatio
                                : parseAssetValue((op as any).op.value.reward) * data.vestsToHpRatio;
                              
                              return (
                                <tr key={`${op.trx_id}-${idx}`} className="border-b border-slate-800/30 hover:bg-slate-800/40 transition-all group">
                                  <td className="py-5 px-8">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${isAuthor ? 'bg-emerald-500' : isBenefactor ? 'bg-purple-500' : 'bg-blue-500'} group-hover:scale-125 transition-transform`}></div>
                                      <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded ${isAuthor ? 'bg-emerald-500/10 text-emerald-400' : isBenefactor ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                        {isAuthor ? 'AUTH_DIST' : isBenefactor ? 'BENE_DIST' : 'CURA_DIST'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-5 px-8">
                                     <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-slate-100">@{contextUser}</span>
                                        {permlink && <span className="text-[10px] text-slate-500 font-mono truncate max-w-[200px] bg-slate-900/50 px-1 rounded">/{permlink}</span>}
                                      </div>
                                      <div className="flex items-center gap-2 text-[9px] text-slate-600 font-bold">
                                        <Layers className="w-2.5 h-2.5" /> Block #{op.block.toLocaleString()}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-5 px-8 text-right">
                                    <div className="flex flex-col items-end">
                                      <div className="text-base font-black text-slate-50 group-hover:text-white transition-colors">
                                        +{hpValue.toFixed(3)} <span className="text-[10px] text-slate-500">HP</span>
                                      </div>
                                      {(isAuthor || isBenefactor) && parseAssetValue((op as any).op.value.hbd_payout) > 0 && (
                                        <div className="text-[10px] text-amber-500 font-black flex items-center gap-1">
                                          <Gem className="w-2.5 h-2.5" /> +{parseAssetValue((op as any).op.value.hbd_payout).toFixed(3)} HBD
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'delegation' && (
                <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card-blur p-8 rounded-3xl border-l-4 border-l-blue-500 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <ArrowUpRightIcon className="w-16 h-16" />
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <ArrowUpRightIcon className="w-4 h-4 text-blue-400" />
                            </div>
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Delegated Outflow</span>
                        </div>
                        <p className="text-3xl font-black text-white">{analytics.totalDelegatedOut.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-sm text-slate-500">HP</span></p>
                    </div>
                    
                    <div className="card-blur p-8 rounded-3xl border-l-4 border-l-emerald-500 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <ArrowDownLeft className="w-16 h-16" />
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                            </div>
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Leased Inflow</span>
                        </div>
                        <p className="text-3xl font-black text-white">{analytics.totalDelegatedIn.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-sm text-slate-500">HP</span></p>
                    </div>
                  </div>

                  <div className="card-blur p-8 rounded-3xl relative overflow-hidden border-slate-800/50">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px]"></div>
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-2xl font-black flex items-center gap-3">
                          <HandCoins className="w-7 h-7 text-blue-500" /> Stake Lease Audit
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">Cross-referencing active leases with historical vote returns.</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="border-b border-slate-800 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                          <tr>
                            <th className="py-6 px-8">Delegatee</th>
                            <th className="py-6 px-8 text-center">Amount (HP)</th>
                            <th className="py-6 px-8 text-center">ROI (30d)</th>
                            <th className="py-6 px-8 text-right">Relationship Index</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.delegationROI.map((d: any) => (
                            <tr key={d.delegatee} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-all group">
                              <td className="py-5 px-8">
                                <div className="flex items-center gap-3">
                                  <img src={`https://images.hive.blog/u/${d.delegatee}/avatar`} className="w-10 h-10 rounded-full border-2 border-slate-800 shadow-xl" alt="" />
                                  <span className="text-sm font-bold text-slate-100 group-hover:text-blue-400 transition-colors">@{d.delegatee}</span>
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
                                <div className="flex items-center justify-end gap-2">
                                  {d.returnedValue > 0 ? (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[10px] font-black uppercase">
                                      <ShieldCheck className="w-3.5 h-3.5" /> Mutual Active
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-400 text-[10px] font-black uppercase">
                                      <Frown className="w-3.5 h-3.5" /> No Reciprocity
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'circlejerk' && (
                <div className="space-y-8 animate-in zoom-in duration-500">
                  <div className="card-blur p-8 rounded-3xl relative overflow-hidden border-amber-500/20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px]"></div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                      <div>
                        <h3 className="text-2xl font-black flex items-center gap-3">
                          <RefreshCcw className="w-7 h-7 text-amber-500 animate-spin-slow" /> CircleJerk Forensics
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 font-medium">Quantifying mutual voting clusters and governance reciprocity.</p>
                      </div>
                      <div className="flex items-center gap-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                         <div className="text-center">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Mutual Cluster Size</p>
                            <p className="text-3xl font-black text-amber-500">{analytics.circleJerk.filter(u => u.given > 0 && u.received > 0).length}</p>
                         </div>
                         <div className="w-px h-10 bg-slate-800"></div>
                         <div className="text-center">
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Mean Balance Index</p>
                            <p className="text-3xl font-black text-slate-200">
                              {analytics.meanBalanceIndex.toFixed(0)}<span className="text-base text-slate-500 ml-1">%</span>
                            </p>
                         </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="border-b border-slate-800 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                          <tr>
                            <th className="py-6 px-8">Cluster Member</th>
                            <th className="py-6 px-8 text-center">Gave (Est $)</th>
                            <th className="py-6 px-8 text-center">Received (Est $)</th>
                            <th className="py-6 px-8 text-right">Reciprocity Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.circleJerk.map((u) => (
                            <tr key={u.name} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-all group">
                              <td className="py-5 px-8">
                                <div className="flex items-center gap-3">
                                  <img src={`https://images.hive.blog/u/${u.name}/avatar`} className="w-10 h-10 rounded-full border-2 border-slate-800 shadow-lg" alt="" />
                                  <span className="text-sm font-bold text-slate-100 group-hover:text-amber-500 transition-colors">@{u.name}</span>
                                </div>
                              </td>
                              <td className="py-5 px-8 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="text-sm font-mono text-emerald-400 font-black">${u.given.toFixed(3)}</span>
                                  <div className="w-20 h-1 bg-slate-800 rounded-full mt-2 overflow-hidden shadow-inner">
                                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (u.given / (u.given + u.received)) * 100)}%` }}></div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-5 px-8 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="text-sm font-mono text-blue-400 font-black">${u.received.toFixed(3)}</span>
                                  <div className="w-20 h-1 bg-slate-800 rounded-full mt-2 overflow-hidden shadow-inner">
                                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (u.received / (u.given + u.received)) * 100)}%` }}></div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-5 px-8 text-right">
                                <div className="flex flex-col items-end">
                                  <div className={`text-2xl font-black ${u.balance > 85 ? 'text-amber-400' : 'text-slate-400'}`}>
                                    {u.balance.toFixed(0)}<span className="text-[10px] ml-0.5">%</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    {u.given > u.received ? <UserMinus className="w-3 h-3 text-rose-500" /> : <UserPlus className="w-3 h-3 text-emerald-500" />}
                                    <span className="text-[9px] text-slate-600 font-black uppercase tracking-tighter">
                                      {u.given > u.received ? 'Favor Accumulator' : 'Net Beneficiary'}
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
              )}
            </div>
          </div>
        ) : null}
      </main>

      <footer className="py-12 px-6 border-t border-slate-900 mt-20 bg-slate-950/50 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner group">
              <Hexagon className="w-7 h-7 text-red-500 fill-red-500/5 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <span className="text-sm font-black uppercase tracking-[0.4em] text-slate-400 block">HiveLytics Engine</span>
              <span className="text-[10px] text-slate-700 font-black uppercase tracking-widest">Stake Intelligence • HAF-Enhanced Visualization • v4.9.0</span>
            </div>
          </div>
          <div className="flex items-center gap-8">
             <div className="text-right">
                <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1">System Load</p>
                <div className="flex items-center gap-1.5 justify-end">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                   <span className="text-xs font-bold text-slate-400">Node Cluster Online</span>
                </div>
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
