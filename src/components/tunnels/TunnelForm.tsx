import { useState } from 'react';
import { X, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Tunnel, TunnelType, tunnelTypeLabels } from '@/types/business';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

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
    endDate: tunnel?.endDate || '',
    month: tunnel?.month || selectedMonth,
    isActive: tunnel?.isActive ?? true,
    adBudget: tunnel?.adBudget || '',
    callsGenerated: tunnel?.callsGenerated || '',
    callsClosed: tunnel?.callsClosed || '',
    averagePrice: tunnel?.averagePrice || '',
    collectedAmount: tunnel?.collectedAmount || '',
    sales: tunnel?.sales || [],
  });

  const [dateOpen, setDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      adBudget: parseFloat(String(formData.adBudget)) || 0,
      callsGenerated: parseInt(String(formData.callsGenerated)) || 0,
      callsClosed: tunnel?.callsClosed || 0, // Calculated from sales
      averagePrice: 0, // Calculated from sales
      collectedAmount: tunnel?.collectedAmount || 0, // Calculated from sales
    });
  };

  const selectedDate = formData.date ? new Date(formData.date) : undefined;
  const selectedEndDate = formData.endDate ? new Date(formData.endDate) : undefined;

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({ ...prev, date: format(date, 'yyyy-MM-dd') }));
      setDateOpen(false);
    }
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({ ...prev, endDate: format(date, 'yyyy-MM-dd') }));
      setEndDateOpen(false);
    }
  };

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

          {/* Date (for Webinar only - single date) */}
          {formData.type === 'webinar' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Date du webinar
              </label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal bg-secondary/30"
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {formData.date ? (
                      format(new Date(formData.date), 'PPP', { locale: fr })
                    ) : (
                      <span className="text-muted-foreground">Choisir une date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border z-[60]" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    locale={fr}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Date range (for Challenge - multiple days) */}
          {formData.type === 'challenge' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Date de début
                </label>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-secondary/30"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {formData.date ? (
                        format(new Date(formData.date), 'PPP', { locale: fr })
                      ) : (
                        <span className="text-muted-foreground">Début</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border-border z-[60]" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      locale={fr}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Date de fin
                </label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-secondary/30"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {formData.endDate ? (
                        format(new Date(formData.endDate), 'PPP', { locale: fr })
                      ) : (
                        <span className="text-muted-foreground">Fin</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border-border z-[60]" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedEndDate}
                      onSelect={handleEndDateSelect}
                      disabled={(date) => formData.date ? date < new Date(formData.date) : false}
                      locale={fr}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Traffic */}
          <div className="border-t border-border/50 pt-5">
            <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
              Données de trafic
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  💰 Budget publicitaire (€)
                </label>
                <input
                  type="number"
                  value={formData.adBudget}
                  onChange={(e) => setFormData(prev => ({ ...prev, adBudget: e.target.value }))}
                  className="input-field w-full"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 5000"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  📞 Calls générés
                </label>
                <input
                  type="number"
                  value={formData.callsGenerated}
                  onChange={(e) => setFormData(prev => ({ ...prev, callsGenerated: e.target.value }))}
                  className="input-field w-full"
                  min="0"
                  placeholder="Ex: 50"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Modifiable après (follow-up, etc.)
                </p>
              </div>
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
