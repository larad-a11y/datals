import { useState } from 'react';
import { RotateCcw, History } from 'lucide-react';
import { Sale, RefundRecord } from '@/types/business';
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
import { Badge } from '@/components/ui/badge';

interface RefundActionsProps {
  sale: Sale;
  onRecordRefund: (saleId: string, tunnelId: string, amount: number, isFull: boolean) => void;
}

export function RefundActions({ sale, onRecordRefund }: RefundActionsProps) {
  const [showPartialDialog, setShowPartialDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  const maxRefundable = sale.amountCollected - (sale.refundedAmount || 0);
  const isFullyRefunded = sale.isFullyRefunded || maxRefundable <= 0;

  if (isFullyRefunded) {
    return (
      <Badge variant="destructive" className="text-xs">
        Remboursée
      </Badge>
    );
  }

  const handleFullRefund = () => {
    onRecordRefund(sale.id, sale.tunnelId, maxRefundable, true);
  };

  const handlePartialRefund = () => {
    const amount = parseFloat(customAmount);
    if (amount > 0 && amount <= maxRefundable) {
      onRecordRefund(sale.id, sale.tunnelId, amount, false);
      setCustomAmount('');
      setShowPartialDialog(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
            <RotateCcw className="h-3 w-3" />
            Rembourser
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleFullRefund} className="gap-2">
            <RotateCcw className="h-4 w-4 text-destructive" />
            <div>
              <p className="font-medium">Remboursement total</p>
              <p className="text-xs text-muted-foreground">
                {maxRefundable.toLocaleString('fr-FR')} €
              </p>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setShowPartialDialog(true)} className="gap-2">
            <RotateCcw className="h-4 w-4 text-warning" />
            <div>
              <p className="font-medium">Remboursement partiel</p>
              <p className="text-xs text-muted-foreground">Saisir un montant</p>
            </div>
          </DropdownMenuItem>

          {(sale.refundHistory || []).length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowHistoryDialog(true)} className="gap-2">
                <History className="h-4 w-4" />
                Historique des remboursements
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Partial Refund Dialog */}
      <Dialog open={showPartialDialog} onOpenChange={setShowPartialDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remboursement partiel - {sale.clientName || 'Client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-secondary/30 p-3 text-sm">
              <p className="text-muted-foreground">Max remboursable</p>
              <p className="font-semibold">{maxRefundable.toLocaleString('fr-FR')} €</p>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder={`Max: ${maxRefundable.toLocaleString('fr-FR')} €`}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 flex-1"
                min="0"
                max={maxRefundable}
                step="0.01"
              />
              <Button
                onClick={handlePartialRefund}
                disabled={!customAmount || parseFloat(customAmount) <= 0 || parseFloat(customAmount) > maxRefundable}
                variant="destructive"
              >
                Rembourser
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Historique des remboursements - {sale.clientName || 'Client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary/30 p-3 text-sm">
              <div>
                <p className="text-muted-foreground">Total encaissé</p>
                <p className="font-semibold">{sale.amountCollected.toLocaleString('fr-FR')} €</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total remboursé</p>
                <p className="font-semibold text-destructive">{(sale.refundedAmount || 0).toLocaleString('fr-FR')} €</p>
              </div>
            </div>
            {(sale.refundHistory || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun remboursement</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(sale.refundHistory || []).map((refund) => (
                  <div key={refund.id} className="flex items-center justify-between rounded-lg border border-border/50 p-2 text-sm">
                    <span>{new Date(refund.date).toLocaleDateString('fr-FR')}</span>
                    <span className="font-medium text-destructive">
                      -{refund.amount.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
