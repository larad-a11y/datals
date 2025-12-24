import { useState, useMemo } from 'react';
import { Bell, AlertCircle, Clock, Calendar, X, ExternalLink } from 'lucide-react';
import { PaymentNotification, Sale, TunnelType } from '@/types/business';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface EnrichedSale extends Sale {
  tunnelName?: string;
  tunnelType?: TunnelType;
  tunnelDate?: string;
  tunnelMonth?: string;
}

interface NotificationBellProps {
  notifications: PaymentNotification[];
  onNavigateToSale: (saleId: string, tunnelId: string) => void;
  onDismiss: (notificationId: string) => void;
  onDismissAll: () => void;
}

export function NotificationBell({ 
  notifications, 
  onNavigateToSale, 
  onDismiss,
  onDismissAll 
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  
  const activeNotifications = notifications.filter(n => !n.dismissed);
  const overdueCount = activeNotifications.filter(n => n.type === 'overdue').length;
  const dueCount = activeNotifications.filter(n => n.type === 'due').length;
  
  const hasUrgent = overdueCount > 0 || dueCount > 0;
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    const diff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Payment date is in the past - show how many days ago for verification
    if (diff < 0) {
      const daysAgo = Math.abs(diff);
      return `Prélèvement du ${date.toLocaleDateString('fr-FR')} (il y a ${daysAgo} jour${daysAgo > 1 ? 's' : ''})`;
    }
    return date.toLocaleDateString('fr-FR');
  };
  
  const getTypeIcon = (type: PaymentNotification['type']) => {
    switch (type) {
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-danger" />;
      case 'due':
        return <Clock className="h-4 w-4 text-warning" />;
      default:
        return <Calendar className="h-4 w-4 text-muted-foreground" />;
    }
  };
  
  const getTypeBadge = (type: PaymentNotification['type']) => {
    switch (type) {
      case 'overdue':
        return <span className="badge-danger">Urgent</span>;
      case 'due':
        return <span className="badge-warning">À vérifier</span>;
      default:
        return <span className="badge-profitable">À venir</span>;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className={`h-5 w-5 ${hasUrgent ? 'text-warning' : ''}`} />
          {activeNotifications.length > 0 && (
            <span className={`absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-primary-foreground ${
              overdueCount > 0 ? 'bg-danger' : dueCount > 0 ? 'bg-warning' : 'bg-primary'
            }`}>
              {activeNotifications.length > 9 ? '9+' : activeNotifications.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border/50 p-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Paiements à vérifier</h3>
            {activeNotifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-muted-foreground"
                onClick={onDismissAll}
              >
                Tout effacer
              </Button>
            )}
          </div>
          {activeNotifications.length > 0 && (
            <div className="mt-1 flex gap-2 text-xs">
              {overdueCount > 0 && (
                <span className="text-danger">{overdueCount} urgent{overdueCount > 1 ? 's' : ''}</span>
              )}
              {dueCount > 0 && (
                <span className="text-warning">{dueCount} à vérifier</span>
              )}
            </div>
          )}
        </div>
        
        <div className="max-h-80 overflow-y-auto">
          {activeNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Aucun paiement à vérifier</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {activeNotifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-3 transition-colors hover:bg-secondary/30 ${
                    notification.type === 'overdue' ? 'bg-danger/5' : 
                    notification.type === 'due' ? 'bg-warning/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {getTypeIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {notification.clientName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(notification.dueDate)}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          {getTypeBadge(notification.type)}
                          <span className="text-sm font-medium">
                            {notification.amount.toLocaleString('fr-FR')} €
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          onNavigateToSale(notification.saleId, notification.tunnelId);
                          setOpen(false);
                        }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => onDismiss(notification.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}