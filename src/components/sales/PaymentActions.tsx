import { useState } from 'react';
import { Check, ChevronsUp, Plus, History } from 'lucide-react';
import { Sale, PaymentRecord } from '@/types/business';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PaymentActionsProps {
  sale: Sale;
  onRecordPayment: (saleId: string, tunnelId: string, amount: number) => void;
  onFullyPaid: (saleId: string, tunnelId: string) => void;
  onViewHistory: (sale: Sale) => void;
}

export function PaymentActions({ sale, onRecordPayment, onFullyPaid, onViewHistory }: PaymentActionsProps) {
  const remaining = sale.totalPrice - sale.amountCollected;
  const monthlyPayment = sale.totalPrice / sale.numberOfPayments;
  const isPaid = remaining <= 0;

  if (isPaid) {
    return (
      <span className="flex items-center gap-1 text-xs text-profitable">
        <Check className="h-3 w-3" />
        Soldé
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
          <Plus className="h-3 w-3" />
          Encaisser
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem 
          onClick={() => onRecordPayment(sale.id, sale.tunnelId, monthlyPayment)}
          className="gap-2"
        >
          <Check className="h-4 w-4 text-profitable" />
          <div>
            <p className="font-medium">Mensualité</p>
            <p className="text-xs text-muted-foreground">
              +{monthlyPayment.toLocaleString('fr-FR')} €
            </p>
          </div>
        </DropdownMenuItem>
        
        {remaining !== monthlyPayment && (
          <DropdownMenuItem 
            onClick={() => onFullyPaid(sale.id, sale.tunnelId)}
            className="gap-2"
          >
            <ChevronsUp className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium">Solder le total</p>
              <p className="text-xs text-muted-foreground">
                +{remaining.toLocaleString('fr-FR')} €
              </p>
            </div>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => onViewHistory(sale)}
          className="gap-2"
        >
          <History className="h-4 w-4" />
          Historique des paiements
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface PaymentHistoryDialogProps {
  sale: Sale | null;
  onClose: () => void;
  onRecordPayment: (saleId: string, tunnelId: string, amount: number) => void;
}

export function PaymentHistoryDialog({ sale, onClose, onRecordPayment }: PaymentHistoryDialogProps) {
  const [customAmount, setCustomAmount] = useState('');
  
  if (!sale) return null;
  
  const remaining = sale.totalPrice - sale.amountCollected;
  const monthlyPayment = sale.totalPrice / sale.numberOfPayments;
  
  const handleCustomPayment = () => {
    const amount = parseFloat(customAmount);
    if (amount > 0 && amount <= remaining) {
      onRecordPayment(sale.id, sale.tunnelId, amount);
      setCustomAmount('');
    }
  };

  return (
    <Dialog open={!!sale} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Historique des paiements - {sale.clientName || 'Client'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-secondary/30 p-3 text-sm">
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="font-semibold">{sale.totalPrice.toLocaleString('fr-FR')} €</p>
            </div>
            <div>
              <p className="text-muted-foreground">Encaissé</p>
              <p className="font-semibold text-profitable">{sale.amountCollected.toLocaleString('fr-FR')} €</p>
            </div>
            <div>
              <p className="text-muted-foreground">Reste</p>
              <p className={`font-semibold ${remaining > 0 ? 'text-warning' : 'text-profitable'}`}>
                {remaining.toLocaleString('fr-FR')} €
              </p>
            </div>
          </div>
          
          {/* Payment History */}
          <div>
            <h4 className="mb-2 text-sm font-medium">Paiements enregistrés</h4>
            {sale.paymentHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun paiement enregistré</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sale.paymentHistory.map((payment) => (
                  <div 
                    key={payment.id} 
                    className="flex items-center justify-between rounded-lg border border-border/50 p-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Check className={`h-4 w-4 ${payment.verified ? 'text-profitable' : 'text-muted-foreground'}`} />
                      <span>{new Date(payment.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <span className="font-medium text-profitable">
                      +{payment.amount.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Add Payment */}
          {remaining > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium">Ajouter un paiement</h4>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder={`Max: ${remaining.toLocaleString('fr-FR')} €`}
                  className="input-field flex-1"
                  min="0"
                  max={remaining}
                  step="0.01"
                />
                <Button 
                  onClick={handleCustomPayment}
                  disabled={!customAmount || parseFloat(customAmount) <= 0 || parseFloat(customAmount) > remaining}
                >
                  Ajouter
                </Button>
              </div>
              
              {/* Quick buttons */}
              <div className="mt-2 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRecordPayment(sale.id, sale.tunnelId, monthlyPayment)}
                  disabled={monthlyPayment > remaining}
                  className="text-xs"
                >
                  Mensualité ({monthlyPayment.toLocaleString('fr-FR')} €)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRecordPayment(sale.id, sale.tunnelId, remaining)}
                  className="text-xs"
                >
                  Solder ({remaining.toLocaleString('fr-FR')} €)
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}