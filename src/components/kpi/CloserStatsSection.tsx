import { User, TrendingUp, Wallet, Target, Phone } from 'lucide-react';
import { Sale, Tunnel, Charges, Closer } from '@/types/business';

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
}

interface CloserStatsSectionProps {
  tunnels: Tunnel[];
  charges: Charges;
}

export function CloserStatsSection({ tunnels, charges }: CloserStatsSectionProps) {
  const taxRate = charges.taxPercent / 100;
  
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
    });
  });
  
  // Aggregate sales data per closer
  tunnels.forEach(tunnel => {
    tunnel.sales.forEach(sale => {
      if (sale.closerId) {
        const stats = closerStatsMap.get(sale.closerId);
        if (stats) {
          stats.totalSales += 1;
          stats.totalCollected += sale.amountCollected;
          stats.totalContracted += sale.totalPrice;
          stats.callsClosed += 1;
        }
      }
    });
  });
  
  // Calculate derived metrics for each closer
  closerStatsMap.forEach((stats, closerId) => {
    // Calculate commission (on HT amount)
    const collectedHT = stats.totalCollected * (1 / (1 + taxRate));
    stats.commission = collectedHT * (charges.closersPercent / 100);
    
    // Calculate average price per sale
    stats.averagePrice = stats.totalSales > 0 ? stats.totalContracted / stats.totalSales : 0;
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

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6">
      <h3 className="mb-6 font-display text-lg font-semibold text-foreground flex items-center gap-2">
        <User className="h-5 w-5 text-primary" />
        Statistiques par Closer
      </h3>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {closerStats.map((stats) => {
          const sharePercent = totals.totalCollected > 0 
            ? (stats.totalCollected / totals.totalCollected) * 100 
            : 0;
          
          return (
            <div 
              key={stats.closerId} 
              className="rounded-lg border border-border/30 bg-secondary/20 p-4 hover:bg-secondary/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{stats.closerName}</h4>
                  <p className="text-xs text-muted-foreground">
                    {sharePercent.toFixed(1)}% du CA total
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
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
                    <span className="font-medium text-primary">
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
