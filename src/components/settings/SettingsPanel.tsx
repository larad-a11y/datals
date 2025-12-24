import { Settings, RotateCcw } from 'lucide-react';
import { Charges, defaultCharges } from '@/types/business';
import { Button } from '@/components/ui/button';

interface SettingsPanelProps {
  charges: Charges;
  onResetCharges: () => void;
}

export function SettingsPanel({ charges, onResetCharges }: SettingsPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Paramètres
        </h2>
        <p className="text-sm text-muted-foreground">
          Configuration générale de l'application
        </p>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-semibold text-foreground">
            Valeurs par défaut
          </h3>
        </div>

        <div className="mb-6 rounded-lg bg-secondary/30 p-4">
          <h4 className="mb-3 font-medium text-foreground">Pourcentages actuels</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Closeurs</span>
              <span className="font-medium text-foreground">{charges.closersPercent}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Agence</span>
              <span className="font-medium text-foreground">{charges.agencyPercent}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Associé</span>
              <span className="font-medium text-foreground">{charges.associatePercent}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Seuil agence</span>
              <span className="font-medium text-foreground">{charges.agencyThreshold.toLocaleString('fr-FR')} €</span>
            </div>
          </div>
        </div>

        <Button variant="outline" onClick={onResetCharges}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Réinitialiser les charges par défaut
        </Button>

        <div className="mt-6 rounded-lg border border-border/50 p-4">
          <h4 className="mb-2 font-medium text-foreground">Valeurs par défaut</h4>
          <div className="grid gap-1 text-sm text-muted-foreground">
            <p>• Closeurs: {defaultCharges.closersPercent}%</p>
            <p>• Agence: {defaultCharges.agencyPercent}%</p>
            <p>• Associé: {defaultCharges.associatePercent}%</p>
            <p>• Seuil agence: {defaultCharges.agencyThreshold.toLocaleString('fr-FR')} €</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-6">
        <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
          À propos
        </h3>
        <p className="text-sm text-muted-foreground">
          ProfitPilot est une application de calcul de rentabilité business 
          conçue pour les entrepreneurs utilisant des tunnels de vente 
          (Webinar, VSL, Challenge).
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Pilotez votre business par les chiffres, pas à l'instinct.
        </p>
      </div>
    </div>
  );
}
