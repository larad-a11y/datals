import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Tunnel, Charges, Salary, KPIData, defaultCharges, Sale, CoachingExpense, 
  PaymentRecord, InstallmentPlan, Offer, Closer, ChallengeDay 
} from '@/types/business';
import type { Json } from '@/integrations/supabase/types';

const generateId = () => Math.random().toString(36).substring(2, 9);

// Helper to convert DB tunnel to app tunnel
function dbTunnelToApp(dbTunnel: any, dbSales: any[]): Tunnel {
  const tunnelSales = dbSales
    .filter(s => s.tunnel_id === dbTunnel.id)
    .map(dbSaleToApp);
  
  return {
    id: dbTunnel.id,
    name: dbTunnel.name,
    type: dbTunnel.type,
    date: dbTunnel.date,
    endDate: dbTunnel.end_date,
    month: dbTunnel.month,
    isActive: dbTunnel.is_active ?? true,
    adBudget: Number(dbTunnel.ad_budget) || 0,
    callsGenerated: dbTunnel.calls_generated || 0,
    callsClosed: dbTunnel.calls_closed || 0,
    averagePrice: Number(dbTunnel.average_price) || 0,
    collectedAmount: Number(dbTunnel.collected_amount) || 0,
    registrations: dbTunnel.registrations || 0,
    attendees: dbTunnel.attendees || 0,
    challengeDays: (dbTunnel.challenge_days as ChallengeDay[]) || [],
    callsBooked: dbTunnel.calls_booked || 0,
    sales: tunnelSales,
  };
}

// Helper to convert DB sale to app sale
function dbSaleToApp(dbSale: any): Sale {
  return {
    id: dbSale.id,
    tunnelId: dbSale.tunnel_id,
    clientName: dbSale.client_name,
    closerId: dbSale.closer_id,
    saleDate: dbSale.sale_date,
    offerId: dbSale.offer_id,
    paymentMethod: dbSale.payment_method,
    basePrice: Number(dbSale.base_price) || 0,
    totalPrice: Number(dbSale.total_price) || 0,
    numberOfPayments: dbSale.number_of_payments || 1,
    amountCollected: Number(dbSale.amount_collected) || 0,
    paymentHistory: (dbSale.payment_history as PaymentRecord[]) || [],
    nextPaymentDate: dbSale.next_payment_date,
    createdAt: dbSale.created_at,
  };
}

// Helper to convert DB charges to app charges
function dbChargesToApp(dbCharges: any): Charges {
  return {
    associatePercent: Number(dbCharges.associate_percent) || 15,
    closersPercent: Number(dbCharges.closers_percent) || 17.5,
    agencyPercent: Number(dbCharges.agency_percent) || 20,
    agencyThreshold: Number(dbCharges.agency_threshold) || 130000,
    paymentProcessorPercent: Number(dbCharges.payment_processor_percent) || 4,
    taxPercent: Number(dbCharges.tax_percent) || 20,
    closers: (dbCharges.closers as Closer[]) || [],
    installmentPlans: (dbCharges.installment_plans as InstallmentPlan[]) || defaultCharges.installmentPlans,
    offers: (dbCharges.offers as Offer[]) || [],
    advertising: Number(dbCharges.advertising) || 0,
    marketing: Number(dbCharges.marketing) || 0,
    software: Number(dbCharges.software) || 0,
    otherCosts: Number(dbCharges.other_costs) || 0,
  };
}

// Helper to convert DB salary to app salary
function dbSalaryToApp(dbSalary: any): Salary {
  return {
    id: dbSalary.id,
    name: dbSalary.employee_name,
    monthlyAmount: Number(dbSalary.total_cost) || 0,
  };
}

// Helper to convert DB coaching expense to app
function dbCoachingToApp(dbCoaching: any): CoachingExpense {
  return {
    id: dbCoaching.id,
    name: dbCoaching.name,
    amount: Number(dbCoaching.amount) || 0,
    month: dbCoaching.month,
    type: 'group',
  };
}

export function useBusinessData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Fetch tunnels
  const { data: dbTunnels = [] } = useQuery({
    queryKey: ['tunnels', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('tunnels')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch sales
  const { data: dbSales = [] } = useQuery({
    queryKey: ['sales', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch charges
  const { data: dbCharges } = useQuery({
    queryKey: ['charges', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_charges')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch salaries
  const { data: dbSalaries = [] } = useQuery({
    queryKey: ['salaries', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('salaries')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch coaching expenses
  const { data: dbCoachingExpenses = [] } = useQuery({
    queryKey: ['coaching_expenses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('coaching_expenses')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Convert DB data to app format
  const tunnels = useMemo(() => 
    dbTunnels.map(t => dbTunnelToApp(t, dbSales)),
    [dbTunnels, dbSales]
  );

  const charges = useMemo(() => 
    dbCharges ? dbChargesToApp(dbCharges) : defaultCharges,
    [dbCharges]
  );

  const salaries = useMemo(() => 
    dbSalaries.map(dbSalaryToApp),
    [dbSalaries]
  );

  const coachingExpenses = useMemo(() => 
    dbCoachingExpenses.map(dbCoachingToApp),
    [dbCoachingExpenses]
  );

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

  // ========== MUTATIONS ==========

  // Add tunnel
  const addTunnelMutation = useMutation({
    mutationFn: async (tunnel: Omit<Tunnel, 'id'>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('tunnels')
        .insert({
          user_id: user.id,
          name: tunnel.name,
          type: tunnel.type,
          date: tunnel.date,
          end_date: tunnel.endDate,
          month: tunnel.month,
          is_active: tunnel.isActive,
          ad_budget: tunnel.adBudget,
          calls_generated: tunnel.callsGenerated,
          calls_closed: tunnel.callsClosed,
          average_price: tunnel.averagePrice,
          collected_amount: tunnel.collectedAmount,
          registrations: tunnel.registrations,
          attendees: tunnel.attendees,
          challenge_days: tunnel.challengeDays as unknown as Json,
          calls_booked: tunnel.callsBooked,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tunnels'] });
    },
  });

  // Update tunnel
  const updateTunnelMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Tunnel> }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Handle sales separately
      if (updates.sales) {
        for (const sale of updates.sales) {
          const existingSale = dbSales.find(s => s.id === sale.id);
          if (existingSale) {
            await supabase
              .from('sales')
              .update({
                client_name: sale.clientName,
                closer_id: sale.closerId,
                sale_date: sale.saleDate,
                offer_id: sale.offerId,
                payment_method: sale.paymentMethod,
                base_price: sale.basePrice,
                total_price: sale.totalPrice,
                number_of_payments: sale.numberOfPayments,
                amount_collected: sale.amountCollected,
                payment_history: sale.paymentHistory as unknown as Json,
                next_payment_date: sale.nextPaymentDate,
              })
              .eq('id', sale.id);
          } else {
            await supabase
              .from('sales')
              .insert({
                id: sale.id || generateId(),
                user_id: user.id,
                tunnel_id: id,
                client_name: sale.clientName,
                closer_id: sale.closerId,
                sale_date: sale.saleDate,
                offer_id: sale.offerId,
                payment_method: sale.paymentMethod,
                base_price: sale.basePrice,
                total_price: sale.totalPrice,
                number_of_payments: sale.numberOfPayments,
                amount_collected: sale.amountCollected,
                payment_history: sale.paymentHistory as unknown as Json,
                next_payment_date: sale.nextPaymentDate,
              });
          }
        }
        
        // Delete removed sales
        const currentSaleIds = updates.sales.map(s => s.id);
        const salesToDelete = dbSales
          .filter(s => s.tunnel_id === id && !currentSaleIds.includes(s.id))
          .map(s => s.id);
        
        if (salesToDelete.length > 0) {
          await supabase
            .from('sales')
            .delete()
            .in('id', salesToDelete);
        }
      }

      const { error } = await supabase
        .from('tunnels')
        .update({
          name: updates.name,
          type: updates.type,
          date: updates.date,
          end_date: updates.endDate,
          month: updates.month,
          is_active: updates.isActive,
          ad_budget: updates.adBudget,
          calls_generated: updates.callsGenerated,
          calls_closed: updates.callsClosed,
          average_price: updates.averagePrice,
          collected_amount: updates.collectedAmount,
          registrations: updates.registrations,
          attendees: updates.attendees,
          challenge_days: updates.challengeDays as unknown as Json,
          calls_booked: updates.callsBooked,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tunnels'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });

  // Delete tunnel
  const deleteTunnelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tunnels')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tunnels'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
  });

  // Update charges
  const updateChargesMutation = useMutation({
    mutationFn: async (newCharges: Charges) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('user_charges')
        .upsert({
          user_id: user.id,
          associate_percent: newCharges.associatePercent,
          closers_percent: newCharges.closersPercent,
          agency_percent: newCharges.agencyPercent,
          agency_threshold: newCharges.agencyThreshold,
          payment_processor_percent: newCharges.paymentProcessorPercent,
          tax_percent: newCharges.taxPercent,
          closers: newCharges.closers as unknown as Json,
          installment_plans: newCharges.installmentPlans as unknown as Json,
          offers: newCharges.offers as unknown as Json,
          advertising: newCharges.advertising,
          marketing: newCharges.marketing,
          software: newCharges.software,
          other_costs: newCharges.otherCosts,
        }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
    },
  });

  // Add salary
  const addSalaryMutation = useMutation({
    mutationFn: async (salary: Omit<Salary, 'id'>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('salaries')
        .insert({
          user_id: user.id,
          employee_name: salary.name,
          gross_salary: salary.monthlyAmount,
          total_cost: salary.monthlyAmount,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
    },
  });

  // Update salary
  const updateSalaryMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Salary> }) => {
      const { error } = await supabase
        .from('salaries')
        .update({
          employee_name: updates.name,
          gross_salary: updates.monthlyAmount,
          total_cost: updates.monthlyAmount,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
    },
  });

  // Delete salary
  const deleteSalaryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('salaries')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
    },
  });

  // Add coaching expense
  const addCoachingMutation = useMutation({
    mutationFn: async (expense: Omit<CoachingExpense, 'id'>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('coaching_expenses')
        .insert({
          user_id: user.id,
          name: expense.name,
          amount: expense.amount,
          month: expense.month,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaching_expenses'] });
    },
  });

  // Update coaching expense
  const updateCoachingMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CoachingExpense> }) => {
      const { error } = await supabase
        .from('coaching_expenses')
        .update({
          name: updates.name,
          amount: updates.amount,
          month: updates.month,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaching_expenses'] });
    },
  });

  // Delete coaching expense
  const deleteCoachingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('coaching_expenses')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaching_expenses'] });
    },
  });

  // ========== KPIs ==========
  const kpis = useMemo((): KPIData => {
    const totalContracted = filteredTunnels.reduce((sum, t) => {
      const salesContracted = t.sales.reduce((s, sale) => s + sale.totalPrice, 0);
      return sum + (salesContracted > 0 ? salesContracted : t.callsClosed * t.averagePrice);
    }, 0);
    
    const totalCollectedTTC = filteredTunnels.reduce((sum, t) => {
      const salesCollected = t.sales.reduce((s, sale) => s + sale.amountCollected, 0);
      return sum + (salesCollected > 0 ? salesCollected : t.collectedAmount);
    }, 0);
    
    const totalAdBudget = filteredTunnels.reduce((sum, t) => sum + t.adBudget, 0);
    const totalCalls = filteredTunnels.reduce((sum, t) => sum + t.callsGenerated, 0);
    const totalClosedCalls = filteredTunnels.reduce((sum, t) => sum + t.callsClosed, 0);
    const totalRegistrations = filteredTunnels.reduce((sum, t) => sum + (t.registrations || 0), 0);
    const totalWebinarAttendees = filteredTunnels
      .filter(t => t.type === 'webinar')
      .reduce((sum, t) => sum + (t.attendees || 0), 0);

    const taxRate = charges.taxPercent / 100;
    const tvaAmount = totalCollectedTTC * taxRate / (1 + taxRate);
    const totalCollectedHT = totalCollectedTTC - tvaAmount;
    
    const paymentProcessorCost = totalCollectedTTC * (charges.paymentProcessorPercent / 100);
    
    const salesWithCloserHT = filteredTunnels.reduce((sum, t) => {
      const tunnelSalesWithCloser = t.sales
        .filter(sale => sale.closerId)
        .reduce((s, sale) => s + sale.amountCollected, 0);
      return sum + tunnelSalesWithCloser;
    }, 0);
    const salesWithCloserHTAmount = salesWithCloserHT * (1 / (1 + taxRate));
    const closersCost = salesWithCloserHTAmount * (charges.closersPercent / 100);
    
    let agencyCost = 0;
    if (totalCollectedHT > charges.agencyThreshold) {
      const excessHT = totalCollectedHT - charges.agencyThreshold;
      agencyCost = excessHT * (charges.agencyPercent / 100);
    }
    
    const fixedCharges = charges.advertising + charges.marketing + 
                         charges.software + charges.otherCosts;
    
    const totalCoachingExpenses = filteredCoachingExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalSalaries = salaries.reduce((sum, s) => sum + s.monthlyAmount, 0);
    
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

    const adROI = totalAdBudget > 0 
      ? ((totalCollectedHT - totalAdBudget) / totalAdBudget) * 100 
      : 0;
    const costPerCall = totalCalls > 0 ? totalAdBudget / totalCalls : 0;
    const closingRate = totalCalls > 0 ? (totalClosedCalls / totalCalls) * 100 : 0;
    const cac = totalClosedCalls > 0 ? totalAdBudget / totalClosedCalls : 0;
    const cpl = totalRegistrations > 0 ? totalAdBudget / totalRegistrations : 0;
    const costPerWebinarAttendee = totalWebinarAttendees > 0 ? totalAdBudget / totalWebinarAttendees : 0;

    return {
      contractedRevenue: totalContracted,
      collectedRevenue: totalCollectedTTC,
      collectedRevenueHT: totalCollectedHT,
      tvaAmount,
      adROI,
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
      closersCost,
      agencyCost,
    };
  }, [filteredTunnels, charges, salaries, filteredCoachingExpenses]);

  // ========== CALLBACKS ==========
  const addTunnel = useCallback((tunnel: Omit<Tunnel, 'id'>) => {
    addTunnelMutation.mutate(tunnel);
  }, [addTunnelMutation]);

  const updateTunnel = useCallback((id: string, updates: Partial<Tunnel>) => {
    updateTunnelMutation.mutate({ id, updates });
  }, [updateTunnelMutation]);

  const deleteTunnel = useCallback((id: string) => {
    deleteTunnelMutation.mutate(id);
  }, [deleteTunnelMutation]);

  const setCharges = useCallback((newCharges: Charges) => {
    updateChargesMutation.mutate(newCharges);
  }, [updateChargesMutation]);

  const addSalary = useCallback((salary: Omit<Salary, 'id'>) => {
    addSalaryMutation.mutate(salary);
  }, [addSalaryMutation]);

  const updateSalary = useCallback((id: string, updates: Partial<Salary>) => {
    updateSalaryMutation.mutate({ id, updates });
  }, [updateSalaryMutation]);

  const deleteSalary = useCallback((id: string) => {
    deleteSalaryMutation.mutate(id);
  }, [deleteSalaryMutation]);

  const addCoachingExpense = useCallback((expense: Omit<CoachingExpense, 'id'>) => {
    addCoachingMutation.mutate(expense);
  }, [addCoachingMutation]);

  const updateCoachingExpense = useCallback((id: string, updates: Partial<CoachingExpense>) => {
    updateCoachingMutation.mutate({ id, updates });
  }, [updateCoachingMutation]);

  const deleteCoachingExpense = useCallback((id: string) => {
    deleteCoachingMutation.mutate(id);
  }, [deleteCoachingMutation]);

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
