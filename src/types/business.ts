export type TunnelType = 'webinar' | 'vsl' | 'challenge';

export interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  verified: boolean;
  verifiedAt?: string;
}

export interface Sale {
  id: string;
  tunnelId: string;
  tunnelName?: string;
  clientName?: string;
  basePrice: number; // Prix de base (prix cash)
  totalPrice: number; // Prix final contracté (peut inclure majoration pour paiement échelonné)
  numberOfPayments: number; // 1 = full, 2 = 2x, 3 = 3x, etc.
  amountCollected: number;
  createdAt: string;
  paymentHistory: PaymentRecord[];
  nextPaymentDate?: string; // Date of next expected payment
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
}

export interface Charges {
  // Percentage-based charges
  associatePercent: number; // Default 15%, calculated AFTER all other charges
  closersPercent: number; // Default 17.5%
  agencyPercent: number; // Default 20%, only above 130k€ HT
  agencyThreshold: number; // 130000€
  paymentProcessorPercent: number; // Default 4%
  installmentMarkupPercent: number; // Default 5%, markup for installment payments
  
  // Fixed charges
  advertising: number;
  marketing: number;
  software: number;
  coaching: number;
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
  collectedRevenue: number;
  adROI: number;
  costPerCall: number;
  closingRate: number;
  cac: number;
  netProfit: number;
  netNetProfit: number;
  totalCalls: number;
  totalClosedCalls: number;
  totalAdBudget: number;
}

export const defaultCharges: Charges = {
  associatePercent: 15,
  closersPercent: 17.5,
  agencyPercent: 20,
  agencyThreshold: 130000,
  paymentProcessorPercent: 4,
  installmentMarkupPercent: 5,
  advertising: 0,
  marketing: 0,
  software: 0,
  coaching: 0,
  otherCosts: 0,
};

export const tunnelTypeLabels: Record<TunnelType, string> = {
  webinar: 'Webinar',
  vsl: 'VSL',
  challenge: 'Challenge',
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