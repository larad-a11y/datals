import { LayoutDashboard, Target, Receipt, Wallet, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserProfile } from './UserProfile';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { PaymentNotification } from '@/types/business';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  notifications?: PaymentNotification[];
  onNavigateToSale?: (saleId: string, tunnelId: string) => void;
  onDismissNotification?: (notificationId: string) => void;
  onDismissAllNotifications?: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Tableau de b...', icon: LayoutDashboard },
  { id: 'tunnels', label: 'Tunnel de v...', icon: Target },
  { id: 'sales', label: 'Ventes', icon: Receipt },
  { id: 'charges', label: 'Charges', icon: Wallet },
  { id: 'kpi', label: 'KPI', icon: BarChart3 },
];

export function Sidebar({ 
  activeTab, 
  onTabChange,
  notifications = [],
  onNavigateToSale,
  onDismissNotification,
  onDismissAllNotifications,
}: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-20 border-r border-border/30 bg-sidebar flex flex-col">
      <div className="flex flex-1 flex-col items-center py-4">
        {/* Navigation */}
        <nav className="flex flex-col items-center gap-2 w-full px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  'flex flex-col items-center justify-center w-full py-3 px-1 rounded-xl transition-all duration-200 group',
                  isActive 
                    ? 'bg-primary/15 border border-primary/50' 
                    : 'hover:bg-accent/50 border border-transparent'
                )}
              >
                <Icon className={cn(
                  'h-5 w-5 mb-1.5 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )} />
                <span className={cn(
                  'text-[10px] font-medium text-center leading-tight truncate w-full',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
      
      {/* Bottom section: Notifications + User Profile */}
      <div className="px-2 pb-4 flex flex-col items-center gap-3">
        {/* Notification Bell */}
        {onNavigateToSale && onDismissNotification && onDismissAllNotifications && (
          <NotificationBell
            notifications={notifications}
            onNavigateToSale={onNavigateToSale}
            onDismiss={onDismissNotification}
            onDismissAll={onDismissAllNotifications}
          />
        )}
        
        {/* User Profile */}
        <UserProfile />
      </div>
    </aside>
  );
}