import { useState, useMemo } from 'react';
import { X, CalendarDays, Plus, Trash2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Tunnel, TunnelType, tunnelTypeLabels, ChallengeDay } from '@/types/business';
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
    // New traffic metrics
    registrations: tunnel?.registrations || '',
    attendees: tunnel?.attendees || '',
    challengeDays: tunnel?.challengeDays || [] as ChallengeDay[],
    callsBooked: tunnel?.callsBooked || '',
  });

  const [dateOpen, setDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  // Calculate number of challenge days
  const numberOfChallengeDays = useMemo(() => {
    if (formData.type !== 'challenge' || !formData.date || !formData.endDate) return 0;
    return differenceInDays(new Date(formData.endDate), new Date(formData.date)) + 1;
  }, [formData.type, formData.date, formData.endDate]);

  // Update challenge days when dates change
  const updateChallengeDays = (numDays: number) => {
    const currentDays = formData.challengeDays;
    const newDays: ChallengeDay[] = [];
    for (let i = 1; i <= numDays; i++) {
      const existing = currentDays.find(d => d.day === i);
      newDays.push(existing || { day: i, attendees: 0 });
    }
    setFormData(prev => ({ ...prev, challengeDays: newDays }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      adBudget: parseFloat(String(formData.adBudget)) || 0,
      callsGenerated: parseInt(String(formData.callsGenerated)) || 0,
      callsClosed: tunnel?.callsClosed || 0, // Calculated from sales
      averagePrice: 0, // Calculated from sales
      collectedAmount: tunnel?.collectedAmount || 0, // Calculated from sales
      registrations: parseInt(String(formData.registrations)) || 0,
      attendees: formData.type === 'webinar' ? parseInt(String(formData.attendees)) || 0 : undefined,
      challengeDays: formData.type === 'challenge' ? formData.challengeDays : undefined,
      callsBooked: formData.type === 'vsl' ? parseInt(String(formData.callsBooked)) || 0 : undefined,
    });
  };

  const selectedDate = formData.date ? new Date(formData.date) : undefined;
  const selectedEndDate = formData.endDate ? new Date(formData.endDate) : undefined;

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const month = format(date, 'yyyy-MM'); // Synchroniser le mois avec la date
      setFormData(prev => ({ 
        ...prev, 
        date: formattedDate,
        month: month
      }));
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

          {/* Date (for Webinar and VSL - single date) */}
          {(formData.type === 'webinar' || formData.type === 'vsl') && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                {formData.type === 'webinar' ? 'Date du webinar' : 'Date de la VSL'}
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
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {formData.date && formData.month !== selectedMonth && (
                <p className="mt-2 text-xs text-primary bg-primary/10 rounded-lg px-3 py-2">
                  ℹ️ Ce tunnel sera visible dans le mois de {format(new Date(formData.date), 'MMMM yyyy', { locale: fr })}
                </p>
              )}
            </div>
          )}

          {/* Date range (for Challenge - multiple days) */}
          {formData.type === 'challenge' && (
            <>
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
                        className="pointer-events-auto"
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
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              {formData.date && formData.month !== selectedMonth && (
                <p className="mt-2 text-xs text-primary bg-primary/10 rounded-lg px-3 py-2">
                  ℹ️ Ce tunnel sera visible dans le mois de {format(new Date(formData.date), 'MMMM yyyy', { locale: fr })}
                </p>
              )}
            </>
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

            {/* Registrations - common to all types */}
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                📝 Nombre d'inscrits
              </label>
              <input
                type="number"
                value={formData.registrations}
                onChange={(e) => setFormData(prev => ({ ...prev, registrations: e.target.value }))}
                className="input-field w-full"
                min="0"
                placeholder={formData.type === 'webinar' ? "Ex: 500" : formData.type === 'challenge' ? "Ex: 1000" : "Ex: 200"}
              />
            </div>

            {/* Webinar specific: attendees */}
            {formData.type === 'webinar' && (
              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  👥 Nombre de présents
                </label>
                <input
                  type="number"
                  value={formData.attendees}
                  onChange={(e) => setFormData(prev => ({ ...prev, attendees: e.target.value }))}
                  className="input-field w-full"
                  min="0"
                  placeholder="Ex: 150"
                />
                {formData.registrations && formData.attendees && (
                  <p className="mt-1 text-xs text-primary">
                    Show-up rate: {((parseInt(String(formData.attendees)) / parseInt(String(formData.registrations))) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
            )}

            {/* Challenge specific: attendees per day */}
            {formData.type === 'challenge' && formData.date && formData.endDate && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">
                    👥 Présents par jour
                  </label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => updateChallengeDays(numberOfChallengeDays)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Initialiser les jours
                  </Button>
                </div>
                {formData.challengeDays.length > 0 ? (
                  <div className="space-y-2">
                    {formData.challengeDays.map((day, index) => {
                      const showUpRate = formData.registrations 
                        ? ((day.attendees / parseInt(String(formData.registrations))) * 100).toFixed(1)
                        : '0';
                      return (
                        <div key={day.day} className="flex items-center gap-3 rounded-lg bg-secondary/30 p-2">
                          <span className="text-sm font-medium text-foreground w-16">Jour {day.day}</span>
                          <input
                            type="number"
                            value={day.attendees}
                            onChange={(e) => {
                              const newDays = [...formData.challengeDays];
                              newDays[index] = { ...day, attendees: parseInt(e.target.value) || 0 };
                              setFormData(prev => ({ ...prev, challengeDays: newDays }));
                            }}
                            className="input-field flex-1"
                            min="0"
                            placeholder="Présents"
                          />
                          <span className="text-xs text-primary w-20 text-right">{showUpRate}%</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Cliquez sur "Initialiser les jours" après avoir défini les dates
                  </p>
                )}
              </div>
            )}

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
