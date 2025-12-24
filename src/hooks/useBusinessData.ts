import { useState, useCallback, useMemo } from 'react';
import { Tunnel, Charges, Salary, KPIData, defaultCharges, Sale, CoachingExpense } from '@/types/business';

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
    
    const totalCollected = filteredTunnels.reduce((sum, t) => {
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

    // Calculate deductions in order
    let remaining = totalCollected;

    // 1. Payment processor fees
    const paymentProcessorCost = remaining * (charges.paymentProcessorPercent / 100);
    remaining -= paymentProcessorCost;

    // 2. Closers percentage
    const closersCost = remaining * (charges.closersPercent / 100);
    remaining -= closersCost;

    // 3. Agency percentage (only if above threshold)
    let agencyCost = 0;
    if (totalCollected > charges.agencyThreshold) {
      agencyCost = remaining * (charges.agencyPercent / 100);
      remaining -= agencyCost;
    }

    // 4. Fixed charges (without coaching, now managed separately)
    const fixedCharges = charges.advertising + charges.marketing + 
                         charges.software + charges.otherCosts;
    remaining -= fixedCharges;

    // 5. Coaching expenses (filtered by month)
    const totalCoachingExpenses = filteredCoachingExpenses.reduce((sum, e) => sum + e.amount, 0);
    remaining -= totalCoachingExpenses;

    // 6. Salaries
    const totalSalaries = salaries.reduce((sum, s) => sum + s.monthlyAmount, 0);
    remaining -= totalSalaries;

    // Net profit before associate
    const netProfit = remaining;

    // 7. Associate percentage (on net profit only)
    const associateCost = netProfit > 0 ? netProfit * (charges.associatePercent / 100) : 0;
    const netNetProfit = netProfit - associateCost;

    // ROI: (Collected - Ad Budget) / Ad Budget
    const adROI = totalAdBudget > 0 
      ? ((totalCollected - totalAdBudget) / totalAdBudget) * 100 
      : 0;

    // Cost per call
    const costPerCall = totalCalls > 0 ? totalAdBudget / totalCalls : 0;

    // Closing rate
    const closingRate = totalCalls > 0 ? (totalClosedCalls / totalCalls) * 100 : 0;

    // CAC (Customer Acquisition Cost)
    const cac = totalClosedCalls > 0 ? totalAdBudget / totalClosedCalls : 0;

    return {
      contractedRevenue: totalContracted,
      collectedRevenue: totalCollected,
      adROI,
      costPerCall,
      closingRate,
      cac,
      netProfit,
      netNetProfit,
      totalCalls,
      totalClosedCalls,
      totalAdBudget,
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
