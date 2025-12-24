import { useState } from 'react';
import { Edit2, Trash2, ExternalLink, ArrowUpDown } from 'lucide-react';
import { Sale, TunnelType, tunnelTypeLabels } from '@/types/business';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

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
}

type SortKey = 'createdAt' | 'clientName' | 'totalPrice' | 'amountCollected' | 'tunnelName';
type SortDirection = 'asc' | 'desc';

export function SalesTable({ sales, onEdit, onDelete, onViewTunnel }: SalesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
            <TableHead className="text-right">
              <SortHeader label="Prix total" sortKeyName="totalPrice" />
            </TableHead>
            <TableHead className="text-center">Paiements</TableHead>
            <TableHead className="text-right">
              <SortHeader label="Encaissé" sortKeyName="amountCollected" />
            </TableHead>
            <TableHead className="text-right">Reste</TableHead>
            <TableHead className="w-[120px]">Progression</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedSales.map((sale) => {
            const remaining = sale.totalPrice - sale.amountCollected;
            const progress = sale.totalPrice > 0 ? (sale.amountCollected / sale.totalPrice) * 100 : 0;
            const isPaid = remaining <= 0;
            const isPartial = sale.amountCollected > 0 && remaining > 0;

            return (
              <TableRow key={sale.id} className="hover:bg-secondary/20">
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
                <TableCell className="text-right font-medium">
                  {sale.totalPrice.toLocaleString('fr-FR')} €
                </TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">
                  {sale.numberOfPayments}x
                </TableCell>
                <TableCell className="text-right font-medium text-profitable">
                  {sale.amountCollected.toLocaleString('fr-FR')} €
                </TableCell>
                <TableCell className={`text-right font-medium ${isPaid ? 'text-profitable' : 'text-warning'}`}>
                  {remaining.toLocaleString('fr-FR')} €
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={progress} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {Math.round(progress)}%
                    </span>
                  </div>
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
    </div>
  );
}
