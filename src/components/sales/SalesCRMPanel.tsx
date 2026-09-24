import { useState, useMemo } from 'react';
import { Receipt, TrendingUp, Clock, CheckCircle, RotateCcw, Download, Columns3 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Sale, Tunnel, TunnelType, InstallmentPlan, Offer, defaultInstallmentPlans, Closer, getEffectiveCollectedAmount, getEffectiveContractedAmount, getRemainingAmount } from '@/types/business';
import { SalesFilters, PaymentStatus } from './SalesFilters';
import { SalesTable, SortDirection, SortKey, OptionalColumn, optionalColumnLabels } from './SalesTable';
import { SaleForm } from '@/components/tunnels/SaleForm';

interface EnrichedSale extends Sale {
  tunnelName?: string;
  tunnelType?: TunnelType;
  tunnelDate?: string;
  tunnelMonth?: string;
}

interface SalesCRMPanelProps {
  tunnels: Tunnel[];
  getAllSales: () => EnrichedSale[];
  onUpdateSale: (tunnelId: string, saleId: string, updates: Partial<Sale>) => void;
  onDeleteSale: (tunnelId: string, saleId: string) => void;
  onNavigateToTunnel?: (tunnelId: string) => void;
  initialTunnelFilter?: string;
  onRecordPayment: (saleId: string, tunnelId: string, amount: number) => void;
  onFullyPaid: (saleId: string, tunnelId: string) => void;
  onToggleDefaulted?: (saleId: string, tunnelId: string, isDefaulted: boolean) => void;
  onRecordRefund?: (saleId: string, tunnelId: string, amount: number, isFull: boolean) => void;
  onCancelRefund?: (saleId: string, tunnelId: string, refundId?: string) => void;
  installmentPlans?: InstallmentPlan[];
  offers?: Offer[];
  closers?: Closer[];
}

const ITEMS_PER_PAGE = 20;

export function SalesCRMPanel({
  tunnels,
  getAllSales,
  onUpdateSale,
  onDeleteSale,
  onNavigateToTunnel,
  initialTunnelFilter = '',
  onRecordPayment,
  onFullyPaid,
  onToggleDefaulted,
  onRecordRefund,
  onCancelRefund,
  installmentPlans = defaultInstallmentPlans,
  offers = [],
  closers = [],
}: SalesCRMPanelProps) {
  const [selectedTunnelId, setSelectedTunnelId] = useState(initialTunnelFilter);
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedCloserId, setSelectedCloserId] = useState('');
  const [selectedOfferId, setSelectedOfferId] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [editingSale, setEditingSale] = useState<EnrichedSale | null>(null);
  const [minRemaining, setMinRemaining] = useState('');
  const [hiddenColumns, setHiddenColumns] = useState<OptionalColumn[]>(() => {
    try { return JSON.parse(localStorage.getItem('sales_hidden_columns') || '[]'); } catch { return []; }
  });
  const toggleColumn = (col: OptionalColumn) => {
    setHiddenColumns((prev) => {
      const next = prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col];
      localStorage.setItem('sales_hidden_columns', JSON.stringify(next));
      return next;
    });
  };

  const allSales = useMemo(() => getAllSales(), [getAllSales]);

  // Filter sales
  const filteredSales = useMemo(() => {
    return allSales.filter((sale) => {
      // Tunnel filter
      if (selectedTunnelId && sale.tunnelId !== selectedTunnelId) return false;

      // Month filter
      if (selectedMonth && sale.tunnelMonth !== selectedMonth) return false;

      // Closer filter
      if (selectedCloserId && sale.closerId !== selectedCloserId) return false;

      // Offer filter
      if (selectedOfferId) {
        if (selectedOfferId === 'none' && sale.offerId) return false;
        if (selectedOfferId !== 'none' && sale.offerId !== selectedOfferId) return false;
      }

      // Payment method filter
      if (selectedPaymentMethod && sale.paymentMethod !== selectedPaymentMethod) return false;

      // Date range filter - parse dates as local dates to avoid timezone issues
      if (dateRange.from || dateRange.to) {
        // Parse sale date as local date (YYYY-MM-DD string)
        const saleDateParts = sale.saleDate.split('-').map(Number);
        const saleDate = new Date(saleDateParts[0], saleDateParts[1] - 1, saleDateParts[2]);
        
        if (dateRange.from) {
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          if (saleDate < fromDate) return false;
        }
        
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (saleDate > toDate) return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesClient = sale.clientName?.toLowerCase().includes(query);
        const matchesTunnel = sale.tunnelName?.toLowerCase().includes(query);
        const matchesEmail = sale.clientEmail?.toLowerCase().includes(query);
        if (!matchesClient && !matchesTunnel && !matchesEmail) return false;
      }

      // Minimum remaining amount filter
      const minRem = parseFloat(minRemaining.replace(',', '.'));
      if (!isNaN(minRem) && minRem > 0 && getRemainingAmount(sale) < minRem) return false;

      // Status filter
      if (selectedStatus !== 'all') {
        const remaining = getRemainingAmount(sale);
        const isRefunded = (sale.refundedAmount || 0) > 0;
        // Auto-defaulted: payment overdue AND no update in 14 days (same logic as SalesTable)
        let isDefaulted = sale.isDefaulted === true;
        if (!isDefaulted && remaining > 0 && sale.nextPaymentDate) {
          const today = new Date();
          const lastUpdate = sale.lastPaymentUpdate ? new Date(sale.lastPaymentUpdate) : new Date(sale.createdAt);
          const daysSinceUpdate = Math.floor((today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
          const daysOverdue = Math.floor((today.getTime() - new Date(sale.nextPaymentDate).getTime()) / (1000 * 60 * 60 * 24));
          isDefaulted = daysOverdue > 0 && daysSinceUpdate >= 14;
        }
        const isPaid = remaining <= 0 && !isRefunded;
        const effectiveCollected = getEffectiveCollectedAmount(sale);
        const isPartial = effectiveCollected > 0 && remaining > 0 && !isDefaulted;
        const isPending = effectiveCollected === 0 && remaining > 0 && !isDefaulted && !sale.isFullyRefunded;

        if (selectedStatus === 'paid' && !isPaid) return false;
        if (selectedStatus === 'partial' && !isPartial) return false;
        if (selectedStatus === 'pending' && !isPending) return false;
        if (selectedStatus === 'defaulted' && !isDefaulted) return false;
        if (selectedStatus === 'refunded' && !isRefunded) return false;
      }

      return true;
    });
  }, [allSales, selectedTunnelId, selectedMonth, selectedCloserId, selectedOfferId, selectedPaymentMethod, dateRange, searchQuery, selectedStatus, minRemaining]);

  const sortedFilteredSales = useMemo(() => {
    const closerName = (id?: string) => {
      const closer = closers.find((item) => item.id === id);
      return closer ? `${closer.firstName} ${closer.lastName}` : '';
    };

    return [...filteredSales].sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case 'createdAt': comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
        case 'clientName': comparison = (a.clientName || '').localeCompare(b.clientName || ''); break;
        case 'totalPrice': comparison = a.totalPrice - b.totalPrice; break;
        case 'amountCollected': comparison = a.amountCollected - b.amountCollected; break;
        case 'tunnelName': comparison = (a.tunnelName || '').localeCompare(b.tunnelName || ''); break;
        case 'offerName': comparison = (offers.find(o => o.id === a.offerId)?.name || '').localeCompare(offers.find(o => o.id === b.offerId)?.name || ''); break;
        case 'tunnelDate': comparison = new Date(a.tunnelDate || 0).getTime() - new Date(b.tunnelDate || 0).getTime(); break;
        case 'closer': comparison = closerName(a.closerId).localeCompare(closerName(b.closerId)); break;
        case 'paymentMethod': comparison = (a.paymentMethod || 'cb').localeCompare(b.paymentMethod || 'cb'); break;
        case 'numberOfPayments': comparison = a.numberOfPayments - b.numberOfPayments; break;
        case 'nextPaymentDate': comparison = new Date(a.nextPaymentDate || 0).getTime() - new Date(b.nextPaymentDate || 0).getTime(); break;
        case 'remaining': comparison = getRemainingAmount(a) - getRemainingAmount(b); break;
        case 'refunded': comparison = (a.refundedAmount || 0) - (b.refundedAmount || 0); break;
        case 'progress': {
          const progressA = a.isFullyRefunded ? 0 : a.totalPrice > 0 ? getEffectiveCollectedAmount(a) / a.totalPrice : 0;
          const progressB = b.isFullyRefunded ? 0 : b.totalPrice > 0 ? getEffectiveCollectedAmount(b) / b.totalPrice : 0;
          comparison = progressA - progressB;
          break;
        }
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredSales, sortKey, sortDirection, closers, offers]);

  const handleSort = (key: SortKey) => {
    setCurrentPage(1);
    if (sortKey === key) {
      setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  // Pagination is applied after sorting the complete filtered result.
  const totalPages = Math.ceil(filteredSales.length / ITEMS_PER_PAGE);
  const paginatedSales = sortedFilteredSales.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Global stats
  const stats = useMemo(() => {
    const totalContracted = filteredSales.reduce((sum, s) => sum + getEffectiveContractedAmount(s), 0);
    const totalCollected = filteredSales.reduce((sum, s) => sum + getEffectiveCollectedAmount(s), 0);
    const remaining = filteredSales.reduce((sum, s) => sum + getRemainingAmount(s), 0);
    const paidCount = filteredSales.filter((s) => !s.isFullyRefunded && getRemainingAmount(s) <= 0).length;
    const totalRefunded = filteredSales.reduce((sum, s) => sum + (s.refundedAmount || 0), 0);
    const refundedCount = filteredSales.filter((s) => (s.refundedAmount || 0) > 0).length;

    return {
      totalContracted,
      totalCollected,
      remaining,
      totalSales: filteredSales.length,
      paidCount,
      pendingCount: filteredSales.length - paidCount,
      totalRefunded,
      refundedCount,
      totalPrice: filteredSales.reduce((sum, s) => sum + s.totalPrice, 0),
    };
  }, [filteredSales]);

  const handleEditSale = (sale: EnrichedSale) => {
    setEditingSale(sale);
  };

  const handleSaveEdit = (data: Omit<Sale, 'id' | 'createdAt'>) => {
    if (editingSale) {
      onUpdateSale(editingSale.tunnelId, editingSale.id, data);
      setEditingSale(null);
    }
  };

  const handleDeleteSale = (saleId: string, tunnelId: string) => {
    onDeleteSale(tunnelId, saleId);
  };

  const downloadCSV = (headers: string[], rows: unknown[][], filename: string) => {
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = '\uFEFF' + [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const refundedSales = useMemo(() => sortedFilteredSales.filter((s) => (s.refundedAmount || 0) > 0), [sortedFilteredSales]);

  const handleExportRefundsCSV = () => {
    const headers = ['Date vente', 'Client', 'Email', 'Tunnel', 'Prix total', 'Encaissé (brut)', 'Montant remboursé', 'Type', 'Date(s) remboursement', 'Motif(s)'];
    const rows = refundedSales.map((s) => {
      const history = s.refundHistory;
      return [
        s.saleDate, s.clientName || '', s.clientEmail || '', s.tunnelName || '',
        s.totalPrice, s.amountCollected, s.refundedAmount || 0,
        s.isFullyRefunded ? 'Total' : 'Partiel',
        (history || []).map((h) => h.date ? new Date(h.date).toLocaleDateString('fr-FR') : '').filter(Boolean).join(' | '),
        (history || []).map((h) => h.reason || '').filter(Boolean).join(' | '),
      ];
    });
    downloadCSV(headers, rows, `remboursements_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportCSV = () => {
    const headers = [
      'Date vente', 'Client', 'Email', 'Tunnel', 'Type tunnel', 'Date tunnel', 'Mois',
      'Closer', 'Offre', 'Méthode paiement', 'Prix de base', 'Prix total',
      'Nb échéances', 'Encaissé', 'Reste', 'Remboursé', 'Statut',
      'Montant CB', 'Montant Klarna', 'Prochaine échéance'
    ];

    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const getStatus = (s: EnrichedSale) => {
      if (s.isFullyRefunded) return 'Remboursée';
      const remaining = getRemainingAmount(s);
      if (s.isDefaulted) return 'Impayé';
      if (remaining <= 0) return 'Payée';
      if (s.amountCollected > 0) return 'Partielle';
      return 'En attente';
    };

    const closerName = (id?: string) => {
      const c = closers.find((c) => c.id === id);
      return c ? `${c.firstName} ${c.lastName}`.trim() : '';
    };
    const offerName = (id?: string) => offers.find((o) => o.id === id)?.name || '';

    const rows = sortedFilteredSales.map((s) => [
      s.saleDate, s.clientName || '', s.clientEmail || '', s.tunnelName || '',
      s.tunnelType || '', s.tunnelDate || '', s.tunnelMonth || '',
      closerName(s.closerId), offerName(s.offerId), s.paymentMethod || '',
      s.basePrice, s.totalPrice, s.numberOfPayments || 1,
      getEffectiveCollectedAmount(s), getRemainingAmount(s), s.refundedAmount || 0,
      getStatus(s), s.cbAmount ?? '', s.klarnaAmount ?? '', s.nextPaymentDate || '',
    ].map(escape).join(','));

    const csv = '\uFEFF' + [headers.map(escape).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `ventes_${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Ventes
        </h2>
        <p className="text-sm text-muted-foreground">
          Vue centralisée de toutes vos ventes
        </p>
      </div>

      {/* Global Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="kpi-card kpi-profitable">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-profitable/20">
              <Receipt className="h-5 w-5 text-profitable" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CA Contracté</p>
              <p className="font-display text-xl font-bold text-foreground">
                {stats.totalContracted.toLocaleString('fr-FR')} €
              </p>
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-profitable">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-profitable/20">
              <TrendingUp className="h-5 w-5 text-profitable" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Encaissé</p>
              <p className="font-display text-xl font-bold text-profitable">
                {stats.totalCollected.toLocaleString('fr-FR')} €
              </p>
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-warning">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/20">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reste à encaisser</p>
              <p className="font-display text-xl font-bold text-warning">
                {stats.remaining.toLocaleString('fr-FR')} €
              </p>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <CheckCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ventes</p>
              <p className="font-display text-xl font-bold text-foreground">
                {stats.paidCount} / {stats.totalSales}
                <span className="ml-1 text-sm font-normal text-muted-foreground">payées</span>
              </p>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/20">
              <RotateCcw className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remboursements</p>
              <p className="font-display text-xl font-bold text-destructive">
                {stats.totalRefunded.toLocaleString('fr-FR')} €
              </p>
              <p className="text-xs text-muted-foreground">
                {stats.refundedCount} vente{stats.refundedCount > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <SalesFilters
        tunnels={tunnels}
        selectedTunnelId={selectedTunnelId}
        onTunnelChange={(id) => {
          setSelectedTunnelId(id);
          handleFilterChange();
        }}
        selectedStatus={selectedStatus}
        onStatusChange={(status) => {
          setSelectedStatus(status);
          handleFilterChange();
        }}
        searchQuery={searchQuery}
        onSearchChange={(query) => {
          setSearchQuery(query);
          handleFilterChange();
        }}
        selectedMonth={selectedMonth}
        onMonthChange={(month) => {
          setSelectedMonth(month);
          handleFilterChange();
        }}
        closers={closers}
        selectedCloserId={selectedCloserId}
        onCloserChange={(id) => {
          setSelectedCloserId(id);
          handleFilterChange();
        }}
        offers={offers}
        selectedOfferId={selectedOfferId}
        onOfferChange={(id) => {
          setSelectedOfferId(id);
          handleFilterChange();
        }}
        selectedPaymentMethod={selectedPaymentMethod}
        onPaymentMethodChange={(method) => {
          setSelectedPaymentMethod(method);
          handleFilterChange();
        }}
        dateRange={dateRange}
        onDateRangeChange={(range) => {
          setDateRange(range);
          handleFilterChange();
        }}
      />

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
        <span>
          {filteredSales.length} vente{filteredSales.length !== 1 ? 's' : ''} trouvée{filteredSales.length !== 1 ? 's' : ''}
        </span>
          <input
            type="number"
            min={0}
            value={minRemaining}
            onWheel={(e) => (e.target as HTMLInputElement).blur()}
            onChange={(e) => { setMinRemaining(e.target.value); setCurrentPage(1); }}
            placeholder="Reste min. (€)"
            className="input-field w-36 py-1.5 text-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={filteredSales.length === 0}
            className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Exporter les ventes filtrées en CSV"
          >
            <Download className="h-4 w-4" />
            Exporter CSV
          </button>
          <button
            onClick={handleExportRefundsCSV}
            disabled={refundedSales.length === 0}
            className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Exporter uniquement les ventes remboursées (filtres appliqués)"
          >
            <RotateCcw className="h-4 w-4" />
            CSV remboursements
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors">
                <Columns3 className="h-4 w-4" />
                Colonnes
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-52 space-y-2">
              {(Object.keys(optionalColumnLabels) as OptionalColumn[]).map((col) => (
                <label key={col} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={!hiddenColumns.includes(col)} onCheckedChange={() => toggleColumn(col)} />
                  {optionalColumnLabels[col]}
                </label>
              ))}
            </PopoverContent>
          </Popover>
          {totalPages > 1 && (
            <span>
              Page {currentPage} sur {totalPages}
            </span>
          )}
        </div>
      </div>

      {/* Sales Table */}
      <SalesTable
        sales={paginatedSales}
        onEdit={handleEditSale}
        onDelete={handleDeleteSale}
        onViewTunnel={onNavigateToTunnel}
        onRecordPayment={onRecordPayment}
        onFullyPaid={onFullyPaid}
        onToggleDefaulted={onToggleDefaulted}
        onRecordRefund={onRecordRefund}
        onCancelRefund={onCancelRefund}
        closers={closers}
        offers={offers}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={handleSort}
        hiddenColumns={hiddenColumns}
        totals={{ price: stats.totalPrice, collected: stats.totalCollected, remaining: stats.remaining, refunded: stats.totalRefunded, count: stats.totalSales }}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-border/50 px-3 py-1.5 text-sm font-medium disabled:opacity-50 hover:bg-secondary/50"
          >
            Précédent
          </button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    currentPage === pageNum
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border/50 hover:bg-secondary/50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-lg border border-border/50 px-3 py-1.5 text-sm font-medium disabled:opacity-50 hover:bg-secondary/50"
          >
            Suivant
          </button>
        </div>
      )}

      {/* Edit Sale Modal */}
      {editingSale && (
        <SaleForm
          sale={editingSale}
          tunnelId={editingSale.tunnelId}
          onSave={handleSaveEdit}
          onCancel={() => setEditingSale(null)}
          installmentPlans={installmentPlans}
          offers={offers}
          closers={closers}
        />
      )}
    </div>
  );
}
