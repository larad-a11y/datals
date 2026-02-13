import { useMemo, useState } from 'react';
import { CalendarRange, Wallet, Receipt, AlertTriangle, Diamond, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Tunnel, Charges, Salary, CoachingExpense } from '@/types/business';
import { roundCurrency } from '@/lib/utils';

interface ForecastSectionProps {
  tunnels: Tunnel[];
  charges: Charges;
  salaries: Salary[];
  coachingExpenses: CoachingExpense[];
}

interface MonthForecast {
  month: string;
  label: string;
  revenueTTC: number;
  revenueHT: number;
  tva: number;
  processorCost: number;
  klarnaCost: number;
  closersCost: number;
  agencyCost: number;
  fixedCharges: number;
  coachingCost: number;
  adBudget: number;
  salariesCost: number;
  associateCost: number;
  totalCharges: number;
  netProfit: number;
  netNetProfit: number;
  defaultedAmount: number;
}

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -6; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return options;
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  const label = d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

interface ChargesBreakdownData {
  processorCost: number;
  klarnaCost: number;
  closersCost: number;
  agencyCost: number;
  fixedCharges: number;
  coachingCost: number;
  adBudget: number;
  associateCost: number;
  salariesCost: number;
}

function ChargesBreakdown({ data, fmt }: { data: ChargesBreakdownData; fmt: (v: number) => string }) {
  const items: { label: string; value: number }[] = [
    { label: 'Frais processeur', value: data.processorCost },
    { label: 'Frais Klarna', value: data.klarnaCost },
    { label: 'Closers', value: data.closersCost },
    { label: 'Agence', value: data.agencyCost },
    { label: 'Charges fixes', value: data.fixedCharges },
    { label: 'Coaching', value: data.coachingCost },
    { label: 'Budget pub', value: data.adBudget },
    { label: 'Part associé', value: data.associateCost },
    { label: 'Salaires', value: data.salariesCost },
  ].filter(i => i.value > 0);

  if (items.length === 0) return <span>Aucune charge</span>;

  return (
    <div className="space-y-1 text-xs">
      {items.map(i => (
        <div key={i.label} className="flex justify-between gap-4">
          <span className="text-muted-foreground">{i.label}</span>
          <span className="font-medium">{fmt(i.value)} €</span>
        </div>
      ))}
    </div>
  );
}

export function ForecastSection({ tunnels, charges, salaries, coachingExpenses }: ForecastSectionProps) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const defaultEnd = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() + 3, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const [startMonth, setStartMonth] = useState(currentMonth);
  const [endMonth, setEndMonth] = useState(defaultEnd);
  const monthOptions = useMemo(() => getMonthOptions(), []);

  const allSales = useMemo(() => tunnels.flatMap(t => t.sales), [tunnels]);

  // Generate months in range
  const monthsInRange = useMemo(() => {
    const result: string[] = [];
    const [sy, sm] = startMonth.split('-').map(Number);
    const [ey, em] = endMonth.split('-').map(Number);
    let cur = new Date(sy, sm - 1, 1);
    const end = new Date(ey, em - 1, 1);
    while (cur <= end) {
      result.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
      cur.setMonth(cur.getMonth() + 1);
    }
    return result;
  }, [startMonth, endMonth]);

  // Calculate forecast per month — only REAL data, no projections for charges
  const forecasts = useMemo((): MonthForecast[] => {
    const taxRate = charges.taxPercent / 100;
    const totalSalaries = salaries.reduce((s, sal) => s + sal.monthlyAmount, 0);

    return monthsInRange.map(month => {
      // === REVENUE: project installment payments due this month from existing sales ===
      let revenueTTC = 0;
      let totalKlarna = 0;
      let salesWithCloserHT = 0;
      let klarnaWithCloser = 0;
      let defaultedAmount = 0;

      allSales.forEach(sale => {
        if (sale.isFullyRefunded) return;

        const saleDate = new Date(sale.saleDate);
        const klarnaAmt = sale.klarnaAmount || 0;
        const cbAmt = sale.cbAmount || (sale.totalPrice - klarnaAmt);
        const cbInstallment = cbAmt / sale.numberOfPayments;

        for (let i = 0; i < sale.numberOfPayments; i++) {
          const payDate = new Date(saleDate);
          payDate.setMonth(saleDate.getMonth() + i);
          const payMonth = `${payDate.getFullYear()}-${String(payDate.getMonth() + 1).padStart(2, '0')}`;

          if (payMonth !== month) continue;

          if (sale.isDefaulted) {
            if (i === 0) {
              defaultedAmount += klarnaAmt + cbInstallment;
            } else {
              defaultedAmount += cbInstallment;
            }
            continue;
          }

          // Check if already paid
          const isPaid = i > 0 && (sale.paymentHistory || []).some(p => {
            const pMonth = p.date.substring(0, 7);
            return pMonth === month && p.verified;
          });

          if (i === 0) {
            const paymentAmount = klarnaAmt + cbInstallment;
            revenueTTC += paymentAmount;
            totalKlarna += klarnaAmt;
            if (sale.closerId) {
              salesWithCloserHT += paymentAmount / (1 + taxRate);
              klarnaWithCloser += klarnaAmt;
            }
          } else if (!isPaid) {
            revenueTTC += cbInstallment;
            if (sale.closerId) {
              salesWithCloserHT += cbInstallment / (1 + taxRate);
            }
          }
        }
      });

      revenueTTC = roundCurrency(revenueTTC);
      const tva = roundCurrency(revenueTTC * taxRate / (1 + taxRate));
      const revenueHT = roundCurrency(revenueTTC - tva);

      // === CHARGES: only percentage-based deductions on projected revenue (always apply) ===
      const klarnaCost = roundCurrency(totalKlarna * (charges.klarnaPercent / 100));
      const cbTotal = roundCurrency(revenueTTC - totalKlarna);
      const processorCost = roundCurrency(cbTotal * (charges.paymentProcessorPercent / 100));

      const klarnaFeeWithCloser = roundCurrency(klarnaWithCloser * (charges.klarnaPercent / 100));
      const closerBase = roundCurrency(salesWithCloserHT - klarnaFeeWithCloser);
      const closersCost = roundCurrency(closerBase * (charges.closersPercent / 100));

      const agencyBase = roundCurrency(revenueHT - klarnaCost);
      let agencyCost = 0;
      if (agencyBase > charges.agencyThreshold) {
        agencyCost = roundCurrency((agencyBase - charges.agencyThreshold) * (charges.agencyPercent / 100));
      }

      // === FIXED CHARGES: only from REAL data already entered for this month ===
      // Tunnels for this month (ad budget)
      const adBudget = tunnels
        .filter(t => t.month === month)
        .reduce((s, t) => s + t.adBudget, 0);

      // Coaching expenses actually entered for this month
      const coachingCost = coachingExpenses
        .filter(e => e.month === month)
        .reduce((s, e) => s + e.amount, 0);

      // Fixed charges (current values — they exist in the system)
      // Only count them for months that have at least some activity (tunnels)
      const hasTunnels = tunnels.some(t => t.month === month);
      const fixedCharges = hasTunnels
        ? (charges.advertising + charges.marketing + charges.software + charges.otherCosts)
        : 0;

      const salariesCost = totalSalaries;

      const variableCharges = roundCurrency(
        processorCost + klarnaCost + closersCost + agencyCost
      );
      const realFixedCharges = roundCurrency(fixedCharges + coachingCost + adBudget);

      const netProfit = roundCurrency(revenueHT - variableCharges - realFixedCharges);
      const associateCost = roundCurrency(netProfit > 0 ? netProfit * (charges.associatePercent / 100) : 0);
      const netNetProfit = roundCurrency(netProfit - associateCost - salariesCost);

      const totalCharges = roundCurrency(variableCharges + realFixedCharges + associateCost + salariesCost);

      return {
        month,
        label: formatMonth(month),
        revenueTTC,
        revenueHT,
        tva,
        processorCost,
        klarnaCost,
        closersCost,
        agencyCost,
        fixedCharges,
        coachingCost,
        adBudget,
        salariesCost,
        associateCost,
        totalCharges,
        netProfit,
        netNetProfit,
        defaultedAmount: roundCurrency(defaultedAmount),
      };
    });
  }, [monthsInRange, allSales, charges, salaries, coachingExpenses, tunnels]);

  // Totals
  const totals = useMemo(() => ({
    revenueTTC: roundCurrency(forecasts.reduce((s, f) => s + f.revenueTTC, 0)),
    revenueHT: roundCurrency(forecasts.reduce((s, f) => s + f.revenueHT, 0)),
    tva: roundCurrency(forecasts.reduce((s, f) => s + f.tva, 0)),
    totalCharges: roundCurrency(forecasts.reduce((s, f) => s + f.totalCharges, 0)),
    netProfit: roundCurrency(forecasts.reduce((s, f) => s + f.netProfit, 0)),
    netNetProfit: roundCurrency(forecasts.reduce((s, f) => s + f.netNetProfit, 0)),
    defaultedAmount: roundCurrency(forecasts.reduce((s, f) => s + f.defaultedAmount, 0)),
  }), [forecasts]);

  const fmt = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-primary" />
          Prévisionnel — Encaissements réels à venir
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Basé uniquement sur les échéances des ventes existantes. Les charges n'apparaissent que si elles sont déjà saisies.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date filters */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Du</span>
          <Select value={startMonth} onValueChange={setStartMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">au</span>
          <Select value={endMonth} onValueChange={setEndMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary KPI cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="kpi-card">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Receipt className="h-4 w-4" />
              Encaissements Prévisionnels HT
            </div>
            <p className="stat-value mt-2 text-foreground">{fmt(totals.revenueHT)} €</p>
            <p className="text-xs text-muted-foreground mt-1">
              TTC: {fmt(totals.revenueTTC)} € | TVA: {fmt(totals.tva)} €
            </p>
          </div>

          <div className={`kpi-card ${totals.netProfit > 0 ? 'kpi-profitable' : 'kpi-danger'}`}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4" />
              Bénéfice Net Prévisionnel
            </div>
            <p className={`stat-value mt-2 ${totals.netProfit > 0 ? 'text-profitable' : 'text-danger'}`}>
              {fmt(totals.netProfit)} €
            </p>
          </div>

          <div className={`kpi-card ${totals.netNetProfit > 0 ? 'kpi-profitable' : 'kpi-danger'}`}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Diamond className="h-4 w-4" />
              Bénéfice Net Net Prévisionnel
            </div>
            <p className={`stat-value mt-2 ${totals.netNetProfit > 0 ? 'text-profitable' : 'text-danger'}`}>
              {fmt(totals.netNetProfit)} €
            </p>
          </div>

          {totals.defaultedAmount > 0 && (
            <div className="kpi-card kpi-danger">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                Impayés
              </div>
              <p className="stat-value mt-2 text-danger">{fmt(totals.defaultedAmount)} €</p>
            </div>
          )}
        </div>

        {/* Monthly breakdown table */}
        {forecasts.length > 0 && (
          <div className="overflow-x-auto">
          <TooltipProvider delayDuration={200}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Mois</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Encaissements TTC</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Encaissements HT</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Charges</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Bén. Net</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Bén. Net Net</th>
                </tr>
              </thead>
              <tbody>
                {forecasts.map(f => (
                  <tr key={f.month} className="border-b border-border/30 hover:bg-secondary/20">
                    <td className="py-2 px-3 font-medium">{f.label}</td>
                    <td className="text-right py-2 px-3">{fmt(f.revenueTTC)} €</td>
                    <td className="text-right py-2 px-3">{fmt(f.revenueHT)} €</td>
                    <td className="text-right py-2 px-3 text-danger">
                      {f.totalCharges > 0 ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help underline decoration-dotted">{fmt(f.totalCharges)} €</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <ChargesBreakdown data={f} fmt={fmt} />
                          </TooltipContent>
                        </Tooltip>
                      ) : '—'}
                    </td>
                    <td className={`text-right py-2 px-3 font-medium ${f.netProfit > 0 ? 'text-profitable' : f.netProfit < 0 ? 'text-danger' : ''}`}>
                      {fmt(f.netProfit)} €
                    </td>
                    <td className={`text-right py-2 px-3 font-medium ${f.netNetProfit > 0 ? 'text-profitable' : f.netNetProfit < 0 ? 'text-danger' : ''}`}>
                      {fmt(f.netNetProfit)} €
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-border font-semibold">
                  <td className="py-2 px-3">Total</td>
                  <td className="text-right py-2 px-3">{fmt(totals.revenueTTC)} €</td>
                  <td className="text-right py-2 px-3">{fmt(totals.revenueHT)} €</td>
                  <td className="text-right py-2 px-3 text-danger">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help underline decoration-dotted">{fmt(totals.totalCharges)} €</span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <ChargesBreakdown data={{
                          processorCost: roundCurrency(forecasts.reduce((s, f) => s + f.processorCost, 0)),
                          klarnaCost: roundCurrency(forecasts.reduce((s, f) => s + f.klarnaCost, 0)),
                          closersCost: roundCurrency(forecasts.reduce((s, f) => s + f.closersCost, 0)),
                          agencyCost: roundCurrency(forecasts.reduce((s, f) => s + f.agencyCost, 0)),
                          fixedCharges: roundCurrency(forecasts.reduce((s, f) => s + f.fixedCharges, 0)),
                          coachingCost: roundCurrency(forecasts.reduce((s, f) => s + f.coachingCost, 0)),
                          adBudget: roundCurrency(forecasts.reduce((s, f) => s + f.adBudget, 0)),
                          associateCost: roundCurrency(forecasts.reduce((s, f) => s + f.associateCost, 0)),
                          salariesCost: roundCurrency(forecasts.reduce((s, f) => s + f.salariesCost, 0)),
                        }} fmt={fmt} />
                      </TooltipContent>
                    </Tooltip>
                  </td>
                  <td className={`text-right py-2 px-3 ${totals.netProfit > 0 ? 'text-profitable' : 'text-danger'}`}>
                    {fmt(totals.netProfit)} €
                  </td>
                  <td className={`text-right py-2 px-3 ${totals.netNetProfit > 0 ? 'text-profitable' : 'text-danger'}`}>
                    {fmt(totals.netNetProfit)} €
                  </td>
                </tr>
              </tbody>
            </table>
          </TooltipProvider>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
