'use client';

import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface AdminStats {
  recentActivity: {
    dailyCounts: Record<string, number>;
    dailyVolume: Record<string, { onramp: number; offramp: number }>;
    typeBreakdown: { onramp: number; offramp: number };
    statusBreakdown: Record<string, number>;
  };
  overview: {
    totalVolumeUsdc: number;
    completionRate: number;
    activeDisputes: number;
  };
}

interface Props {
  stats: AdminStats;
  days?: number;
}

const ORANGE = '#FF7A1A';
const GREEN = '#22c55e';
const BLUE = '#3b82f6';
const PURPLE = '#a855f7';
const RED = '#ef4444';
const YELLOW = '#eab308';

const STATUS_COLORS: Record<string, string> = {
  completed: GREEN,
  pending: YELLOW,
  accepted: BLUE,
  cancelled: RED,
  disputed: PURPLE,
  fiat_sent: '#06b6d4',
  usdc_sent: '#8b5cf6',
};

function buildDailyChartData(
  dailyCounts: Record<string, number>,
  dailyVolume: Record<string, { onramp: number; offramp: number }>,
  days: number
) {
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    data.push({
      date: label,
      orders: dailyCounts[key] || 0,
      onramp: dailyVolume?.[key]?.onramp || 0,
      offramp: dailyVolume?.[key]?.offramp || 0,
      volume: (dailyVolume?.[key]?.onramp || 0) + (dailyVolume?.[key]?.offramp || 0),
    });
  }
  return data;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs" style={{
      background: 'rgba(15,16,18,0.95)',
      border: '1px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(12px)',
    }}>
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === 'number' && p.value % 1 !== 0 ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
};

export function AnalyticsCharts({ stats, days = 7 }: Props) {
  const chartData = buildDailyChartData(
    stats.recentActivity.dailyCounts,
    stats.recentActivity.dailyVolume,
    days
  );

  const statusData = Object.entries(stats.recentActivity.statusBreakdown).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
    color: STATUS_COLORS[name] || '#64748b',
  }));

  const typeData = [
    { name: 'On-Ramp', value: stats.recentActivity.typeBreakdown.onramp, color: ORANGE },
    { name: 'Off-Ramp', value: stats.recentActivity.typeBreakdown.offramp, color: GREEN },
  ];

  return (
    <div className="space-y-4">
      {/* Row 1: Volume area chart */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-white">USDC Volume</h3>
            <p className="text-xs text-muted-foreground mt-0.5">On-ramp vs off-ramp · last {days} days</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{background: ORANGE}} />On-Ramp</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{background: GREEN}} />Off-Ramp</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradOnramp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ORANGE} stopOpacity={0.25} />
                <stop offset="95%" stopColor={ORANGE} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradOfframp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={GREEN} stopOpacity={0.2} />
                <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={45} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="onramp" name="On-Ramp USDC" stroke={ORANGE} strokeWidth={2} fill="url(#gradOnramp)" />
            <Area type="monotone" dataKey="offramp" name="Off-Ramp USDC" stroke={GREEN} strokeWidth={2} fill="url(#gradOfframp)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Row 2: Orders bar + two pie charts */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Daily orders bar */}
        <div className="glass-card rounded-xl p-6 md:col-span-2">
          <div className="mb-5">
            <h3 className="font-semibold text-white">Daily Orders</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Transaction count · last {days} days</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="orders" name="Orders" fill={ORANGE} radius={[4, 4, 0, 0]} opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Type split pie */}
        <div className="glass-card rounded-xl p-6">
          <div className="mb-4">
            <h3 className="font-semibold text-white">Flow Split</h3>
            <p className="text-xs text-muted-foreground mt-0.5">On-ramp vs off-ramp</p>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={typeData}
                cx="50%" cy="50%"
                innerRadius={42} outerRadius={64}
                paddingAngle={3}
                dataKey="value"
              >
                {typeData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-around mt-2">
            {typeData.map(t => (
              <div key={t.name} className="text-center">
                <p className="text-xs text-muted-foreground">{t.name}</p>
                <p className="text-sm font-bold" style={{ color: t.color }}>{t.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Status breakdown */}
      {statusData.length > 0 && (
        <div className="glass-card rounded-xl p-6">
          <div className="mb-5">
            <h3 className="font-semibold text-white">Order Status Breakdown</h3>
            <p className="text-xs text-muted-foreground mt-0.5">All statuses · last {days} days</p>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={statusData} layout="vertical" margin={{ top: 0, right: 24, left: 72, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]}>
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
