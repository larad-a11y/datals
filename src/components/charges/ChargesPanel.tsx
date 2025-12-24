import { Percent, Euro, AlertCircle } from 'lucide-react';
import { Charges } from '@/types/business';

interface ChargesPanelProps {
  charges: Charges;
  onUpdate: (charges: Charges) => void;
  collectedRevenue: number;
}

export function ChargesPanel({ charges, onUpdate, collectedRevenue }: ChargesPanelProps) {
  const handleChange = (key: keyof Charges, value: number) => {
    onUpdate({ ...charges, [key]: value });
  };

  const isAboveAgencyThreshold = collectedRevenue > charges.agencyThreshold;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          Charges & Déductions
        </h2>
        <p className="text-sm text-muted-foreground">
          Configurez vos pourcentages et charges fixes
        </p>
      </div>

      {/* Percentage-based charges */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Percent className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-semibold text-foreground">
            Charges à pourcentage
          </h3>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
              📞 Closeurs
            </label>
            <div className="relative">
              <input
                type="number"
                value={charges.closersPercent}
                onChange={(e) => handleChange('closersPercent', parseFloat(e.target.value) || 0)}
                className="input-field w-full pr-8"
                min="0"
                max="100"
                step="0.5"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Par défaut: 17,5%</p>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
              🏢 Agence
              {!isAboveAgencyThreshold && (
                <span className="text-xs text-warning">(seuil non atteint)</span>
              )}
            </label>
            <div className="relative">
              <input
                type="number"
                value={charges.agencyPercent}
                onChange={(e) => handleChange('agencyPercent', parseFloat(e.target.value) || 0)}
                className="input-field w-full pr-8"
                min="0"
                max="100"
                step="0.5"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Appliqué au-delà de {charges.agencyThreshold.toLocaleString('fr-FR')} € HT
            </p>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
              🤝 Associé
            </label>
            <div className="relative">
              <input
                type="number"
                value={charges.associatePercent}
                onChange={(e) => handleChange('associatePercent', parseFloat(e.target.value) || 0)}
                className="input-field w-full pr-8"
                min="0"
                max="100"
                step="0.5"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Calculé APRÈS toutes les autres charges</p>
          </div>
        </div>

        {/* Agency threshold setting */}
        <div className="mt-6 border-t border-border/50 pt-6">
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Seuil agence (€ HT)
          </label>
          <input
            type="number"
            value={charges.agencyThreshold}
            onChange={(e) => handleChange('agencyThreshold', parseFloat(e.target.value) || 0)}
            className="input-field w-full max-w-xs"
            min="0"
            step="1000"
          />
        </div>
      </div>

      {/* Fixed charges */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Euro className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-semibold text-foreground">
            Charges fixes (€)
          </h3>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              📢 Publicité
            </label>
            <input
              type="number"
              value={charges.advertising}
              onChange={(e) => handleChange('advertising', parseFloat(e.target.value) || 0)}
              className="input-field w-full"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              🧠 Marketing
            </label>
            <input
              type="number"
              value={charges.marketing}
              onChange={(e) => handleChange('marketing', parseFloat(e.target.value) || 0)}
              className="input-field w-full"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              🛠️ Logiciels
            </label>
            <input
              type="number"
              value={charges.software}
              onChange={(e) => handleChange('software', parseFloat(e.target.value) || 0)}
              className="input-field w-full"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              🎓 Coach / Mentorat
            </label>
            <input
              type="number"
              value={charges.coaching}
              onChange={(e) => handleChange('coaching', parseFloat(e.target.value) || 0)}
              className="input-field w-full"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              🧩 Autres coûts
            </label>
            <input
              type="number"
              value={charges.otherCosts}
              onChange={(e) => handleChange('otherCosts', parseFloat(e.target.value) || 0)}
              className="input-field w-full"
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 text-primary" />
        <div className="text-sm">
          <p className="font-medium text-foreground">Ordre de calcul des déductions</p>
          <ol className="mt-2 list-inside list-decimal text-muted-foreground">
            <li>Closeurs (sur le CA collecté)</li>
            <li>Agence (si seuil dépassé)</li>
            <li>Charges fixes (publicité, marketing, logiciels, etc.)</li>
            <li>Salaires</li>
            <li>Part associé (sur le bénéfice net uniquement)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
