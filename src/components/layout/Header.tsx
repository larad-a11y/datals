import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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

  const currentDate = parse(selectedMonth + '-01', 'yyyy-MM-dd', new Date());

  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const newMonth = format(date, 'yyyy-MM');
      onMonthChange(newMonth);
      setOpen(false);
    }
  };

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
          <PopoverContent className="w-auto p-0 bg-card border-border" align="end">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={handleSelect}
              locale={fr}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
