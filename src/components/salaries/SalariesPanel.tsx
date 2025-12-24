import { useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { Salary } from '@/types/business';
import { Button } from '@/components/ui/button';

interface SalariesPanelProps {
  salaries: Salary[];
  onAdd: (salary: Omit<Salary, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Salary>) => void;
  onDelete: (id: string) => void;
}

export function SalariesPanel({ salaries, onAdd, onUpdate, onDelete }: SalariesPanelProps) {
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const handleAdd = () => {
    if (newName.trim() && newAmount) {
      onAdd({
        name: newName.trim(),
        monthlyAmount: parseFloat(newAmount) || 0,
      });
      setNewName('');
      setNewAmount('');
    }
  };

  const totalSalaries = salaries.reduce((sum, s) => sum + s.monthlyAmount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Salaires
        </h2>
        <p className="text-sm text-muted-foreground">
          Gérez les salaires mensuels déduits du bénéfice net
        </p>
      </div>

      {/* Add new salary */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
          Ajouter un salaire
        </h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Nom
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="input-field w-full"
              placeholder="Ex: Commercial"
            />
          </div>
          <div className="w-40">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Montant (€)
            </label>
            <input
              type="number"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="input-field w-full"
              min="0"
              step="0.01"
              placeholder="0"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleAdd} disabled={!newName.trim() || !newAmount}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter
            </Button>
          </div>
        </div>
      </div>

      {/* Salaries list */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-semibold text-foreground">
              Liste des salaires
            </h3>
          </div>
          <div className="rounded-lg bg-secondary/50 px-4 py-2">
            <span className="text-sm text-muted-foreground">Total: </span>
            <span className="font-display text-lg font-bold text-foreground">
              {totalSalaries.toLocaleString('fr-FR')} €
            </span>
          </div>
        </div>

        {salaries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucun salaire configuré
          </p>
        ) : (
          <div className="space-y-3">
            {salaries.map((salary) => (
              <div
                key={salary.id}
                className="flex items-center justify-between rounded-lg bg-secondary/30 p-4"
              >
                <div className="flex-1">
                  <input
                    type="text"
                    value={salary.name}
                    onChange={(e) => onUpdate(salary.id, { name: e.target.value })}
                    className="bg-transparent font-medium text-foreground outline-none focus:underline"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={salary.monthlyAmount}
                      onChange={(e) => onUpdate(salary.id, { monthlyAmount: parseFloat(e.target.value) || 0 })}
                      className="w-32 rounded-lg bg-secondary/50 px-3 py-2 text-right font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                      min="0"
                      step="0.01"
                    />
                    <span className="text-muted-foreground">€</span>
                  </div>
                  <button
                    onClick={() => onDelete(salary.id)}
                    className="rounded p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
