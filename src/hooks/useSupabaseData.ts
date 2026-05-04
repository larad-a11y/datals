import { useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Json } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Tunnel, 
  Charges, 
  Salary, 
  Sale, 
  CoachingExpense, 
  TunnelType, 
  PaymentMethod,
  PaymentRecord,
  RefundRecord,
  ChallengeDay,
  defaultCharges,
  Closer,
  Offer,
  InstallmentPlan,
  CloserTunnelStats,
} from '@/types/business';
import { toast } from 'sonner';

// Type for database row mapping
interface DbTunnel {
  id: string;
  user_id: string;
  name: string;
  type: string;
  month: string;
  date: string | null;
  end_date: string | null;
  is_active: boolean | null;
  ad_budget: number | null;
  calls_generated: number | null;
  calls_closed: number | null;
  average_price: number | null;
  collected_amount: number | null;
  registrations: number | null;
  registrations_ads: number | null;
  registrations_organic: number | null;
  attendees: number | null;
  challenge_days: unknown;
  calls_booked: number | null;
  closer_stats: unknown;
  created_at: string | null;
  updated_at: string | null;
}

interface DbSale {
  id: string;
  user_id: string;
  tunnel_id: string | null;
  client_name: string | null;
  client_email: string | null;
  closer_id: string | null;
  sale_date: string;
  offer_id: string | null;
  payment_method: string;
  base_price: number;
  total_price: number;
  number_of_payments: number | null;
  amount_collected: number | null;
  payment_history: unknown;
  next_payment_date: string | null;
  is_defaulted: boolean | null;
  defaulted_at: string | null;
  last_payment_update: string | null;
  klarna_amount: number | null;
  cb_amount: number | null;
  created_at: string | null;
  refunded_amount: number | null;
  refund_history: unknown;
  is_fully_refunded: boolean | null;
}

interface DbUserCharges {
  id: string;
  user_id: string;
  associate_percent: number | null;
  closers_percent: number | null;
  agency_percent: number | null;
  agency_threshold: number | null;
  payment_processor_percent: number | null;
  tax_percent: number | null;
  klarna_percent: number | null;
  klarna_max_amount: number | null;
  closers: unknown;
  installment_plans: unknown;
  offers: unknown;
  advertising: number | null;
  marketing: number | null;
  software: number | null;
  other_costs: number | null;
}

interface DbSalary {
  id: string;
  user_id: string;
  employee_name: string;
  gross_salary: number;
  employer_charges: number | null;
  total_cost: number;
}

interface DbCoachingExpense {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  month: string;
}

// Transform DB tunnel to app Tunnel
function dbTunnelToTunnel(dbTunnel: DbTunnel, sales: Sale[]): Tunnel {
  const registrationsAds = dbTunnel.registrations_ads || 0;
  const registrationsOrganic = dbTunnel.registrations_organic || 0;
  return {
    id: dbTunnel.id,
    name: dbTunnel.name,
    type: dbTunnel.type as TunnelType,
    date: dbTunnel.date || undefined,
    endDate: dbTunnel.end_date || undefined,
    month: dbTunnel.month,
    isActive: dbTunnel.is_active ?? true,
    adBudget: Number(dbTunnel.ad_budget) || 0,
    callsGenerated: dbTunnel.calls_generated || 0,
    callsClosed: dbTunnel.calls_closed || 0,
    averagePrice: Number(dbTunnel.average_price) || 0,
    collectedAmount: Number(dbTunnel.collected_amount) || 0,
    registrations: registrationsAds + registrationsOrganic,
    registrationsAds: registrationsAds || undefined,
    registrationsOrganic: registrationsOrganic || undefined,
    attendees: dbTunnel.attendees || undefined,
    challengeDays: (dbTunnel.challenge_days as ChallengeDay[]) || undefined,
    callsBooked: dbTunnel.calls_booked || undefined,
    closerStats: (dbTunnel.closer_stats as CloserTunnelStats[]) || undefined,
    sales,
  };
}

// Transform DB sale to app Sale
function dbSaleToSale(dbSale: DbSale): Sale {
  return {
    id: dbSale.id,
    tunnelId: dbSale.tunnel_id || '',
    clientName: dbSale.client_name || undefined,
    clientEmail: (dbSale as any).client_email || undefined,
    closerId: dbSale.closer_id || undefined,
    saleDate: dbSale.sale_date,
    offerId: dbSale.offer_id || undefined,
    paymentMethod: dbSale.payment_method as PaymentMethod,
    trafficSource: ((dbSale as any).traffic_source as 'ads' | 'organic') || 'ads',
    basePrice: Number(dbSale.base_price),
    totalPrice: Number(dbSale.total_price),
    numberOfPayments: dbSale.number_of_payments || 1,
    amountCollected: Number(dbSale.amount_collected) || 0,
    createdAt: dbSale.created_at || new Date().toISOString(),
    paymentHistory: (dbSale.payment_history as PaymentRecord[]) || [],
    nextPaymentDate: dbSale.next_payment_date || undefined,
    isDefaulted: dbSale.is_defaulted || false,
    defaultedAt: dbSale.defaulted_at || undefined,
    lastPaymentUpdate: dbSale.last_payment_update || undefined,
    klarnaAmount: dbSale.klarna_amount ? Number(dbSale.klarna_amount) : undefined,
    cbAmount: dbSale.cb_amount ? Number(dbSale.cb_amount) : undefined,
    refundedAmount: Number(dbSale.refunded_amount) || 0,
    refundHistory: (dbSale.refund_history as RefundRecord[]) || [],
    isFullyRefunded: dbSale.is_fully_refunded || false,
  };
}

// Transform DB installment plan to handle legacy format
interface LegacyInstallmentPlan {
  id: string;
  name?: string;
  payments?: number; // Legacy field
  numberOfPayments?: number; // Current field
  markupPercent: number;
}

function transformInstallmentPlans(dbPlans: unknown): InstallmentPlan[] {
  if (!Array.isArray(dbPlans)) return [];
  
  return (dbPlans as LegacyInstallmentPlan[])
    .map(plan => ({
      id: plan.id,
      // Handle both legacy 'payments' and current 'numberOfPayments'
      numberOfPayments: plan.numberOfPayments ?? plan.payments ?? 0,
      markupPercent: plan.markupPercent ?? 0,
    }))
    // Filter out invalid plans (numberOfPayments must be > 0)
    .filter(plan => plan.numberOfPayments > 0);
}

// Transform DB charges to app Charges
function dbChargesToCharges(dbCharges: DbUserCharges | null): Charges {
  if (!dbCharges) return defaultCharges;
  
  const installmentPlans = transformInstallmentPlans(dbCharges.installment_plans);
  
  return {
    associatePercent: Number(dbCharges.associate_percent) ?? 15,
    closersPercent: Number(dbCharges.closers_percent) ?? 17.5,
    agencyPercent: Number(dbCharges.agency_percent) ?? 20,
    agencyThreshold: Number(dbCharges.agency_threshold) ?? 130000,
    paymentProcessorPercent: Number(dbCharges.payment_processor_percent) ?? 4,
    taxPercent: Number(dbCharges.tax_percent) ?? 20,
    klarnaPercent: Number(dbCharges.klarna_percent) ?? 8,
    klarnaMaxAmount: Number(dbCharges.klarna_max_amount) ?? 1500,
    closers: (dbCharges.closers as Closer[]) || [],
    installmentPlans: installmentPlans.length > 0 ? installmentPlans : defaultCharges.installmentPlans,
    offers: (dbCharges.offers as Offer[]) || [],
    advertising: Number(dbCharges.advertising) || 0,
    marketing: Number(dbCharges.marketing) || 0,
    software: Number(dbCharges.software) || 0,
    otherCosts: Number(dbCharges.other_costs) || 0,
  };
}

// Transform DB salary to app Salary
function dbSalaryToSalary(dbSalary: DbSalary): Salary {
  return {
    id: dbSalary.id,
    name: dbSalary.employee_name,
    monthlyAmount: Number(dbSalary.total_cost),
  };
}

// Transform DB coaching expense to app CoachingExpense
function dbCoachingToCoaching(dbExpense: DbCoachingExpense): CoachingExpense {
  return {
    id: dbExpense.id,
    name: dbExpense.name,
    amount: Number(dbExpense.amount),
    month: dbExpense.month,
    type: 'group', // Default, adjust if needed
  };
}

export function useSupabaseData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ========== QUERIES ==========

  // Fetch tunnels
  const { data: dbTunnels, isLoading: tunnelsLoading, error: tunnelsError } = useQuery({
    queryKey: ['tunnels', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tunnels')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DbTunnel[];
    },
    enabled: !!user,
  });

  // Fetch sales
  const { data: dbSales, isLoading: salesLoading, error: salesError } = useQuery({
    queryKey: ['sales', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('user_id', user!.id)
        .order('sale_date', { ascending: false });
      if (error) throw error;
      return data as DbSale[];
    },
    enabled: !!user,
  });

  // Fetch user charges
  const { data: dbCharges, isLoading: chargesLoading, error: chargesError } = useQuery({
    queryKey: ['user_charges', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_charges')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as DbUserCharges | null;
    },
    enabled: !!user,
  });

  // Fetch salaries
  const { data: dbSalaries, isLoading: salariesLoading, error: salariesError } = useQuery({
    queryKey: ['salaries', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salaries')
        .select('*')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data as DbSalary[];
    },
    enabled: !!user,
  });

  // Fetch coaching expenses
  const { data: dbCoachingExpenses, isLoading: coachingLoading, error: coachingError } = useQuery({
    queryKey: ['coaching_expenses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaching_expenses')
        .select('*')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data as DbCoachingExpense[];
    },
    enabled: !!user,
  });

  // ========== TRANSFORMED DATA ==========

  // Transform sales
  const sales = useMemo(() => {
    if (!dbSales) return [];
    return dbSales.map(dbSaleToSale);
  }, [dbSales]);

  // Transform tunnels with their sales
  const tunnels = useMemo(() => {
    if (!dbTunnels) return [];
    return dbTunnels.map(dbTunnel => {
      const tunnelSales = sales.filter(s => s.tunnelId === dbTunnel.id);
      return dbTunnelToTunnel(dbTunnel, tunnelSales);
    });
  }, [dbTunnels, sales]);

  // Transform charges
  const charges = useMemo(() => dbChargesToCharges(dbCharges), [dbCharges]);

  // Transform salaries
  const salaries = useMemo(() => {
    if (!dbSalaries) return [];
    return dbSalaries.map(dbSalaryToSalary);
  }, [dbSalaries]);

  // Transform coaching expenses
  const coachingExpenses = useMemo(() => {
    if (!dbCoachingExpenses) return [];
    return dbCoachingExpenses.map(dbCoachingToCoaching);
  }, [dbCoachingExpenses]);

  // ========== MUTATIONS ==========

  // Add tunnel
  const addTunnelMutation = useMutation({
    mutationFn: async (tunnel: Omit<Tunnel, 'id' | 'sales'>) => {
      const insertData = {
        user_id: user!.id,
        name: tunnel.name,
        type: tunnel.type,
        month: tunnel.month,
        date: tunnel.date || null,
        end_date: tunnel.endDate || null,
        is_active: tunnel.isActive,
        ad_budget: tunnel.adBudget,
        calls_generated: tunnel.callsGenerated,
        calls_closed: tunnel.callsClosed,
        average_price: tunnel.averagePrice,
        collected_amount: tunnel.collectedAmount,
        registrations: tunnel.registrations || null,
        registrations_ads: tunnel.registrationsAds || null,
        registrations_organic: tunnel.registrationsOrganic || null,
        attendees: tunnel.attendees || null,
        challenge_days: (tunnel.challengeDays || []) as unknown as Json,
        calls_booked: tunnel.callsBooked || null,
        closer_stats: (tunnel.closerStats || []) as unknown as Json,
      };
      
      const { data, error } = await supabase
        .from('tunnels')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tunnels'] });
      toast.success('Tunnel créé avec succès');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la création du tunnel: ${error.message}`);
    },
  });

  // Update tunnel
  const updateTunnelMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Tunnel> }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.month !== undefined) dbUpdates.month = updates.month;
      if (updates.date !== undefined) dbUpdates.date = updates.date || null;
      if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate || null;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.adBudget !== undefined) dbUpdates.ad_budget = updates.adBudget;
      if (updates.callsGenerated !== undefined) dbUpdates.calls_generated = updates.callsGenerated;
      if (updates.callsClosed !== undefined) dbUpdates.calls_closed = updates.callsClosed;
      if (updates.averagePrice !== undefined) dbUpdates.average_price = updates.averagePrice;
      if (updates.collectedAmount !== undefined) dbUpdates.collected_amount = updates.collectedAmount;
      if (updates.registrations !== undefined) dbUpdates.registrations = updates.registrations;
      if (updates.registrationsAds !== undefined) dbUpdates.registrations_ads = updates.registrationsAds;
      if (updates.registrationsOrganic !== undefined) dbUpdates.registrations_organic = updates.registrationsOrganic;
      if (updates.attendees !== undefined) dbUpdates.attendees = updates.attendees;
      if (updates.challengeDays !== undefined) dbUpdates.challenge_days = updates.challengeDays;
      if (updates.callsBooked !== undefined) dbUpdates.calls_booked = updates.callsBooked;
      if (updates.closerStats !== undefined) dbUpdates.closer_stats = updates.closerStats;

      const { error } = await supabase
        .from('tunnels')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tunnels'] });
    },
    onError: (error) => {
      toast.error(`Erreur lors de la mise à jour du tunnel: ${error.message}`);
    },
  });

  // Delete tunnel
  const deleteTunnelMutation = useMutation({
    mutationFn: async (id: string) => {
      // First delete all sales for this tunnel
      const { error: salesError } = await supabase
        .from('sales')
        .delete()
        .eq('tunnel_id', id)
        .eq('user_id', user!.id);
      if (salesError) throw salesError;

      const { error } = await supabase
        .from('tunnels')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tunnels'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Tunnel supprimé avec succès');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la suppression du tunnel: ${error.message}`);
    },
  });

  // Add sale
  const addSaleMutation = useMutation({
    mutationFn: async ({ tunnelId, sale }: { tunnelId: string; sale: Omit<Sale, 'id' | 'createdAt'> }) => {
      const insertData = {
        user_id: user!.id,
        tunnel_id: tunnelId,
        client_name: sale.clientName || null,
        client_email: sale.clientEmail || null,
        closer_id: sale.closerId || null,
        sale_date: sale.saleDate,
        offer_id: sale.offerId || null,
        payment_method: sale.paymentMethod,
        traffic_source: sale.trafficSource || 'ads',
        base_price: sale.basePrice,
        total_price: sale.totalPrice,
        number_of_payments: sale.numberOfPayments,
        amount_collected: sale.amountCollected,
        payment_history: (sale.paymentHistory || []) as unknown as Json,
        next_payment_date: sale.nextPaymentDate || null,
        is_defaulted: sale.isDefaulted || false,
        defaulted_at: sale.defaultedAt || null,
        klarna_amount: sale.klarnaAmount || null,
        cb_amount: sale.cbAmount || null,
      };
      
      const { data, error } = await supabase
        .from('sales')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Vente créée avec succès');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la création de la vente: ${error.message}`);
    },
  });

  // Update sale
  const updateSaleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Sale> }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.clientName !== undefined) dbUpdates.client_name = updates.clientName || null;
      if (updates.closerId !== undefined) dbUpdates.closer_id = updates.closerId || null;
      if (updates.saleDate !== undefined) dbUpdates.sale_date = updates.saleDate;
      if (updates.offerId !== undefined) dbUpdates.offer_id = updates.offerId || null;
      if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
      if (updates.trafficSource !== undefined) dbUpdates.traffic_source = updates.trafficSource;
      if (updates.basePrice !== undefined) dbUpdates.base_price = updates.basePrice;
      if (updates.totalPrice !== undefined) dbUpdates.total_price = updates.totalPrice;
      if (updates.numberOfPayments !== undefined) dbUpdates.number_of_payments = updates.numberOfPayments;
      if (updates.amountCollected !== undefined) dbUpdates.amount_collected = updates.amountCollected;
      if (updates.paymentHistory !== undefined) dbUpdates.payment_history = updates.paymentHistory;
      if (updates.nextPaymentDate !== undefined) dbUpdates.next_payment_date = updates.nextPaymentDate || null;
      if (updates.isDefaulted !== undefined) dbUpdates.is_defaulted = updates.isDefaulted;
      if (updates.defaultedAt !== undefined) dbUpdates.defaulted_at = updates.defaultedAt || null;
      if (updates.klarnaAmount !== undefined) dbUpdates.klarna_amount = updates.klarnaAmount || null;
      if (updates.cbAmount !== undefined) dbUpdates.cb_amount = updates.cbAmount || null;
      if (updates.refundedAmount !== undefined) dbUpdates.refunded_amount = updates.refundedAmount;
      if (updates.refundHistory !== undefined) dbUpdates.refund_history = updates.refundHistory;
      if (updates.isFullyRefunded !== undefined) dbUpdates.is_fully_refunded = updates.isFullyRefunded;

      const { error } = await supabase
        .from('sales')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
    onError: (error) => {
      toast.error(`Erreur lors de la mise à jour de la vente: ${error.message}`);
    },
  });

  // Delete sale
  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Vente supprimée avec succès');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la suppression de la vente: ${error.message}`);
    },
  });

  // Update charges
  const updateChargesMutation = useMutation({
    mutationFn: async (newCharges: Partial<Charges>) => {
      const dbUpdates: Record<string, unknown> = {};
      if (newCharges.associatePercent !== undefined) dbUpdates.associate_percent = newCharges.associatePercent;
      if (newCharges.closersPercent !== undefined) dbUpdates.closers_percent = newCharges.closersPercent;
      if (newCharges.agencyPercent !== undefined) dbUpdates.agency_percent = newCharges.agencyPercent;
      if (newCharges.agencyThreshold !== undefined) dbUpdates.agency_threshold = newCharges.agencyThreshold;
      if (newCharges.paymentProcessorPercent !== undefined) dbUpdates.payment_processor_percent = newCharges.paymentProcessorPercent;
      if (newCharges.taxPercent !== undefined) dbUpdates.tax_percent = newCharges.taxPercent;
      if (newCharges.klarnaPercent !== undefined) dbUpdates.klarna_percent = newCharges.klarnaPercent;
      if (newCharges.klarnaMaxAmount !== undefined) dbUpdates.klarna_max_amount = newCharges.klarnaMaxAmount;
      if (newCharges.closers !== undefined) dbUpdates.closers = newCharges.closers;
      if (newCharges.installmentPlans !== undefined) dbUpdates.installment_plans = newCharges.installmentPlans;
      if (newCharges.offers !== undefined) dbUpdates.offers = newCharges.offers;
      if (newCharges.advertising !== undefined) dbUpdates.advertising = newCharges.advertising;
      if (newCharges.marketing !== undefined) dbUpdates.marketing = newCharges.marketing;
      if (newCharges.software !== undefined) dbUpdates.software = newCharges.software;
      if (newCharges.otherCosts !== undefined) dbUpdates.other_costs = newCharges.otherCosts;

      const { error } = await supabase
        .from('user_charges')
        .update(dbUpdates)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_charges'] });
    },
    onError: (error) => {
      toast.error(`Erreur lors de la mise à jour des charges: ${error.message}`);
    },
  });

  // Add salary
  const addSalaryMutation = useMutation({
    mutationFn: async (salary: Omit<Salary, 'id'>) => {
      const { data, error } = await supabase
        .from('salaries')
        .insert({
          user_id: user!.id,
          employee_name: salary.name,
          gross_salary: salary.monthlyAmount,
          employer_charges: 0,
          total_cost: salary.monthlyAmount,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
      toast.success('Salaire ajouté avec succès');
    },
    onError: (error) => {
      toast.error(`Erreur lors de l'ajout du salaire: ${error.message}`);
    },
  });

  // Update salary
  const updateSalaryMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Salary> }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.employee_name = updates.name;
      if (updates.monthlyAmount !== undefined) {
        dbUpdates.gross_salary = updates.monthlyAmount;
        dbUpdates.total_cost = updates.monthlyAmount;
      }

      const { error } = await supabase
        .from('salaries')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
    },
    onError: (error) => {
      toast.error(`Erreur lors de la mise à jour du salaire: ${error.message}`);
    },
  });

  // Delete salary
  const deleteSalaryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('salaries')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salaries'] });
      toast.success('Salaire supprimé avec succès');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la suppression du salaire: ${error.message}`);
    },
  });

  // Add coaching expense
  const addCoachingExpenseMutation = useMutation({
    mutationFn: async (expense: Omit<CoachingExpense, 'id'>) => {
      const { data, error } = await supabase
        .from('coaching_expenses')
        .insert({
          user_id: user!.id,
          name: expense.name,
          amount: expense.amount,
          month: expense.month,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaching_expenses'] });
      toast.success('Dépense de coaching ajoutée avec succès');
    },
    onError: (error) => {
      toast.error(`Erreur lors de l'ajout de la dépense: ${error.message}`);
    },
  });

  // Update coaching expense
  const updateCoachingExpenseMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CoachingExpense> }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.month !== undefined) dbUpdates.month = updates.month;

      const { error } = await supabase
        .from('coaching_expenses')
        .update(dbUpdates)
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaching_expenses'] });
    },
    onError: (error) => {
      toast.error(`Erreur lors de la mise à jour de la dépense: ${error.message}`);
    },
  });

  // Delete coaching expense
  const deleteCoachingExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('coaching_expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coaching_expenses'] });
      toast.success('Dépense de coaching supprimée avec succès');
    },
    onError: (error) => {
      toast.error(`Erreur lors de la suppression de la dépense: ${error.message}`);
    },
  });

  // ========== BACKUP SYSTEM ==========

  const createBackupMutation = useMutation({
    mutationFn: async (month: string) => {
      const backupData = {
        user_id: user!.id,
        month,
        backup_type: 'auto',
        tunnels_snapshot: (dbTunnels || []) as unknown as Json,
        sales_snapshot: (dbSales || []) as unknown as Json,
        charges_snapshot: (dbCharges || {}) as unknown as Json,
        salaries_snapshot: (dbSalaries || []) as unknown as Json,
        coaching_expenses_snapshot: (dbCoachingExpenses || []) as unknown as Json,
      };
      
      const { error } = await supabase
        .from('data_backups')
        .insert(backupData);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Sauvegarde créée avec succès');
    },
    onError: (error) => {
      console.error('Backup error:', error);
    },
  });

  // Auto-backup on first load of each month
  useEffect(() => {
    if (!user || tunnelsLoading || salesLoading) return;

    const checkAndBackup = async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Check if backup exists for this month
      const { data: existing } = await supabase
        .from('data_backups')
        .select('id')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .maybeSingle();

      if (!existing && (dbTunnels?.length || dbSales?.length)) {
        createBackupMutation.mutate(currentMonth);
      }
    };

    checkAndBackup();
  }, [user, tunnelsLoading, salesLoading, dbTunnels?.length, dbSales?.length]);

  // Manual backup function
  const createManualBackup = useCallback(() => {
    if (!user) return;
    const currentMonth = new Date().toISOString().slice(0, 7);
    createBackupMutation.mutate(currentMonth);
  }, [user, createBackupMutation]);

  // ========== WRAPPER FUNCTIONS ==========

  const addTunnel = useCallback((tunnel: Omit<Tunnel, 'id'>) => {
    addTunnelMutation.mutate(tunnel);
  }, [addTunnelMutation]);

  const updateTunnel = useCallback((id: string, updates: Partial<Tunnel>) => {
    updateTunnelMutation.mutate({ id, updates });
  }, [updateTunnelMutation]);

  const deleteTunnel = useCallback((id: string) => {
    deleteTunnelMutation.mutate(id);
  }, [deleteTunnelMutation]);

  const addSale = useCallback((tunnelId: string, sale: Omit<Sale, 'id' | 'createdAt'>) => {
    addSaleMutation.mutate({ tunnelId, sale: { ...sale, tunnelId } });
  }, [addSaleMutation]);

  const updateSale = useCallback((id: string, updates: Partial<Sale>) => {
    updateSaleMutation.mutate({ id, updates });
  }, [updateSaleMutation]);

  const deleteSale = useCallback((id: string) => {
    deleteSaleMutation.mutate(id);
  }, [deleteSaleMutation]);

  const setCharges = useCallback((newCharges: Charges | ((prev: Charges) => Charges)) => {
    if (typeof newCharges === 'function') {
      const updated = newCharges(charges);
      updateChargesMutation.mutate(updated);
    } else {
      updateChargesMutation.mutate(newCharges);
    }
  }, [charges, updateChargesMutation]);

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
    addCoachingExpenseMutation.mutate(expense);
  }, [addCoachingExpenseMutation]);

  const updateCoachingExpense = useCallback((id: string, updates: Partial<CoachingExpense>) => {
    updateCoachingExpenseMutation.mutate({ id, updates });
  }, [updateCoachingExpenseMutation]);

  const deleteCoachingExpense = useCallback((id: string) => {
    deleteCoachingExpenseMutation.mutate(id);
  }, [deleteCoachingExpenseMutation]);

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

  // ========== LOADING AND ERROR STATES ==========

  const isLoading = tunnelsLoading || salesLoading || chargesLoading || salariesLoading || coachingLoading;
  
  const hasError = tunnelsError || salesError || chargesError || salariesError || coachingError;
  const errorMessage = hasError 
    ? [tunnelsError, salesError, chargesError, salariesError, coachingError]
        .filter(Boolean)
        .map(e => (e as Error).message)
        .join(', ')
    : null;

  return {
    // Data
    tunnels,
    charges,
    salaries,
    coachingExpenses,
    
    // Loading/Error states
    isLoading,
    hasError,
    errorMessage,
    
    // Tunnel operations
    addTunnel,
    updateTunnel,
    deleteTunnel,
    
    // Sale operations
    addSale,
    updateSale,
    deleteSale,
    
    // Charges
    setCharges,
    
    // Salary operations
    addSalary,
    updateSalary,
    deleteSalary,
    
    // Coaching expense operations
    addCoachingExpense,
    updateCoachingExpense,
    deleteCoachingExpense,
    
    // Utils
    getAllSales,
    
    // Backup
    createManualBackup,
  };
}
