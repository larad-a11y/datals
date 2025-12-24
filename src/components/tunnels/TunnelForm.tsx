import { useState } from 'react';
import { X } from 'lucide-react';
import { Tunnel, TunnelType, tunnelTypeLabels } from '@/types/business';
import { Button } from '@/components/ui/button';

interface TunnelFormProps {
  tunnel?: Tunnel;
  selectedMonth: string;
  onSave: (tunnel: Omit<Tunnel, 'id'>) => void;
  onCancel: () => void;
}

export function TunnelForm({ tunnel, selectedMonth, onSave, onCancel }: TunnelFormProps) {
  const [formData, setFormData] = useState({
    name: tunnel?.name || '',
    type: tunnel?.type || 'webinar' as TunnelType,
    date: tunnel?.date || '',
    month: tunnel?.month || selectedMonth,
    isActive: tunnel?.isActive ?? true,
    adBudget: tunnel?.adBudget || 0,
    callsGenerated: tunnel?.callsGenerated || 0,
    callsClosed: tunnel?.callsClosed || 0,
    averagePrice: tunnel?.averagePrice || 0,
    collectedAmount: tunnel?.collectedAmount || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const contractedRevenue = formData.callsClosed * formData.averagePrice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-border/50 bg-card p-6 shadow-lg animate-slide-up">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-foreground">
            {tunnel ? 'Modifier le tunnel' : 'Nouveau tunnel'}
          </h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Nom du tunnel
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input-field w-full"
                placeholder="Ex: Webinar Janvier"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as TunnelType }))}
                className="input-field w-full"
              >
                {Object.entries(tunnelTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date (for Webinar & Challenge) */}
          {(formData.type === 'webinar' || formData.type === 'challenge') && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Date de l'événement
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="input-field w-full"
              />
            </div>
          )}

          {/* Traffic & Sales */}
          <div className="border-t border-border/50 pt-5">
            <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
              Données de trafic & ventes
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  💰 Budget publicitaire (€)
                </label>
                <input
                  type="number"
                  value={formData.adBudget}
                  onChange={(e) => setFormData(prev => ({ ...prev, adBudget: parseFloat(e.target.value) || 0 }))}
                  className="input-field w-full"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  📞 Calls générés
                </label>
                <input
                  type="number"
                  value={formData.callsGenerated}
                  onChange={(e) => setFormData(prev => ({ ...prev, callsGenerated: parseInt(e.target.value) || 0 }))}
                  className="input-field w-full"
                  min="0"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  ✅ Calls closés
                </label>
                <input
                  type="number"
                  value={formData.callsClosed}
                  onChange={(e) => setFormData(prev => ({ ...prev, callsClosed: parseInt(e.target.value) || 0 }))}
                  className="input-field w-full"
                  min="0"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  💵 Prix moyen (€)
                </label>
                <input
                  type="number"
                  value={formData.averagePrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, averagePrice: parseFloat(e.target.value) || 0 }))}
                  className="input-field w-full"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Collected Amount */}
          <div className="border-t border-border/50 pt-5">
            <div className="mb-4 rounded-lg bg-secondary/30 p-4">
              <p className="text-sm text-muted-foreground">CA Contracté (calculé)</p>
              <p className="font-display text-2xl font-bold text-foreground">
                {contractedRevenue.toLocaleString('fr-FR')} €
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                💰 Montant réellement collecté (€)
              </label>
              <input
                type="number"
                value={formData.collectedAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, collectedAmount: parseFloat(e.target.value) || 0 }))}
                className="input-field w-full"
                min="0"
                step="0.01"
                placeholder="Montant encaissé ce mois"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" className="flex-1">
              {tunnel ? 'Enregistrer' : 'Créer le tunnel'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
