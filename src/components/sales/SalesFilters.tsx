import { Search, X } from 'lucide-react';
import { Tunnel, TunnelType, tunnelTypeLabels } from '@/types/business';
import { Button } from '@/components/ui/button';

export type PaymentStatus = 'all' | 'paid' | 'pending' | 'partial';

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
}: SalesFiltersProps) {
  const statusOptions: { value: PaymentStatus; label: string }[] = [
    { value: 'all', label: 'Tous' },
    { value: 'paid', label: 'Payé' },
    { value: 'partial', label: 'En cours' },
    { value: 'pending', label: 'Impayé' },
  ];

  const hasActiveFilters = selectedTunnelId !== '' || selectedStatus !== 'all' || searchQuery !== '' || selectedMonth !== '';

  const resetFilters = () => {
    onTunnelChange('');
    onStatusChange('all');
    onSearchChange('');
    onMonthChange('');
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
          placeholder="Rechercher un client..."
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
