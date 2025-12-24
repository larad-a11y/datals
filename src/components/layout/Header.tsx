import { CalendarDays } from 'lucide-react';

interface HeaderProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export function Header({ selectedMonth, onMonthChange }: HeaderProps) {
  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
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

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/50 px-4 py-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="bg-transparent text-sm font-medium text-foreground outline-none"
          />
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-foreground capitalize">
            {formatMonthLabel(selectedMonth)}
          </p>
        </div>
      </div>
    </header>
  );
}
