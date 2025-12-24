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
  ArrowRight
} from 'lucide-react';
import { KPIData, Charges, Salary, CoachingExpense } from '@/types/business';

interface KPIPanelProps {
  kpis: KPIData;
  charges: Charges;
  salaries: Salary[];
  coachingExpenses: CoachingExpense[];
}

export function KPIPanel({ kpis, charges, salaries, coachingExpenses }: KPIPanelProps) {
  const totalSalaries = salaries.reduce((sum, s) => sum + s.monthlyAmount, 0);
  const totalCoachingExpenses = coachingExpenses.reduce((sum, e) => sum + e.amount, 0);
  const isAboveAgencyThreshold = kpis.collectedRevenue > charges.agencyThreshold;
  
  // Calculate intermediate values
  const closersCost = kpis.collectedRevenue * (charges.closersPercent / 100);
  const afterClosers = kpis.collectedRevenue - closersCost;
  
  const agencyCost = isAboveAgencyThreshold ? afterClosers * (charges.agencyPercent / 100) : 0;
  const afterAgency = afterClosers - agencyCost;
  
  const fixedCharges = charges.advertising + charges.marketing + 
                       charges.software + charges.otherCosts;
  const afterFixed = afterAgency - fixedCharges;

  const afterCoaching = afterFixed - totalCoachingExpenses;
  
  const afterSalaries = afterCoaching - totalSalaries;
  
  const associateCost = afterSalaries > 0 ? afterSalaries * (charges.associatePercent / 100) : 0;

  const getTrend = (value: number) => {
    if (value > 0) return 'profitable';
    if (value === 0) return 'warning';
    return 'danger';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          KPI & Rentabilité
        </h2>
        <p className="text-sm text-muted-foreground">
          Analyse détaillée de votre performance
        </p>
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
            CA Collecté
          </div>
          <p className="stat-value mt-2 text-foreground">
            {kpis.collectedRevenue.toLocaleString('fr-FR')} €
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
      </div>

      {/* Performance metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="kpi-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            ROI Pub
          </div>
          <p className={`stat-value mt-2 ${kpis.adROI > 100 ? 'text-profitable' : kpis.adROI > 50 ? 'text-warning' : 'text-danger'}`}>
            {kpis.adROI.toFixed(1)}%
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
      </div>

      {/* Calculation breakdown */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <h3 className="mb-6 font-display text-lg font-semibold text-foreground">
          Détail du calcul
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-4">
            <span className="text-foreground">CA Collecté</span>
            <span className="font-display text-xl font-bold text-foreground">
              {kpis.collectedRevenue.toLocaleString('fr-FR')} €
            </span>
          </div>

          <div className="flex items-center justify-center">
            <ArrowDown className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-danger/10 p-4">
            <span className="text-foreground">
              - Closeurs ({charges.closersPercent}%)
            </span>
            <span className="font-medium text-danger">
              -{closersCost.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
            </span>
          </div>

          {isAboveAgencyThreshold && (
            <div className="flex items-center justify-between rounded-lg bg-danger/10 p-4">
              <span className="text-foreground">
                - Agence ({charges.agencyPercent}%)
              </span>
              <span className="font-medium text-danger">
                -{agencyCost.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
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

          <div className={`flex items-center justify-between rounded-lg p-4 ${kpis.netProfit > 0 ? 'bg-profitable/10' : 'bg-danger/10'}`}>
            <span className="font-medium text-foreground">= Bénéfice Net</span>
            <span className={`font-display text-xl font-bold ${kpis.netProfit > 0 ? 'text-profitable' : 'text-danger'}`}>
              {kpis.netProfit.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
            </span>
          </div>

          <div className="flex items-center justify-center">
            <ArrowDown className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-danger/10 p-4">
            <span className="text-foreground">
              - Part associé ({charges.associatePercent}% du net)
            </span>
            <span className="font-medium text-danger">
              -{associateCost.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
            </span>
          </div>

          <div className="flex items-center justify-center">
            <ArrowDown className="h-5 w-5 text-muted-foreground" />
          </div>

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
