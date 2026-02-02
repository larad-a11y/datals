import { useState } from 'react';
import { Plus, Edit2, Trash2, Target, ExternalLink } from 'lucide-react';
import { Tunnel, Sale, tunnelTypeLabels, InstallmentPlan, Offer, defaultInstallmentPlans, Closer } from '@/types/business';
import { TunnelForm } from './TunnelForm';
import { SaleForm } from './SaleForm';
import { Button } from '@/components/ui/button';
import { MonthSelector } from '@/components/layout/MonthSelector';

type TunnelTypeFilter = 'all' | 'webinar' | 'vsl' | 'challenge';

interface TunnelsListProps {
  tunnels: Tunnel[];
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onAdd: (tunnel: Omit<Tunnel, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Tunnel>) => void;
  onDelete: (id: string) => void;
  onAddSale: (tunnelId: string, sale: Omit<Sale, 'id' | 'createdAt'>) => void;
  onNavigateToSales?: (tunnelId?: string) => void;
  installmentPlans?: InstallmentPlan[];
  offers?: Offer[];
  closers?: Closer[];
}

export function TunnelsList({ tunnels, selectedMonth, onMonthChange, onAdd, onUpdate, onDelete, onAddSale, onNavigateToSales, installmentPlans = defaultInstallmentPlans, offers = [], closers = [] }: TunnelsListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingTunnel, setEditingTunnel] = useState<Tunnel | null>(null);
  const [typeFilter, setTypeFilter] = useState<TunnelTypeFilter>('all');
  const [showQuickSale, setShowQuickSale] = useState<string | null>(null);

  const handleSave = (data: Omit<Tunnel, 'id'>) => {
    if (editingTunnel) {
      onUpdate(editingTunnel.id, data);
    } else {
      onAdd(data);
    }
    setShowForm(false);
    setEditingTunnel(null);
  };

  // Quick add sale from tunnel card - now properly saves to database
  const handleQuickAddSale = (tunnelId: string, saleData: Omit<Sale, 'id' | 'createdAt'>) => {
    onAddSale(tunnelId, saleData);
    setShowQuickSale(null);
  };

  const filteredTunnels = tunnels
    .filter(t => t.month === selectedMonth)
    .filter(t => typeFilter === 'all' || t.type === typeFilter);

  const filterOptions: { value: TunnelTypeFilter; label: string }[] = [
    { value: 'all', label: 'Tous' },
    { value: 'webinar', label: 'Webinar' },
    { value: 'vsl', label: 'VSL' },
    { value: 'challenge', label: 'Challenge' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Tunnels de vente
          </h2>
          <MonthSelector selectedMonth={selectedMonth} onMonthChange={onMonthChange} />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-border/50 bg-secondary/30 p-1">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTypeFilter(option.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  typeFilter === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau
          </Button>
        </div>
      </div>

      {filteredTunnels.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 py-16">
          <Target className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">
            Aucun tunnel pour ce mois
          </p>
          <p className="mb-4 text-sm text-muted-foreground">
            Créez votre premier tunnel pour commencer à tracker
          </p>
          <Button onClick={() => setShowForm(true)} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Créer un tunnel
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTunnels.map((tunnel) => {
            const salesContracted = tunnel.sales.reduce((sum, s) => sum + s.totalPrice, 0);
            const salesCollected = tunnel.sales.reduce((sum, s) => sum + s.amountCollected, 0);
            const contractedRevenue = salesContracted > 0 ? salesContracted : tunnel.callsClosed * tunnel.averagePrice;
            const collectedAmount = salesCollected > 0 ? salesCollected : tunnel.collectedAmount;
            
            // ROAS = CA / Budget (multiplicateur)
            const roas = tunnel.adBudget > 0 
              ? collectedAmount / tunnel.adBudget 
              : 0;
            // Use actual sales count instead of manual callsClosed
            const actualSalesCount = tunnel.sales.length;
            const closingRate = tunnel.callsGenerated > 0 
              ? (actualSalesCount / tunnel.callsGenerated) * 100 
              : 0;
            const trend = roas >= 3 ? 'profitable' : roas >= 2 ? 'warning' : 'danger';
            const remainingAmount = salesContracted - salesCollected;

            return (
              <div 
                key={tunnel.id}
                className={`kpi-card kpi-${trend}`}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`badge-${trend}`}>
                        {tunnelTypeLabels[tunnel.type]}
                      </span>
                      {tunnel.date && (
                        <span className="text-sm font-medium text-foreground bg-secondary/50 px-2 py-0.5 rounded">
                          {tunnel.type === 'challenge' && tunnel.endDate ? (
                            <>
                              {new Date(tunnel.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} → {new Date(tunnel.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </>
                          ) : (
                            new Date(tunnel.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
                          )}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {tunnel.name}
                    </h3>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingTunnel(tunnel);
                        setShowForm(true);
                      }}
                      className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(tunnel.id)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Budget pub prominent */}
                <div className="mb-4 rounded-lg bg-secondary/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">💰 Budget pub</span>
                    <span className="text-xl font-bold text-foreground">
                      {tunnel.adBudget.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ventes / Calls</span>
                    <span className="font-medium text-foreground">
                      {actualSalesCount} / {tunnel.callsGenerated}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taux closing</span>
                    <span className="font-medium text-foreground">
                      {closingRate.toFixed(1)}%
                    </span>
                  </div>

                  {/* Revenus en grand */}
                  <div className="border-t border-border/50 pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">📋 CA Contracté</span>
                      <span className="text-lg font-bold text-foreground">
                        {contractedRevenue.toLocaleString('fr-FR')} €
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">✅ CA Collecté</span>
                      <span className="text-lg font-bold text-profitable">
                        {collectedAmount.toLocaleString('fr-FR')} €
                      </span>
                    </div>
                    {remainingAmount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Reste à encaisser</span>
                        <span className="text-sm font-medium text-warning">
                          {remainingAmount.toLocaleString('fr-FR')} €
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ROAS */}
                  <div className="rounded-lg bg-secondary/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground">ROAS</p>
                    <p className={`font-display text-2xl font-bold text-${trend}`}>
                      {roas.toFixed(2)}x
                    </p>
                  </div>

                  {/* Sales summary */}
                  <div className="border-t border-border/50 pt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {tunnel.sales.length} vente{tunnel.sales.length !== 1 ? 's' : ''}
                      </span>
                      {remainingAmount > 0 && (
                        <span className="text-xs text-warning">
                          {remainingAmount.toLocaleString('fr-FR')} € restant
                        </span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="profitable"
                        size="sm"
                        onClick={() => setShowQuickSale(showQuickSale === tunnel.id ? null : tunnel.id)}
                        className="flex-1"
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Ajouter une vente
                      </Button>
                      {onNavigateToSales && tunnel.sales.length > 0 && (
                        <button
                          onClick={() => onNavigateToSales(tunnel.id)}
                          className="flex items-center gap-1 rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                          title="Voir toutes les ventes"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick sale form */}
                  {showQuickSale === tunnel.id && (
                    <div className="border-t border-border/50 pt-4">
                      <SaleForm
                        tunnelId={tunnel.id}
                        onSave={(data) => handleQuickAddSale(tunnel.id, data)}
                        onCancel={() => setShowQuickSale(null)}
                        inline
                        installmentPlans={installmentPlans}
                        offers={offers}
                        closers={closers}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <TunnelForm
          tunnel={editingTunnel || undefined}
          selectedMonth={selectedMonth}
          closers={closers}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingTunnel(null);
          }}
        />
      )}
    </div>
  );
}
