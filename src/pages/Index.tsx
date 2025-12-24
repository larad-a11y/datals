import { useState, useMemo, useCallback } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { TunnelsList } from '@/components/tunnels/TunnelsList';
import { SalesCRMPanel } from '@/components/sales/SalesCRMPanel';
import { ChargesPanel } from '@/components/charges/ChargesPanel';
import { SalariesPanel } from '@/components/salaries/SalariesPanel';
import { KPIPanel } from '@/components/kpi/KPIPanel';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { useBusinessData } from '@/hooks/useBusinessData';
import { defaultCharges, Sale, PaymentNotification, generatePaymentNotifications, PaymentRecord } from '@/types/business';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [salesTunnelFilter, setSalesTunnelFilter] = useState('');
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  
  const {
    selectedMonth,
    setSelectedMonth,
    tunnels,
    filteredTunnels,
    charges,
    setCharges,
    salaries,
    kpis,
    addTunnel,
    updateTunnel,
    deleteTunnel,
    addSalary,
    updateSalary,
    deleteSalary,
    getAllSales,
  } = useBusinessData();

  // Sale operations from CRM
  const handleUpdateSale = (tunnelId: string, saleId: string, updates: Partial<Sale>) => {
    const tunnel = tunnels.find(t => t.id === tunnelId);
    if (!tunnel) return;
    
    const updatedSales = tunnel.sales.map(s => s.id === saleId ? { ...s, ...updates } : s);
    const totalCollected = updatedSales.reduce((sum, s) => sum + s.amountCollected, 0);
    
    updateTunnel(tunnelId, { 
      sales: updatedSales,
      collectedAmount: totalCollected,
    });
  };

  const handleDeleteSale = (tunnelId: string, saleId: string) => {
    const tunnel = tunnels.find(t => t.id === tunnelId);
    if (!tunnel) return;
    
    const updatedSales = tunnel.sales.filter(s => s.id !== saleId);
    const totalCollected = updatedSales.reduce((sum, s) => sum + s.amountCollected, 0);
    
    updateTunnel(tunnelId, { 
      sales: updatedSales,
      collectedAmount: totalCollected,
      callsClosed: updatedSales.length,
    });
  };

  const handleNavigateToSales = (tunnelId?: string) => {
    if (tunnelId) {
      setSalesTunnelFilter(tunnelId);
    }
    setActiveTab('sales');
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
    
    handleUpdateSale(tunnelId, saleId, {
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
    
    handleUpdateSale(tunnelId, saleId, {
      amountCollected: sale.totalPrice,
      paymentHistory: [...(sale.paymentHistory || []), newPayment],
      nextPaymentDate: undefined,
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
        return <Dashboard kpis={kpis} tunnels={filteredTunnels} />;
      case 'tunnels':
      case 'events':
        return (
          <TunnelsList
            tunnels={tunnels}
            selectedMonth={selectedMonth}
            onAdd={addTunnel}
            onUpdate={updateTunnel}
            onDelete={deleteTunnel}
            onNavigateToSales={handleNavigateToSales}
            installmentPlans={charges.installmentPlans}
            offers={charges.offers}
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
            installmentPlans={charges.installmentPlans}
            offers={charges.offers}
          />
        );
      case 'charges':
        return (
          <ChargesPanel
            charges={charges}
            onUpdate={setCharges}
            collectedRevenue={kpis.collectedRevenue}
          />
        );
      case 'salaries':
        return (
          <SalariesPanel
            salaries={salaries}
            onAdd={addSalary}
            onUpdate={updateSalary}
            onDelete={deleteSalary}
          />
        );
      case 'kpi':
        return (
          <KPIPanel
            kpis={kpis}
            charges={charges}
            salaries={salaries}
          />
        );
      case 'settings':
        return (
          <SettingsPanel
            charges={charges}
            onResetCharges={() => setCharges(defaultCharges)}
          />
        );
      default:
        return <Dashboard kpis={kpis} tunnels={filteredTunnels} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="pl-64">
        <Header 
          selectedMonth={selectedMonth} 
          onMonthChange={setSelectedMonth}
          notifications={notifications}
          onNavigateToSale={handleNavigateToSale}
          onDismissNotification={handleDismissNotification}
          onDismissAllNotifications={handleDismissAllNotifications}
        />
        
        <main className="p-6">
          <div className="mx-auto max-w-7xl animate-fade-in">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
