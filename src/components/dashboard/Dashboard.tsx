import { 
  TrendingUp, 
  PhoneCall, 
  Target, 
  Users, 
  Wallet, 
  Diamond,
  Receipt,
  FileText
} from 'lucide-react';
import { KPICard } from './KPICard';
import { KPIData, Tunnel } from '@/types/business';

interface DashboardProps {
  kpis: KPIData;
  tunnels: Tunnel[];
}

export function Dashboard({ kpis, tunnels }: DashboardProps) {
  const getTrend = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'profitable' as const;
    if (value >= thresholds.warning) return 'warning' as const;
    return 'danger' as const;
  };

  const profitTrend = kpis.netNetProfit > 0 ? 'profitable' : kpis.netNetProfit === 0 ? 'warning' : 'danger';
  const roiTrend = getTrend(kpis.adROI, { good: 100, warning: 50 });
  const closingTrend = getTrend(kpis.closingRate, { good: 30, warning: 15 });

  return (
    <div className="space-y-6">
      {/* Main KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Bénéfice Net Net"
          value={kpis.netNetProfit}
          icon={Diamond}
          trend={profitTrend}
          suffix=" €"
          subtitle="Après toutes les charges"
        />
        <KPICard
          title="Bénéfice Net"
          value={kpis.netProfit}
          icon={Wallet}
          trend={kpis.netProfit > 0 ? 'profitable' : 'danger'}
          suffix=" €"
          subtitle="Avant part associé"
        />
        <KPICard
          title="CA Collecté"
          value={kpis.collectedRevenue}
          icon={Receipt}
          trend="neutral"
          suffix=" €"
          subtitle="Encaissé ce mois"
        />
        <KPICard
          title="CA Contracté"
          value={kpis.contractedRevenue}
          icon={FileText}
          trend="neutral"
          suffix=" €"
          subtitle="Signé ce mois"
        />
      </div>

      {/* Performance KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="ROI Publicitaire"
          value={kpis.adROI}
          icon={TrendingUp}
          trend={roiTrend}
          suffix=" %"
          subtitle={`Budget: ${kpis.totalAdBudget.toLocaleString('fr-FR')} €`}
        />
        <KPICard
          title="Coût par Call"
          value={kpis.costPerCall}
          icon={PhoneCall}
          trend="neutral"
          suffix=" €"
          subtitle={`${kpis.totalCalls} calls générés`}
        />
        <KPICard
          title="Taux de Closing"
          value={kpis.closingRate}
          icon={Target}
          trend={closingTrend}
          suffix=" %"
          subtitle={`${kpis.totalClosedCalls} / ${kpis.totalCalls} calls`}
        />
        <KPICard
          title="CAC"
          value={kpis.cac}
          icon={Users}
          trend="neutral"
          suffix=" €"
          subtitle="Coût d'acquisition client"
        />
      </div>

      {/* Tunnels Overview */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
          Tunnels actifs ce mois
        </h3>
        {tunnels.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun tunnel actif. Ajoutez un tunnel pour commencer.
          </p>
        ) : (
          <div className="space-y-3">
            {tunnels.map((tunnel) => {
              const contractedRevenue = tunnel.sales.reduce((sum, s) => sum + s.totalPrice, 0);
              const roi = tunnel.adBudget > 0 
                ? ((tunnel.collectedAmount - tunnel.adBudget) / tunnel.adBudget) * 100 
                : 0;
              const trend = roi > 100 ? 'profitable' : roi > 50 ? 'warning' : 'danger';
              const formattedDate = tunnel.date ? new Date(tunnel.date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              }) : '';

              // Calculate type-specific metrics
              const showUpRate = tunnel.type === 'webinar' && tunnel.registrations && tunnel.attendees
                ? ((tunnel.attendees / tunnel.registrations) * 100).toFixed(1)
                : null;
              
              const bookingRate = tunnel.type === 'vsl' && tunnel.registrations && tunnel.callsBooked
                ? ((tunnel.callsBooked / tunnel.registrations) * 100).toFixed(1)
                : null;
              
              const avgChallengeShowUp = tunnel.type === 'challenge' && tunnel.registrations && tunnel.challengeDays && tunnel.challengeDays.length > 0
                ? (tunnel.challengeDays.reduce((sum, d) => sum + d.attendees, 0) / tunnel.challengeDays.length / tunnel.registrations * 100).toFixed(1)
                : null;
              
              return (
                <div 
                  key={tunnel.id}
                  className="rounded-lg bg-secondary/30 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`badge-${trend}`}>
                        {tunnel.type.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{tunnel.name}</p>
                        <p className="text-sm text-muted-foreground">{formattedDate}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-display text-lg font-semibold text-${trend}`}>
                        {roi.toFixed(1)}% ROI
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 pt-3 border-t border-border/30">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Pub dépensée</p>
                      <p className="font-display text-base font-semibold text-foreground">
                        {tunnel.adBudget.toLocaleString('fr-FR')} €
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Ventes</p>
                      <p className="font-display text-base font-semibold text-foreground">
                        {tunnel.callsClosed}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">CA Collecté</p>
                      <p className="font-display text-base font-semibold text-foreground">
                        {tunnel.collectedAmount.toLocaleString('fr-FR')} €
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">CA Contracté</p>
                      <p className="font-display text-base font-semibold text-foreground">
                        {contractedRevenue.toLocaleString('fr-FR')} €
                      </p>
                    </div>
                    
                    {/* Type-specific metrics - Always show based on tunnel type */}
                    {tunnel.type === 'webinar' && (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Inscrits / Présents</p>
                          <p className="font-display text-base font-semibold text-foreground">
                            {tunnel.registrations || 0} / {tunnel.attendees || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Show-up rate</p>
                          <p className="font-display text-base font-semibold text-primary">
                            {showUpRate ? `${showUpRate}%` : '0%'}
                          </p>
                        </div>
                      </>
                    )}
                    
                    {tunnel.type === 'vsl' && (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Inscrits / Calls</p>
                          <p className="font-display text-base font-semibold text-foreground">
                            {tunnel.registrations || 0} / {tunnel.callsBooked || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Taux booking</p>
                          <p className="font-display text-base font-semibold text-primary">
                            {bookingRate ? `${bookingRate}%` : '0%'}
                          </p>
                        </div>
                      </>
                    )}
                    
                    {tunnel.type === 'challenge' && (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Inscrits</p>
                          <p className="font-display text-base font-semibold text-foreground">
                            {tunnel.registrations || 0}
                          </p>
                          {tunnel.challengeDays && tunnel.challengeDays.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {tunnel.challengeDays.length} jours
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Show-up moyen</p>
                          <p className="font-display text-base font-semibold text-primary">
                            {avgChallengeShowUp ? `${avgChallengeShowUp}%` : '0%'}
                          </p>
                          {tunnel.challengeDays && tunnel.challengeDays.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Moy: {Math.round(tunnel.challengeDays.reduce((sum, d) => sum + d.attendees, 0) / tunnel.challengeDays.length)} présents
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
