import { useState, useEffect } from 'react';
import { Sale } from '@/types/business';
import { Button } from '@/components/ui/button';

interface SaleFormProps {
  sale?: Sale;
  tunnelId?: string;
  onSave: (sale: Omit<Sale, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  inline?: boolean;
  installmentMarkupPercent?: number; // Pourcentage de majoration configurable
}

export function SaleForm({ sale, tunnelId = '', onSave, onCancel, inline = false, installmentMarkupPercent = 5 }: SaleFormProps) {
  const [formData, setFormData] = useState({
    clientName: sale?.clientName || '',
    basePrice: sale?.basePrice || sale?.totalPrice || '',
    numberOfPayments: sale?.numberOfPayments || 1,
    totalPrice: sale?.totalPrice || '',
    amountCollected: sale?.amountCollected || '',
    useMarkup: !sale, // Par défaut on utilise la majoration pour les nouvelles ventes
  });

  const basePriceNum = typeof formData.basePrice === 'string' 
    ? parseFloat(formData.basePrice) || 0 
    : formData.basePrice;

  const totalPriceNum = typeof formData.totalPrice === 'string' 
    ? parseFloat(formData.totalPrice) || 0 
    : formData.totalPrice;
  
  const amountCollectedNum = typeof formData.amountCollected === 'string'
    ? parseFloat(formData.amountCollected) || 0
    : formData.amountCollected;

  // Calcul automatique du prix total avec majoration
  useEffect(() => {
    if (basePriceNum > 0 && formData.useMarkup && formData.numberOfPayments > 1) {
      const calculatedTotal = basePriceNum * (1 + installmentMarkupPercent / 100);
      setFormData(prev => ({ ...prev, totalPrice: calculatedTotal }));
    } else if (basePriceNum > 0 && formData.numberOfPayments === 1) {
      // Pas de majoration pour paiement en 1x
      setFormData(prev => ({ ...prev, totalPrice: basePriceNum }));
    }
  }, [basePriceNum, formData.numberOfPayments, formData.useMarkup, installmentMarkupPercent]);

  // Auto-calculate amountCollected when totalPrice or numberOfPayments changes
  useEffect(() => {
    if (totalPriceNum > 0 && !sale) {
      const firstPayment = totalPriceNum / formData.numberOfPayments;
      setFormData(prev => ({ ...prev, amountCollected: firstPayment }));
    }
  }, [totalPriceNum, formData.numberOfPayments, sale]);

  // Calculate next payment date (1 month from now for new sales)
  const calculateNextPaymentDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (basePriceNum <= 0) return;
    
    onSave({
      tunnelId: sale?.tunnelId || tunnelId,
      clientName: formData.clientName,
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

      <div>
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          💵 Prix de base / Prix cash (€)
        </label>
        <input
          type="number"
          value={formData.basePrice}
          onChange={(e) => setFormData(prev => ({ ...prev, basePrice: e.target.value }))}
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
          {[1, 2, 3, 4, 6, 10, 12].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, numberOfPayments: n, useMarkup: true }))}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                formData.numberOfPayments === n
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {n}x
              {n > 1 && (
                <span className="ml-1 text-xs opacity-70">+{installmentMarkupPercent}%</span>
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
              Appliquer majoration (+{installmentMarkupPercent}%)
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
      <div className="w-full max-w-md rounded-xl border border-border/50 bg-card p-6 shadow-lg animate-slide-up">
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