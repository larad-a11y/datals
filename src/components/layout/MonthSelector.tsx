import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface MonthSelectorProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

const months = [
  'Janvier', 'Février', 'Mars', 'Avril',
  'Mai', 'Juin', 'Juillet', 'Août',
  'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function MonthSelector({ selectedMonth, onMonthChange }: MonthSelectorProps) {
  const [open, setOpen] = useState(false);
  const [year, month] = selectedMonth.split('-').map(Number);
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

  return (
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
  );
}