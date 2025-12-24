import { useState } from 'react';
import { Edit2, Trash2, ExternalLink, ArrowUpDown, User } from 'lucide-react';
import { Sale, TunnelType, tunnelTypeLabels, Closer } from '@/types/business';
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
  closers?: Closer[];
}

type SortKey = 'createdAt' | 'clientName' | 'totalPrice' | 'amountCollected' | 'tunnelName';
type SortDirection = 'asc' | 'desc';

export function SalesTable({ sales, onEdit, onDelete, onViewTunnel, onRecordPayment, onFullyPaid, closers = [] }: SalesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [historyDialogSale, setHistoryDialogSale] = useState<EnrichedSale | null>(null);

  // Helper to get closer name
  const getCloserName = (closerId?: string) => {
    if (!closerId) return null;
    const closer = closers.find(c => c.id === closerId);
    return closer ? `${closer.firstName} ${closer.lastName}` : null;
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
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
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <button
      onClick={() => handleSort(sortKeyName)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sortKey === sortKeyName ? 'text-primary' : ''}`} />
    </button>
  );

  // Get row status class based on payment verification status
  const getRowStatusClass = (sale: EnrichedSale) => {
    const remaining = sale.totalPrice - sale.amountCollected;
    const isPaid = remaining <= 0;
    
    if (isPaid) return 'bg-profitable/5 border-l-2 border-l-profitable';
    
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
              <SortHeader label="Date vente" sortKeyName="createdAt" />
            </TableHead>
            <TableHead>
              <SortHeader label="Client" sortKeyName="clientName" />
            </TableHead>
            <TableHead>
              <SortHeader label="Tunnel" sortKeyName="tunnelName" />
            </TableHead>
            <TableHead>Date tunnel</TableHead>
            <TableHead>Closer</TableHead>
            <TableHead className="text-right">
              <SortHeader label="Prix" sortKeyName="totalPrice" />
            </TableHead>
            <TableHead className="text-center">Paiements</TableHead>
            <TableHead>Dates paiements</TableHead>
            <TableHead className="text-right">
              <SortHeader label="Encaissé" sortKeyName="amountCollected" />
            </TableHead>
            <TableHead className="text-right">Reste</TableHead>
            <TableHead className="w-[120px]">Progression</TableHead>
            <TableHead className="w-[120px]">Paiement</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedSales.map((sale) => {
            const remaining = sale.totalPrice - sale.amountCollected;
            const progress = sale.totalPrice > 0 ? (sale.amountCollected / sale.totalPrice) * 100 : 0;
            const isPaid = remaining <= 0;
            const rowClass = getRowStatusClass(sale);

            return (
              <TableRow key={sale.id} className={`hover:bg-secondary/20 ${rowClass}`}>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(sale.createdAt).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell className="font-medium">
                  {sale.clientName || <span className="text-muted-foreground italic">Sans nom</span>}
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
                <TableCell className="text-sm text-muted-foreground">
                  {sale.tunnelDate ? new Date(sale.tunnelDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '-'}
                </TableCell>
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
                <TableCell className="text-right font-medium">
                  <div className="flex flex-col items-end">
                    <span>{sale.totalPrice.toLocaleString('fr-FR')} €</span>
                    {sale.basePrice && sale.basePrice < sale.totalPrice && (
                      <span className="text-xs text-profitable">
                        +{(((sale.totalPrice - sale.basePrice) / sale.basePrice) * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">
                  {sale.numberOfPayments}x
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    {sale.paymentHistory && sale.paymentHistory.length > 0 ? (
                      sale.paymentHistory.slice(0, 3).map((payment, index) => (
                        <span key={payment.id} className="text-xs text-muted-foreground">
                          {index + 1}. {new Date(payment.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          {payment.verified && <span className="ml-1 text-profitable">✓</span>}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Aucun</span>
                    )}
                    {sale.paymentHistory && sale.paymentHistory.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{sale.paymentHistory.length - 3} autres
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium text-profitable">
                  {sale.amountCollected.toLocaleString('fr-FR')} €
                </TableCell>
                <TableCell className={`text-right font-medium ${isPaid ? 'text-profitable' : 'text-warning'}`}>
                  {remaining.toLocaleString('fr-FR')} €
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={progress} variant={isPaid ? "profitable" : "warning"} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {Math.round(progress)}%
                    </span>
                  </div>
                </TableCell>
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
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(sale)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                      title="Modifier"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(sale.id, sale.tunnelId)}
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
      </Table>
      
      {/* Payment History Dialog */}
      {onRecordPayment && (
        <PaymentHistoryDialog
          sale={historyDialogSale}
          onClose={() => setHistoryDialogSale(null)}
          onRecordPayment={handleRecordPayment}
        />
      )}
    </div>
  );
}
