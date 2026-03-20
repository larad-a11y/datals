import { useMemo, useState } from 'react';
import { Tunnel, Charges, Salary, KPIData, CoachingExpense } from '@/types/business';
import { roundCurrency } from '@/lib/utils';

interface UseBusinessCalculationsProps {
  tunnels: Tunnel[];
  charges: Charges;
  salaries: Salary[];
  coachingExpenses: CoachingExpense[];
  initialMonth?: string;
}

export function useBusinessCalculations({
  tunnels,
  charges,
  salaries,
  coachingExpenses,
  initialMonth,
}: UseBusinessCalculationsProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (initialMonth) return initialMonth;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const filteredTunnels = useMemo(() =>
    tunnels.filter(t => t.month === selectedMonth && t.isActive),
    [tunnels, selectedMonth]
  );

  const filteredCoachingExpenses = useMemo(() =>
    coachingExpenses.filter(e => e.month === selectedMonth),
    [coachingExpenses, selectedMonth]
  );

  const kpis = useMemo((): KPIData => {
    const allFilteredSales = filteredTunnels.flatMap(t => t.sales);

    // === REMBOURSEMENTS ===
    const totalRefundedAmount = roundCurrency(
      allFilteredSales.reduce((sum, s) => sum + (s.refundedAmount || 0), 0)
    );
    const refundedSalesCount = allFilteredSales.filter(s => (s.refundedAmount || 0) > 0).length;

    // === CA CONTRACTÉ ===
    const totalContracted = roundCurrency(filteredTunnels.reduce((sum, t) => {
      if (t.sales.length > 0) {
        return sum + t.sales.reduce((s, sale) => s + sale.totalPrice - (sale.refundedAmount || 0), 0);
      }
      return sum + t.sales.length * t.averagePrice;
    }, 0));

    // === CA COLLECTÉ TTC ===
    const totalCollectedTTC = roundCurrency(filteredTunnels.reduce((sum, t) => {
      if (t.sales.length > 0) {
        return sum + t.sales.reduce((s, sale) => s + sale.amountCollected - (sale.refundedAmount || 0), 0);
      }
      return sum + t.collectedAmount;
    }, 0));

    // === TVA & CA HT ===
    const taxRate = charges.taxPercent / 100;
    const tvaAmount = roundCurrency(totalCollectedTTC * taxRate / (1 + taxRate));
    const totalCollectedHT = roundCurrency(totalCollectedTTC - tvaAmount);

    // === BUDGET PUB & MÉTRIQUES TRAFIC ===
    const totalAdBudget = filteredTunnels.reduce((sum, t) => sum + t.adBudget, 0);
    const totalCalls = filteredTunnels.reduce((sum, t) => sum + t.callsGenerated, 0);
    const totalClosedCalls = filteredTunnels.reduce((sum, t) => sum + t.sales.length, 0);
    const totalClosedCallsAds = filteredTunnels.reduce(
      (sum, t) => sum + t.sales.filter(s => s.trafficSource === 'ads').length, 0
    );
    const totalRegistrationsAds = filteredTunnels.reduce(
      (sum, t) => sum + (t.registrationsAds || 0), 0
    );
    const totalRegistrations = filteredTunnels.reduce(
      (sum, t) => sum + (t.registrationsAds || 0) + (t.registrationsOrganic || 0), 0
    );
    const adsRatio = totalRegistrations > 0 ? totalRegistrationsAds / totalRegistrations : 1;

    const totalWebinarAttendees = filteredTunnels
      .filter(t => t.type === 'webinar')
      .reduce((sum, t) => sum + (t.attendees || 0), 0);
    const totalChallengeMaxAttendees = filteredTunnels
      .filter(t => t.type === 'challenge' && t.challengeDays && t.challengeDays.length > 0)
      .reduce((sum, t) => sum + Math.max(...t.challengeDays!.map(d => d.attendees)), 0);
    const totalAttendees = totalWebinarAttendees + totalChallengeMaxAttendees;
    const totalAttendeesAds = Math.round(totalAttendees * adsRatio);

    // === FRAIS PROCESSEUR (sur tout le CA TTC, tous moyens de paiement) ===
    const paymentProcessorCost = roundCurrency(
      totalCollectedTTC * (charges.paymentProcessorPercent / 100)
    );

    // Klarna et agence désactivés
    const klarnaCost = 0;
    const totalKlarnaAmount = 0;
    const agencyCost = 0;

    // === CLOSERS ===
    const salesWithCloserHTAmount = roundCurrency(
      filteredTunnels.reduce((sum, t) =>
        sum + t.sales
          .filter(s => s.closerId)
          .reduce((s, sale) =>
            s + (sale.amountCollected - (sale.refundedAmount || 0)) / (1 + taxRate), 0
          ), 0
      )
    );
    const closersCost = roundCurrency(salesWithCloserHTAmount * (charges.closersPercent / 100));

    // === CHARGES FIXES ===
    const fixedCharges = roundCurrency(
      charges.advertising + charges.marketing + charges.software + charges.otherCosts
    );

    // === COACHING ===
    const totalCoachingExpenses = roundCurrency(
      filteredCoachingExpenses.reduce((sum, e) => sum + e.amount, 0)
    );

    // === BÉNÉFICE NET ===
    const netProfit = roundCurrency(
      totalCollectedHT
      - paymentProcessorCost
      - closersCost
      - totalAdBudget
      - fixedCharges
      - totalCoachingExpenses
    );

    // === PART ASSOCIÉ ===
    const associateCost = roundCurrency(
      netProfit > 0 ? netProfit * (charges.associatePercent / 100) : 0
    );

    // === SALAIRES ===
    const totalSalaries = roundCurrency(salaries.reduce((sum, s) => sum + s.monthlyAmount, 0));

    // === BÉNÉFICE NET NET ===
    const netNetProfit = roundCurrency(netProfit - associateCost - totalSalaries);

    // === BÉNÉFICES CONTRACTÉS ===
    const contractedHT = roundCurrency(totalContracted / (1 + taxRate));
    const revenueRatio = totalCollectedTTC > 0 ? totalContracted / totalCollectedTTC : 0;
    const contractedProcessorCost = roundCurrency(paymentProcessorCost * revenueRatio);
    const contractedClosersCost = roundCurrency(closersCost * revenueRatio);
    const contractedNetProfit = roundCurrency(
      contractedHT
      - contractedProcessorCost
      - contractedClosersCost
      - totalAdBudget
      - fixedCharges
      - totalCoachingExpenses
    );
    const contractedAssociateCost = roundCurrency(
      contractedNetProfit > 0 ? contractedNetProfit * (charges.associatePercent / 100) : 0
    );
    const contractedNetNetProfit = roundCurrency(
      contractedNetProfit - contractedAssociateCost - totalSalaries
    );

    // === ROAS ===
    const roasCollected = totalAdBudget > 0
      ? roundCurrency(totalCollectedTTC / totalAdBudget) : 0;
    const roasContracted = totalAdBudget > 0
      ? roundCurrency(totalContracted / totalAdBudget) : 0;

    // === CONVERSION ===
    const costPerCall = roundCurrency(totalCalls > 0 ? totalAdBudget / totalCalls : 0);
    const closingRate = roundCurrency(totalCalls > 0 ? (totalClosedCalls / totalCalls) * 100 : 0);
    const cac = roundCurrency(totalClosedCallsAds > 0 ? totalAdBudget / totalClosedCallsAds : 0);
    const cpl = roundCurrency(totalRegistrationsAds > 0 ? totalAdBudget / totalRegistrationsAds : 0);
    const costPerWebinarAttendee = roundCurrency(
      totalAttendeesAds > 0 ? totalAdBudget / totalAttendeesAds : 0
    );

    // === VENTES ORGANIQUES ===
    const organicSales = filteredTunnels.flatMap(t => t.sales.filter(s => s.trafficSource === 'organic'));
    const organicSalesCount = organicSales.length;
    const organicCollectedAmount = roundCurrency(
      organicSales.reduce((sum, s) => sum + s.amountCollected - (s.refundedAmount || 0), 0)
    );

    // === ENCAISSÉ DIRECT ===
    const directCollectedThisMonth = roundCurrency(
      filteredTunnels.reduce((sum, t) =>
        sum + t.sales.reduce((s, sale) => {
          const collected = sale.amountCollected - (sale.refundedAmount || 0);
          if (sale.numberOfPayments <= 1) return s + collected;
          const cbAmount = sale.totalPrice - (sale.klarnaAmount || 0);
          const firstInstallment = cbAmount / sale.numberOfPayments + (sale.klarnaAmount || 0);
          return s + Math.min(collected, firstInstallment);
        }, 0)
      , 0)
    );

    // === ENCAISSÉ ÉCHELONNÉ ===
    const installmentCollectedThisMonth = roundCurrency(
      tunnels
        .filter(t => t.month !== selectedMonth)
        .flatMap(t => t.sales)
        .filter(sale => !sale.isDefaulted)
        .reduce((sum, sale) => {
          const paymentsThisMonth = (sale.paymentHistory || []).filter(p =>
            p.date.substring(0, 7) === selectedMonth && p.verified
          );
          return sum + paymentsThisMonth.reduce((ps, p) => ps + p.amount, 0);
        }, 0)
    );

    // === RESTE À ENCAISSER CE MOIS ===
    const remainingToCollectThisMonth = roundCurrency(
      tunnels
        .flatMap(t => t.sales)
        .filter(sale => !sale.isDefaulted && sale.numberOfPayments > 1 && sale.saleDate)
        .reduce((sum, sale) => {
          const cbAmount = sale.totalPrice - (sale.klarnaAmount || 0);
          const installmentAmount = cbAmount / sale.numberOfPayments;
          const saleDate = new Date(sale.saleDate);
          for (let i = 2; i <= sale.numberOfPayments; i++) {
            const paymentDate = new Date(saleDate);
            paymentDate.setMonth(saleDate.getMonth() + (i - 1));
            const paymentMonth = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
            if (paymentMonth === selectedMonth) {
              const isPaid = (sale.paymentHistory || []).some(p =>
                p.date.substring(0, 7) === paymentMonth && p.verified
              );
              if (!isPaid) return sum + installmentAmount;
            }
          }
          return sum;
        }, 0)
    );

    // === TOTAL À ENCAISSER ===
    const upcomingPaymentsTotal = roundCurrency(
      tunnels
        .flatMap(t => t.sales)
        .filter(sale => !sale.isDefaulted)
        .reduce((sum, sale) => sum + Math.max(0, sale.totalPrice - sale.amountCollected), 0)
    );

    // === PAIEMENTS CE MOIS ===
    const upcomingPaymentsThisMonth = roundCurrency(
      tunnels
        .filter(t => t.month !== selectedMonth)
        .flatMap(t => t.sales)
        .filter(sale => {
          if (sale.isDefaulted || !sale.nextPaymentDate) return false;
          return sale.nextPaymentDate.substring(0, 7) === selectedMonth
            && sale.amountCollected < sale.totalPrice;
        })
        .reduce((sum, sale) => {
          const remaining = sale.totalPrice - sale.amountCollected;
          const paid = sale.paymentHistory?.length || 1;
          const paymentsRemaining = sale.numberOfPayments - paid;
          return sum + (paymentsRemaining > 0 ? remaining / paymentsRemaining : remaining);
        }, 0)
    );

    // === IMPAYÉS ===
    const defaultedAmount = roundCurrency(
      tunnels
        .flatMap(t => t.sales)
        .filter(sale => sale.isDefaulted)
        .reduce((sum, sale) => sum + Math.max(0, sale.totalPrice - sale.amountCollected), 0)
    );

    return {
      contractedRevenue: totalContracted,
      collectedRevenue: totalCollectedTTC,
      collectedRevenueHT: totalCollectedHT,
      tvaAmount,
      roasCollected,
      roasContracted,
      costPerCall,
      closingRate,
      cac,
      cpl,
      costPerWebinarAttendee,
      netProfit,
      netNetProfit,
      contractedNetProfit,
      contractedNetNetProfit,
      totalCalls,
      totalClosedCalls,
      totalAdBudget,
      totalRegistrations,
      totalRegistrationsAds,
      totalWebinarAttendees,
      paymentProcessorCost,
      klarnaCost,
      totalKlarnaAmount,
      closersCost,
      agencyCost,
      upcomingPaymentsThisMonth,
      upcomingPaymentsTotal,
      defaultedAmount,
      organicSalesCount,
      organicCollectedAmount,
      directCollectedThisMonth,
      installmentCollectedThisMonth,
      remainingToCollectThisMonth,
      totalRefundedAmount,
      refundedSalesCount,
    };
  }, [filteredTunnels, charges, salaries, filteredCoachingExpenses, tunnels, selectedMonth]);

  return {
    selectedMonth,
    setSelectedMonth,
    filteredTunnels,
    filteredCoachingExpenses,
    kpis,
  };
}
