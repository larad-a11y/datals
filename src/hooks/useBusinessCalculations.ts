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

  // Filter tunnels by selected month
  const filteredTunnels = useMemo(() => 
    tunnels.filter(t => t.month === selectedMonth && t.isActive),
    [tunnels, selectedMonth]
  );

  // Filter coaching expenses by selected month
  const filteredCoachingExpenses = useMemo(() =>
    coachingExpenses.filter(e => e.month === selectedMonth),
    [coachingExpenses, selectedMonth]
  );

  // Calculate KPIs
  const kpis = useMemo((): KPIData => {
    const totalContracted = filteredTunnels.reduce((sum, t) => {
      const salesContracted = t.sales.reduce((s, sale) => s + sale.totalPrice, 0);
      // Use actual sales count for fallback calculation
      return sum + (salesContracted > 0 ? salesContracted : t.sales.length * t.averagePrice);
    }, 0);
    
    // CA Collecté TTC
    const totalCollectedTTC = filteredTunnels.reduce((sum, t) => {
      const salesCollected = t.sales.reduce((s, sale) => s + sale.amountCollected, 0);
      return sum + (salesCollected > 0 ? salesCollected : t.collectedAmount);
    }, 0);
    
    const totalAdBudget = filteredTunnels.reduce(
      (sum, t) => sum + t.adBudget, 0
    );
    const totalCalls = filteredTunnels.reduce(
      (sum, t) => sum + t.callsGenerated, 0
    );
    // Total sales count (all sources)
    const totalClosedCalls = filteredTunnels.reduce(
      (sum, t) => sum + t.sales.length, 0
    );
    // Sales from Ads only (for CAC calculation)
    const totalClosedCallsAds = filteredTunnels.reduce(
      (sum, t) => sum + t.sales.filter(s => s.trafficSource === 'ads').length, 0
    );
    // Inscriptions Ads uniquement (pour le calcul du CPL)
    const totalRegistrationsAds = filteredTunnels.reduce(
      (sum, t) => sum + (t.registrationsAds || 0), 0
    );
    const totalRegistrations = filteredTunnels.reduce(
      (sum, t) => sum + (t.registrationsAds || 0) + (t.registrationsOrganic || 0), 0
    );
    
    // Ratio of ads registrations (to estimate ads-only attendees)
    const adsRatio = totalRegistrations > 0 ? totalRegistrationsAds / totalRegistrations : 1;
    
    const totalWebinarAttendees = filteredTunnels
      .filter(t => t.type === 'webinar')
      .reduce((sum, t) => sum + (t.attendees || 0), 0);
    
    // For challenges, use peak day attendees (max per day) since same people return daily
    const totalChallengeMaxAttendees = filteredTunnels
      .filter(t => t.type === 'challenge' && t.challengeDays && t.challengeDays.length > 0)
      .reduce((sum, t) => sum + Math.max(...t.challengeDays!.map(d => d.attendees)), 0);
    
    const totalAttendees = totalWebinarAttendees + totalChallengeMaxAttendees;
    // Estimate attendees from Ads only (based on registration ratio)
    const totalAttendeesAds = Math.round(totalAttendees * adsRatio);

    // === ORDRE DE CALCUL ===
    
    // 1. Calcul TVA et CA HT
    const taxRate = charges.taxPercent / 100;
    const tvaAmount = roundCurrency(totalCollectedTTC * taxRate / (1 + taxRate));
    const totalCollectedHT = roundCurrency(totalCollectedTTC - tvaAmount);
    
    // 2. Calcul du montant Klarna total
    const totalKlarnaAmount = roundCurrency(filteredTunnels.reduce((sum, t) => {
      return sum + t.sales.reduce((s, sale) => {
        if (sale.klarnaAmount && sale.klarnaAmount > 0) {
          return s + sale.klarnaAmount;
        }
        return s;
      }, 0);
    }, 0));
    
    // 3. Frais Klarna (8% sur portion Klarna uniquement - PAS de frais processeur sur Klarna)
    const klarnaCost = roundCurrency(totalKlarnaAmount * (charges.klarnaPercent / 100));
    
    // 4. Frais processeur de paiement (sur CB uniquement, pas sur Klarna)
    const totalCBAmount = roundCurrency(totalCollectedTTC - totalKlarnaAmount);
    const paymentProcessorCost = roundCurrency(totalCBAmount * (charges.paymentProcessorPercent / 100));
    
    // 4. Closers (calculé sur le HT uniquement pour les ventes avec un closer assigné)
    const salesWithCloserHT = filteredTunnels.reduce((sum, t) => {
      const tunnelSalesWithCloser = t.sales
        .filter(sale => sale.closerId)
        .reduce((s, sale) => s + sale.amountCollected, 0);
      return sum + tunnelSalesWithCloser;
    }, 0);
    const salesWithCloserHTAmount = roundCurrency(salesWithCloserHT * (1 / (1 + taxRate)));
    
    const klarnaAmountWithCloser = filteredTunnels.reduce((sum, t) => {
      return sum + t.sales
        .filter(sale => sale.closerId && sale.klarnaAmount)
        .reduce((s, sale) => s + (sale.klarnaAmount || 0), 0);
    }, 0);
    const klarnaFeeWithCloser = roundCurrency(klarnaAmountWithCloser * (charges.klarnaPercent / 100));
    
    const closerBaseAmount = roundCurrency(salesWithCloserHTAmount - klarnaFeeWithCloser);
    const closersCost = roundCurrency(closerBaseAmount * (charges.closersPercent / 100));
    
    // 5. Agence : uniquement sur l'excédent au-delà du seuil HT
    const agencyBaseHT = roundCurrency(totalCollectedHT - klarnaCost);
    let agencyCost = 0;
    if (agencyBaseHT > charges.agencyThreshold) {
      const excessHT = agencyBaseHT - charges.agencyThreshold;
      agencyCost = roundCurrency(excessHT * (charges.agencyPercent / 100));
    }
    
    // 6. Charges fixes
    const fixedCharges = roundCurrency(charges.advertising + charges.marketing + 
                         charges.software + charges.otherCosts);
    
    // 7. Coaching / Mentorat (filtré par mois)
    const totalCoachingExpenses = roundCurrency(filteredCoachingExpenses.reduce((sum, e) => sum + e.amount, 0));
    
    // 8. Bénéfice Net = AVANT associé et salaires
    const netProfit = roundCurrency(totalCollectedHT 
      - paymentProcessorCost 
      - klarnaCost
      - closersCost 
      - agencyCost 
      - totalAdBudget
      - fixedCharges 
      - totalCoachingExpenses);

    // 8. Part associé (15% du Bénéfice Net)
    const associateCost = roundCurrency(netProfit > 0 ? netProfit * (charges.associatePercent / 100) : 0);

    // 9. Salaires (déduits APRÈS la part associé)
    const totalSalaries = roundCurrency(salaries.reduce((sum, s) => sum + s.monthlyAmount, 0));
    
    // 10. Bénéfice Net Net = Bénéfice Net - Part Associé - Salaires
    const netNetProfit = roundCurrency(netProfit - associateCost - totalSalaries);

    // ROAS Collecté = CA HT / Budget Pub (multiplicateur)
    const roasCollected = totalAdBudget > 0 
      ? roundCurrency(totalCollectedHT / totalAdBudget)
      : 0;

    // ROAS Contracté = CA Contracté / Budget Pub (multiplicateur)
    const roasContracted = totalAdBudget > 0 
      ? roundCurrency(totalContracted / totalAdBudget)
      : 0;

    // Paiements à venir CE MOIS
    const upcomingPaymentsThisMonth = roundCurrency(tunnels
      .filter(t => t.month !== selectedMonth)
      .flatMap(t => t.sales)
      .filter(sale => {
        if (sale.isDefaulted) return false;
        if (!sale.nextPaymentDate) return false;
        const paymentMonth = sale.nextPaymentDate.substring(0, 7);
        return paymentMonth === selectedMonth && sale.amountCollected < sale.totalPrice;
      })
      .reduce((sum, sale) => {
        const remaining = sale.totalPrice - sale.amountCollected;
        const paymentsRemaining = sale.numberOfPayments ? 
          sale.numberOfPayments - (sale.paymentHistory?.length || 1) : 1;
        return sum + (paymentsRemaining > 0 ? remaining / paymentsRemaining : remaining);
      }, 0));

    // Paiements à venir TOTAL
    const upcomingPaymentsTotal = roundCurrency(tunnels
      .flatMap(t => t.sales)
      .filter(sale => !sale.isDefaulted)
      .reduce((sum, sale) => sum + Math.max(0, sale.totalPrice - sale.amountCollected), 0));

    // Montant total en impayé
    const defaultedAmount = roundCurrency(tunnels
      .flatMap(t => t.sales)
      .filter(sale => sale.isDefaulted)
      .reduce((sum, sale) => sum + Math.max(0, sale.totalPrice - sale.amountCollected), 0));

    // Cost per call
    const costPerCall = roundCurrency(totalCalls > 0 ? totalAdBudget / totalCalls : 0);

    // Closing rate (all sources)
    const closingRate = roundCurrency(totalCalls > 0 ? (totalClosedCalls / totalCalls) * 100 : 0);

    // CAC (basé sur les ventes Ads uniquement)
    const cac = roundCurrency(totalClosedCallsAds > 0 ? totalAdBudget / totalClosedCallsAds : 0);

    // CPL (basé sur les inscriptions Ads uniquement)
    const cpl = roundCurrency(totalRegistrationsAds > 0 ? totalAdBudget / totalRegistrationsAds : 0);

    // Coût par présent (basé sur les présents Ads estimés)
    const costPerWebinarAttendee = roundCurrency(totalAttendeesAds > 0 ? totalAdBudget / totalAttendeesAds : 0);

    // Organic stats
    const organicSales = filteredTunnels.flatMap(t => t.sales.filter(s => s.trafficSource === 'organic'));
    const organicSalesCount = organicSales.length;
    const organicCollectedAmount = roundCurrency(organicSales.reduce((sum, s) => sum + s.amountCollected, 0));

    // === NOUVELLES MÉTRIQUES: Breakdown des encaissements du mois ===
    
    // Encaissé direct = 1ère échéance des ventes faites ce mois-ci
    const directCollectedThisMonth = roundCurrency(filteredTunnels.reduce((sum, t) => {
      return sum + t.sales.reduce((s, sale) => {
        // Premier paiement = montant Klarna (si présent) + première échéance CB
        const klarnaAmount = sale.klarnaAmount || 0;
        const cbAmount = sale.cbAmount || (sale.totalPrice - klarnaAmount);
        const firstInstallmentCB = sale.numberOfPayments > 1 ? cbAmount / sale.numberOfPayments : cbAmount;
        return s + klarnaAmount + firstInstallmentCB;
      }, 0);
    }, 0));

    // Encaissé depuis échéances = paiements échelonnés des mois précédents encaissés ce mois
    const installmentCollectedThisMonth = roundCurrency(tunnels
      .filter(t => t.month !== selectedMonth) // Ventes des mois précédents
      .flatMap(t => t.sales)
      .filter(sale => !sale.isDefaulted)
      .reduce((sum, sale) => {
        // Vérifier les paiements dont la date est dans le mois sélectionné
        const paymentsThisMonth = (sale.paymentHistory || []).filter(payment => {
          const paymentMonth = payment.date.substring(0, 7);
          return paymentMonth === selectedMonth && payment.verified;
        });
        return sum + paymentsThisMonth.reduce((ps, p) => ps + p.amount, 0);
      }, 0));

    // Reste à encaisser ce mois = paiements attendus ce mois mais pas encore vérifiés
    // Projette TOUTES les échéances futures basées sur saleDate + numberOfPayments
    const remainingToCollectThisMonth = roundCurrency(tunnels
      .flatMap(t => t.sales)
      .filter(sale => !sale.isDefaulted && sale.numberOfPayments > 1 && sale.saleDate)
      .reduce((sum, sale) => {
        const klarnaAmount = sale.klarnaAmount || 0;
        const cbAmount = sale.cbAmount || (sale.totalPrice - klarnaAmount);
        const installmentAmount = cbAmount / sale.numberOfPayments;
        
        const saleDate = new Date(sale.saleDate);
        
        // Parcourir toutes les échéances futures (à partir de la 2ème car la 1ère est déjà collectée)
        for (let i = 2; i <= sale.numberOfPayments; i++) {
          const paymentDate = new Date(saleDate);
          paymentDate.setMonth(saleDate.getMonth() + (i - 1));
          const paymentMonth = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
          
          // Si cette échéance est dans le mois sélectionné
          if (paymentMonth === selectedMonth) {
            // Vérifier si cette échéance a déjà été payée
            const isPaid = (sale.paymentHistory || []).some(p => {
              const pMonth = p.date.substring(0, 7);
              return pMonth === paymentMonth && p.verified;
            });
            
            if (!isPaid) {
              return sum + installmentAmount;
            }
          }
        }
        return sum;
      }, 0));

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
