import { 
  TrendingUp, 
  PhoneCall, 
  Target, 
  Users, 
  DollarSign,
  Wallet,
  Diamond,
  Receipt,
  FileText,
  MousePointerClick,
  Eye
} from 'lucide-react';
import { Tunnel, Charges, Salary, CoachingExpense } from '@/types/business';

interface TunnelCardProps {
  tunnel: Tunnel;
  charges: Charges;
  salaries: Salary[];
  coachingExpenses: CoachingExpense[];
}

export function TunnelCard({ tunnel, charges, salaries, coachingExpenses }: TunnelCardProps) {
  // Calculate all metrics for this tunnel
  const contractedRevenue = tunnel.sales.reduce((sum, s) => sum + s.totalPrice, 0);
  const collectedRevenueTTC = tunnel.sales.reduce((sum, s) => sum + s.amountCollected, 0) || tunnel.collectedAmount;
  
  // Calculate HT
  const taxRate = charges.taxPercent / 100;
  const tvaAmount = collectedRevenueTTC * taxRate / (1 + taxRate);
  const collectedRevenueHT = collectedRevenueTTC - tvaAmount;
  
  // Payment processor cost (on TTC)
  const paymentProcessorCost = collectedRevenueTTC * (charges.paymentProcessorPercent / 100);
  
  // Closers (only for sales with closer assigned)
  const salesWithCloserTTC = tunnel.sales
    .filter(sale => sale.closerId)
    .reduce((s, sale) => s + sale.amountCollected, 0);
  const salesWithCloserHT = salesWithCloserTTC * (1 / (1 + taxRate));
  const closersCost = salesWithCloserHT * (charges.closersPercent / 100);
  
  // ROI calculation
  const roi = tunnel.adBudget > 0 
    ? ((collectedRevenueHT - tunnel.adBudget) / tunnel.adBudget) * 100 
    : 0;
  
  // Cost per call
  const costPerCall = tunnel.callsGenerated > 0 
    ? tunnel.adBudget / tunnel.callsGenerated 
    : 0;
  
  // Use actual sales count for closing rate
  const actualSalesCount = tunnel.sales.length;
  const closingRate = tunnel.callsGenerated > 0 
    ? (actualSalesCount / tunnel.callsGenerated) * 100 
    : 0;
  
  // CAC (use actual sales count)
  const cac = actualSalesCount > 0 
    ? tunnel.adBudget / actualSalesCount 
    : 0;
  
  // CPL (Cost per Lead/Registration)
  const cpl = tunnel.registrations && tunnel.registrations > 0 
    ? tunnel.adBudget / tunnel.registrations 
    : 0;
  
  // Coût par présent (webinar/challenge)
  let costPerAttendee = 0;
  if (tunnel.type === 'webinar' && tunnel.attendees && tunnel.attendees > 0) {
    costPerAttendee = tunnel.adBudget / tunnel.attendees;
  } else if (tunnel.type === 'challenge' && tunnel.challengeDays && tunnel.challengeDays.length > 0) {
    const avgAttendees = tunnel.challengeDays.reduce((sum, d) => sum + d.attendees, 0) / tunnel.challengeDays.length;
    if (avgAttendees > 0) {
      costPerAttendee = tunnel.adBudget / avgAttendees;
    }
  }
  
  // Net Profit for this tunnel (simplified - without fixed charges distributed)
  const netProfit = collectedRevenueHT 
    - paymentProcessorCost 
    - closersCost 
    - tunnel.adBudget;
  
  // Net Net Profit (after associate cut)
  const associateCost = netProfit > 0 ? netProfit * (charges.associatePercent / 100) : 0;
  const netNetProfit = netProfit - associateCost;
  
  const trend = roi > 100 ? 'profitable' : roi > 50 ? 'warning' : 'danger';
  
  const formattedDate = tunnel.date ? new Date(tunnel.date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) : '';
  
  // Type-specific metrics
  const showUpRate = tunnel.type === 'webinar' && tunnel.registrations && tunnel.attendees
    ? ((tunnel.attendees / tunnel.registrations) * 100).toFixed(1)
    : null;
  
  const bookingRate = tunnel.type === 'vsl' && tunnel.registrations && tunnel.callsBooked
    ? ((tunnel.callsBooked / tunnel.registrations) * 100).toFixed(1)
    : null;

  return (
    <div className="rounded-xl border border-border/50 bg-secondary/20 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`badge-${trend}`}>
            {tunnel.type.toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-foreground">{tunnel.name}</p>
            <p className="text-sm text-muted-foreground">{formattedDate}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`font-display text-xl font-bold text-${trend}`}>
            {roi.toFixed(1)}% ROI
          </p>
        </div>
      </div>
      
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
        {/* Revenus */}
        <MetricItem 
          icon={Receipt} 
          label="CA Collecté HT" 
          value={`${collectedRevenueHT.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`}
        />
        <MetricItem 
          icon={FileText} 
          label="CA Contracté" 
          value={`${contractedRevenue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`}
        />
        <MetricItem 
          icon={Wallet} 
          label="Bénéfice Net" 
          value={`${netProfit.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`}
          valueColor={netProfit > 0 ? 'text-profitable' : 'text-danger'}
        />
        <MetricItem 
          icon={Diamond} 
          label="Bénéfice Net Net" 
          value={`${netNetProfit.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`}
          valueColor={netNetProfit > 0 ? 'text-profitable' : 'text-danger'}
        />
      </div>
      
      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-border/30">
        <MetricItem 
          icon={DollarSign} 
          label="Pub dépensée" 
          value={`${tunnel.adBudget.toLocaleString('fr-FR')} €`}
          small
        />
        <MetricItem 
          icon={Target} 
          label="Ventes" 
          value={actualSalesCount.toString()}
          small
        />
        <MetricItem 
          icon={TrendingUp} 
          label="ROI Pub" 
          value={`${roi.toFixed(1)}%`}
          valueColor={roi > 100 ? 'text-profitable' : roi > 50 ? 'text-warning' : 'text-danger'}
          small
        />
        <MetricItem 
          icon={PhoneCall} 
          label="Coût/Call" 
          value={costPerCall > 0 ? `${costPerCall.toFixed(0)} €` : '-'}
          small
        />
        <MetricItem 
          icon={Target} 
          label="Taux Closing" 
          value={`${closingRate.toFixed(1)}%`}
          valueColor={closingRate >= 30 ? 'text-profitable' : closingRate >= 15 ? 'text-warning' : 'text-danger'}
          small
        />
        <MetricItem 
          icon={Users} 
          label="CAC" 
          value={cac > 0 ? `${cac.toFixed(0)} €` : '-'}
          small
        />
      </div>
      
      {/* Acquisition Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border/30 mt-4">
        <MetricItem 
          icon={MousePointerClick} 
          label="CPL (Coût/Lead)" 
          value={cpl > 0 ? `${cpl.toFixed(2)} €` : '-'}
          small
        />
        {tunnel.type === 'webinar' && (
          <>
            <MetricItem 
              icon={Eye} 
              label="Coût/Présent" 
              value={costPerAttendee > 0 ? `${costPerAttendee.toFixed(2)} €` : '-'}
              small
            />
            <MetricItem 
              icon={Users} 
              label="Inscrits / Présents" 
              value={`${tunnel.registrations || 0} / ${tunnel.attendees || 0}`}
              small
            />
            <MetricItem 
              icon={TrendingUp} 
              label="Show-up Rate" 
              value={showUpRate ? `${showUpRate}%` : '0%'}
              valueColor="text-primary"
              small
            />
          </>
        )}
        {tunnel.type === 'vsl' && (
          <>
            <MetricItem 
              icon={Users} 
              label="Inscrits / Calls" 
              value={`${tunnel.registrations || 0} / ${tunnel.callsBooked || 0}`}
              small
            />
            <MetricItem 
              icon={TrendingUp} 
              label="Taux Booking" 
              value={bookingRate ? `${bookingRate}%` : '0%'}
              valueColor="text-primary"
              small
            />
          </>
        )}
        {tunnel.type === 'challenge' && (
          <>
            <MetricItem 
              icon={Eye} 
              label="Coût/Présent Moy" 
              value={costPerAttendee > 0 ? `${costPerAttendee.toFixed(2)} €` : '-'}
              small
            />
            <MetricItem 
              icon={Users} 
              label="Inscrits" 
              value={(tunnel.registrations || 0).toString()}
              subtitle={tunnel.challengeDays ? `${tunnel.challengeDays.length} jours` : undefined}
              small
            />
            <MetricItem 
              icon={TrendingUp} 
              label="Show-up Moyen" 
              value={tunnel.challengeDays && tunnel.challengeDays.length > 0 && tunnel.registrations
                ? `${((tunnel.challengeDays.reduce((sum, d) => sum + d.attendees, 0) / tunnel.challengeDays.length / tunnel.registrations) * 100).toFixed(1)}%`
                : '0%'
              }
              valueColor="text-primary"
              small
            />
          </>
        )}
      </div>
    </div>
  );
}

interface MetricItemProps {
  icon: React.ElementType;
  label: string;
  value: string;
  valueColor?: string;
  subtitle?: string;
  small?: boolean;
}

function MetricItem({ icon: Icon, label, value, valueColor = 'text-foreground', subtitle, small = false }: MetricItemProps) {
  return (
    <div className={`flex items-start gap-2 ${small ? 'p-2 bg-background/50 rounded-lg' : 'p-3 bg-background/30 rounded-lg'}`}>
      <Icon className={`${small ? 'h-3.5 w-3.5' : 'h-4 w-4'} text-muted-foreground mt-0.5 flex-shrink-0`} />
      <div className="min-w-0">
        <p className={`${small ? 'text-[10px]' : 'text-xs'} text-muted-foreground truncate`}>{label}</p>
        <p className={`font-display ${small ? 'text-sm' : 'text-base'} font-semibold ${valueColor} truncate`}>
          {value}
        </p>
        {subtitle && (
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
