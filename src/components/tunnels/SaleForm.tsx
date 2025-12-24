import { useState, useEffect, useMemo } from 'react';
import { Sale, InstallmentPlan, Offer, PaymentMethod, paymentMethodLabels } from '@/types/business';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SaleFormProps {
  sale?: Sale;
  tunnelId?: string;
  onSave: (sale: Omit<Sale, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  inline?: boolean;
  installmentPlans: InstallmentPlan[];
  offers: Offer[];
}

export function SaleForm({ sale, tunnelId = '', onSave, onCancel, inline = false, installmentPlans, offers }: SaleFormProps) {
  const [formData, setFormData] = useState({
    clientName: sale?.clientName || '',
    saleDate: sale?.saleDate || new Date().toISOString().split('T')[0],
    offerId: sale?.offerId || '',
    paymentMethod: sale?.paymentMethod || 'cb' as PaymentMethod,
    basePrice: sale?.basePrice || sale?.totalPrice || '',
    numberOfPayments: sale?.numberOfPayments || 1,
    totalPrice: sale?.totalPrice || '',
    amountCollected: sale?.amountCollected || '',
    useMarkup: !sale, // Par défaut on utilise la majoration pour les nouvelles ventes
  });

  // Get available installment plans based on selected offer
  const availableInstallments = useMemo(() => {
    if (formData.offerId) {
      const offer = offers.find(o => o.id === formData.offerId);
      if (offer) {
        return installmentPlans.filter(p => offer.availableInstallments.includes(p.numberOfPayments));
      }
    }
    return installmentPlans;
  }, [formData.offerId, offers, installmentPlans]);

  // Get current markup percent
  const currentMarkupPercent = useMemo(() => {
    const plan = installmentPlans.find(p => p.numberOfPayments === formData.numberOfPayments);
    return plan?.markupPercent || 0;
  }, [formData.numberOfPayments, installmentPlans]);

  const basePriceNum = typeof formData.basePrice === 'string' 
    ? parseFloat(formData.basePrice) || 0 
    : formData.basePrice;

  const totalPriceNum = typeof formData.totalPrice === 'string' 
    ? parseFloat(formData.totalPrice) || 0 
    : formData.totalPrice;
  
  const amountCollectedNum = typeof formData.amountCollected === 'string'
    ? parseFloat(formData.amountCollected) || 0
    : formData.amountCollected;

  // When offer is selected, auto-fill base price
  useEffect(() => {
    if (formData.offerId) {
      const offer = offers.find(o => o.id === formData.offerId);
      if (offer) {
        setFormData(prev => ({ ...prev, basePrice: offer.basePrice }));
        // Reset numberOfPayments if not available in offer
        if (!offer.availableInstallments.includes(formData.numberOfPayments)) {
          setFormData(prev => ({ ...prev, numberOfPayments: offer.availableInstallments[0] || 1 }));
        }
      }
    }
  }, [formData.offerId, offers]);

  // Calcul automatique du prix total avec majoration
  useEffect(() => {
    if (basePriceNum > 0 && formData.useMarkup) {
      const calculatedTotal = basePriceNum * (1 + currentMarkupPercent / 100);
      setFormData(prev => ({ ...prev, totalPrice: calculatedTotal }));
    } else if (basePriceNum > 0 && formData.numberOfPayments === 1) {
      // Pas de majoration pour paiement en 1x
      setFormData(prev => ({ ...prev, totalPrice: basePriceNum }));
    }
  }, [basePriceNum, formData.numberOfPayments, formData.useMarkup, currentMarkupPercent]);

  // Auto-calculate amountCollected when totalPrice or numberOfPayments changes
  useEffect(() => {
    if (totalPriceNum > 0 && !sale) {
      const firstPayment = totalPriceNum / formData.numberOfPayments;
      setFormData(prev => ({ ...prev, amountCollected: firstPayment }));
    }
  }, [totalPriceNum, formData.numberOfPayments, sale]);

  // Calculate next payment date (1 month from sale date for new sales)
  const calculateNextPaymentDate = () => {
    const date = new Date(formData.saleDate);
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (basePriceNum <= 0) return;
    
    onSave({
      tunnelId: sale?.tunnelId || tunnelId,
      clientName: formData.clientName,
      saleDate: formData.saleDate,
      offerId: formData.offerId || undefined,
      paymentMethod: formData.paymentMethod,
      basePrice: basePriceNum,
      totalPrice: totalPriceNum || basePriceNum,
      numberOfPayments: formData.numberOfPayments,
      amountCollected: amountCollectedNum,
      paymentHistory: sale?.paymentHistory || [],
      nextPaymentDate: formData.numberOfPayments > 1 && amountCollectedNum < totalPriceNum
        ? calculateNextPaymentDate()
        : undefined,
    });
    
    // Reset form for inline mode
    if (inline) {
      setFormData({
        clientName: '',
        saleDate: new Date().toISOString().split('T')[0],
        offerId: '',
        paymentMethod: 'cb',
        basePrice: '',
        numberOfPayments: 1,
        totalPrice: '',
        amountCollected: '',
        useMarkup: true,
      });
    }
  };

  const hasMarkup = totalPriceNum > basePriceNum && basePriceNum > 0;
  const markupAmount = totalPriceNum - basePriceNum;
  const remainingAmount = totalPriceNum - amountCollectedNum;
  const paymentPerInstallment = formData.numberOfPayments > 0 && totalPriceNum > 0
    ? totalPriceNum / formData.numberOfPayments 
    : 0;

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Date de vente */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          📅 Date de la vente
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !formData.saleDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formData.saleDate ? format(new Date(formData.saleDate), "PPP", { locale: fr }) : <span>Choisir une date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={formData.saleDate ? new Date(formData.saleDate) : undefined}
              onSelect={(date) => date && setFormData(prev => ({ ...prev, saleDate: date.toISOString().split('T')[0] }))}
              disabled={(date) => date > new Date()}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Nom du client (optionnel)
        </label>
        <input
          type="text"
          value={formData.clientName}
          onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
          className="input-field w-full"
          placeholder="Ex: Jean Dupont"
        />
      </div>

      {/* Offer selection */}
      {offers.length > 0 && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            🎁 Offre
          </label>
          <select
            value={formData.offerId}
            onChange={(e) => setFormData(prev => ({ ...prev, offerId: e.target.value }))}
            className="input-field w-full"
          >
            <option value="">Sélectionner une offre (optionnel)</option>
            {offers.map(offer => (
              <option key={offer.id} value={offer.id}>
                {offer.name} - {offer.basePrice.toLocaleString('fr-FR')} €
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Payment method */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          💳 Moyen de paiement
        </label>
        <select
          value={formData.paymentMethod}
          onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as PaymentMethod }))}
          className="input-field w-full"
        >
          <option value="cb">{paymentMethodLabels.cb}</option>
          <option value="virement">{paymentMethodLabels.virement}</option>
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          💵 Prix de base / Prix cash (€)
        </label>
        <input
          type="number"
          value={formData.basePrice}
          onChange={(e) => setFormData(prev => ({ ...prev, basePrice: e.target.value, offerId: '' }))}
          className="input-field w-full"
          min="0"
          step="0.01"
          placeholder="1000"
          required
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          📅 Nombre de paiements
        </label>
        <div className="flex flex-wrap gap-2">
          {availableInstallments.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, numberOfPayments: plan.numberOfPayments, useMarkup: true }))}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                formData.numberOfPayments === plan.numberOfPayments
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {plan.numberOfPayments}x
              {plan.markupPercent > 0 && (
                <span className="ml-1 text-xs opacity-70">+{plan.markupPercent}%</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {formData.numberOfPayments > 1 && basePriceNum > 0 && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Prix final avec majoration</span>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={formData.useMarkup}
                onChange={(e) => {
                  if (!e.target.checked) {
                    setFormData(prev => ({ ...prev, useMarkup: false, totalPrice: prev.basePrice }));
                  } else {
                    setFormData(prev => ({ ...prev, useMarkup: true }));
                  }
                }}
                className="rounded"
              />
              Appliquer majoration (+{currentMarkupPercent}%)
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={formData.totalPrice}
              onChange={(e) => setFormData(prev => ({ ...prev, totalPrice: e.target.value, useMarkup: false }))}
              className="input-field flex-1"
              min={basePriceNum}
              step="0.01"
            />
            <span className="text-sm text-muted-foreground">€</span>
          </div>
          {hasMarkup && (
            <p className="mt-2 text-xs text-profitable">
              +{markupAmount.toLocaleString('fr-FR')} € de majoration ({((markupAmount / basePriceNum) * 100).toFixed(0)}%)
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {formData.numberOfPayments} paiements de {paymentPerInstallment.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
          </p>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          💰 Montant déjà encaissé (€)
        </label>
        <input
          type="number"
          value={formData.amountCollected}
          onChange={(e) => setFormData(prev => ({ ...prev, amountCollected: e.target.value }))}
          className="input-field w-full"
          min="0"
          max={totalPriceNum || basePriceNum}
          step="0.01"
          placeholder="Premier paiement"
        />
      </div>

      {(totalPriceNum > 0 || basePriceNum > 0) && (
        <div className="rounded-lg bg-secondary/30 p-4">
          {hasMarkup && (
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Prix de base</span>
              <span className="text-muted-foreground">
                {basePriceNum.toLocaleString('fr-FR')} €
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Prix contracté</span>
            <span className="font-medium text-foreground">
              {(totalPriceNum || basePriceNum).toLocaleString('fr-FR')} €
              {hasMarkup && (
                <span className="ml-1 text-xs text-profitable">(+{((markupAmount / basePriceNum) * 100).toFixed(0)}%)</span>
              )}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Encaissé</span>
            <span className="font-medium text-profitable">
              {amountCollectedNum.toLocaleString('fr-FR')} €
            </span>
          </div>
          <div className="mt-2 border-t border-border/50 pt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Reste à encaisser</span>
            <span className={`font-semibold ${remainingAmount > 0 ? 'text-warning' : 'text-profitable'}`}>
              {remainingAmount.toLocaleString('fr-FR')} €
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {!inline && (
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={basePriceNum <= 0}>
          {sale ? 'Enregistrer' : 'Ajouter la vente'}
        </Button>
      </div>
    </form>
  );

  if (inline) {
    return (
      <div className="rounded-lg border border-border/50 bg-background/50 p-4">
        <h4 className="mb-4 text-sm font-semibold text-foreground">Nouvelle vente</h4>
        {formContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-border/50 bg-card p-6 shadow-lg animate-slide-up">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-foreground">
            {sale ? 'Modifier la vente' : 'Nouvelle vente'}
          </h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
        {formContent}
      </div>
    </div>
  );
}
