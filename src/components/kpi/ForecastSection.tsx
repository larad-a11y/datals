import { useMemo, useState } from 'react';
import { CalendarRange, TrendingUp, Wallet, Receipt, AlertTriangle, Diamond } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  totalCharges: number;
  netProfit: number;
  netNetProfit: number;
  defaultedAmount: number;
}

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  // From 6 months ago to 12 months in the future
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

  // All sales across all tunnels
  const allSales = useMemo(() => tunnels.flatMap(t => t.sales), [tunnels]);

  // Calculate average monthly fixed charges from recent data
  const avgAdBudget = useMemo(() => {
    const months = [...new Set(tunnels.map(t => t.month))];
    if (months.length === 0) return 0;
    const totalBudget = tunnels.reduce((s, t) => s + t.adBudget, 0);
    return roundCurrency(totalBudget / months.length);
  }, [tunnels]);

  const avgCoaching = useMemo(() => {
    const months = [...new Set(coachingExpenses.map(e => e.month))];
    if (months.length === 0) return 0;
    const total = coachingExpenses.reduce((s, e) => s + e.amount, 0);
    return roundCurrency(total / months.length);
  }, [coachingExpenses]);

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

  // Calculate forecast per month
  const forecasts = useMemo((): MonthForecast[] => {
    const taxRate = charges.taxPercent / 100;
    const totalSalaries = salaries.reduce((s, sal) => s + sal.monthlyAmount, 0);
    const fixedChargesAmount = charges.advertising + charges.marketing + charges.software + charges.otherCosts;

    return monthsInRange.map(month => {
      // Find all installment payments due in this month
      let revenueTTC = 0;
      let totalKlarna = 0;
      let salesWithCloserHT = 0;
      let klarnaWithCloser = 0;
      let defaultedAmount = 0;

      allSales.forEach(sale => {
        if (sale.isDefaulted) {
          // Check if any installment falls in this month for defaulted tracking
          const saleDate = new Date(sale.saleDate);
          for (let i = 0; i < sale.numberOfPayments; i++) {
            const payDate = new Date(saleDate);
            payDate.setMonth(saleDate.getMonth() + i);
            const payMonth = `${payDate.getFullYear()}-${String(payDate.getMonth() + 1).padStart(2, '0')}`;
            if (payMonth === month) {
              const klarnaAmt = sale.klarnaAmount || 0;
              const cbAmt = sale.cbAmount || (sale.totalPrice - klarnaAmt);
              if (i === 0) {
                defaultedAmount += klarnaAmt + cbAmt / sale.numberOfPayments;
              } else {
                defaultedAmount += cbAmt / sale.numberOfPayments;
              }
            }
          }
          return;
        }

        if (sale.isFullyRefunded) return;

        const saleDate = new Date(sale.saleDate);
        const klarnaAmt = sale.klarnaAmount || 0;
        const cbAmt = sale.cbAmount || (sale.totalPrice - klarnaAmt);
        const cbInstallment = cbAmt / sale.numberOfPayments;

        for (let i = 0; i < sale.numberOfPayments; i++) {
          const payDate = new Date(saleDate);
          payDate.setMonth(saleDate.getMonth() + i);
          const payMonth = `${payDate.getFullYear()}-${String(payDate.getMonth() + 1).padStart(2, '0')}`;

          if (payMonth === month) {
            // Check if already paid
            const isPaid = i > 0 && (sale.paymentHistory || []).some(p => {
              const pMonth = p.date.substring(0, 7);
              return pMonth === month && p.verified;
            });

            if (i === 0) {
              // First payment: klarna + first CB installment
              const paymentAmount = klarnaAmt + cbInstallment;
              revenueTTC += paymentAmount;
              totalKlarna += klarnaAmt;
              if (sale.closerId) {
                salesWithCloserHT += paymentAmount / (1 + taxRate);
                klarnaWithCloser += klarnaAmt;
              }
            } else if (!isPaid) {
              // Subsequent CB installments
              revenueTTC += cbInstallment;
              if (sale.closerId) {
                salesWithCloserHT += cbInstallment / (1 + taxRate);
              }
            }
          }
        }
      });

      revenueTTC = roundCurrency(revenueTTC);
      const tva = roundCurrency(revenueTTC * taxRate / (1 + taxRate));
      const revenueHT = roundCurrency(revenueTTC - tva);

      // Fees
      const klarnaCost = roundCurrency(totalKlarna * (charges.klarnaPercent / 100));
      const cbTotal = roundCurrency(revenueTTC - totalKlarna);
      const processorCost = roundCurrency(cbTotal * (charges.paymentProcessorPercent / 100));

      // Closers
      const klarnaFeeWithCloser = roundCurrency(klarnaWithCloser * (charges.klarnaPercent / 100));
      const closerBase = roundCurrency(salesWithCloserHT - klarnaFeeWithCloser);
      const closersCost = roundCurrency(closerBase * (charges.closersPercent / 100));

      // Agency
      const agencyBase = roundCurrency(revenueHT - klarnaCost);
      let agencyCost = 0;
      if (agencyBase > charges.agencyThreshold) {
        agencyCost = roundCurrency((agencyBase - charges.agencyThreshold) * (charges.agencyPercent / 100));
      }

      // Monthly coaching for this specific month or average
      const monthCoaching = coachingExpenses
        .filter(e => e.month === month)
        .reduce((s, e) => s + e.amount, 0) || avgCoaching;

      const adBudget = tunnels
        .filter(t => t.month === month)
        .reduce((s, t) => s + t.adBudget, 0) || avgAdBudget;

      const totalCharges = roundCurrency(
        processorCost + klarnaCost + closersCost + agencyCost +
        fixedChargesAmount + monthCoaching + adBudget
      );

      const netProfit = roundCurrency(revenueHT - totalCharges);
      const associateCost = roundCurrency(netProfit > 0 ? netProfit * (charges.associatePercent / 100) : 0);
      const netNetProfit = roundCurrency(netProfit - associateCost - totalSalaries);

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
        fixedCharges: fixedChargesAmount,
        coachingCost: monthCoaching,
        adBudget,
        salariesCost: totalSalaries,
        totalCharges: roundCurrency(totalCharges + associateCost + totalSalaries),
        netProfit,
        netNetProfit,
        defaultedAmount: roundCurrency(defaultedAmount),
      };
    });
  }, [monthsInRange, allSales, charges, salaries, coachingExpenses, tunnels, avgAdBudget, avgCoaching]);

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
          Prévisionnel
        </CardTitle>
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
              CA Prévisionnel HT
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

          <div className="kpi-card">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Total Charges Prévisionnelles
            </div>
            <p className="stat-value mt-2 text-foreground">{fmt(totals.totalCharges)} €</p>
          </div>

          {totals.defaultedAmount > 0 && (
            <div className="kpi-card kpi-danger">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                Impayés Potentiels
              </div>
              <p className="stat-value mt-2 text-danger">{fmt(totals.defaultedAmount)} €</p>
            </div>
          )}
        </div>

        {/* Monthly breakdown table */}
        {forecasts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Mois</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">CA TTC</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">CA HT</th>
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
                    <td className="text-right py-2 px-3 text-danger">{fmt(f.totalCharges)} €</td>
                    <td className={`text-right py-2 px-3 font-medium ${f.netProfit > 0 ? 'text-profitable' : 'text-danger'}`}>
                      {fmt(f.netProfit)} €
                    </td>
                    <td className={`text-right py-2 px-3 font-medium ${f.netNetProfit > 0 ? 'text-profitable' : 'text-danger'}`}>
                      {fmt(f.netNetProfit)} €
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="border-t-2 border-border font-semibold">
                  <td className="py-2 px-3">Total</td>
                  <td className="text-right py-2 px-3">{fmt(totals.revenueTTC)} €</td>
                  <td className="text-right py-2 px-3">{fmt(totals.revenueHT)} €</td>
                  <td className="text-right py-2 px-3 text-danger">{fmt(totals.totalCharges)} €</td>
                  <td className={`text-right py-2 px-3 ${totals.netProfit > 0 ? 'text-profitable' : 'text-danger'}`}>
                    {fmt(totals.netProfit)} €
                  </td>
                  <td className={`text-right py-2 px-3 ${totals.netNetProfit > 0 ? 'text-profitable' : 'text-danger'}`}>
                    {fmt(totals.netNetProfit)} €
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
