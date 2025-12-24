export type TunnelType = 'webinar' | 'vsl' | 'challenge';

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
  collectedAmount: number;
}

export interface Charges {
  // Percentage-based charges
  associatePercent: number; // Default 15%, calculated AFTER all other charges
  closersPercent: number; // Default 17.5%
  agencyPercent: number; // Default 20%, only above 130k€ HT
  agencyThreshold: number; // 130000€
  paymentProcessorPercent: number; // Default 4%
  
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
