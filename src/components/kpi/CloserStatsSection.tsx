import { useState } from 'react';
import { User, TrendingUp, Wallet, Target, Phone, PhoneCall, Percent, UserX, Filter } from 'lucide-react';
import { Tunnel, Charges, CloserTunnelStats } from '@/types/business';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CloserStats {
  closerId: string;
  closerName: string;
  totalSales: number;
  totalCollected: number;
  totalContracted: number;
  closingRate: number;
  callsClosed: number;
  callsGenerated: number;
  commission: number;
  averagePrice: number;
  // New tracking stats
  callsReceived: number;
  callsAnswered: number;
  noShows: number;
  answerRate: number;
  noShowRate: number;
}

interface CloserStatsSectionProps {
  tunnels: Tunnel[];
  charges: Charges;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function CloserStatsSection({ tunnels, charges }: CloserStatsSectionProps) {
  const [tunnelFilter, setTunnelFilter] = useState<string>('all');
  
  // Filter tunnels
  const filteredTunnels = tunnelFilter === 'all' 
    ? tunnels 
    : tunnels.filter(t => t.id === tunnelFilter);
  
  // Calculate stats per closer
  const closerStatsMap = new Map<string, CloserStats>();
  
  // Initialize all closers (even those with no sales)
  charges.closers.forEach(closer => {
    closerStatsMap.set(closer.id, {
      closerId: closer.id,
      closerName: `${closer.firstName} ${closer.lastName}`,
      totalSales: 0,
      totalCollected: 0,
      totalContracted: 0,
      closingRate: 0,
      callsClosed: 0,
      callsGenerated: 0,
      commission: 0,
      averagePrice: 0,
      // New tracking stats
      callsReceived: 0,
      callsAnswered: 0,
      noShows: 0,
      answerRate: 0,
      noShowRate: 0,
    });
  });
  
  // Aggregate closer tracking stats from tunnels
  filteredTunnels.forEach(tunnel => {
    if (tunnel.closerStats) {
      tunnel.closerStats.forEach(stat => {
        const closerStats = closerStatsMap.get(stat.closerId);
        if (closerStats) {
          closerStats.callsReceived += stat.callsReceived;
          closerStats.callsAnswered += stat.callsAnswered;
          closerStats.noShows += stat.noShows;
        }
      });
    }
  });
  
  // Track calls generated per closer (based on tunnel data)
  // We need to track which tunnels each closer worked on
  const closerTunnelsMap = new Map<string, Set<string>>();
  
  // Aggregate sales data per closer
  filteredTunnels.forEach(tunnel => {
    tunnel.sales.forEach(sale => {
      if (sale.closerId) {
        const stats = closerStatsMap.get(sale.closerId);
        if (stats) {
          stats.totalSales += 1;
          stats.totalCollected += sale.amountCollected;
          stats.totalContracted += sale.totalPrice;
          stats.callsClosed += 1;
          
          // Track which tunnels this closer worked on
          if (!closerTunnelsMap.has(sale.closerId)) {
            closerTunnelsMap.set(sale.closerId, new Set());
          }
          closerTunnelsMap.get(sale.closerId)!.add(tunnel.id);
        }
      }
    });
  });
  
  // Calculate calls generated per closer
  // Approach: For each tunnel a closer worked on, attribute a proportional share of calls
  closerTunnelsMap.forEach((tunnelIds, closerId) => {
    const stats = closerStatsMap.get(closerId);
    if (stats) {
      tunnelIds.forEach(tunnelId => {
        const tunnel = tunnels.find(t => t.id === tunnelId);
        if (tunnel && tunnel.callsGenerated > 0) {
          // Count how many closers worked on this tunnel
          const closersOnTunnel = new Set(
            tunnel.sales.filter(s => s.closerId).map(s => s.closerId)
          ).size;
          
          // Attribute calls proportionally based on sales
          const closerSalesInTunnel = tunnel.sales.filter(s => s.closerId === closerId).length;
          const totalSalesInTunnel = tunnel.sales.filter(s => s.closerId).length;
          
          if (totalSalesInTunnel > 0) {
            // Proportional attribution of calls generated
            const callsShare = (closerSalesInTunnel / totalSalesInTunnel) * tunnel.callsGenerated;
            stats.callsGenerated += callsShare;
          }
        }
      });
    }
  });
  
  // Calculate derived metrics for each closer
  const taxRate = charges.taxPercent / 100;
  closerStatsMap.forEach((stats) => {
    // Calculate commission (on HT amount)
    const collectedHT = stats.totalCollected * (1 / (1 + taxRate));
    stats.commission = collectedHT * (charges.closersPercent / 100);
    
    // Calculate average price per sale
    stats.averagePrice = stats.totalSales > 0 ? stats.totalContracted / stats.totalSales : 0;
    
    // Calculate closing rate (calls closed / calls generated)
    stats.closingRate = stats.callsGenerated > 0 
      ? (stats.callsClosed / stats.callsGenerated) * 100 
      : 0;
    
    // Calculate answer and no-show rates from tracking data
    stats.answerRate = stats.callsReceived > 0 
      ? (stats.callsAnswered / stats.callsReceived) * 100 
      : 0;
    stats.noShowRate = stats.callsReceived > 0 
      ? (stats.noShows / stats.callsReceived) * 100 
      : 0;
  });
  
  // Convert to array and sort by total collected (descending)
  const closerStats = Array.from(closerStatsMap.values())
    .sort((a, b) => b.totalCollected - a.totalCollected);
  
  if (closerStats.length === 0) {
    return null;
  }
  
  // Calculate totals for comparison
  const totals = closerStats.reduce((acc, stats) => ({
    totalSales: acc.totalSales + stats.totalSales,
    totalCollected: acc.totalCollected + stats.totalCollected,
    totalContracted: acc.totalContracted + stats.totalContracted,
    totalCommission: acc.totalCommission + stats.commission,
  }), { totalSales: 0, totalCollected: 0, totalContracted: 0, totalCommission: 0 });

  // Prepare chart data
  const barChartData = closerStats.map(stats => ({
    name: stats.closerName.split(' ')[0], // First name only for chart
    fullName: stats.closerName,
    collected: Math.round(stats.totalCollected),
    contracted: Math.round(stats.totalContracted),
    commission: Math.round(stats.commission),
    ventes: stats.totalSales,
  }));

  const pieChartData = closerStats.map((stats, index) => ({
    name: stats.closerName,
    value: Math.round(stats.totalCollected),
    color: COLORS[index % COLORS.length],
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{payload[0]?.payload?.fullName || label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toLocaleString('fr-FR')} {entry.name === 'ventes' ? '' : '€'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percent = totals.totalCollected > 0 
        ? ((data.value / totals.totalCollected) * 100).toFixed(1) 
        : 0;
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="font-medium text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value.toLocaleString('fr-FR')} € ({percent}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Statistiques par Closer
        </h3>
        
        {/* Tunnel Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={tunnelFilter} onValueChange={setTunnelFilter}>
            <SelectTrigger className="w-[200px] bg-secondary/30">
              <SelectValue placeholder="Filtrer par tunnel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les tunnels</SelectItem>
              {tunnels.map(tunnel => (
                <SelectItem key={tunnel.id} value={tunnel.id}>
                  {tunnel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Charts Section */}
      {closerStats.length > 0 && totals.totalCollected > 0 && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          {/* Bar Chart - CA Comparison */}
          <div className="rounded-lg border border-border/30 bg-secondary/10 p-4">
            <h4 className="mb-4 text-sm font-medium text-foreground">Comparaison CA par Closer</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => <span className="text-muted-foreground">{value}</span>}
                />
                <Bar 
                  dataKey="collected" 
                  name="Collecté" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="contracted" 
                  name="Contracté" 
                  fill="hsl(var(--chart-2))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart - Revenue Share */}
          <div className="rounded-lg border border-border/30 bg-secondary/10 p-4">
            <h4 className="mb-4 text-sm font-medium text-foreground">Répartition du CA Collecté</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name.split(' ')[0]} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {closerStats.map((stats, index) => {
          const sharePercent = totals.totalCollected > 0 
            ? (stats.totalCollected / totals.totalCollected) * 100 
            : 0;
          
          return (
            <div 
              key={stats.closerId} 
              className="rounded-lg border border-border/30 bg-secondary/20 p-4 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-4">
                <div 
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${COLORS[index % COLORS.length]}20` }}
                >
                  <User className="h-5 w-5" style={{ color: COLORS[index % COLORS.length] }} />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{stats.closerName}</h4>
                  <p className="text-xs text-muted-foreground">
                    {sharePercent.toFixed(1)}% du CA total
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                {/* Tracking Stats - Calls Received/Answered/NoShows */}
                {stats.callsReceived > 0 && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-2 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Tracking Appels</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Reçus</p>
                        <p className="font-bold text-foreground">{stats.callsReceived}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Répondus</p>
                        <p className="font-bold text-profitable">{stats.callsAnswered}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">No-shows</p>
                        <p className="font-bold text-warning">{stats.noShows}</p>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-profitable">Réponse: {stats.answerRate.toFixed(1)}%</span>
                      <span className="text-warning">No-show: {stats.noShowRate.toFixed(1)}%</span>
                    </div>
                  </div>
                )}

                {/* Closing Rate */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Percent className="h-3.5 w-3.5" />
                    Taux de closing
                  </span>
                  <span className={`font-medium ${stats.closingRate > 30 ? 'text-profitable' : stats.closingRate > 15 ? 'text-warning' : 'text-danger'}`}>
                    {stats.closingRate > 0 ? `${stats.closingRate.toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
                
                {/* Calls Info (from sales, not tracking) */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <PhoneCall className="h-3.5 w-3.5" />
                    Closés / Générés
                  </span>
                  <span className="font-medium text-foreground">
                    {stats.callsClosed} / {Math.round(stats.callsGenerated) || '–'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" />
                    Ventes
                  </span>
                  <span className="font-medium text-foreground">{stats.totalSales}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5" />
                    CA Collecté
                  </span>
                  <span className="font-medium text-foreground">
                    {stats.totalCollected.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" />
                    CA Contracté
                  </span>
                  <span className="font-medium text-foreground">
                    {stats.totalContracted.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    Panier moyen
                  </span>
                  <span className="font-medium text-foreground">
                    {stats.averagePrice.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
                  </span>
                </div>
                
                <div className="pt-2 border-t border-border/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Commission</span>
                    <span className="font-medium" style={{ color: COLORS[index % COLORS.length] }}>
                      {stats.commission.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary row */}
      {closerStats.length > 1 && (
        <div className="mt-4 pt-4 border-t border-border/30">
          <div className="flex flex-wrap gap-6 justify-center text-sm">
            <div className="text-center">
              <p className="text-muted-foreground">Total Ventes</p>
              <p className="font-display text-lg font-bold text-foreground">{totals.totalSales}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Total Collecté</p>
              <p className="font-display text-lg font-bold text-foreground">
                {totals.totalCollected.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
              </p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Total Contracté</p>
              <p className="font-display text-lg font-bold text-foreground">
                {totals.totalContracted.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
              </p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Total Commissions</p>
              <p className="font-display text-lg font-bold text-primary">
                {totals.totalCommission.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
