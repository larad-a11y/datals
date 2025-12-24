import { useState } from 'react';
import { Plus, Edit2, Trash2, Target } from 'lucide-react';
import { Tunnel, tunnelTypeLabels } from '@/types/business';
import { TunnelForm } from './TunnelForm';
import { Button } from '@/components/ui/button';

type TunnelTypeFilter = 'all' | 'webinar' | 'vsl' | 'challenge';

interface TunnelsListProps {
  tunnels: Tunnel[];
  selectedMonth: string;
  onAdd: (tunnel: Omit<Tunnel, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Tunnel>) => void;
  onDelete: (id: string) => void;
}

export function TunnelsList({ tunnels, selectedMonth, onAdd, onUpdate, onDelete }: TunnelsListProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingTunnel, setEditingTunnel] = useState<Tunnel | null>(null);
  const [typeFilter, setTypeFilter] = useState<TunnelTypeFilter>('all');

  const handleSave = (data: Omit<Tunnel, 'id'>) => {
    if (editingTunnel) {
      onUpdate(editingTunnel.id, data);
    } else {
      onAdd(data);
    }
    setShowForm(false);
    setEditingTunnel(null);
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
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Tunnels de vente
          </h2>
          <p className="text-sm text-muted-foreground">
            Gérez vos différents tunnels de conversion
          </p>
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
            const contractedRevenue = tunnel.callsClosed * tunnel.averagePrice;
            const roi = tunnel.adBudget > 0 
              ? ((tunnel.collectedAmount - tunnel.adBudget) / tunnel.adBudget) * 100 
              : 0;
            const closingRate = tunnel.callsGenerated > 0 
              ? (tunnel.callsClosed / tunnel.callsGenerated) * 100 
              : 0;
            const trend = roi > 100 ? 'profitable' : roi > 50 ? 'warning' : 'danger';

            return (
              <div 
                key={tunnel.id}
                className={`kpi-card kpi-${trend}`}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div className={`badge-${trend} mb-2`}>
                      {tunnelTypeLabels[tunnel.type]}
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {tunnel.name}
                    </h3>
                    {tunnel.date && (
                      <p className="text-xs text-muted-foreground">
                        {tunnel.type === 'challenge' && tunnel.endDate ? (
                          <>
                            {new Date(tunnel.date).toLocaleDateString('fr-FR')} → {new Date(tunnel.endDate).toLocaleDateString('fr-FR')}
                          </>
                        ) : (
                          new Date(tunnel.date).toLocaleDateString('fr-FR')
                        )}
                      </p>
                    )}
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

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Budget pub</span>
                    <span className="font-medium text-foreground">
                      {tunnel.adBudget.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Calls</span>
                    <span className="font-medium text-foreground">
                      {tunnel.callsClosed} / {tunnel.callsGenerated}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Taux closing</span>
                    <span className="font-medium text-foreground">
                      {closingRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="border-t border-border/50 pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Contracté</span>
                      <span className="font-medium text-foreground">
                        {contractedRevenue.toLocaleString('fr-FR')} €
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Collecté</span>
                      <span className="font-semibold text-profitable">
                        {tunnel.collectedAmount.toLocaleString('fr-FR')} €
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground">ROI</p>
                    <p className={`font-display text-2xl font-bold text-${trend}`}>
                      {roi.toFixed(1)}%
                    </p>
                  </div>
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
