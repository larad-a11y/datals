import { useState, useEffect } from 'react';
import { Sale } from '@/types/business';
import { Button } from '@/components/ui/button';

interface SaleFormProps {
  sale?: Sale;
  tunnelId?: string;
  onSave: (sale: Omit<Sale, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  inline?: boolean;
}

export function SaleForm({ sale, tunnelId = '', onSave, onCancel, inline = false }: SaleFormProps) {
  const [formData, setFormData] = useState({
    clientName: sale?.clientName || '',
    totalPrice: sale?.totalPrice || '',
    numberOfPayments: sale?.numberOfPayments || 1,
    amountCollected: sale?.amountCollected || '',
  });

  const totalPriceNum = typeof formData.totalPrice === 'string' 
    ? parseFloat(formData.totalPrice) || 0 
    : formData.totalPrice;
  
  const amountCollectedNum = typeof formData.amountCollected === 'string'
    ? parseFloat(formData.amountCollected) || 0
    : formData.amountCollected;

  // Auto-calculate amountCollected when totalPrice or numberOfPayments changes
  useEffect(() => {
    if (totalPriceNum > 0 && !sale) {
      const firstPayment = totalPriceNum / formData.numberOfPayments;
      setFormData(prev => ({ ...prev, amountCollected: firstPayment }));
    }
  }, [totalPriceNum, formData.numberOfPayments, sale]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalPriceNum <= 0) return;
    
    onSave({
      tunnelId: sale?.tunnelId || tunnelId,
      clientName: formData.clientName,
      totalPrice: totalPriceNum,
      numberOfPayments: formData.numberOfPayments,
      amountCollected: amountCollectedNum,
    });
    
    // Reset form for inline mode
    if (inline) {
      setFormData({
        clientName: '',
        totalPrice: '',
        numberOfPayments: 1,
        amountCollected: '',
      });
    }
  };

  const remainingAmount = totalPriceNum - amountCollectedNum;
  const paymentPerInstallment = formData.numberOfPayments > 0 
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
          💵 Prix total de la vente (€)
        </label>
        <input
          type="number"
          value={formData.totalPrice}
          onChange={(e) => setFormData(prev => ({ ...prev, totalPrice: e.target.value }))}
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
              onClick={() => setFormData(prev => ({ ...prev, numberOfPayments: n }))}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                formData.numberOfPayments === n
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {n}x
            </button>
          ))}
        </div>
        {formData.numberOfPayments > 1 && totalPriceNum > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {formData.numberOfPayments} paiements de {paymentPerInstallment.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
          </p>
        )}
      </div>

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
          max={totalPriceNum}
          step="0.01"
          placeholder="Premier paiement"
        />
      </div>

      {totalPriceNum > 0 && (
        <div className="rounded-lg bg-secondary/30 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Prix total</span>
            <span className="font-medium text-foreground">
              {totalPriceNum.toLocaleString('fr-FR')} €
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
        <Button type="submit" className="flex-1" disabled={totalPriceNum <= 0}>
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