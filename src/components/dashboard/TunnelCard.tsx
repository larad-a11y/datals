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
  
  // ROAS Collecté (multiplicateur)
  const roasCollected = tunnel.adBudget > 0 
    ? collectedRevenueHT / tunnel.adBudget 
    : 0;
  
  // ROAS Contracté (multiplicateur)
  const roasContracted = tunnel.adBudget > 0 
    ? contractedRevenue / tunnel.adBudget 
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
  
  const trend = roasCollected >= 3 ? 'profitable' : roasCollected >= 2 ? 'warning' : 'danger';
  
  // Format date range for challenges, single date for others
  const formatDateDisplay = () => {
    if (!tunnel.date) return '';
    
    const startDate = new Date(tunnel.date);
    const formattedStart = startDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    });
    
    if (tunnel.type === 'challenge' && tunnel.endDate) {
      const endDate = new Date(tunnel.endDate);
      const formattedEnd = endDate.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short'
      });
      return `${formattedStart} → ${formattedEnd}`;
    }
    
    // Add year for non-challenge tunnels
    return startDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  
  const formattedDate = formatDateDisplay();
  
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
      <div className="flex items-center justify-between mb-5">
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
          <p className={`font-display text-lg font-bold text-${trend}`}>
            {roasCollected.toFixed(2)}x <span className="text-xs font-normal text-muted-foreground">collecté</span>
          </p>
          <p className={`font-display text-sm font-semibold ${roasContracted >= 3 ? 'text-profitable' : roasContracted >= 2 ? 'text-warning' : 'text-danger'}`}>
            {roasContracted.toFixed(2)}x <span className="text-xs font-normal text-muted-foreground">contracté</span>
          </p>
        </div>
      </div>
      
      {/* Section 1: Revenus & Profits */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">💰 Revenus & Profits</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <MetricCard 
            label="CA Collecté HT" 
            value={`${collectedRevenueHT.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`}
          />
          <MetricCard 
            label="CA Contracté" 
            value={`${contractedRevenue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`}
          />
          <MetricCard 
            label="Bénéfice Net" 
            value={`${netProfit.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`}
            valueColor={netProfit > 0 ? 'text-profitable' : 'text-danger'}
          />
          <MetricCard 
            label="Bénéfice Net Net" 
            value={`${netNetProfit.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`}
            valueColor={netNetProfit > 0 ? 'text-profitable' : 'text-danger'}
          />
        </div>
      </div>
      
      {/* Section 2: Performance Publicitaire */}
      <div className="mb-4 pt-4 border-t border-border/30">
        <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">📊 Performance Pub</p>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
          <MetricCard 
            label="Budget Pub" 
            value={`${tunnel.adBudget.toLocaleString('fr-FR')} €`}
            highlight
          />
          <MetricCard 
            label="ROAS Collecté" 
            value={`${roasCollected.toFixed(2)}x`}
            valueColor={roasCollected >= 3 ? 'text-profitable' : roasCollected >= 2 ? 'text-warning' : 'text-danger'}
          />
          <MetricCard 
            label="ROAS Contracté" 
            value={`${roasContracted.toFixed(2)}x`}
            valueColor={roasContracted >= 3 ? 'text-profitable' : roasContracted >= 2 ? 'text-warning' : 'text-danger'}
          />
          <MetricCard 
            label="CAC" 
            value={cac > 0 ? `${cac.toFixed(0)} €` : '-'}
          />
          <MetricCard 
            label="CPL" 
            value={cpl > 0 ? `${cpl.toFixed(0)} €` : '-'}
          />
          <MetricCard 
            label="Coût/Call" 
            value={costPerCall > 0 ? `${costPerCall.toFixed(0)} €` : '-'}
          />
        </div>
      </div>
      
      {/* Section 3: Conversion */}
      <div className="pt-4 border-t border-border/30">
        <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">🎯 Conversion</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <MetricCard 
            label="Ventes" 
            value={actualSalesCount.toString()}
            subtitle={`sur ${tunnel.callsGenerated} calls`}
          />
          <MetricCard 
            label="Taux Closing" 
            value={`${closingRate.toFixed(1)}%`}
            valueColor={closingRate >= 30 ? 'text-profitable' : closingRate >= 15 ? 'text-warning' : 'text-danger'}
          />
          
          {/* Type-specific metrics */}
          {tunnel.type === 'webinar' && (
            <>
              <MetricCard 
                label="Inscrits → Présents" 
                value={`${tunnel.registrations || 0} → ${tunnel.attendees || 0}`}
              />
              <MetricCard 
                label="Show-up Rate" 
                value={showUpRate ? `${showUpRate}%` : '0%'}
                valueColor={Number(showUpRate) >= 30 ? 'text-profitable' : Number(showUpRate) >= 20 ? 'text-warning' : 'text-danger'}
              />
              {costPerAttendee > 0 && (
                <MetricCard 
                  label="Coût/Présent" 
                  value={`${costPerAttendee.toFixed(0)} €`}
                />
              )}
            </>
          )}
          
          {tunnel.type === 'vsl' && (
            <>
              <MetricCard 
                label="Inscrits → Calls" 
                value={`${tunnel.registrations || 0} → ${tunnel.callsBooked || 0}`}
              />
              <MetricCard 
                label="Taux Booking" 
                value={bookingRate ? `${bookingRate}%` : '0%'}
                valueColor={Number(bookingRate) >= 30 ? 'text-profitable' : Number(bookingRate) >= 15 ? 'text-warning' : 'text-danger'}
              />
            </>
          )}
          
          {tunnel.type === 'challenge' && (
            <>
              <MetricCard 
                label="Inscrits" 
                value={(tunnel.registrations || 0).toString()}
                subtitle={tunnel.challengeDays ? `${tunnel.challengeDays.length} jours` : undefined}
              />
              {costPerAttendee > 0 && (
                <MetricCard 
                  label="Coût/Présent Moy" 
                  value={`${costPerAttendee.toFixed(0)} €`}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Challenge Days Show-up Rate */}
      {tunnel.type === 'challenge' && tunnel.challengeDays && tunnel.challengeDays.length > 0 && tunnel.registrations && tunnel.registrations > 0 && (
        <div className="pt-4 border-t border-border/30 mt-4">
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">📅 Show-up par jour</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {tunnel.challengeDays.map((day, index) => {
              const dayShowUpRate = ((day.attendees / tunnel.registrations!) * 100);
              const dayDate = tunnel.date 
                ? new Date(new Date(tunnel.date).getTime() + index * 24 * 60 * 60 * 1000)
                : null;
              const formattedDayDate = dayDate 
                ? dayDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                : `Jour ${day.day}`;
              
              return (
                <div 
                  key={day.day} 
                  className="p-2 bg-background/50 rounded-lg text-center border border-border/30"
                >
                  <p className="text-[10px] text-muted-foreground font-medium">{formattedDayDate}</p>
                  <p className={`text-lg font-bold ${dayShowUpRate >= 30 ? 'text-profitable' : dayShowUpRate >= 20 ? 'text-warning' : 'text-danger'}`}>
                    {dayShowUpRate.toFixed(0)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">{day.attendees} présents</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  valueColor?: string;
  subtitle?: string;
  highlight?: boolean;
}

function MetricCard({ label, value, valueColor = 'text-foreground', subtitle, highlight = false }: MetricCardProps) {
  return (
    <div className={`p-2.5 rounded-lg ${highlight ? 'bg-primary/10 border border-primary/20' : 'bg-background/50'}`}>
      <p className="text-[10px] text-muted-foreground truncate mb-0.5">{label}</p>
      <p className={`font-display text-sm font-semibold ${valueColor} truncate`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-[10px] text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
