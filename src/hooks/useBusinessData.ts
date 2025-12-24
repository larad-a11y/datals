import { useState, useCallback, useMemo, useEffect } from 'react';
import { Tunnel, Charges, Salary, KPIData, defaultCharges, Sale, CoachingExpense, Closer, Offer, InstallmentPlan } from '@/types/business';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export function useBusinessData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [charges, setCharges] = useState<Charges>(defaultCharges);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [coachingExpenses, setCoachingExpenses] = useState<CoachingExpense[]>([]);

  // Load all data from Supabase on mount
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        // Load tunnels with their sales
        const { data: tunnelsData, error: tunnelsError } = await supabase
          .from('tunnels')
          .select('*')
          .eq('user_id', user.id);

        if (tunnelsError) throw tunnelsError;

        // Load sales
        const { data: salesData, error: salesError } = await supabase
          .from('sales')
          .select('*')
          .eq('user_id', user.id);

        if (salesError) throw salesError;

        // Map sales to tunnels
        const tunnelsWithSales: Tunnel[] = (tunnelsData || []).map(t => {
          const tunnelSales = (salesData || [])
            .filter(s => s.tunnel_id === t.id)
            .map(s => ({
              id: s.id,
              tunnelId: s.tunnel_id || '',
              clientName: s.client_name || undefined,
              closerId: s.closer_id || undefined,
              saleDate: s.sale_date,
              offerId: s.offer_id || undefined,
              paymentMethod: s.payment_method as 'cb' | 'virement',
              basePrice: Number(s.base_price),
              totalPrice: Number(s.total_price),
              numberOfPayments: s.number_of_payments || 1,
              amountCollected: Number(s.amount_collected) || 0,
              createdAt: s.created_at || new Date().toISOString(),
              paymentHistory: (s.payment_history as any[]) || [],
              nextPaymentDate: s.next_payment_date || undefined,
            }));

          return {
            id: t.id,
            name: t.name,
            type: t.type as 'webinar' | 'vsl' | 'challenge',
            date: t.date || undefined,
            endDate: t.end_date || undefined,
            month: t.month,
            isActive: t.is_active ?? true,
            adBudget: Number(t.ad_budget) || 0,
            callsGenerated: t.calls_generated || 0,
            callsClosed: t.calls_closed || 0,
            averagePrice: Number(t.average_price) || 0,
            collectedAmount: Number(t.collected_amount) || 0,
            sales: tunnelSales,
            registrations: t.registrations || 0,
            attendees: t.attendees || 0,
            challengeDays: (t.challenge_days as any[]) || [],
            callsBooked: t.calls_booked || 0,
          };
        });

        setTunnels(tunnelsWithSales);

        // Load salaries
        const { data: salariesData, error: salariesError } = await supabase
          .from('salaries')
          .select('*')
          .eq('user_id', user.id);

        if (salariesError) throw salariesError;

        setSalaries((salariesData || []).map(s => ({
          id: s.id,
          name: s.employee_name,
          monthlyAmount: Number(s.total_cost) || 0,
        })));

        // Load coaching expenses
        const { data: coachingData, error: coachingError } = await supabase
          .from('coaching_expenses')
          .select('*')
          .eq('user_id', user.id);

        if (coachingError) throw coachingError;

        setCoachingExpenses((coachingData || []).map(e => ({
          id: e.id,
          name: e.name,
          amount: Number(e.amount),
          month: e.month,
          type: 'group' as const, // Default type since DB doesn't have type column
        })));

        // Load user charges
        const { data: chargesData, error: chargesError } = await supabase
          .from('user_charges')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (chargesError) throw chargesError;

        if (chargesData) {
          setCharges({
            associatePercent: Number(chargesData.associate_percent) || 15,
            closersPercent: Number(chargesData.closers_percent) || 17.5,
            agencyPercent: Number(chargesData.agency_percent) || 20,
            agencyThreshold: Number(chargesData.agency_threshold) || 130000,
            paymentProcessorPercent: Number(chargesData.payment_processor_percent) || 4,
            taxPercent: Number(chargesData.tax_percent) || 20,
            closers: (chargesData.closers as unknown as Closer[]) || [],
            installmentPlans: (chargesData.installment_plans as unknown as InstallmentPlan[]) || defaultCharges.installmentPlans,
            offers: (chargesData.offers as unknown as Offer[]) || [],
            advertising: Number(chargesData.advertising) || 0,
            marketing: Number(chargesData.marketing) || 0,
            software: Number(chargesData.software) || 0,
            otherCosts: Number(chargesData.other_costs) || 0,
          });
        }

      } catch (error: any) {
        console.error('Error loading data:', error);
        toast({
          title: "Erreur de chargement",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, toast]);

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

  // Tunnel operations with Supabase persistence
  const addTunnel = useCallback(async (tunnel: Omit<Tunnel, 'id'>) => {
    if (!user) return;

    try {
      const insertData = {
        user_id: user.id,
        name: tunnel.name,
        type: tunnel.type,
        date: tunnel.date || null,
        end_date: tunnel.endDate || null,
        month: tunnel.month,
        is_active: tunnel.isActive ?? true,
        ad_budget: tunnel.adBudget,
        calls_generated: tunnel.callsGenerated,
        calls_closed: tunnel.callsClosed,
        average_price: tunnel.averagePrice,
        collected_amount: tunnel.collectedAmount,
        registrations: tunnel.registrations || 0,
        attendees: tunnel.attendees || 0,
        challenge_days: (tunnel.challengeDays || []) as any,
        calls_booked: tunnel.callsBooked || 0,
      };

      const { data, error } = await supabase
        .from('tunnels')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      const newTunnel: Tunnel = {
        id: data.id,
        name: data.name,
        type: data.type as 'webinar' | 'vsl' | 'challenge',
        date: data.date || undefined,
        endDate: data.end_date || undefined,
        month: data.month,
        isActive: data.is_active ?? true,
        adBudget: Number(data.ad_budget) || 0,
        callsGenerated: data.calls_generated || 0,
        callsClosed: data.calls_closed || 0,
        averagePrice: Number(data.average_price) || 0,
        collectedAmount: Number(data.collected_amount) || 0,
        sales: tunnel.sales || [],
        registrations: data.registrations || 0,
        attendees: data.attendees || 0,
        challengeDays: (data.challenge_days as any[]) || [],
        callsBooked: data.calls_booked || 0,
      };

      setTunnels(prev => [...prev, newTunnel]);
      toast({ title: "Tunnel créé", description: `${tunnel.name} a été ajouté.` });
    } catch (error: any) {
      console.error('Error adding tunnel:', error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [user, toast]);

  const updateTunnel = useCallback(async (id: string, updates: Partial<Tunnel>) => {
    if (!user) return;

    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.date !== undefined) dbUpdates.date = updates.date || null;
      if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate || null;
      if (updates.month !== undefined) dbUpdates.month = updates.month;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.adBudget !== undefined) dbUpdates.ad_budget = updates.adBudget;
      if (updates.callsGenerated !== undefined) dbUpdates.calls_generated = updates.callsGenerated;
      if (updates.callsClosed !== undefined) dbUpdates.calls_closed = updates.callsClosed;
      if (updates.averagePrice !== undefined) dbUpdates.average_price = updates.averagePrice;
      if (updates.collectedAmount !== undefined) dbUpdates.collected_amount = updates.collectedAmount;
      if (updates.registrations !== undefined) dbUpdates.registrations = updates.registrations;
      if (updates.attendees !== undefined) dbUpdates.attendees = updates.attendees;
      if (updates.challengeDays !== undefined) dbUpdates.challenge_days = updates.challengeDays;
      if (updates.callsBooked !== undefined) dbUpdates.calls_booked = updates.callsBooked;

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase
          .from('tunnels')
          .update(dbUpdates)
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;
      }

      // Handle sales updates separately
      if (updates.sales !== undefined) {
        const tunnel = tunnels.find(t => t.id === id);
        if (tunnel) {
          const existingSaleIds = tunnel.sales.map(s => s.id);
          const newSaleIds = updates.sales.map(s => s.id);

          // Delete removed sales
          const salesToDelete = existingSaleIds.filter(sId => !newSaleIds.includes(sId));
          for (const saleId of salesToDelete) {
            await supabase.from('sales').delete().eq('id', saleId).eq('user_id', user.id);
          }

          // Upsert sales
          for (const sale of updates.sales) {
            const existingSale = tunnel.sales.find(s => s.id === sale.id);
            
            if (existingSale) {
              // Update existing sale
              await supabase
                .from('sales')
                .update({
                  client_name: sale.clientName || null,
                  closer_id: sale.closerId || null,
                  sale_date: sale.saleDate,
                  offer_id: sale.offerId || null,
                  payment_method: sale.paymentMethod,
                  base_price: sale.basePrice,
                  total_price: sale.totalPrice,
                  number_of_payments: sale.numberOfPayments,
                  amount_collected: sale.amountCollected,
                  payment_history: (sale.paymentHistory || []) as any,
                  next_payment_date: sale.nextPaymentDate || null,
                })
                .eq('id', sale.id)
                .eq('user_id', user.id);
            } else {
              // Insert new sale
              const saleInsertData = {
                user_id: user.id,
                tunnel_id: id,
                client_name: sale.clientName || null,
                closer_id: sale.closerId || null,
                sale_date: sale.saleDate,
                offer_id: sale.offerId || null,
                payment_method: sale.paymentMethod,
                base_price: sale.basePrice,
                total_price: sale.totalPrice,
                number_of_payments: sale.numberOfPayments,
                amount_collected: sale.amountCollected,
                payment_history: (sale.paymentHistory || []) as any,
                next_payment_date: sale.nextPaymentDate || null,
              };
              await supabase
                .from('sales')
                .insert(saleInsertData);
            }
          }
        }
      }

      setTunnels(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    } catch (error: any) {
      console.error('Error updating tunnel:', error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [user, tunnels, toast]);

  const deleteTunnel = useCallback(async (id: string) => {
    if (!user) return;

    try {
      // First delete associated sales
      await supabase.from('sales').delete().eq('tunnel_id', id).eq('user_id', user.id);
      
      // Then delete tunnel
      const { error } = await supabase
        .from('tunnels')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setTunnels(prev => prev.filter(t => t.id !== id));
      toast({ title: "Tunnel supprimé" });
    } catch (error: any) {
      console.error('Error deleting tunnel:', error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [user, toast]);

  // Salary operations with Supabase persistence
  const addSalary = useCallback(async (salary: Omit<Salary, 'id'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('salaries')
        .insert({
          user_id: user.id,
          employee_name: salary.name,
          gross_salary: salary.monthlyAmount,
          total_cost: salary.monthlyAmount,
          employer_charges: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setSalaries(prev => [...prev, {
        id: data.id,
        name: data.employee_name,
        monthlyAmount: Number(data.total_cost),
      }]);
      toast({ title: "Salaire ajouté" });
    } catch (error: any) {
      console.error('Error adding salary:', error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [user, toast]);

  const updateSalary = useCallback(async (id: string, updates: Partial<Salary>) => {
    if (!user) return;

    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.employee_name = updates.name;
      if (updates.monthlyAmount !== undefined) {
        dbUpdates.gross_salary = updates.monthlyAmount;
        dbUpdates.total_cost = updates.monthlyAmount;
      }

      const { error } = await supabase
        .from('salaries')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSalaries(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    } catch (error: any) {
      console.error('Error updating salary:', error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [user, toast]);

  const deleteSalary = useCallback(async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('salaries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setSalaries(prev => prev.filter(s => s.id !== id));
      toast({ title: "Salaire supprimé" });
    } catch (error: any) {
      console.error('Error deleting salary:', error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [user, toast]);

  // Coaching expense operations with Supabase persistence
  const addCoachingExpense = useCallback(async (expense: Omit<CoachingExpense, 'id'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('coaching_expenses')
        .insert({
          user_id: user.id,
          name: expense.name,
          amount: expense.amount,
          month: expense.month,
        })
        .select()
        .single();

      if (error) throw error;

      setCoachingExpenses(prev => [...prev, {
        id: data.id,
        name: data.name,
        amount: Number(data.amount),
        month: data.month,
        type: expense.type,
      }]);
      toast({ title: "Dépense coaching ajoutée" });
    } catch (error: any) {
      console.error('Error adding coaching expense:', error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [user, toast]);

  const updateCoachingExpense = useCallback(async (id: string, updates: Partial<CoachingExpense>) => {
    if (!user) return;

    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.month !== undefined) dbUpdates.month = updates.month;

      const { error } = await supabase
        .from('coaching_expenses')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setCoachingExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    } catch (error: any) {
      console.error('Error updating coaching expense:', error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [user, toast]);

  const deleteCoachingExpense = useCallback(async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('coaching_expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setCoachingExpenses(prev => prev.filter(e => e.id !== id));
      toast({ title: "Dépense coaching supprimée" });
    } catch (error: any) {
      console.error('Error deleting coaching expense:', error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [user, toast]);

  // Update charges with Supabase persistence
  const updateCharges = useCallback(async (newCharges: Charges) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_charges')
        .update({
          associate_percent: newCharges.associatePercent,
          closers_percent: newCharges.closersPercent,
          agency_percent: newCharges.agencyPercent,
          agency_threshold: newCharges.agencyThreshold,
          payment_processor_percent: newCharges.paymentProcessorPercent,
          tax_percent: newCharges.taxPercent,
          closers: newCharges.closers as any,
          installment_plans: newCharges.installmentPlans as any,
          offers: newCharges.offers as any,
          advertising: newCharges.advertising,
          marketing: newCharges.marketing,
          software: newCharges.software,
          other_costs: newCharges.otherCosts,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setCharges(newCharges);
    } catch (error: any) {
      console.error('Error updating charges:', error);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  }, [user, toast]);

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
    loading,
    selectedMonth,
    setSelectedMonth,
    tunnels,
    filteredTunnels,
    charges,
    setCharges: updateCharges,
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
