import { 
  TrendingUp, 
  TrendingDown,
  PhoneCall, 
  Target, 
  Users, 
  Wallet, 
  Diamond,
  Receipt,
  FileText,
  MousePointerClick,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Leaf,
  Calendar,
  CreditCard,
  Clock,
  RotateCcw
} from 'lucide-react';
import { KPICard } from './KPICard';
import { TunnelCard } from './TunnelCard';
import { DashboardAIChat } from './DashboardAIChat';
import { KPIData, Tunnel, Charges, Salary, CoachingExpense } from '@/types/business';
import { useMemo, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MonthSelector } from '@/components/layout/MonthSelector';

interface DashboardProps {
  kpis: KPIData;
  tunnels: Tunnel[];
  charges: Charges;
  salaries: Salary[];
  coachingExpenses: CoachingExpense[];
  allTunnels?: Tunnel[]; // All tunnels for comparison
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export function Dashboard({ kpis, tunnels, charges, salaries, coachingExpenses, allTunnels = [], selectedMonth, onMonthChange }: DashboardProps) {
  const [showComparison, setShowComparison] = useState(false);
  
  // Calculate previous month KPIs
  const previousMonthKpis = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    
    const prevTunnels = allTunnels.filter(t => t.month === prevMonth && t.isActive);
    
    if (prevTunnels.length === 0) {
      return null;
    }
    
    // Calculate previous month metrics
    const totalContracted = prevTunnels.reduce((sum, t) => {
      const salesContracted = t.sales.reduce((s, sale) => s + sale.totalPrice, 0);
      return sum + (salesContracted > 0 ? salesContracted : t.callsClosed * t.averagePrice);
    }, 0);
    
    const totalCollectedTTC = prevTunnels.reduce((sum, t) => {
      const salesCollected = t.sales.reduce((s, sale) => s + sale.amountCollected, 0);
      return sum + (salesCollected > 0 ? salesCollected : t.collectedAmount);
    }, 0);
    
    const taxRate = charges.taxPercent / 100;
    const tvaAmount = totalCollectedTTC * taxRate / (1 + taxRate);
    const totalCollectedHT = totalCollectedTTC - tvaAmount;
    
    const totalAdBudget = prevTunnels.reduce((sum, t) => sum + t.adBudget, 0);
    const totalCalls = prevTunnels.reduce((sum, t) => sum + t.callsGenerated, 0);
    const totalClosedCalls = prevTunnels.reduce((sum, t) => sum + t.callsClosed, 0);
    
    const paymentProcessorCost = totalCollectedTTC * (charges.paymentProcessorPercent / 100);
    
    // Closers
    const salesWithCloserTTC = prevTunnels.reduce((sum, t) => {
      const tunnelSalesWithCloser = t.sales
        .filter(sale => sale.closerId)
        .reduce((s, sale) => s + sale.amountCollected, 0);
      return sum + tunnelSalesWithCloser;
    }, 0);
    const salesWithCloserHT = salesWithCloserTTC * (1 / (1 + taxRate));
    const closersCost = salesWithCloserHT * (charges.closersPercent / 100);
    
    let agencyCost = 0;
    if (totalCollectedHT > charges.agencyThreshold) {
      const excessHT = totalCollectedHT - charges.agencyThreshold;
      agencyCost = excessHT * (charges.agencyPercent / 100);
    }
    
    const fixedCharges = charges.advertising + charges.marketing + charges.software + charges.otherCosts;
    const totalSalaries = salaries.reduce((sum, s) => sum + s.monthlyAmount, 0);
    
    // Filter coaching for previous month
    const prevCoaching = coachingExpenses.filter(e => e.month === prevMonth);
    const totalCoachingExpenses = prevCoaching.reduce((sum, e) => sum + e.amount, 0);
    
    const netProfit = totalCollectedHT 
      - paymentProcessorCost 
      - closersCost 
      - agencyCost 
      - totalAdBudget
      - fixedCharges 
      - totalCoachingExpenses 
      - totalSalaries;
    
    const associateCost = netProfit > 0 ? netProfit * (charges.associatePercent / 100) : 0;
    const netNetProfit = netProfit - associateCost;
    
    const roasCollected = totalAdBudget > 0 
      ? totalCollectedTTC / totalAdBudget
      : 0;
    const costPerCall = totalCalls > 0 ? totalAdBudget / totalCalls : 0;
    const closingRate = totalCalls > 0 ? (totalClosedCalls / totalCalls) * 100 : 0;
    const cac = totalClosedCalls > 0 ? totalAdBudget / totalClosedCalls : 0;
    
    return {
      contractedRevenue: totalContracted,
      collectedRevenue: totalCollectedTTC,
      collectedRevenueHT: totalCollectedHT,
      netProfit,
      netNetProfit,
      roasCollected,
      costPerCall,
      closingRate,
      cac,
      totalAdBudget,
      totalCalls,
      totalClosedCalls,
    };
  }, [allTunnels, selectedMonth, charges, salaries, coachingExpenses]);
  
  // Calculate percentage changes
  const getPercentChange = (current: number, previous: number | undefined) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / Math.abs(previous)) * 100;
  };
  
  const collectedChange = showComparison && previousMonthKpis 
    ? getPercentChange(kpis.collectedRevenue, previousMonthKpis.collectedRevenue) 
    : null;
  const netProfitChange = showComparison && previousMonthKpis 
    ? getPercentChange(kpis.netProfit, previousMonthKpis.netProfit) 
    : null;
  const netNetProfitChange = showComparison && previousMonthKpis 
    ? getPercentChange(kpis.netNetProfit, previousMonthKpis.netNetProfit) 
    : null;
  const contractedChange = showComparison && previousMonthKpis 
    ? getPercentChange(kpis.contractedRevenue, previousMonthKpis.contractedRevenue) 
    : null;
  
  const getTrend = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'profitable' as const;
    if (value >= thresholds.warning) return 'warning' as const;
    return 'danger' as const;
  };

  const profitTrend = kpis.netNetProfit > 0 ? 'profitable' : kpis.netNetProfit === 0 ? 'warning' : 'danger';
  const roasTrend = kpis.roasCollected >= 3 ? 'profitable' : kpis.roasCollected >= 2 ? 'warning' : 'danger';
  const closingTrend = getTrend(kpis.closingRate, { good: 30, warning: 15 });
  
  // Calculate global CPL
  const totalRegistrations = tunnels.reduce((sum, t) => sum + (t.registrations || 0), 0);
  const globalCPL = totalRegistrations > 0 ? kpis.totalAdBudget / totalRegistrations : 0;
  
  // Calculate global cost per attendee (webinars only)
  const totalAttendees = tunnels
    .filter(t => t.type === 'webinar')
    .reduce((sum, t) => sum + (t.attendees || 0), 0);
  const webinarBudget = tunnels
    .filter(t => t.type === 'webinar')
    .reduce((sum, t) => sum + t.adBudget, 0);
  const globalCostPerAttendee = totalAttendees > 0 ? webinarBudget / totalAttendees : 0;

  const ChangeIndicator = ({ value }: { value: number | null }) => {
    if (value === null) return null;
    const isPositive = value >= 0;
    const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-profitable' : 'text-danger'}`}>
        <Icon className="h-3 w-3" />
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Month Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Tableau de bord
          </h2>
          <MonthSelector selectedMonth={selectedMonth} onMonthChange={onMonthChange} />
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="comparison" className="text-sm text-muted-foreground">
            Comparer au mois précédent
          </Label>
          <Switch 
            id="comparison" 
            checked={showComparison} 
            onCheckedChange={setShowComparison}
            disabled={!previousMonthKpis}
          />
          {!previousMonthKpis && showComparison === false && (
            <span className="text-xs text-muted-foreground italic">Aucune donnée mois précédent</span>
          )}
        </div>
      </div>
      
      {/* Main KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <KPICard
            title="Bénéfice Net Net"
            value={kpis.netNetProfit}
            icon={Diamond}
            trend={profitTrend}
            suffix=" €"
            subtitle="Après toutes les charges"
          />
          {netNetProfitChange !== null && (
            <div className="absolute top-3 right-3">
              <ChangeIndicator value={netNetProfitChange} />
            </div>
          )}
        </div>
        <div className="relative">
          <KPICard
            title="Bénéfice Net"
            value={kpis.netProfit}
            icon={Wallet}
            trend={kpis.netProfit > 0 ? 'profitable' : 'danger'}
            suffix=" €"
            subtitle="Avant part associé"
          />
          {netProfitChange !== null && (
            <div className="absolute top-3 right-3">
              <ChangeIndicator value={netProfitChange} />
            </div>
          )}
        </div>
        <div className="relative">
          <KPICard
            title="CA Collecté"
            value={kpis.collectedRevenue}
            icon={Receipt}
            trend="neutral"
            suffix=" €"
            subtitle="Encaissé ce mois"
          />
          {collectedChange !== null && (
            <div className="absolute top-3 right-3">
              <ChangeIndicator value={collectedChange} />
            </div>
          )}
        </div>
        <div className="relative">
          <KPICard
            title="CA Contracté"
            value={kpis.contractedRevenue}
            icon={FileText}
            trend="neutral"
            suffix=" €"
            subtitle="Signé ce mois"
          />
          {contractedChange !== null && (
            <div className="absolute top-3 right-3">
              <ChangeIndicator value={contractedChange} />
            </div>
          )}
        </div>
      </div>

      {/* Payment Breakdown Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Encaissé direct</p>
              <p className="text-2xl font-bold text-foreground">
                {kpis.directCollectedThisMonth.toLocaleString('fr-FR')} €
              </p>
              <p className="text-xs text-muted-foreground">1ère échéance des ventes du mois</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Calendar className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Encaissé échelonné</p>
              <p className="text-2xl font-bold text-foreground">
                {kpis.installmentCollectedThisMonth.toLocaleString('fr-FR')} €
              </p>
              <p className="text-xs text-muted-foreground">Échéances des mois précédents</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Reste à encaisser ce mois</p>
              <p className="text-2xl font-bold text-amber-500">
                {kpis.remainingToCollectThisMonth.toLocaleString('fr-FR')} €
              </p>
              <p className="text-xs text-muted-foreground">Échéances attendues ce mois</p>
            </div>
          </div>
        </div>
      </div>

      {/* Total à encaisser - toutes échéances */}
      {kpis.upcomingPaymentsTotal > 0 && (
        <div className="flex justify-end -mt-2">
          <p className="text-sm text-muted-foreground">
            💰 Total à encaisser (toutes ventes) : 
            <span className="font-semibold text-foreground ml-1">
              {kpis.upcomingPaymentsTotal.toLocaleString('fr-FR')} €
            </span>
          </p>
        </div>
      )}

      {/* Performance KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <KPICard
          title="ROAS Collecté"
          value={kpis.roasCollected}
          icon={TrendingUp}
          trend={roasTrend}
          suffix="x"
          subtitle={`CA TTC / Budget Pub`}
        />
        <KPICard
          title="ROAS Contracté"
          value={kpis.roasContracted}
          icon={TrendingUp}
          trend={kpis.roasContracted >= 3 ? 'profitable' : kpis.roasContracted >= 2 ? 'warning' : 'danger'}
          suffix="x"
          subtitle={`CA Contracté TTC / Budget Pub`}
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
        <KPICard
          title="CPL"
          value={globalCPL}
          icon={MousePointerClick}
          trend="neutral"
          suffix=" €"
          subtitle={`${totalRegistrations} inscrits total`}
        />
        {totalAttendees > 0 && (
          <KPICard
            title="Coût/Présent"
            value={globalCostPerAttendee}
            icon={Users}
            trend="neutral"
            suffix=" €"
            subtitle={`${totalAttendees} présents webinars`}
          />
        )}
      </div>

      {/* Refund Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/20">
              <RotateCcw className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remboursements</p>
              <p className="text-2xl font-bold text-destructive">
                {kpis.totalRefundedAmount.toLocaleString('fr-FR')} €
              </p>
              <p className="text-xs text-muted-foreground">{kpis.refundedSalesCount} vente{kpis.refundedSalesCount > 1 ? 's' : ''} remboursée{kpis.refundedSalesCount > 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Organic Stats */}
      {(kpis.organicSalesCount > 0 || kpis.organicCollectedAmount > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                <Leaf className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ventes organiques</p>
                <p className="text-2xl font-bold text-foreground">{kpis.organicSalesCount}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                <Receipt className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CA organique encaissé</p>
                <p className="text-2xl font-bold text-foreground">
                  {kpis.organicCollectedAmount.toLocaleString('fr-FR')} €
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tunnels Overview */}
      <div className="space-y-4">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Tunnels actifs ce mois
        </h3>
        {tunnels.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun tunnel actif. Ajoutez un tunnel pour commencer.
          </p>
        ) : (
          <div className="space-y-4">
            {tunnels.map((tunnel) => (
              <div key={tunnel.id} className="rounded-xl border border-border/50 bg-card p-4">
                <TunnelCard 
                  tunnel={tunnel}
                  charges={charges}
                  salaries={salaries}
                  coachingExpenses={coachingExpenses.filter(e => e.month === selectedMonth)}
                  totalCollectedTTC={kpis.collectedRevenue}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <DashboardAIChat
        kpis={kpis}
        tunnels={tunnels}
        allTunnels={allTunnels}
        charges={charges}
        salaries={salaries}
        coachingExpenses={coachingExpenses}
        selectedMonth={selectedMonth}
      />
    </div>
  );
}
