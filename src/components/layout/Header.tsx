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
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { PaymentNotification } from '@/types/business';

interface HeaderProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  notifications?: PaymentNotification[];
  onNavigateToSale?: (saleId: string, tunnelId: string) => void;
  onDismissNotification?: (notificationId: string) => void;
  onDismissAllNotifications?: () => void;
}

export function Header({ 
  selectedMonth, 
  onMonthChange, 
  notifications = [],
  onNavigateToSale,
  onDismissNotification,
  onDismissAllNotifications,
}: HeaderProps) {
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">
          Tableau de bord
        </h1>
        <p className="text-sm text-muted-foreground">
          Analysez votre rentabilité en temps réel
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        {onNavigateToSale && onDismissNotification && onDismissAllNotifications && (
          <NotificationBell
            notifications={notifications}
            onNavigateToSale={onNavigateToSale}
            onDismiss={onDismissNotification}
            onDismissAll={onDismissAllNotifications}
          />
        )}
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="flex items-center gap-2 bg-secondary/50"
            >
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="capitalize">{formatMonthLabel(selectedMonth)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4 bg-card border-border" align="end">
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
