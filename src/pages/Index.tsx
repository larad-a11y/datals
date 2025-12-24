import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { TunnelsList } from '@/components/tunnels/TunnelsList';
import { ChargesPanel } from '@/components/charges/ChargesPanel';
import { SalariesPanel } from '@/components/salaries/SalariesPanel';
import { KPIPanel } from '@/components/kpi/KPIPanel';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { useBusinessData } from '@/hooks/useBusinessData';
import { defaultCharges } from '@/types/business';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
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
  } = useBusinessData();

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
