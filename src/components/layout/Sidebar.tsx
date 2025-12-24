import { LayoutDashboard, Target, Receipt, Wallet, BarChart3, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'tunnels', label: 'Tunnels de vente', icon: Target },
  { id: 'sales', label: 'Ventes / CRM', icon: Receipt },
  { id: 'charges', label: 'Charges & Déductions', icon: Wallet },
  { id: 'kpi', label: 'KPI & Rentabilité', icon: BarChart3 },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border/50 bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border/50 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-semibold text-foreground">
            ProfitPilot
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  'nav-item w-full',
                  activeTab === item.id && 'active'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border/50 p-4">
          <div className="rounded-lg bg-accent/50 p-4">
            <p className="text-xs text-muted-foreground">
              Pilotez votre business par les chiffres, pas à l'instinct.
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <button className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline">
                  <Info className="h-3 w-3" />
                  À propos
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>À propos de ProfitPilot</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <p>
                    ProfitPilot est une application de calcul de rentabilité business 
                    conçue pour les entrepreneurs utilisant des tunnels de vente 
                    (Webinar, VSL, Challenge).
                  </p>
                  <p>
                    Pilotez votre business par les chiffres, pas à l'instinct.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </aside>
  );
}
