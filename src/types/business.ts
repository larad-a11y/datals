export type TunnelType = 'webinar' | 'vsl' | 'challenge';

export type PaymentMethod = 'cb' | 'virement' | 'klarna' | 'cb_klarna';

export type TrafficSource = 'ads' | 'organic';

export const trafficSourceLabels: Record<TrafficSource, string> = {
  ads: 'Publicité',
  organic: 'Organique',
};

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  verified: boolean;
  verifiedAt?: string;
}

export interface InstallmentPlan {
  id: string;
  numberOfPayments: number;
  markupPercent: number;
}

export interface OfferInstallment {
  numberOfPayments: number;
  markupPercent: number;
}

export interface Offer {
  id: string;
  name: string;
  basePrice: number;
  availableInstallments: OfferInstallment[]; // Array with custom markup per installment
}

export interface Closer {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Sale {
  id: string;
  tunnelId: string;
  tunnelName?: string;
  clientName?: string;
  closerId?: string; // Reference to a closer (optional - no closer = no commission)
  saleDate: string; // Date de la vente
  offerId?: string; // Reference to an offer
  paymentMethod: PaymentMethod;
  trafficSource: TrafficSource; // Source du trafic (ads ou organique)
  basePrice: number; // Prix de base (prix cash)
  totalPrice: number; // Prix final contracté (peut inclure majoration pour paiement échelonné)
  numberOfPayments: number; // 1 = full, 2 = 2x, 3 = 3x, etc.
  amountCollected: number;
  createdAt: string;
  paymentHistory: PaymentRecord[];
  nextPaymentDate?: string; // Date of next expected payment
  isDefaulted?: boolean; // Vente en impayé
  defaultedAt?: string; // Date de mise en impayé
  lastPaymentUpdate?: string; // Dernière mise à jour du paiement
  // Klarna mixed payment support
  klarnaAmount?: number; // Montant payé via Klarna (max klarnaMaxAmount)
  cbAmount?: number; // Montant payé via CB (le reste)
}

export interface PaymentNotification {
  id: string;
  saleId: string;
  tunnelId: string;
  clientName: string;
  amount: number;
  dueDate: string;
  type: 'upcoming' | 'due' | 'overdue';
  dismissed: boolean;
}

export interface ChallengeDay {
  day: number;
  attendees: number;
}

export interface Tunnel {
  id: string;
  name: string;
  type: TunnelType;
  date?: string;
  endDate?: string; // For challenges that span multiple days
  month: string;
  isActive: boolean;
  // Traffic & Sales data
  adBudget: number;
  callsGenerated: number;
  callsClosed: number;
  averagePrice: number;
  collectedAmount: number; // Kept for backward compatibility, will be calculated from sales
  sales: Sale[];
  // Traffic metrics by type
  registrations?: number; // Nombre d'inscrits (all types)
  attendees?: number; // Nombre de présents (webinar only)
  challengeDays?: ChallengeDay[]; // Présents par jour (challenge only)
  callsBooked?: number; // Calls réservés (VSL only)
}

export type CoachingExpenseType = 'group' | 'private';

export interface CoachingExpense {
  id: string;
  name: string;
  amount: number;
  month: string; // Format "YYYY-MM"
  type: CoachingExpenseType;
}

export interface Charges {
  // Percentage-based charges
  associatePercent: number; // Default 15%, calculated AFTER all other charges
  closersPercent: number; // Default 17.5%
  agencyPercent: number; // Default 20%, only above 130k€ HT
  agencyThreshold: number; // 130000€
  paymentProcessorPercent: number; // Default 4%
  taxPercent: number; // Default 20% (TVA)
  
  // Klarna fees
  klarnaPercent: number; // Default 8% (applied only to Klarna portion)
  klarnaMaxAmount: number; // Default 1500€ (max amount for Klarna)
  
  // Closers list
  closers: Closer[];
  
  // Installment plans with individual markups
  installmentPlans: InstallmentPlan[];
  
  // Offers catalog
  offers: Offer[];
  
  // Fixed charges
  advertising: number;
  marketing: number;
  software: number;
  otherCosts: number;
}

export interface Salary {
  id: string;
  name: string;
  monthlyAmount: number;
}

export interface MonthData {
  month: string;
  tunnels: Tunnel[];
  charges: Charges;
  salaries: Salary[];
}

export interface KPIData {
  contractedRevenue: number;
  collectedRevenue: number; // TTC
  collectedRevenueHT: number; // HT (après déduction TVA)
  tvaAmount: number; // Montant de la TVA
  roasCollected: number; // ROAS = CA Collecté HT / Budget Pub (multiplicateur)
  roasContracted: number; // ROAS = CA Contracté / Budget Pub (multiplicateur)
  costPerCall: number;
  closingRate: number;
  cac: number;
  cpl: number; // Coût par lead (inscrit)
  costPerWebinarAttendee: number; // Coût par présent webinaire
  netProfit: number;
  netNetProfit: number;
  totalCalls: number;
  totalClosedCalls: number;
  totalAdBudget: number;
  totalRegistrations: number;
  totalWebinarAttendees: number;
  paymentProcessorCost: number;
  klarnaCost: number; // Frais Klarna
  totalKlarnaAmount: number; // Total encaissé via Klarna
  closersCost: number;
  agencyCost: number;
  upcomingPaymentsThisMonth: number;
  upcomingPaymentsTotal: number;
  defaultedAmount: number; // Montant total en impayé
  // Organic stats
  organicSalesCount: number; // Nombre de ventes organiques
  organicCollectedAmount: number; // Montant encaissé en organique
}

export const defaultInstallmentPlans: InstallmentPlan[] = [
  { id: 'plan-1', numberOfPayments: 1, markupPercent: 0 },
  { id: 'plan-2', numberOfPayments: 2, markupPercent: 5 },
  { id: 'plan-3', numberOfPayments: 3, markupPercent: 10 },
  { id: 'plan-4', numberOfPayments: 4, markupPercent: 15 },
];

export const defaultCharges: Charges = {
  associatePercent: 15,
  closersPercent: 17.5,
  agencyPercent: 20,
  agencyThreshold: 130000,
  paymentProcessorPercent: 4,
  taxPercent: 20,
  klarnaPercent: 8,
  klarnaMaxAmount: 1500,
  closers: [],
  installmentPlans: defaultInstallmentPlans,
  offers: [],
  advertising: 0,
  marketing: 0,
  software: 0,
  otherCosts: 0,
};

export const coachingExpenseTypeLabels: Record<CoachingExpenseType, string> = {
  group: 'Coaching de groupe',
  private: 'Coaching privé',
};

export const tunnelTypeLabels: Record<TunnelType, string> = {
  webinar: 'Webinar',
  vsl: 'VSL',
  challenge: 'Challenge',
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cb: 'CB',
  virement: 'Virement',
  klarna: 'Klarna',
  cb_klarna: 'CB + Klarna',
};

// Helper to generate notifications from sales
// Notifications appear 1 day AFTER the payment date (for verification that payment was collected)
export function generatePaymentNotifications(sales: (Sale & { tunnelName?: string })[]): PaymentNotification[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const notifications: PaymentNotification[] = [];
  
  sales.forEach(sale => {
    if (!sale.nextPaymentDate) return;
    
    const remaining = sale.totalPrice - sale.amountCollected;
    if (remaining <= 0) return; // Fully paid
    
    const dueDate = new Date(sale.nextPaymentDate);
    dueDate.setHours(0, 0, 0, 0);
    
    // diffDays: negative = payment date is in the past
    const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Only show notification if payment date has passed (diffDays <= -1 means at least 1 day after)
    // This is for VERIFICATION that the automatic payment was collected
    if (diffDays <= -1) {
      const paymentAmount = sale.totalPrice / sale.numberOfPayments;
      const daysOverdue = Math.abs(diffDays);
      
      // Type based on how long since payment should have been verified
      let type: PaymentNotification['type'] = 'due'; // 1-3 days after = to verify
      if (daysOverdue > 3) type = 'overdue'; // More than 3 days = urgent verification needed
      
      notifications.push({
        id: `notif-${sale.id}-${sale.nextPaymentDate}`,
        saleId: sale.id,
        tunnelId: sale.tunnelId,
        clientName: sale.clientName || 'Client sans nom',
        amount: paymentAmount,
        dueDate: sale.nextPaymentDate,
        type,
        dismissed: false,
      });
    }
  });
  
  // Sort by date (oldest overdue first - most urgent)
  return notifications.sort((a, b) => {
    const typeOrder = { overdue: 0, due: 1, upcoming: 2 };
    if (typeOrder[a.type] !== typeOrder[b.type]) {
      return typeOrder[a.type] - typeOrder[b.type];
    }
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
}
