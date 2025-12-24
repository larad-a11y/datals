import { useState, useMemo } from 'react';
import { Receipt, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { Sale, Tunnel, TunnelType, InstallmentPlan, Offer, defaultInstallmentPlans, Closer } from '@/types/business';
import { SalesFilters, PaymentStatus } from './SalesFilters';
import { SalesTable } from './SalesTable';
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
  installmentPlans = defaultInstallmentPlans,
  offers = [],
  closers = [],
}: SalesCRMPanelProps) {
  const [selectedTunnelId, setSelectedTunnelId] = useState(initialTunnelFilter);
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedCloserId, setSelectedCloserId] = useState('');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [currentPage, setCurrentPage] = useState(1);
  const [editingSale, setEditingSale] = useState<EnrichedSale | null>(null);

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

      // Date range filter
      if (dateRange.from || dateRange.to) {
        const saleDate = new Date(sale.saleDate);
        saleDate.setHours(0, 0, 0, 0);
        
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
        if (!matchesClient && !matchesTunnel) return false;
      }

      // Status filter
      if (selectedStatus !== 'all') {
        const remaining = sale.totalPrice - sale.amountCollected;
        const isPaid = remaining <= 0;
        const isPartial = sale.amountCollected > 0 && remaining > 0;
        const isPending = sale.amountCollected === 0;

        if (selectedStatus === 'paid' && !isPaid) return false;
        if (selectedStatus === 'partial' && !isPartial) return false;
        if (selectedStatus === 'pending' && !isPending) return false;
      }

      return true;
    });
  }, [allSales, selectedTunnelId, selectedMonth, selectedCloserId, dateRange, searchQuery, selectedStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredSales.length / ITEMS_PER_PAGE);
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  // Global stats
  const stats = useMemo(() => {
    const totalContracted = allSales.reduce((sum, s) => sum + s.totalPrice, 0);
    const totalCollected = allSales.reduce((sum, s) => sum + s.amountCollected, 0);
    const remaining = totalContracted - totalCollected;
    const paidCount = allSales.filter((s) => s.totalPrice - s.amountCollected <= 0).length;

    return {
      totalContracted,
      totalCollected,
      remaining,
      totalSales: allSales.length,
      paidCount,
      pendingCount: allSales.length - paidCount,
    };
  }, [allSales]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Ventes / CRM
        </h2>
        <p className="text-sm text-muted-foreground">
          Vue centralisée de toutes vos ventes
        </p>
      </div>

      {/* Global Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        dateRange={dateRange}
        onDateRangeChange={(range) => {
          setDateRange(range);
          handleFilterChange();
        }}
      />

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filteredSales.length} vente{filteredSales.length !== 1 ? 's' : ''} trouvée{filteredSales.length !== 1 ? 's' : ''}
        </span>
        {totalPages > 1 && (
          <span>
            Page {currentPage} sur {totalPages}
          </span>
        )}
      </div>

      {/* Sales Table */}
      <SalesTable
        sales={paginatedSales}
        onEdit={handleEditSale}
        onDelete={handleDeleteSale}
        onViewTunnel={onNavigateToTunnel}
        onRecordPayment={onRecordPayment}
        onFullyPaid={onFullyPaid}
        closers={closers}
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
