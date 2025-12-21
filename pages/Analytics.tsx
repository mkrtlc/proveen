
import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppSelector } from '../store';
import { StatCardSkeleton, ChartSkeleton } from '../components/Skeleton';
import { Icon } from '../components/Icon';

const Analytics: React.FC = () => {
  const { generatedCreatives, loading } = useAppSelector((state) => state.creative);

  const stats = useMemo(() => {
    const totalCreatives = generatedCreatives.length;

    // Calculate creatives generated this week
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Note: stored timestamp is currently a string like "Just now" or ISO string depending on implementation.
    // Ideally we should store real ISO timestamps. 
    // Checking creativeSlice.ts, it uses `id: Date.now().toString()` which gives us a timestamp!

    const thisWeekCount = generatedCreatives.filter(c => {
      const timestamp = parseInt(c.id);
      return !isNaN(timestamp) && timestamp > oneWeekAgo.getTime();
    }).length;

    return {
      totalCreatives,
      thisWeekCount,
      // Placeholders until we track these
      postsPublished: 0,
      postsPublishedGrowth: 0,
      totalEngagement: 0,
      totalEngagementGrowth: 0
    };
  }, [generatedCreatives]);

  // Placeholder data for chart until we track historical creation
  const chartData = [
    { name: 'Week 1', creatives: 0 },
    { name: 'Week 2', creatives: 0 },
    { name: 'Week 3', creatives: 0 },
    { name: 'Week 4', creatives: 0 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-main">Analytics Dashboard</h1>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Icon name="calendar_month" size={18} />
            Last 30 Days
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Total Creatives Generated</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold">{stats.totalCreatives}</h3>
                <span className="text-xs text-black font-bold">+{stats.thisWeekCount} this week</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Posts Published</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold">{stats.postsPublished}</h3>
                <span className="text-xs text-gray-400 font-medium">Not tracked yet</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Total Engagement</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold">{stats.totalEngagement}</h3>
                <span className="text-xs text-gray-400 font-medium">Not tracked yet</span>
              </div>
            </div>
          </>
        )}
      </div>

      {loading ? (
        <ChartSkeleton />
      ) : (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold">Creatives Created</h3>
            <p className="text-sm text-gray-500">Total creatives generated over time</p>
          </div>
          <div className="h-[300px] w-full">
            {/* If no data, maybe show a clearer state? For now, empty chart is fine. */}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCreative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#000000" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#000000', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="creatives" stroke="#000000" strokeWidth={3} fillOpacity={1} fill="url(#colorCreative)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
