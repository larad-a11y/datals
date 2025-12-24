import { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { Sale } from '@/types/business';
import { SaleForm } from './SaleForm';

interface SalesSectionProps {
  sales: Sale[];
  onAddSale: (sale: Omit<Sale, 'id' | 'createdAt'>) => void;
  onUpdateSale: (id: string, updates: Partial<Sale>) => void;
  onDeleteSale: (id: string) => void;
}

export function SalesSection({ sales, onAddSale, onUpdateSale, onDeleteSale }: SalesSectionProps) {
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const handleSave = (data: Omit<Sale, 'id' | 'createdAt'>) => {
    onAddSale(data);
  };

  const handleEditSave = (data: Omit<Sale, 'id' | 'createdAt'>) => {
    if (editingSale) {
      onUpdateSale(editingSale.id, data);
      setEditingSale(null);
    }
  };

  // Calculate totals
  const totalContracted = sales.reduce((sum, s) => sum + s.totalPrice, 0);
  const totalCollected = sales.reduce((sum, s) => sum + s.amountCollected, 0);
  const totalRemaining = totalContracted - totalCollected;

  return (
    <div className="space-y-4">
      {/* Summary */}
      {sales.length > 0 && (
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-secondary/30 p-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Contracté</p>
            <p className="font-display text-sm font-bold text-foreground">
              {totalContracted.toLocaleString('fr-FR')} €
            </p>
          </div>
          <div className="text-center border-x border-border/50">
            <p className="text-xs text-muted-foreground">Encaissé</p>
            <p className="font-display text-sm font-bold text-profitable">
              {totalCollected.toLocaleString('fr-FR')} €
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Reste</p>
            <p className={`font-display text-sm font-bold ${totalRemaining > 0 ? 'text-warning' : 'text-profitable'}`}>
              {totalRemaining.toLocaleString('fr-FR')} €
            </p>
          </div>
        </div>
      )}

      {/* Sales list */}
      {sales.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {sales.map((sale) => {
            const remaining = sale.totalPrice - sale.amountCollected;
            const progress = sale.totalPrice > 0 ? (sale.amountCollected / sale.totalPrice) * 100 : 0;
            
            return (
              <div 
                key={sale.id}
                className="rounded-lg border border-border/30 bg-background/50 p-3"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {sale.clientName || 'Client anonyme'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sale.totalPrice.toLocaleString('fr-FR')} € en {sale.numberOfPayments}x
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingSale(sale)}
                      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onDeleteSale(sale.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="h-1.5 w-full rounded-full bg-secondary">
                  <div 
                    className="h-full rounded-full bg-profitable transition-all"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-xs">
                  <span className="text-profitable">{sale.amountCollected.toLocaleString('fr-FR')} €</span>
                  {remaining > 0 && (
                    <span className="text-warning">-{remaining.toLocaleString('fr-FR')} €</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Always visible inline form */}
      <SaleForm
        onSave={handleSave}
        onCancel={() => {}}
        inline
      />

      {/* Edit modal */}
      {editingSale && (
        <SaleForm
          sale={editingSale}
          onSave={handleEditSave}
          onCancel={() => setEditingSale(null)}
        />
      )}
    </div>
  );
}