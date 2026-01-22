import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { TunnelsList } from '@/components/tunnels/TunnelsList';
import { SalesCRMPanel } from '@/components/sales/SalesCRMPanel';
import { ChargesPanel } from '@/components/charges/ChargesPanel';
import { KPIPanel } from '@/components/kpi/KPIPanel';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { useBusinessCalculations } from '@/hooks/useBusinessCalculations';
import { useAuth } from '@/hooks/useAuth';
import { defaultCharges, Sale, generatePaymentNotifications, PaymentRecord } from '@/types/business';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [salesTunnelFilter, setSalesTunnelFilter] = useState('');
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [authLoading, user, navigate]);
  
  // Data persistence layer
  const {
    tunnels,
    charges,
    salaries,
    coachingExpenses,
    isLoading: dataLoading,
    addTunnel,
    updateTunnel,
    deleteTunnel,
    addSale,
    updateSale,
    deleteSale,
    setCharges,
    addSalary,
    updateSalary,
    deleteSalary,
    getAllSales,
    addCoachingExpense,
    updateCoachingExpense,
    deleteCoachingExpense,
    createManualBackup,
  } = useSupabaseData();

  // Business calculations layer
  const {
    selectedMonth,
    setSelectedMonth,
    filteredTunnels,
    filteredCoachingExpenses,
    kpis,
  } = useBusinessCalculations({
    tunnels,
    charges,
    salaries,
    coachingExpenses,
  });

  // Sale operations from CRM - now using direct sale mutations
  const handleUpdateSale = (tunnelId: string, saleId: string, updates: Partial<Sale>) => {
    updateSale(saleId, updates);
  };

  const handleDeleteSale = (tunnelId: string, saleId: string) => {
    deleteSale(saleId);
  };

  const handleNavigateToSales = (tunnelId?: string) => {
    if (tunnelId) {
      setSalesTunnelFilter(tunnelId);
    }
    setActiveTab('sales');
  };

  // Add sale to tunnel - now using direct sale mutation
  const handleAddSaleToTunnel = (tunnelId: string, sale: Omit<Sale, 'id' | 'createdAt'>) => {
    addSale(tunnelId, sale);
  };

  // Record a payment for a sale
  const handleRecordPayment = (saleId: string, tunnelId: string, amount: number) => {
    const tunnel = tunnels.find(t => t.id === tunnelId);
    if (!tunnel) return;
    
    const sale = tunnel.sales.find(s => s.id === saleId);
    if (!sale) return;
    
    const newPayment: PaymentRecord = {
      id: `payment-${Date.now()}`,
      amount,
      date: new Date().toISOString(),
      verified: true,
      verifiedAt: new Date().toISOString(),
    };
    
    const newAmountCollected = sale.amountCollected + amount;
    const remaining = sale.totalPrice - newAmountCollected;
    
    // Calculate next payment date (1 month from now if still has remaining)
    let nextPaymentDate: string | undefined;
    if (remaining > 0 && sale.numberOfPayments > 1) {
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + 1);
      nextPaymentDate = nextDate.toISOString().split('T')[0];
    }
    
    updateSale(saleId, {
      amountCollected: newAmountCollected,
      paymentHistory: [...(sale.paymentHistory || []), newPayment],
      nextPaymentDate,
    });
  };

  // Mark a sale as fully paid
  const handleFullyPaid = (saleId: string, tunnelId: string) => {
    const tunnel = tunnels.find(t => t.id === tunnelId);
    if (!tunnel) return;
    
    const sale = tunnel.sales.find(s => s.id === saleId);
    if (!sale) return;
    
    const remaining = sale.totalPrice - sale.amountCollected;
    if (remaining <= 0) return;
    
    const newPayment: PaymentRecord = {
      id: `payment-${Date.now()}`,
      amount: remaining,
      date: new Date().toISOString(),
      verified: true,
      verifiedAt: new Date().toISOString(),
    };
    
    updateSale(saleId, {
      amountCollected: sale.totalPrice,
      paymentHistory: [...(sale.paymentHistory || []), newPayment],
      nextPaymentDate: undefined,
    });
  };

  // Toggle sale defaulted status
  const handleToggleDefaulted = (saleId: string, tunnelId: string, isDefaulted: boolean) => {
    updateSale(saleId, {
      isDefaulted,
      defaultedAt: isDefaulted ? new Date().toISOString() : undefined,
    });
  };

  // Generate notifications from all sales
  const notifications = useMemo(() => {
    const allSales = getAllSales();
    const notifs = generatePaymentNotifications(allSales);
    return notifs.map(n => ({
      ...n,
      dismissed: dismissedNotifications.includes(n.id),
    }));
  }, [getAllSales, dismissedNotifications]);

  const handleDismissNotification = useCallback((notificationId: string) => {
    setDismissedNotifications(prev => [...prev, notificationId]);
  }, []);

  const handleDismissAllNotifications = useCallback(() => {
    setDismissedNotifications(prev => [...prev, ...notifications.map(n => n.id)]);
  }, [notifications]);

  const handleNavigateToSale = useCallback((saleId: string, tunnelId: string) => {
    setSalesTunnelFilter(tunnelId);
    setActiveTab('sales');
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            kpis={kpis} 
            tunnels={filteredTunnels}
            charges={charges}
            salaries={salaries}
            coachingExpenses={coachingExpenses}
            allTunnels={tunnels}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        );
      case 'tunnels':
      case 'events':
        return (
          <TunnelsList
            tunnels={tunnels}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            onAdd={addTunnel}
            onUpdate={updateTunnel}
            onDelete={deleteTunnel}
            onNavigateToSales={handleNavigateToSales}
            installmentPlans={charges.installmentPlans}
            offers={charges.offers}
            closers={charges.closers}
          />
        );
      case 'sales':
        return (
          <SalesCRMPanel
            tunnels={tunnels}
            getAllSales={getAllSales}
            onUpdateSale={handleUpdateSale}
            onDeleteSale={handleDeleteSale}
            onNavigateToTunnel={(tunnelId) => {
              setActiveTab('tunnels');
            }}
            initialTunnelFilter={salesTunnelFilter}
            onRecordPayment={handleRecordPayment}
            onFullyPaid={handleFullyPaid}
            onToggleDefaulted={handleToggleDefaulted}
            installmentPlans={charges.installmentPlans}
            offers={charges.offers}
            closers={charges.closers}
          />
        );
      case 'charges':
        return (
          <ChargesPanel
            charges={charges}
            onUpdate={setCharges}
            onResetCharges={() => setCharges(defaultCharges)}
            collectedRevenue={kpis.collectedRevenue}
            salaries={salaries}
            onAddSalary={addSalary}
            onUpdateSalary={updateSalary}
            onDeleteSalary={deleteSalary}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            coachingExpenses={filteredCoachingExpenses}
            onAddCoachingExpense={addCoachingExpense}
            onUpdateCoachingExpense={updateCoachingExpense}
            onDeleteCoachingExpense={deleteCoachingExpense}
          />
        );
      case 'kpi':
        return (
          <KPIPanel
            kpis={kpis}
            charges={charges}
            salaries={salaries}
            coachingExpenses={filteredCoachingExpenses}
            tunnels={tunnels}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        );
      default:
        return (
          <Dashboard 
            kpis={kpis} 
            tunnels={filteredTunnels}
            charges={charges}
            salaries={salaries}
            coachingExpenses={coachingExpenses}
            allTunnels={tunnels}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        );
    }
  };

  // Show loading state
  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">
          {authLoading ? 'Vérification de la session...' : 'Chargement de vos données...'}
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        notifications={notifications}
        onNavigateToSale={handleNavigateToSale}
        onDismissNotification={handleDismissNotification}
        onDismissAllNotifications={handleDismissAllNotifications}
        onCreateBackup={createManualBackup}
      />
      
      <div className="pl-20">
        <main className="p-6 pt-4">
          <div className="mx-auto max-w-7xl animate-fade-in">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
