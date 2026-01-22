import { useState, useCallback, useMemo } from 'react';
import { Tunnel, Charges, Salary, KPIData, defaultCharges, Sale, CoachingExpense } from '@/types/business';
import { roundCurrency } from '@/lib/utils';

const generateId = () => Math.random().toString(36).substring(2, 9);

export function useBusinessData() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [charges, setCharges] = useState<Charges>(defaultCharges);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [coachingExpenses, setCoachingExpenses] = useState<CoachingExpense[]>([]);

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
      return sum + (salesContracted > 0 ? salesContracted : t.callsClosed * t.averagePrice);
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
    const totalClosedCalls = filteredTunnels.reduce(
      (sum, t) => sum + t.callsClosed, 0
    );
    const totalRegistrations = filteredTunnels.reduce(
      (sum, t) => sum + (t.registrations || 0), 0
    );
    const totalWebinarAttendees = filteredTunnels
      .filter(t => t.type === 'webinar')
      .reduce((sum, t) => sum + (t.attendees || 0), 0);

    // === NOUVEL ORDRE DE CALCUL ===
    
    // 1. Calcul TVA et CA HT
    const taxRate = charges.taxPercent / 100;
    const tvaAmount = roundCurrency(totalCollectedTTC * taxRate / (1 + taxRate));
    const totalCollectedHT = roundCurrency(totalCollectedTTC - tvaAmount);
    
    // 2. Frais processeur de paiement (sur TTC)
    const paymentProcessorCost = roundCurrency(totalCollectedTTC * (charges.paymentProcessorPercent / 100));
    
    // 3. Frais Klarna (sur le montant Klarna uniquement)
    const totalKlarnaAmount = roundCurrency(filteredTunnels.reduce((sum, t) => {
      return sum + t.sales.reduce((s, sale) => {
        if (sale.klarnaAmount && sale.klarnaAmount > 0) {
          return s + sale.klarnaAmount;
        }
        return s;
      }, 0);
    }, 0));
    
    const klarnaCost = roundCurrency(totalKlarnaAmount * (charges.klarnaPercent / 100));
    
    // 4. Closers (calculé sur le HT uniquement pour les ventes avec un closer assigné)
    // On doit calculer le HT des ventes qui ont un closer
    const salesWithCloserHT = filteredTunnels.reduce((sum, t) => {
      const tunnelSalesWithCloser = t.sales
        .filter(sale => sale.closerId)
        .reduce((s, sale) => s + sale.amountCollected, 0);
      return sum + tunnelSalesWithCloser;
    }, 0);
    // Convertir TTC en HT pour les ventes avec closer
    const salesWithCloserHTAmount = roundCurrency(salesWithCloserHT * (1 / (1 + taxRate)));
    
    // Calculer le montant Klarna des ventes avec closer (pour déduire les frais Klarna de la base)
    const klarnaAmountWithCloser = filteredTunnels.reduce((sum, t) => {
      return sum + t.sales
        .filter(sale => sale.closerId && sale.klarnaAmount)
        .reduce((s, sale) => s + (sale.klarnaAmount || 0), 0);
    }, 0);
    const klarnaFeeWithCloser = roundCurrency(klarnaAmountWithCloser * (charges.klarnaPercent / 100));
    
    // Base closers = HT - frais Klarna (les frais Klarna ne doivent pas être inclus dans la base de commission)
    const closerBaseAmount = roundCurrency(salesWithCloserHTAmount - klarnaFeeWithCloser);
    const closersCost = roundCurrency(closerBaseAmount * (charges.closersPercent / 100));
    
    // 5. Agence : uniquement sur l'excédent au-delà du seuil HT
    // Base agence = CA HT - frais Klarna total (les frais Klarna ne doivent pas être inclus dans la base de commission)
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
    // CA HT - Processeur - Klarna - Closers - Agence - Budget Pub - Charges fixes - Coaching
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

    // ROI Collecté: (Collecté HT - Budget Pub) / Budget Pub
    const adROI = totalAdBudget > 0 
      ? roundCurrency(((totalCollectedHT - totalAdBudget) / totalAdBudget) * 100)
      : 0;

    // ROI Contracté: (Contracté - Budget Pub) / Budget Pub
    const adROIContracted = totalAdBudget > 0 
      ? roundCurrency(((totalContracted - totalAdBudget) / totalAdBudget) * 100)
      : 0;

    // Paiements à venir CE MOIS = ventes des mois précédents avec next_payment_date ce mois (exclut impayés)
    const upcomingPaymentsThisMonth = roundCurrency(tunnels
      .filter(t => t.month !== selectedMonth) // Ventes des mois précédents
      .flatMap(t => t.sales)
      .filter(sale => {
        if (sale.isDefaulted) return false; // Exclure les impayés
        if (!sale.nextPaymentDate) return false;
        const paymentMonth = sale.nextPaymentDate.substring(0, 7); // "YYYY-MM"
        return paymentMonth === selectedMonth && sale.amountCollected < sale.totalPrice;
      })
      .reduce((sum, sale) => {
        // Montant restant à collecter pour cette vente
        const remaining = sale.totalPrice - sale.amountCollected;
        // On estime le prochain paiement comme le montant restant divisé par les paiements restants
        const paymentsRemaining = sale.numberOfPayments ? 
          sale.numberOfPayments - (sale.paymentHistory?.length || 1) : 1;
        return sum + (paymentsRemaining > 0 ? remaining / paymentsRemaining : remaining);
      }, 0));

    // Paiements à venir TOTAL = somme de tous les montants restants à encaisser (ventes NON en impayé)
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

    // Closing rate
    const closingRate = roundCurrency(totalCalls > 0 ? (totalClosedCalls / totalCalls) * 100 : 0);

    // CAC (Customer Acquisition Cost)
    const cac = roundCurrency(totalClosedCalls > 0 ? totalAdBudget / totalClosedCalls : 0);

    // CPL (Cost Per Lead) - Coût par inscrit
    const cpl = roundCurrency(totalRegistrations > 0 ? totalAdBudget / totalRegistrations : 0);

    // Coût par présent webinaire
    const costPerWebinarAttendee = roundCurrency(totalWebinarAttendees > 0 ? totalAdBudget / totalWebinarAttendees : 0);

    return {
      contractedRevenue: totalContracted,
      collectedRevenue: totalCollectedTTC,
      collectedRevenueHT: totalCollectedHT,
      tvaAmount,
      adROI,
      adROIContracted,
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
      totalWebinarAttendees,
      paymentProcessorCost,
      klarnaCost,
      totalKlarnaAmount,
      closersCost,
      agencyCost,
      upcomingPaymentsThisMonth,
      upcomingPaymentsTotal,
      defaultedAmount,
    };
  }, [filteredTunnels, charges, salaries, filteredCoachingExpenses]);

  // Tunnel operations
  const addTunnel = useCallback((tunnel: Omit<Tunnel, 'id'>) => {
    const newTunnel = { 
      ...tunnel, 
      id: generateId(),
      sales: tunnel.sales || [],
    };
    setTunnels(prev => [...prev, newTunnel]);
  }, []);

  const updateTunnel = useCallback((id: string, updates: Partial<Tunnel>) => {
    setTunnels(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const deleteTunnel = useCallback((id: string) => {
    setTunnels(prev => prev.filter(t => t.id !== id));
  }, []);

  // Salary operations
  const addSalary = useCallback((salary: Omit<Salary, 'id'>) => {
    setSalaries(prev => [...prev, { ...salary, id: generateId() }]);
  }, []);

  const updateSalary = useCallback((id: string, updates: Partial<Salary>) => {
    setSalaries(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteSalary = useCallback((id: string) => {
    setSalaries(prev => prev.filter(s => s.id !== id));
  }, []);

  // Coaching expense operations
  const addCoachingExpense = useCallback((expense: Omit<CoachingExpense, 'id'>) => {
    setCoachingExpenses(prev => [...prev, { ...expense, id: generateId() }]);
  }, []);

  const updateCoachingExpense = useCallback((id: string, updates: Partial<CoachingExpense>) => {
    setCoachingExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  const deleteCoachingExpense = useCallback((id: string) => {
    setCoachingExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  // Get all sales from all tunnels with tunnel info
  const getAllSales = useCallback(() => {
    return tunnels.flatMap(tunnel => 
      tunnel.sales.map(sale => ({
        ...sale,
        tunnelId: tunnel.id,
        tunnelName: tunnel.name,
        tunnelType: tunnel.type,
        tunnelDate: tunnel.date,
        tunnelMonth: tunnel.month,
      }))
    );
  }, [tunnels]);

  return {
    selectedMonth,
    setSelectedMonth,
    tunnels,
    filteredTunnels,
    charges,
    setCharges,
    salaries,
    kpis,
    addTunnel,
    updateTunnel,
    deleteTunnel,
    addSalary,
    updateSalary,
    deleteSalary,
    getAllSales,
    coachingExpenses,
    filteredCoachingExpenses,
    addCoachingExpense,
    updateCoachingExpense,
    deleteCoachingExpense,
  };
}
