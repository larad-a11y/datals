import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface HeaderProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  activeTab?: string;
}

const tabInfo: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Tableau de bord', subtitle: 'Analysez votre rentabilité en temps réel' },
  tunnels: { title: 'Tunnels de vente', subtitle: 'Gérez vos différents tunnels de conversion' },
  events: { title: 'Tunnels de vente', subtitle: 'Gérez vos différents tunnels de conversion' },
  sales: { title: 'Ventes / CRM', subtitle: 'Suivez toutes vos ventes en un seul endroit' },
  charges: { title: 'Charges et déductions', subtitle: 'Configurez vos frais et commissions' },
  kpi: { title: 'Indicateurs KPI', subtitle: 'Analysez vos performances en détail' },
};

export function Header({ 
  selectedMonth, 
  onMonthChange, 
  activeTab = 'dashboard',
}: HeaderProps) {
  const currentTabInfo = tabInfo[activeTab] || tabInfo.dashboard;
  const [open, setOpen] = useState(false);

  const [year, month] = selectedMonth.split('-').map(Number);
  const currentDate = new Date(year, month - 1);
  const [displayYear, setDisplayYear] = useState(year);

  const formatMonthLabel = (monthStr: string) => {
    const [y, m] = monthStr.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newMonth = `${displayYear}-${String(monthIndex + 1).padStart(2, '0')}`;
    onMonthChange(newMonth);
    setOpen(false);
  };

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril',
    'Mai', 'Juin', 'Juillet', 'Août',
    'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center border-b border-border/50 bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">
            {currentTabInfo.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {currentTabInfo.subtitle}
          </p>
        </div>

        {/* Month selector - inline with title */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 bg-secondary/50"
            >
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">{formatMonthLabel(selectedMonth)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4 bg-card border-border" align="start">
            <div className="space-y-4">
              {/* Year selector */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDisplayYear(displayYear - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-semibold text-foreground">{displayYear}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDisplayYear(displayYear + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Month grid */}
              <div className="grid grid-cols-3 gap-2">
                {months.map((monthName, index) => {
                  const isSelected = displayYear === year && index === month - 1;
                  return (
                    <Button
                      key={monthName}
                      variant={isSelected ? "default" : "ghost"}
                      size="sm"
                      className="text-sm"
                      onClick={() => handleMonthSelect(index)}
                    >
                      {monthName.slice(0, 3)}
                    </Button>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
