import { useState } from 'react';
import { Search, X, CalendarIcon, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Tunnel, Closer, Offer } from '@/types/business';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

export type PaymentStatus = 'all' | 'paid' | 'pending' | 'partial' | 'defaulted' | 'refunded';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface SalesFiltersProps {
  tunnels: Tunnel[];
  selectedTunnelId: string;
  onTunnelChange: (tunnelId: string) => void;
  selectedStatus: PaymentStatus;
  onStatusChange: (status: PaymentStatus) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  closers: Closer[];
  selectedCloserId: string;
  onCloserChange: (closerId: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  offers?: Offer[];
  selectedOfferIds?: string[];
  onOffersChange?: (offerIds: string[]) => void;
  selectedPaymentMethod?: string;
  onPaymentMethodChange?: (method: string) => void;
}

export function SalesFilters({
  tunnels,
  selectedTunnelId,
  onTunnelChange,
  selectedStatus,
  onStatusChange,
  searchQuery,
  onSearchChange,
  selectedMonth,
  onMonthChange,
  closers,
  selectedCloserId,
  onCloserChange,
  dateRange,
  onDateRangeChange,
  offers = [],
  selectedOfferIds = [],
  onOffersChange,
  selectedPaymentMethod = '',
  onPaymentMethodChange,
}: SalesFiltersProps) {
  const [dateOpen, setDateOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);

  const toggleOffer = (id: string) => {
    const next = selectedOfferIds.includes(id)
      ? selectedOfferIds.filter((v) => v !== id)
      : [...selectedOfferIds, id];
    onOffersChange?.(next);
  };
  const statusOptions: { value: PaymentStatus; label: string }[] = [
    { value: 'all', label: 'Tous' },
    { value: 'paid', label: 'Payé' },
    { value: 'partial', label: 'En cours' },
    { value: 'pending', label: 'À payer' },
    { value: 'defaulted', label: 'Impayés' },
    { value: 'refunded', label: 'Remboursements' },
  ];

  const hasActiveFilters = selectedTunnelId !== '' || selectedStatus !== 'all' || searchQuery !== '' || selectedMonth !== '' || selectedCloserId !== '' || selectedOfferIds.length > 0 || selectedPaymentMethod !== '' || dateRange.from !== undefined || dateRange.to !== undefined;

  const resetFilters = () => {
    onTunnelChange('');
    onStatusChange('all');
    onSearchChange('');
    onMonthChange('');
    onCloserChange('');
    onOffersChange?.([]);
    onPaymentMethodChange?.('');
    onDateRangeChange({ from: undefined, to: undefined });
  };

  // Generate month options (last 12 months)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return { value, label };
  });

  return (
    <div className="flex flex-wrap gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher un client, email, tunnel..."
          className="input-field w-full pl-9"
        />
      </div>

      {/* Tunnel filter */}
      <select
        value={selectedTunnelId}
        onChange={(e) => onTunnelChange(e.target.value)}
        className="input-field min-w-[150px]"
      >
        <option value="">Tous les tunnels</option>
        {tunnels.map((tunnel) => (
          <option key={tunnel.id} value={tunnel.id}>
            {tunnel.name}
          </option>
        ))}
      </select>

      {/* Month filter */}
      <select
        value={selectedMonth}
        onChange={(e) => onMonthChange(e.target.value)}
        className="input-field min-w-[150px]"
      >
        <option value="">Tous les mois</option>
        {monthOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Closer filter */}
      <select
        value={selectedCloserId}
        onChange={(e) => onCloserChange(e.target.value)}
        className="input-field min-w-[150px]"
      >
        <option value="">Tous les closers</option>
        {closers.map((closer) => (
          <option key={closer.id} value={closer.id}>
            {closer.firstName} {closer.lastName}
          </option>
        ))}
      </select>

      {/* Offer filter (multi-select) */}
      {offers.length > 0 && onOffersChange && (
        <Popover open={offerOpen} onOpenChange={setOfferOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "min-w-[150px] justify-start font-normal",
                selectedOfferIds.length === 0 && "text-muted-foreground"
              )}
            >
              <Filter className="mr-2 h-4 w-4" />
              {selectedOfferIds.length === 0
                ? "Toutes les offres"
                : selectedOfferIds.length === 1
                  ? (selectedOfferIds[0] === 'none'
                      ? 'Sans offre'
                      : offers.find((o) => o.id === selectedOfferIds[0])?.name || '1 offre')
                  : `${selectedOfferIds.length} offres`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="max-h-72 overflow-y-auto space-y-1">
              <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary/50 cursor-pointer">
                <Checkbox
                  checked={selectedOfferIds.includes('none')}
                  onCheckedChange={() => toggleOffer('none')}
                />
                Sans offre
              </label>
              {offers.map((offer) => (
                <label
                  key={offer.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedOfferIds.includes(offer.id)}
                    onCheckedChange={() => toggleOffer(offer.id)}
                  />
                  <span className="truncate">{offer.name}</span>
                </label>
              ))}
            </div>
            {selectedOfferIds.length > 0 && (
              <button
                onClick={() => onOffersChange([])}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-border/50 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
                Tout désélectionner
              </button>
            )}
          </PopoverContent>
        </Popover>
      )}

      {/* Payment method filter */}
      {onPaymentMethodChange && (
        <select
          value={selectedPaymentMethod}
          onChange={(e) => onPaymentMethodChange(e.target.value)}
          className="input-field min-w-[150px]"
        >
          <option value="">Tous les moyens</option>
          <option value="cb">CB</option>
          <option value="virement">Virement</option>
        </select>
      )}

      {/* Date range picker */}
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "min-w-[200px] justify-start text-left font-normal",
              !dateRange.from && !dateRange.to && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "dd/MM/yy", { locale: fr })} - {format(dateRange.to, "dd/MM/yy", { locale: fr })}
                </>
              ) : (
                format(dateRange.from, "dd/MM/yyyy", { locale: fr })
              )
            ) : (
              "Période"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={(range) => {
              onDateRangeChange({ from: range?.from, to: range?.to });
              if (range?.from && range?.to) {
                setDateOpen(false);
              }
            }}
            locale={fr}
            initialFocus
            className="pointer-events-auto"
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      {/* Status filter */}
      <div className="flex rounded-lg border border-border/50 bg-secondary/30 p-1">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onStatusChange(option.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedStatus === option.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Reset filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          <X className="mr-1 h-4 w-4" />
          Reset
        </Button>
      )}
    </div>
  );
}
