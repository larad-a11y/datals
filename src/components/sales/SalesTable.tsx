import { useState } from 'react';
import { Edit2, Trash2, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, User, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TableFooter } from '@/components/ui/table';

export type OptionalColumn = 'email' | 'tunnelDate' | 'closer' | 'offer' | 'method' | 'payments' | 'schedule' | 'refunded' | 'progress';
export const optionalColumnLabels: Record<OptionalColumn, string> = {
  email: 'Email', tunnelDate: 'Date tunnel', closer: 'Closer', offer: 'Offre', method: 'Moyen',
  payments: 'Paiements', schedule: 'Échéances', refunded: 'Remboursé', progress: 'Progression',
};
import { Sale, TunnelType, tunnelTypeLabels, Closer, Offer, getEffectiveCollectedAmount, getRemainingAmount } from '@/types/business';
import { RefundActions } from './RefundActions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { PaymentActions, PaymentHistoryDialog } from './PaymentActions';
import { Badge } from '@/components/ui/badge';

interface EnrichedSale extends Sale {
  tunnelName?: string;
  tunnelType?: TunnelType;
  tunnelDate?: string;
  tunnelMonth?: string;
}

interface SalesTableProps {
  sales: EnrichedSale[];
  onEdit: (sale: EnrichedSale) => void;
  onDelete: (saleId: string, tunnelId: string) => void;
  onViewTunnel?: (tunnelId: string) => void;
  onRecordPayment?: (saleId: string, tunnelId: string, amount: number) => void;
  onFullyPaid?: (saleId: string, tunnelId: string) => void;
  onToggleDefaulted?: (saleId: string, tunnelId: string, isDefaulted: boolean) => void;
  onRecordRefund?: (saleId: string, tunnelId: string, amount: number, isFull: boolean) => void;
  onCancelRefund?: (saleId: string, tunnelId: string, refundId?: string) => void;
  closers?: Closer[];
  offers?: Offer[];
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  hiddenColumns?: OptionalColumn[];
  totals?: { price: number; collected: number; remaining: number; refunded: number; count: number };
}

export type SortKey = 'createdAt' | 'clientName' | 'totalPrice' | 'amountCollected' | 'tunnelName' | 'offerName' | 'tunnelDate' | 'closer' | 'paymentMethod' | 'numberOfPayments' | 'nextPaymentDate' | 'remaining' | 'refunded' | 'progress';
export type SortDirection = 'asc' | 'desc';

export function SalesTable({ sales, onEdit, onDelete, onViewTunnel, onRecordPayment, onFullyPaid, onToggleDefaulted, onRecordRefund, onCancelRefund, closers = [], offers = [], sortKey, sortDirection, onSort, hiddenColumns = [], totals }: SalesTableProps) {
  const [historyDialogSale, setHistoryDialogSale] = useState<EnrichedSale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<EnrichedSale | null>(null);
  const show = (col: OptionalColumn) => !hiddenColumns.includes(col);
  const fmt = (n: number) => `${(Math.round(n * 100) / 100).toLocaleString('fr-FR')} €`;

  // Helper to check if sale should be auto-defaulted (14 days without payment update)
  const isAutoDefaulted = (sale: EnrichedSale) => {
    if (sale.isDefaulted) return true;
    if (!sale.nextPaymentDate) return false;
    
    const remaining = getRemainingAmount(sale);
    if (remaining <= 0) return false;
    
    const today = new Date();
    const lastUpdate = sale.lastPaymentUpdate ? new Date(sale.lastPaymentUpdate) : new Date(sale.createdAt);
    const daysSinceUpdate = Math.floor((today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    
    const dueDate = new Date(sale.nextPaymentDate);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Auto-defaulted if payment is overdue AND no update in 14 days
    return daysOverdue > 0 && daysSinceUpdate >= 14;
  };

  // Helper to get closer name
  const getCloserName = (closerId?: string) => {
    if (!closerId) return null;
    const closer = closers.find(c => c.id === closerId);
    return closer ? `${closer.firstName} ${closer.lastName}` : null;
  };

  const handleSort = (key: SortKey) => {
    onSort(key);
  };

  const sortedSales = [...sales].sort((a, b) => {
    let comparison = 0;
    switch (sortKey) {
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'clientName':
        comparison = (a.clientName || '').localeCompare(b.clientName || '');
        break;
      case 'totalPrice':
        comparison = a.totalPrice - b.totalPrice;
        break;
      case 'amountCollected':
        comparison = a.amountCollected - b.amountCollected;
        break;
      case 'tunnelName':
        comparison = (a.tunnelName || '').localeCompare(b.tunnelName || '');
        break;
      case 'offerName': {
        const offerNameA = offers.find(o => o.id === a.offerId)?.name || '';
        const offerNameB = offers.find(o => o.id === b.offerId)?.name || '';
        comparison = offerNameA.localeCompare(offerNameB);
        break;
      }
      case 'tunnelDate':
        comparison = new Date(a.tunnelDate || 0).getTime() - new Date(b.tunnelDate || 0).getTime();
        break;
      case 'closer':
        comparison = (getCloserName(a.closerId) || '').localeCompare(getCloserName(b.closerId) || '');
        break;
      case 'paymentMethod':
        comparison = (a.paymentMethod || 'cb').localeCompare(b.paymentMethod || 'cb');
        break;
      case 'numberOfPayments':
        comparison = a.numberOfPayments - b.numberOfPayments;
        break;
      case 'nextPaymentDate':
        comparison = new Date(a.nextPaymentDate || 0).getTime() - new Date(b.nextPaymentDate || 0).getTime();
        break;
      case 'remaining': {
        const remainingA = getRemainingAmount(a);
        const remainingB = getRemainingAmount(b);
        comparison = remainingA - remainingB;
        break;
      }
      case 'refunded':
        comparison = (a.refundedAmount || 0) - (b.refundedAmount || 0);
        break;
      case 'progress': {
        const progressA = a.isFullyRefunded ? 0 : a.totalPrice > 0 ? (getEffectiveCollectedAmount(a) / a.totalPrice) * 100 : 0;
        const progressB = b.isFullyRefunded ? 0 : b.totalPrice > 0 ? (getEffectiveCollectedAmount(b) / b.totalPrice) * 100 : 0;
        comparison = progressA - progressB;
        break;
      }
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <button
      onClick={() => handleSort(sortKeyName)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      {sortKey === sortKeyName ? (
        sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </button>
  );

  // Get row status class based on payment verification status
  const getRowStatusClass = (sale: EnrichedSale) => {
    const remaining = getRemainingAmount(sale);
    const isPaid = remaining <= 0;
    
    if (isPaid) return 'bg-profitable/5 border-l-2 border-l-profitable';
    
    // Check if sale is defaulted (manual or auto)
    if (sale.isDefaulted || isAutoDefaulted(sale)) {
      return 'bg-danger/10 border-l-4 border-l-danger';
    }
    
    // Check if payment needs verification (1+ day after payment date)
    if (sale.nextPaymentDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(sale.nextPaymentDate);
      dueDate.setHours(0, 0, 0, 0);
      
      // diffDays: negative = payment date has passed
      const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Highlight rows that need verification (payment date has passed)
      if (diffDays <= -1) {
        const daysOverdue = Math.abs(diffDays);
        if (daysOverdue > 3) return 'bg-danger/5 border-l-2 border-l-danger'; // Urgent - more than 3 days
        return 'bg-warning/5 border-l-2 border-l-warning'; // To verify - 1-3 days after
      }
    }
    
    return ''; // Default - payment not yet due
  };

  // Handle payment recording
  const handleRecordPayment = (saleId: string, tunnelId: string, amount: number) => {
    if (onRecordPayment) {
      onRecordPayment(saleId, tunnelId, amount);
    }
    setHistoryDialogSale(null);
  };

  const handleFullyPaid = (saleId: string, tunnelId: string) => {
    if (onFullyPaid) {
      onFullyPaid(saleId, tunnelId);
    }
  };

  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">Aucune vente trouvée</p>
        <p className="text-sm text-muted-foreground">Ajoutez des ventes depuis les tunnels</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/30">
            <TableHead>
              <SortHeader label="Date" sortKeyName="createdAt" />
            </TableHead>
            <TableHead>
              <SortHeader label="Client" sortKeyName="clientName" />
            </TableHead>
            <TableHead>
              <SortHeader label="Tunnel" sortKeyName="tunnelName" />
            </TableHead>
            {show('tunnelDate') && <TableHead><SortHeader label="Date" sortKeyName="tunnelDate" /></TableHead>}
            {show('closer') && <TableHead><SortHeader label="Closer" sortKeyName="closer" /></TableHead>}
            {show('offer') && <TableHead><SortHeader label="Offre" sortKeyName="offerName" /></TableHead>}
            {show('method') && <TableHead><SortHeader label="Moyen" sortKeyName="paymentMethod" /></TableHead>}
            <TableHead className="text-right">
              <SortHeader label="Prix" sortKeyName="totalPrice" />
            </TableHead>
            {show('payments') && <TableHead className="text-center"><SortHeader label="Paiements" sortKeyName="numberOfPayments" /></TableHead>}
            {show('schedule') && <TableHead><SortHeader label="Échéances" sortKeyName="nextPaymentDate" /></TableHead>}
            <TableHead className="text-right">
              <SortHeader label="Encaissé" sortKeyName="amountCollected" />
            </TableHead>
            <TableHead className="text-right">
              <SortHeader label="Reste" sortKeyName="remaining" />
            </TableHead>
            {show('refunded') && <TableHead className="text-right"><SortHeader label="Remboursé" sortKeyName="refunded" /></TableHead>}
            {show('progress') && <TableHead className="w-[120px]"><SortHeader label="Progression" sortKeyName="progress" /></TableHead>}
            <TableHead className="w-[120px]">Paiement</TableHead>
            <TableHead className="w-[120px]">Remb.</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedSales.map((sale) => {
            const remaining = getRemainingAmount(sale);
            const effectiveCollected = getEffectiveCollectedAmount(sale);
            const progress = sale.isFullyRefunded ? 0 : sale.totalPrice > 0 ? (effectiveCollected / sale.totalPrice) * 100 : 0;
            const isPaid = remaining <= 0;
            const rowClass = getRowStatusClass(sale);
            const saleIsDefaulted = sale.isDefaulted || isAutoDefaulted(sale);

            return (
              <TableRow key={sale.id} className={`hover:bg-secondary/20 ${rowClass}`}>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(sale.createdAt).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      {sale.clientName || <span className="text-muted-foreground italic">Sans nom</span>}
                      {saleIsDefaulted && (
                        <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Impayé
                        </Badge>
                      )}
                    </div>
                    {show('email') && sale.clientEmail && (
                      <span className="text-xs text-muted-foreground">{sale.clientEmail}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {sale.tunnelType && (
                      <span className={`badge-${sale.tunnelType === 'webinar' ? 'profitable' : sale.tunnelType === 'vsl' ? 'warning' : 'danger'} text-xs`}>
                        {tunnelTypeLabels[sale.tunnelType]}
                      </span>
                    )}
                    <span className="text-sm">{sale.tunnelName}</span>
                  </div>
                </TableCell>
                {show('tunnelDate') && (
                <TableCell className="text-sm text-muted-foreground">
                  {sale.tunnelDate ? new Date(sale.tunnelDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '-'}
                </TableCell>
                )}
                {show('closer') && (
                <TableCell>
                  {sale.closerId ? (
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        {getCloserName(sale.closerId)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Aucun</span>
                  )}
                </TableCell>
                )}
                {show('offer') && (
                <TableCell className="text-sm">
                  {sale.offerId ? (
                    <Badge variant="outline" className="text-xs">
                      {offers.find(o => o.id === sale.offerId)?.name || '-'}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">-</span>
                  )}
                </TableCell>
                )}
                {show('method') && (
                <TableCell className="text-sm">
                  <Badge variant="outline" className="text-xs">
                    {sale.paymentMethod === 'virement' ? 'Virement' : 'CB'}
                  </Badge>
                </TableCell>
                )}
                <TableCell className="text-right font-medium">
                  <div className="flex flex-col items-end">
                    <span className="whitespace-nowrap">{sale.totalPrice.toLocaleString('fr-FR')} €</span>
                    {sale.basePrice && sale.basePrice < sale.totalPrice && (
                      <span className="text-xs text-profitable">
                        +{(((sale.totalPrice - sale.basePrice) / sale.basePrice) * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </TableCell>
                {show('payments') && (
                <TableCell className="text-center text-sm text-muted-foreground">
                  {sale.numberOfPayments}x
                </TableCell>
                )}
                {show('schedule') && (
                <TableCell>
                  {sale.paymentHistory && sale.paymentHistory.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {sale.paymentHistory.map((payment, idx) => (
                        <span 
                          key={payment.id} 
                          className={`text-xs ${payment.verified ? 'text-profitable' : 'text-muted-foreground'}`}
                        >
                          {idx + 1}. {new Date(payment.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          {payment.verified && ' ✓'}
                        </span>
                      ))}
                      {sale.nextPaymentDate && !isPaid && (
                        <span className="text-xs text-warning">
                          {sale.paymentHistory.length + 1}. {new Date(sale.nextPaymentDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  ) : sale.nextPaymentDate ? (
                    <span className="text-xs text-warning">
                      1. {new Date(sale.nextPaymentDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                )}
                <TableCell className="text-right font-medium text-profitable">
                  {effectiveCollected.toLocaleString('fr-FR')} €
                </TableCell>
                <TableCell className={`text-right font-medium ${isPaid ? 'text-profitable' : 'text-warning'}`}>
                  {remaining.toLocaleString('fr-FR')} €
                </TableCell>
                {show('refunded') && (
                <TableCell className="text-right">
                  {(sale.refundedAmount || 0) > 0 ? (
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-destructive">
                        {(sale.refundedAmount || 0).toLocaleString('fr-FR')} €
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {sale.isFullyRefunded ? '(total)' : '(partiel)'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                )}
                {show('progress') && (
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={progress} 
                      className={`h-2 flex-1 ${isPaid ? '[&>div]:bg-profitable' : '[&>div]:bg-warning'}`} 
                    />
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {Math.round(progress)}%
                    </span>
                  </div>
                </TableCell>
                )}
                <TableCell>
                  {onRecordPayment && onFullyPaid ? (
                    <PaymentActions
                      sale={sale}
                      onRecordPayment={handleRecordPayment}
                      onFullyPaid={handleFullyPaid}
                      onViewHistory={setHistoryDialogSale}
                    />
                  ) : (
                    <span className={`text-xs ${isPaid ? 'text-profitable' : 'text-muted-foreground'}`}>
                      {isPaid ? 'Soldé' : `${sale.numberOfPayments}x`}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {onRecordRefund ? (
                    <RefundActions
                      sale={sale}
                      onRecordRefund={onRecordRefund}
                      onCancelRefund={onCancelRefund}
                    />
                  ) : sale.isFullyRefunded ? (
                    <Badge variant="destructive" className="text-xs">Remboursée</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {/* Toggle defaulted button */}
                    {onToggleDefaulted && !isPaid && (
                      <button
                        onClick={() => onToggleDefaulted(sale.id, sale.tunnelId, !saleIsDefaulted)}
                        className={`rounded p-1.5 ${saleIsDefaulted 
                          ? 'text-profitable hover:bg-profitable/10' 
                          : 'text-muted-foreground hover:bg-danger/10 hover:text-danger'}`}
                        title={saleIsDefaulted ? 'Réactiver' : 'Marquer en impayé'}
                      >
                        {saleIsDefaulted ? <RefreshCw className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(sale)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      title="Modifier"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setSaleToDelete(sale)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {onViewTunnel && (
                      <button
                        onClick={() => onViewTunnel(sale.tunnelId)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Voir le tunnel"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        {totals && (
          <TableFooter>
            <TableRow className="bg-secondary/40 font-semibold">
              <TableCell colSpan={3 + (['tunnelDate', 'closer', 'offer', 'method'] as OptionalColumn[]).filter(show).length}>
                Total ({totals.count} vente{totals.count > 1 ? 's' : ''} filtrée{totals.count > 1 ? 's' : ''})
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">{fmt(totals.price)}</TableCell>
              {(show('payments') || show('schedule')) && (
                <TableCell colSpan={(['payments', 'schedule'] as OptionalColumn[]).filter(show).length} />
              )}
              <TableCell className="text-right whitespace-nowrap text-profitable">{fmt(totals.collected)}</TableCell>
              <TableCell className="text-right whitespace-nowrap text-warning">{fmt(totals.remaining)}</TableCell>
              {show('refunded') && <TableCell className="text-right whitespace-nowrap text-destructive">{fmt(totals.refunded)}</TableCell>}
              <TableCell colSpan={3 + (show('progress') ? 1 : 0)} />
            </TableRow>
          </TableFooter>
        )}
      </Table>
      
      {/* Payment History Dialog */}
      {onRecordPayment && (
        <PaymentHistoryDialog
          sale={historyDialogSale}
          onClose={() => setHistoryDialogSale(null)}
          onRecordPayment={handleRecordPayment}
        />
      )}

      <AlertDialog open={!!saleToDelete} onOpenChange={(open) => !open && setSaleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette vente ?</AlertDialogTitle>
            <AlertDialogDescription>
              La vente de {saleToDelete?.clientName || 'ce client'} ({saleToDelete ? fmt(saleToDelete.totalPrice) : ''}) sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (saleToDelete) onDelete(saleToDelete.id, saleToDelete.tunnelId);
                setSaleToDelete(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
