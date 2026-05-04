import { useState, useEffect, useMemo } from 'react';
import { Sale, InstallmentPlan, Offer, PaymentMethod, paymentMethodLabels, OfferInstallment, Closer, Charges, TrafficSource, trafficSourceLabels } from '@/types/business';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn, roundCurrency } from '@/lib/utils';

interface SaleFormProps {
  sale?: Sale;
  tunnelId?: string;
  onSave: (sale: Omit<Sale, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  inline?: boolean;
  installmentPlans: InstallmentPlan[];
  offers: Offer[];
  closers: Closer[];
  charges?: Charges;
}

export function SaleForm({ sale, tunnelId = '', onSave, onCancel, inline = false, installmentPlans, offers, closers, charges }: SaleFormProps) {
  const [formData, setFormData] = useState({
    clientName: sale?.clientName || '',
    clientEmail: sale?.clientEmail || '',
    closerId: sale?.closerId || '',
    saleDate: sale?.saleDate || new Date().toISOString().split('T')[0],
    offerId: sale?.offerId || '',
    paymentMethod: sale?.paymentMethod || 'cb' as PaymentMethod,
    trafficSource: sale?.trafficSource || 'ads' as TrafficSource,
    basePrice: sale?.basePrice || sale?.totalPrice || '',
    numberOfPayments: sale?.numberOfPayments || 1,
    totalPrice: sale?.totalPrice || '',
    amountCollected: sale?.amountCollected || '',
    useMarkup: !sale, // Par défaut on utilise la majoration pour les nouvelles ventes
    // Klarna mixed payment
    klarnaAmount: sale?.klarnaAmount || '',
    cbAmount: sale?.cbAmount || '',
  });

  // Klarna max amount (1500€ by default, could be passed from charges)
  const KLARNA_MAX = 1500;

  // Get the selected offer
  const selectedOffer = useMemo(() => {
    if (formData.offerId) {
      return offers.find(o => o.id === formData.offerId);
    }
    return undefined;
  }, [formData.offerId, offers]);

  // Get available installment plans based on selected offer
  const availableInstallments = useMemo((): (InstallmentPlan | OfferInstallment)[] => {
    if (selectedOffer) {
      // Return offer-specific installments with their custom markups
      return selectedOffer.availableInstallments;
    }
    return installmentPlans;
  }, [selectedOffer, installmentPlans]);

  // Get current markup percent based on offer or global plan
  const currentMarkupPercent = useMemo(() => {
    if (selectedOffer) {
      const offerInstallment = selectedOffer.availableInstallments.find(
        i => i.numberOfPayments === formData.numberOfPayments
      );
      return offerInstallment?.markupPercent || 0;
    }
    const plan = installmentPlans.find(p => p.numberOfPayments === formData.numberOfPayments);
    return plan?.markupPercent || 0;
  }, [formData.numberOfPayments, selectedOffer, installmentPlans]);

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
    if (selectedOffer) {
      setFormData(prev => ({ ...prev, basePrice: selectedOffer.basePrice }));
      // Reset numberOfPayments if not available in offer
      const isCurrentValid = selectedOffer.availableInstallments.some(
        i => i.numberOfPayments === formData.numberOfPayments
      );
      if (!isCurrentValid && selectedOffer.availableInstallments.length > 0) {
        setFormData(prev => ({ 
          ...prev, 
          numberOfPayments: selectedOffer.availableInstallments[0].numberOfPayments 
        }));
      }
    }
  }, [selectedOffer]);

  // Calcul automatique du prix total avec majoration
  // Pour les paiements mixtes CB + Klarna, le total = Klarna + CB
  useEffect(() => {
    if (formData.paymentMethod === 'cb_klarna') {
      // Pour CB + Klarna, le total est la somme des deux
      const klarnaVal = parseFloat(String(formData.klarnaAmount).replace(',', '.')) || 0;
      const cbVal = parseFloat(String(formData.cbAmount).replace(',', '.')) || 0;
      if (klarnaVal > 0 || cbVal > 0) {
        const total = roundCurrency(klarnaVal + cbVal);
        setFormData(prev => ({ ...prev, totalPrice: total, basePrice: total }));
      }
    } else if (basePriceNum > 0 && formData.useMarkup) {
      const calculatedTotal = roundCurrency(basePriceNum * (1 + currentMarkupPercent / 100));
      setFormData(prev => ({ ...prev, totalPrice: calculatedTotal }));
    } else if (basePriceNum > 0 && formData.numberOfPayments === 1) {
      // Pas de majoration pour paiement en 1x
      setFormData(prev => ({ ...prev, totalPrice: basePriceNum }));
    }
  }, [basePriceNum, formData.numberOfPayments, formData.useMarkup, currentMarkupPercent, formData.paymentMethod, formData.klarnaAmount, formData.cbAmount]);

  // Auto-calculate amountCollected when totalPrice or numberOfPayments changes
  // Pour CB + Klarna : Klarna est encaissé en totalité immédiatement, les échéances ne concernent que la partie CB
  useEffect(() => {
    if (totalPriceNum > 0 && !sale) {
      if (formData.paymentMethod === 'cb_klarna') {
        const klarnaVal = parseFloat(String(formData.klarnaAmount).replace(',', '.')) || 0;
        const cbVal = parseFloat(String(formData.cbAmount).replace(',', '.')) || 0;
        // Klarna est encaissé immédiatement + première échéance CB
        const firstCbPayment = roundCurrency(cbVal / formData.numberOfPayments);
        const firstPayment = roundCurrency(klarnaVal + firstCbPayment);
        setFormData(prev => ({ ...prev, amountCollected: firstPayment }));
      } else {
        const firstPayment = roundCurrency(totalPriceNum / formData.numberOfPayments);
        setFormData(prev => ({ ...prev, amountCollected: firstPayment }));
      }
    }
  }, [totalPriceNum, formData.numberOfPayments, sale, formData.paymentMethod, formData.klarnaAmount, formData.cbAmount]);

  // Calculate next payment date (1 month from sale date for new sales)
  const calculateNextPaymentDate = () => {
    const date = new Date(formData.saleDate);
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (basePriceNum <= 0 || !formData.clientName.trim()) return;
    
    // For new sales, create initial payment record if there's an amount collected
    let paymentHistory = sale?.paymentHistory || [];
    if (!sale && amountCollectedNum > 0) {
      paymentHistory = [{
        id: `payment-${Date.now()}`,
        amount: amountCollectedNum,
        date: formData.saleDate,
        verified: true,
        verifiedAt: new Date().toISOString(),
      }];
    }
    
    // Calculate Klarna/CB amounts based on payment method
    let klarnaAmount: number | undefined;
    let cbAmount: number | undefined;
    
    if (formData.paymentMethod === 'klarna') {
      klarnaAmount = totalPriceNum;
      cbAmount = 0;
    } else if (formData.paymentMethod === 'cb_klarna') {
      const klarnaVal = typeof formData.klarnaAmount === 'string' 
        ? parseFloat(formData.klarnaAmount) || 0 
        : formData.klarnaAmount;
      klarnaAmount = Math.min(klarnaVal, KLARNA_MAX, totalPriceNum);
      cbAmount = totalPriceNum - klarnaAmount;
    }
    
    onSave({
      tunnelId: sale?.tunnelId || tunnelId,
      clientName: formData.clientName,
      clientEmail: formData.clientEmail || undefined,
      closerId: formData.closerId || undefined,
      saleDate: formData.saleDate,
      offerId: formData.offerId || undefined,
      paymentMethod: formData.paymentMethod,
      trafficSource: formData.trafficSource,
      basePrice: basePriceNum,
      totalPrice: totalPriceNum || basePriceNum,
      numberOfPayments: formData.numberOfPayments,
      amountCollected: amountCollectedNum,
      paymentHistory,
      nextPaymentDate: formData.numberOfPayments > 1 && amountCollectedNum < totalPriceNum
        ? calculateNextPaymentDate()
        : undefined,
      klarnaAmount,
      cbAmount,
    });
    
    // Reset form for inline mode
    if (inline) {
      setFormData({
        clientName: '',
        clientEmail: '',
        closerId: '',
        saleDate: new Date().toISOString().split('T')[0],
        offerId: '',
        paymentMethod: 'cb',
        trafficSource: 'ads',
        basePrice: '',
        numberOfPayments: 1,
        totalPrice: '',
        amountCollected: '',
        useMarkup: true,
        klarnaAmount: '',
        cbAmount: '',
      });
    }
  };

  const hasMarkup = totalPriceNum > basePriceNum && basePriceNum > 0;
  const markupAmount = roundCurrency(totalPriceNum - basePriceNum);
  const remainingAmount = roundCurrency(totalPriceNum - amountCollectedNum);
  const paymentPerInstallment = formData.numberOfPayments > 0 && totalPriceNum > 0
    ? roundCurrency(totalPriceNum / formData.numberOfPayments)
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
              {formData.saleDate ? format(new Date(formData.saleDate + 'T12:00:00'), "PPP", { locale: fr }) : <span>Choisir une date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={formData.saleDate ? new Date(formData.saleDate + 'T12:00:00') : undefined}
              onSelect={(date) => {
                if (date) {
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  setFormData(prev => ({ ...prev, saleDate: `${year}-${month}-${day}` }));
                }
              }}
              disabled={(date) => date > new Date()}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          Nom du client <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={formData.clientName}
          onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
          className="input-field w-full"
          placeholder="Ex: Jean Dupont"
          required
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          ✉️ Email du client
        </label>
        <input
          type="email"
          value={formData.clientEmail}
          onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
          className="input-field w-full"
          placeholder="Ex: jean.dupont@email.com"
        />
      </div>

      {/* Closer selection */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          📞 Closer (optionnel)
        </label>
        <select
          value={formData.closerId}
          onChange={(e) => setFormData(prev => ({ ...prev, closerId: e.target.value }))}
          className="input-field w-full"
        >
          <option value="">Aucun closer (pas de commission)</option>
          {closers.map(closer => (
            <option key={closer.id} value={closer.id}>
              {closer.firstName} {closer.lastName}
            </option>
          ))}
        </select>
        {!formData.closerId && (
          <p className="mt-1 text-xs text-muted-foreground">
            Sans closer, aucune commission ne sera déduite
          </p>
        )}
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
          onChange={(e) => {
            const method = e.target.value as PaymentMethod;
            setFormData(prev => ({ 
              ...prev, 
              paymentMethod: method,
              // Reset klarna amounts when changing method
              klarnaAmount: method === 'cb_klarna' ? prev.klarnaAmount : '',
              cbAmount: '',
            }));
          }}
          className="input-field w-full"
        >
          <option value="cb">{paymentMethodLabels.cb}</option>
          <option value="virement">{paymentMethodLabels.virement}</option>
          <option value="klarna">{paymentMethodLabels.klarna}</option>
          <option value="cb_klarna">{paymentMethodLabels.cb_klarna}</option>
        </select>
        {formData.paymentMethod === 'klarna' && (
          <p className="mt-1 text-xs text-warning">
            ⚠️ Klarna limité à {KLARNA_MAX.toLocaleString('fr-FR')} € maximum
          </p>
        )}
      </div>

      {/* Traffic source */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          📣 Source du trafic
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, trafficSource: 'ads' }))}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors",
              formData.trafficSource === 'ads'
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
            )}
          >
            📢 {trafficSourceLabels.ads}
          </button>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, trafficSource: 'organic' }))}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors",
              formData.trafficSource === 'organic'
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
            )}
          >
            🌱 {trafficSourceLabels.organic}
          </button>
        </div>
      </div>

      {formData.paymentMethod === 'cb_klarna' && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            🔄 Répartition CB + Klarna
          </div>
          <p className="text-xs text-muted-foreground">
            Klarna limité à {KLARNA_MAX.toLocaleString('fr-FR')} € max. Le total sera Klarna + CB.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Montant Klarna (max {KLARNA_MAX.toLocaleString('fr-FR')} €)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={formData.klarnaAmount}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                  setFormData(prev => ({
                    ...prev,
                    klarnaAmount: value,
                  }));
                }}
                onBlur={(e) => {
                  const inputVal = parseFloat(e.target.value.replace(',', '.')) || 0;
                  const klarnaVal = roundCurrency(Math.min(inputVal, KLARNA_MAX));
                  setFormData(prev => ({
                    ...prev,
                    klarnaAmount: klarnaVal || '',
                  }));
                }}
                className="input-field w-full"
                placeholder={`Ex: ${KLARNA_MAX}`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Montant CB
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={formData.cbAmount}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                  setFormData(prev => ({
                    ...prev,
                    cbAmount: value,
                  }));
                }}
                onBlur={(e) => {
                  const inputVal = parseFloat(e.target.value.replace(',', '.')) || 0;
                  setFormData(prev => ({
                    ...prev,
                    cbAmount: roundCurrency(inputVal) || '',
                  }));
                }}
                className="input-field w-full"
                placeholder="Ex: 1000"
              />
            </div>
          </div>
          {(() => {
            const klarnaVal = parseFloat(String(formData.klarnaAmount).replace(',', '.')) || 0;
            const cbVal = parseFloat(String(formData.cbAmount).replace(',', '.')) || 0;
            const total = klarnaVal + cbVal;
            if (total > 0) {
              const cbPerPayment = formData.numberOfPayments > 1 ? roundCurrency(cbVal / formData.numberOfPayments) : cbVal;
              const firstPayment = klarnaVal + cbPerPayment;
              return (
                <div className="rounded-lg bg-primary/10 p-3 border border-primary/30 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-foreground">Total vente</span>
                    <span className="text-lg font-bold text-primary">{total.toLocaleString('fr-FR')} €</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Klarna: {klarnaVal.toLocaleString('fr-FR')} € (encaissé immédiatement)</p>
                    <p>CB: {cbVal.toLocaleString('fr-FR')} € {formData.numberOfPayments > 1 ? `en ${formData.numberOfPayments}x (${cbPerPayment.toLocaleString('fr-FR')} €/mois)` : '(en 1 fois)'}</p>
                  </div>
                  {formData.numberOfPayments > 1 && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs text-profitable font-medium">
                        ✓ 1er encaissement : {firstPayment.toLocaleString('fr-FR')} € (Klarna + 1ère mensualité CB)
                      </p>
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })()}
          <p className="text-xs text-warning">
            ⚠️ Frais Klarna ({charges?.klarnaPercent || 8}%) appliqués uniquement sur la portion Klarna
          </p>
        </div>
      )}

      {/* Prix de base - hidden for cb_klarna since it's calculated */}
      {formData.paymentMethod !== 'cb_klarna' && (
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
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          📅 Nombre de paiements
        </label>
        <div className="flex flex-wrap gap-2">
          {availableInstallments.map((installment) => {
            const numPayments = installment.numberOfPayments;
            const markup = installment.markupPercent;
            
            return (
              <button
                key={numPayments}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, numberOfPayments: numPayments, useMarkup: true }))}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  formData.numberOfPayments === numPayments
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                {numPayments}x
                {markup > 0 && (
                  <span className="ml-1 text-xs opacity-70">+{markup}%</span>
                )}
              </button>
            );
          })}
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
