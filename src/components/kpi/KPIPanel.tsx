import { 
  TrendingUp, 
  PhoneCall, 
  Target, 
  Users, 
  Wallet, 
  Diamond,
  Receipt,
  FileText,
  ArrowDown,
  Sparkles,
  UserCheck,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { KPIData, Charges, Salary, CoachingExpense, Tunnel } from '@/types/business';
import { KPITrendChart } from './KPITrendChart';
import { CloserStatsSection } from './CloserStatsSection';
import { MonthSelector } from '@/components/layout/MonthSelector';

interface KPIPanelProps {
  kpis: KPIData;
  charges: Charges;
  salaries: Salary[];
  coachingExpenses: CoachingExpense[];
  tunnels: Tunnel[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export function KPIPanel({ kpis, charges, salaries, coachingExpenses, tunnels, selectedMonth, onMonthChange }: KPIPanelProps) {
  const totalSalaries = salaries.reduce((sum, s) => sum + s.monthlyAmount, 0);
  const totalCoachingExpenses = coachingExpenses.reduce((sum, e) => sum + e.amount, 0);
  const isAboveAgencyThreshold = kpis.collectedRevenueHT > charges.agencyThreshold;
  
  const fixedCharges = charges.advertising + charges.marketing + 
                       charges.software + charges.otherCosts;

  const getTrend = (value: number) => {
    if (value > 0) return 'profitable';
    if (value === 0) return 'warning';
    return 'danger';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">
          KPI & Rentabilité
        </h2>
        <MonthSelector selectedMonth={selectedMonth} onMonthChange={onMonthChange} />
      </div>

      {/* Main metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className={`kpi-card kpi-${getTrend(kpis.netNetProfit)}`}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Diamond className="h-4 w-4" />
            Bénéfice Net Net
          </div>
          <p className={`stat-value mt-2 text-${getTrend(kpis.netNetProfit)}`}>
            {kpis.netNetProfit.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
          </p>
        </div>

        <div className={`kpi-card kpi-${getTrend(kpis.netProfit)}`}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4" />
            Bénéfice Net
          </div>
          <p className={`stat-value mt-2 text-${getTrend(kpis.netProfit)}`}>
            {kpis.netProfit.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
          </p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Receipt className="h-4 w-4" />
            CA Collecté HT
          </div>
          <p className="stat-value mt-2 text-foreground">
            {kpis.collectedRevenueHT.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            TTC: {kpis.collectedRevenue.toLocaleString('fr-FR')} € | TVA: {kpis.tvaAmount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
          </p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            CA Contracté
          </div>
          <p className="stat-value mt-2 text-foreground">
            {kpis.contractedRevenue.toLocaleString('fr-FR')} €
          </p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Paiements à venir (ce mois)
          </div>
          <p className="stat-value mt-2 text-foreground">
            {kpis.upcomingPaymentsThisMonth.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
          </p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Paiements à venir (total)
          </div>
          <p className="stat-value mt-2 text-foreground">
            {kpis.upcomingPaymentsTotal.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
          </p>
        </div>

        {kpis.defaultedAmount > 0 && (
          <div className="kpi-card kpi-danger">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              Impayés
            </div>
            <p className="stat-value mt-2 text-danger">
              {kpis.defaultedAmount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
            </p>
          </div>
        )}

        {kpis.totalKlarnaAmount > 0 && (
          <div className="kpi-card">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4" />
              Total encaissé Klarna
            </div>
            <p className="stat-value mt-2 text-foreground">
              {kpis.totalKlarnaAmount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Frais: -{kpis.klarnaCost.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
            </p>
          </div>
        )}
      </div>

      {/* Performance metrics */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <div className="kpi-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            ROAS Collecté
          </div>
          <p className={`stat-value mt-2 ${kpis.roasCollected >= 3 ? 'text-profitable' : kpis.roasCollected >= 2 ? 'text-warning' : 'text-danger'}`}>
            {kpis.roasCollected.toFixed(2)}x
          </p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            ROAS Contracté
          </div>
          <p className={`stat-value mt-2 ${kpis.roasContracted >= 3 ? 'text-profitable' : kpis.roasContracted >= 2 ? 'text-warning' : 'text-danger'}`}>
            {kpis.roasContracted.toFixed(2)}x
          </p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PhoneCall className="h-4 w-4" />
            Coût/Call
          </div>
          <p className="stat-value mt-2 text-foreground">
            {kpis.costPerCall.toFixed(2)} €
          </p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4" />
            Taux Closing
          </div>
          <p className={`stat-value mt-2 ${kpis.closingRate > 30 ? 'text-profitable' : kpis.closingRate > 15 ? 'text-warning' : 'text-danger'}`}>
            {kpis.closingRate.toFixed(1)}%
          </p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            CAC
          </div>
          <p className="stat-value mt-2 text-foreground">
            {kpis.cac.toFixed(2)} €
          </p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            CPL
          </div>
          <p className="stat-value mt-2 text-foreground">
            {kpis.cpl.toFixed(2)} €
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {kpis.totalRegistrationsAds} inscrits ads
          </p>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserCheck className="h-4 w-4" />
            Coût/Présent Webinaire
          </div>
          <p className="stat-value mt-2 text-foreground">
            {kpis.costPerWebinarAttendee.toFixed(2)} €
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {kpis.totalWebinarAttendees} présents total
          </p>
        </div>
      </div>

      {/* Closer Stats Section */}
      <CloserStatsSection tunnels={tunnels} charges={charges} />

      {/* KPI Trend Chart */}
      <KPITrendChart
        tunnels={tunnels}
        charges={charges}
        salaries={salaries}
        coachingExpenses={coachingExpenses}
        selectedMonth={selectedMonth}
      />

      {/* Calculation breakdown */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <h3 className="mb-6 font-display text-lg font-semibold text-foreground">
          Détail du calcul
        </h3>

        <div className="space-y-4">
          {/* CA TTC */}
          <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-4">
            <span className="text-foreground">CA Collecté TTC</span>
            <span className="font-display text-xl font-bold text-foreground">
              {kpis.collectedRevenue.toLocaleString('fr-FR')} €
            </span>
          </div>

          <div className="flex items-center justify-center">
            <ArrowDown className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* TVA */}
          <div className="flex items-center justify-between rounded-lg bg-danger/10 p-4">
            <span className="text-foreground">
              - TVA ({charges.taxPercent}%)
            </span>
            <span className="font-medium text-danger">
              -{kpis.tvaAmount.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
            </span>
          </div>

          {/* CA HT */}
          <div className="flex items-center justify-between rounded-lg bg-profitable/10 p-4">
            <span className="font-medium text-foreground">= CA Collecté HT</span>
            <span className="font-display text-lg font-bold text-profitable">
              {kpis.collectedRevenueHT.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
            </span>
          </div>

          <div className="flex items-center justify-center">
            <ArrowDown className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Payment Processor (on TTC) */}
          <div className="flex items-center justify-between rounded-lg bg-danger/10 p-4">
            <span className="text-foreground">
              - Processeur paiement ({charges.paymentProcessorPercent}% du TTC)
            </span>
            <span className="font-medium text-danger">
              -{kpis.paymentProcessorCost.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
            </span>
          </div>

          {/* Klarna fees (on Klarna portion only) */}
          {kpis.klarnaCost > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-danger/10 p-4">
              <span className="text-foreground">
                - Frais Klarna ({charges.klarnaPercent}% sur portion Klarna)
              </span>
              <span className="font-medium text-danger">
                -{kpis.klarnaCost.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
              </span>
            </div>
          )}

          {/* Closers (on HT) */}
          <div className="flex items-center justify-between rounded-lg bg-danger/10 p-4">
            <span className="text-foreground">
              - Closeurs ({charges.closersPercent}% du HT)
            </span>
            <span className="font-medium text-danger">
              -{kpis.closersCost.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
            </span>
          </div>

          {/* Agency (on excess HT) */}
          {isAboveAgencyThreshold && (
            <div className="flex items-center justify-between rounded-lg bg-danger/10 p-4">
              <span className="text-foreground">
                - Agence ({charges.agencyPercent}% sur excédent &gt; {charges.agencyThreshold.toLocaleString('fr-FR')}€ HT)
              </span>
              <span className="font-medium text-danger">
                -{kpis.agencyCost.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
              </span>
            </div>
          )}

          {kpis.totalAdBudget > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-danger/10 p-4">
              <span className="text-foreground">- Budget Pub</span>
              <span className="font-medium text-danger">
                -{kpis.totalAdBudget.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
              </span>
            </div>
          )}

          {fixedCharges > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-danger/10 p-4">
              <span className="text-foreground">- Charges fixes</span>
              <span className="font-medium text-danger">
                -{fixedCharges.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
              </span>
            </div>
          )}

          {totalCoachingExpenses > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-danger/10 p-4">
              <span className="text-foreground">- Coaching / Mentorat</span>
              <span className="font-medium text-danger">
                -{totalCoachingExpenses.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
              </span>
            </div>
          )}

          <div className="flex items-center justify-center">
            <ArrowDown className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Bénéfice Net = AVANT associé et salaires */}
          <div className={`flex items-center justify-between rounded-lg border-2 p-4 ${kpis.netProfit > 0 ? 'border-profitable bg-profitable/10' : 'border-danger bg-danger/10'}`}>
            <span className="font-semibold text-foreground">= Bénéfice Net</span>
            <span className={`font-display text-2xl font-bold ${kpis.netProfit > 0 ? 'text-profitable' : 'text-danger'}`}>
              {kpis.netProfit.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
            </span>
          </div>

          <div className="flex items-center justify-center">
            <ArrowDown className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Part associé - sur le Bénéfice Net */}
          <div className="flex items-center justify-between rounded-lg bg-danger/10 p-4">
            <span className="text-foreground">
              - Part associé ({charges.associatePercent}% du Bénéfice Net)
            </span>
            <span className="font-medium text-danger">
              -{(kpis.netProfit > 0 ? kpis.netProfit * (charges.associatePercent / 100) : 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
            </span>
          </div>

          {/* Salaires - APRÈS part associé */}
          {totalSalaries > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-danger/10 p-4">
              <span className="text-foreground">- Salaires</span>
              <span className="font-medium text-danger">
                -{totalSalaries.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
              </span>
            </div>
          )}

          <div className="flex items-center justify-center">
            <ArrowDown className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Bénéfice Net Net = après associé et salaires */}
          <div className={`flex items-center justify-between rounded-lg border-2 p-4 ${kpis.netNetProfit > 0 ? 'border-profitable bg-profitable/10' : 'border-danger bg-danger/10'}`}>
            <span className="font-semibold text-foreground">= Bénéfice Net Net</span>
            <span className={`font-display text-2xl font-bold ${kpis.netNetProfit > 0 ? 'text-profitable' : 'text-danger'}`}>
              {kpis.netNetProfit.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}