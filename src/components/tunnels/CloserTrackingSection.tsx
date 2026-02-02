import { useState, useEffect } from 'react';
import { Phone, PhoneCall, PhoneOff, UserX, Plus, Trash2 } from 'lucide-react';
import { Closer, CloserTunnelStats } from '@/types/business';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CloserTrackingSectionProps {
  closerStats: CloserTunnelStats[];
  closers: Closer[];
  onChange: (stats: CloserTunnelStats[]) => void;
}

export function CloserTrackingSection({ closerStats, closers, onChange }: CloserTrackingSectionProps) {
  const [stats, setStats] = useState<CloserTunnelStats[]>(closerStats || []);

  // Sync with parent
  useEffect(() => {
    setStats(closerStats || []);
  }, [closerStats]);

  const handleAddCloser = (closerId: string) => {
    if (!closerId || stats.some(s => s.closerId === closerId)) return;
    
    const newStats = [...stats, {
      closerId,
      callsReceived: 0,
      callsAnswered: 0,
      noShows: 0,
    }];
    setStats(newStats);
    onChange(newStats);
  };

  const handleRemoveCloser = (closerId: string) => {
    const newStats = stats.filter(s => s.closerId !== closerId);
    setStats(newStats);
    onChange(newStats);
  };

  const handleUpdateStat = (closerId: string, field: keyof Omit<CloserTunnelStats, 'closerId'>, value: number) => {
    const newStats = stats.map(s => 
      s.closerId === closerId ? { ...s, [field]: value } : s
    );
    setStats(newStats);
    onChange(newStats);
  };

  const getCloserName = (closerId: string) => {
    const closer = closers.find(c => c.id === closerId);
    return closer ? `${closer.firstName} ${closer.lastName}` : 'Closer inconnu';
  };

  const availableClosers = closers.filter(c => !stats.some(s => s.closerId === c.id));

  // Calculate totals
  const totals = stats.reduce((acc, s) => ({
    callsReceived: acc.callsReceived + s.callsReceived,
    callsAnswered: acc.callsAnswered + s.callsAnswered,
    noShows: acc.noShows + s.noShows,
  }), { callsReceived: 0, callsAnswered: 0, noShows: 0 });

  if (closers.length === 0) {
    return (
      <div className="rounded-lg border border-border/30 bg-secondary/10 p-4">
        <p className="text-sm text-muted-foreground text-center">
          Ajoutez des closers dans "Charges & Déductions" pour activer le tracking
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add closer select */}
      {availableClosers.length > 0 && (
        <div className="flex items-center gap-2">
          <Select onValueChange={handleAddCloser}>
            <SelectTrigger className="flex-1 bg-secondary/30">
              <SelectValue placeholder="Ajouter un closer..." />
            </SelectTrigger>
            <SelectContent>
              {availableClosers.map(closer => (
                <SelectItem key={closer.id} value={closer.id}>
                  {closer.firstName} {closer.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="icon" disabled>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Closer stats list */}
      {stats.length > 0 && (
        <div className="space-y-3">
          {stats.map(stat => {
            const answerRate = stat.callsReceived > 0 
              ? ((stat.callsAnswered / stat.callsReceived) * 100).toFixed(1) 
              : '0';
            const noShowRate = stat.callsReceived > 0 
              ? ((stat.noShows / stat.callsReceived) * 100).toFixed(1) 
              : '0';
            
            return (
              <div 
                key={stat.closerId}
                className="rounded-lg border border-border/30 bg-secondary/20 p-3"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-foreground text-sm">
                    {getCloserName(stat.closerId)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCloser(stat.closerId)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {/* Calls Received */}
                  <div>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Phone className="h-3 w-3" />
                      Reçus
                    </label>
                    <input
                      type="number"
                      value={stat.callsReceived || ''}
                      onChange={(e) => handleUpdateStat(stat.closerId, 'callsReceived', parseInt(e.target.value) || 0)}
                      className="input-field w-full text-center text-sm"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                  
                  {/* Calls Answered */}
                  <div>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <PhoneCall className="h-3 w-3" />
                      Répondus
                    </label>
                    <input
                      type="number"
                      value={stat.callsAnswered || ''}
                      onChange={(e) => handleUpdateStat(stat.closerId, 'callsAnswered', parseInt(e.target.value) || 0)}
                      className="input-field w-full text-center text-sm"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                  
                  {/* No Shows */}
                  <div>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <UserX className="h-3 w-3" />
                      No-shows
                    </label>
                    <input
                      type="number"
                      value={stat.noShows || ''}
                      onChange={(e) => handleUpdateStat(stat.closerId, 'noShows', parseInt(e.target.value) || 0)}
                      className="input-field w-full text-center text-sm"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                {/* Rates */}
                {stat.callsReceived > 0 && (
                  <div className="mt-2 flex justify-between text-xs">
                    <span className="text-profitable">Réponse: {answerRate}%</span>
                    <span className="text-warning">No-show: {noShowRate}%</span>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Totals */}
          {stats.length > 1 && (
            <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Total reçus</p>
                  <p className="font-bold text-foreground">{totals.callsReceived}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total répondus</p>
                  <p className="font-bold text-profitable">{totals.callsAnswered}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total no-shows</p>
                  <p className="font-bold text-warning">{totals.noShows}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {stats.length === 0 && availableClosers.length > 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Sélectionnez un closer pour commencer le tracking
        </p>
      )}
    </div>
  );
}
