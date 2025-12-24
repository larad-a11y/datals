import { useMemo } from 'react';
import { format, subMonths, parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Tunnel, Charges, Salary, CoachingExpense } from '@/types/business';

interface KPITrendChartProps {
  tunnels: Tunnel[];
  charges: Charges;
  salaries: Salary[];
  coachingExpenses: CoachingExpense[];
  selectedMonth: string;
}

interface MonthlyKPI {
  month: string;
  label: string;
  caCollecte: number;
  beneficeNet: number;
  budgetPub: number;
}

function calculateMonthKPIs(
  tunnels: Tunnel[],
  charges: Charges,
  salaries: Salary[],
  coachingExpenses: CoachingExpense[],
  month: string
): MonthlyKPI {
  const filteredTunnels = tunnels.filter(t => t.month === month && t.isActive);
  const filteredCoachingExpenses = coachingExpenses.filter(e => e.month === month);

  // CA Collecté TTC
  const totalCollectedTTC = filteredTunnels.reduce((sum, t) => {
    const salesCollected = t.sales.reduce((s, sale) => s + sale.amountCollected, 0);
    return sum + (salesCollected > 0 ? salesCollected : t.collectedAmount);
  }, 0);

  const totalAdBudget = filteredTunnels.reduce((sum, t) => sum + t.adBudget, 0);

  // Calcul TVA et CA HT
  const taxRate = charges.taxPercent / 100;
  const tvaAmount = totalCollectedTTC * taxRate / (1 + taxRate);
  const totalCollectedHT = totalCollectedTTC - tvaAmount;

  // Frais processeur
  const paymentProcessorCost = totalCollectedTTC * (charges.paymentProcessorPercent / 100);

  // Closers
  const salesWithCloserHT = filteredTunnels.reduce((sum, t) => {
    const tunnelSalesWithCloser = t.sales
      .filter(sale => sale.closerId)
      .reduce((s, sale) => s + sale.amountCollected, 0);
    return sum + tunnelSalesWithCloser;
  }, 0);
  const salesWithCloserHTAmount = salesWithCloserHT * (1 / (1 + taxRate));
  const closersCost = salesWithCloserHTAmount * (charges.closersPercent / 100);

  // Agence
  let agencyCost = 0;
  if (totalCollectedHT > charges.agencyThreshold) {
    const excessHT = totalCollectedHT - charges.agencyThreshold;
    agencyCost = excessHT * (charges.agencyPercent / 100);
  }

  // Charges fixes
  const fixedCharges = charges.advertising + charges.marketing + 
                       charges.software + charges.otherCosts;

  // Coaching
  const totalCoachingExpenses = filteredCoachingExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Salaires
  const totalSalaries = salaries.reduce((sum, s) => sum + s.monthlyAmount, 0);

  // Bénéfice Net = AVANT associé et salaires
  const netProfit = totalCollectedHT 
    - paymentProcessorCost 
    - closersCost 
    - agencyCost 
    - totalAdBudget
    - fixedCharges 
    - totalCoachingExpenses;

  // Part associé (sur le Bénéfice Net)
  const associateCost = netProfit > 0 ? netProfit * (charges.associatePercent / 100) : 0;
  
  // Bénéfice Net Net = après associé et salaires
  const netNetProfit = netProfit - associateCost - totalSalaries;

  // Parse month to get label
  const date = parse(month, 'yyyy-MM', new Date());
  const label = format(date, 'MMM yyyy', { locale: fr });

  return {
    month,
    label,
    caCollecte: totalCollectedTTC,
    beneficeNet: netNetProfit, // Utilise le Net Net pour le graphique
    budgetPub: totalAdBudget,
  };
}

export function KPITrendChart({ tunnels, charges, salaries, coachingExpenses, selectedMonth }: KPITrendChartProps) {
  const trendData = useMemo(() => {
    const data: MonthlyKPI[] = [];
    const currentDate = parse(selectedMonth, 'yyyy-MM', new Date());

    // Get last 6 months including current
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(currentDate, i);
      const monthStr = format(monthDate, 'yyyy-MM');
      const monthKPIs = calculateMonthKPIs(tunnels, charges, salaries, coachingExpenses, monthStr);
      data.push(monthKPIs);
    }

    return data;
  }, [tunnels, charges, salaries, coachingExpenses, selectedMonth]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(0)}k€`;
    }
    return `${value.toFixed(0)}€`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-border/50 bg-card p-3 shadow-lg">
          <p className="font-medium text-foreground capitalize mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {new Intl.NumberFormat('fr-FR', { 
                style: 'currency', 
                currency: 'EUR',
                maximumFractionDigits: 0 
              }).format(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const hasData = trendData.some(d => d.caCollecte > 0 || d.beneficeNet !== 0);

  if (!hasData) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
          Évolution des KPIs (6 derniers mois)
        </h3>
        <div className="flex h-[200px] items-center justify-center text-muted-foreground">
          Ajoutez des données pour voir l'évolution
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6">
      <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
        Évolution des KPIs (6 derniers mois)
      </h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="label" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => <span className="text-foreground text-sm">{value}</span>}
            />
            <Line 
              type="monotone" 
              dataKey="caCollecte" 
              name="CA Collecté"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="beneficeNet" 
              name="Bénéfice Net"
              stroke="hsl(142 76% 36%)"
              strokeWidth={2}
              dot={{ fill: 'hsl(142 76% 36%)', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="budgetPub" 
              name="Budget Pub"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: 'hsl(var(--muted-foreground))', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
