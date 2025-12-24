import { useState } from 'react';
import { Percent, Euro, AlertCircle, Plus, Trash2, Package, RotateCcw, Users, GraduationCap } from 'lucide-react';
import { Charges, InstallmentPlan, Offer, OfferInstallment, defaultCharges, Salary, CoachingExpense, CoachingExpenseType, coachingExpenseTypeLabels } from '@/types/business';
import { Button } from '@/components/ui/button';

interface ChargesPanelProps {
  charges: Charges;
  onUpdate: (charges: Charges) => void;
  onResetCharges: () => void;
  collectedRevenue: number;
  salaries: Salary[];
  onAddSalary: (salary: Omit<Salary, 'id'>) => void;
  onUpdateSalary: (id: string, updates: Partial<Salary>) => void;
  onDeleteSalary: (id: string) => void;
  // Coaching expenses
  selectedMonth: string;
  coachingExpenses: CoachingExpense[];
  onAddCoachingExpense: (expense: Omit<CoachingExpense, 'id'>) => void;
  onUpdateCoachingExpense: (id: string, updates: Partial<CoachingExpense>) => void;
  onDeleteCoachingExpense: (id: string) => void;
}

export function ChargesPanel({ 
  charges, onUpdate, onResetCharges, collectedRevenue, 
  salaries, onAddSalary, onUpdateSalary, onDeleteSalary,
  selectedMonth, coachingExpenses, onAddCoachingExpense, onUpdateCoachingExpense, onDeleteCoachingExpense 
}: ChargesPanelProps) {
  const [newSalaryName, setNewSalaryName] = useState('');
  const [newSalaryAmount, setNewSalaryAmount] = useState('');
  const [newOfferName, setNewOfferName] = useState('');
  const [newOfferPrice, setNewOfferPrice] = useState('');
  const [newOfferInstallments, setNewOfferInstallments] = useState<OfferInstallment[]>([
    { numberOfPayments: 1, markupPercent: 0 }
  ]);
  // Coaching expense form state
  const [newCoachingName, setNewCoachingName] = useState('');
  const [newCoachingAmount, setNewCoachingAmount] = useState('');
  const [newCoachingType, setNewCoachingType] = useState<CoachingExpenseType>('coaching');

  // Filter coaching expenses for selected month
  const monthlyCoachingExpenses = coachingExpenses.filter(e => e.month === selectedMonth);
  const totalCoachingExpenses = monthlyCoachingExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleChange = (key: keyof Charges, value: number) => {
    onUpdate({ ...charges, [key]: value });
  };

  const handlePlanChange = (planId: string, markupPercent: number) => {
    const updatedPlans = charges.installmentPlans.map(p => 
      p.id === planId ? { ...p, markupPercent } : p
    );
    onUpdate({ ...charges, installmentPlans: updatedPlans });
  };

  const addInstallmentPlan = () => {
    const maxPayments = Math.max(...charges.installmentPlans.map(p => p.numberOfPayments), 0);
    const newPlan: InstallmentPlan = {
      id: `plan-${Date.now()}`,
      numberOfPayments: maxPayments + 1,
      markupPercent: 5,
    };
    onUpdate({ ...charges, installmentPlans: [...charges.installmentPlans, newPlan] });
  };

  const removeInstallmentPlan = (planId: string) => {
    const plan = charges.installmentPlans.find(p => p.id === planId);
    if (plan?.numberOfPayments === 1) return; // Cannot remove 1x payment
    onUpdate({ ...charges, installmentPlans: charges.installmentPlans.filter(p => p.id !== planId) });
  };

  const addOffer = () => {
    if (!newOfferName || !newOfferPrice) return;
    const newOffer: Offer = {
      id: `offer-${Date.now()}`,
      name: newOfferName,
      basePrice: parseFloat(newOfferPrice) || 0,
      availableInstallments: newOfferInstallments,
    };
    onUpdate({ ...charges, offers: [...charges.offers, newOffer] });
    setNewOfferName('');
    setNewOfferPrice('');
    setNewOfferInstallments([{ numberOfPayments: 1, markupPercent: 0 }]);
  };

  const removeOffer = (offerId: string) => {
    onUpdate({ ...charges, offers: charges.offers.filter(o => o.id !== offerId) });
  };

  const toggleOfferInstallment = (plan: InstallmentPlan) => {
    const existing = newOfferInstallments.find(i => i.numberOfPayments === plan.numberOfPayments);
    if (existing) {
      if (newOfferInstallments.length > 1) {
        setNewOfferInstallments(newOfferInstallments.filter(i => i.numberOfPayments !== plan.numberOfPayments));
      }
    } else {
      setNewOfferInstallments([
        ...newOfferInstallments, 
        { numberOfPayments: plan.numberOfPayments, markupPercent: plan.markupPercent }
      ].sort((a, b) => a.numberOfPayments - b.numberOfPayments));
    }
  };

  const updateOfferInstallmentMarkup = (numberOfPayments: number, markupPercent: number) => {
    setNewOfferInstallments(prev => 
      prev.map(i => i.numberOfPayments === numberOfPayments ? { ...i, markupPercent } : i)
    );
  };

  const updateExistingOfferInstallment = (offerId: string, numberOfPayments: number, markupPercent: number) => {
    const updatedOffers = charges.offers.map(offer => {
      if (offer.id === offerId) {
        return {
          ...offer,
          availableInstallments: offer.availableInstallments.map(i => 
            i.numberOfPayments === numberOfPayments ? { ...i, markupPercent } : i
          )
        };
      }
      return offer;
    });
    onUpdate({ ...charges, offers: updatedOffers });
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
              💳 Processeur de paiement
            </label>
            <div className="relative">
              <input
                type="number"
                value={charges.paymentProcessorPercent}
                onChange={(e) => handleChange('paymentProcessorPercent', parseFloat(e.target.value) || 0)}
                className="input-field w-full pr-8"
                min="0"
                max="100"
                step="0.1"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Par défaut: 4%</p>
          </div>

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

      {/* Installment Plans Configuration */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-semibold text-foreground">
              Plans de facilités de paiement
            </h3>
          </div>
          <Button onClick={addInstallmentPlan} size="sm" variant="outline">
            <Plus className="mr-1 h-4 w-4" />
            Ajouter un plan
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {charges.installmentPlans
            .sort((a, b) => a.numberOfPayments - b.numberOfPayments)
            .map((plan) => (
            <div key={plan.id} className="rounded-lg border border-border/50 bg-secondary/20 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-semibold text-foreground">{plan.numberOfPayments}x</span>
                {plan.numberOfPayments > 1 && (
                  <button
                    onClick={() => removeInstallmentPlan(plan.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Majoration</label>
                <div className="relative">
                  <input
                    type="number"
                    value={plan.markupPercent}
                    onChange={(e) => handlePlanChange(plan.id, parseFloat(e.target.value) || 0)}
                    className="input-field w-full pr-8"
                    min="0"
                    max="100"
                    step="0.5"
                    disabled={plan.numberOfPayments === 1}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Offers Management */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-semibold text-foreground">
            Catalogue d'offres
          </h3>
        </div>

        {/* Existing offers */}
        {charges.offers.length > 0 && (
          <div className="mb-6 space-y-3">
            {charges.offers.map(offer => (
              <div key={offer.id} className="rounded-lg border border-border/50 bg-secondary/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-medium text-foreground">{offer.name}</span>
                    <span className="mx-2 text-muted-foreground">-</span>
                    <span className="text-foreground">{offer.basePrice.toLocaleString('fr-FR')} €</span>
                  </div>
                  <button
                    onClick={() => removeOffer(offer.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {offer.availableInstallments.map(installment => (
                    <div key={installment.numberOfPayments} className="flex items-center gap-1 rounded bg-primary/10 px-2 py-1">
                      <span className="text-xs font-medium text-primary">{installment.numberOfPayments}x</span>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          value={installment.markupPercent}
                          onChange={(e) => updateExistingOfferInstallment(offer.id, installment.numberOfPayments, parseFloat(e.target.value) || 0)}
                          className="w-12 rounded bg-background/50 px-1 py-0.5 text-xs text-center"
                          min="0"
                          max="100"
                          step="0.5"
                        />
                        <span className="text-xs text-muted-foreground ml-0.5">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add new offer */}
        <div className="rounded-lg border border-dashed border-border/50 p-4">
          <h4 className="mb-3 text-sm font-medium text-foreground">Ajouter une offre</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Nom de l'offre</label>
              <input
                type="text"
                value={newOfferName}
                onChange={(e) => setNewOfferName(e.target.value)}
                className="input-field w-full"
                placeholder="Ex: Coaching 6 mois"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Prix de base (€)</label>
              <input
                type="number"
                value={newOfferPrice}
                onChange={(e) => setNewOfferPrice(e.target.value)}
                className="input-field w-full"
                placeholder="2000"
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-2 block text-xs text-muted-foreground">Facilités de paiement et majorations</label>
            <div className="space-y-2">
              {charges.installmentPlans
                .sort((a, b) => a.numberOfPayments - b.numberOfPayments)
                .map((plan) => {
                  const isSelected = newOfferInstallments.some(i => i.numberOfPayments === plan.numberOfPayments);
                  const selectedInstallment = newOfferInstallments.find(i => i.numberOfPayments === plan.numberOfPayments);
                  
                  return (
                    <div key={plan.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleOfferInstallment(plan)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {plan.numberOfPayments}x
                      </button>
                      {isSelected && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Majoration:</span>
                          <input
                            type="number"
                            value={selectedInstallment?.markupPercent ?? plan.markupPercent}
                            onChange={(e) => updateOfferInstallmentMarkup(plan.numberOfPayments, parseFloat(e.target.value) || 0)}
                            className="w-16 rounded border border-border/50 bg-background px-2 py-1 text-xs"
                            min="0"
                            max="100"
                            step="0.5"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
          <Button onClick={addOffer} className="mt-4" disabled={!newOfferName || !newOfferPrice}>
            <Plus className="mr-1 h-4 w-4" />
            Ajouter l'offre
          </Button>
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

      {/* Coaching / Mentoring expenses - Variable by month */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-semibold text-foreground">
              Coaching / Mentorat
            </h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              Variable par mois
            </span>
          </div>
          <div className="rounded-lg bg-secondary/50 px-4 py-2">
            <span className="text-sm text-muted-foreground">Ce mois: </span>
            <span className="font-display text-lg font-bold text-foreground">
              {totalCoachingExpenses.toLocaleString('fr-FR')} €
            </span>
          </div>
        </div>

        {/* Add new coaching expense */}
        <div className="mb-4 rounded-lg border border-dashed border-border/50 p-4">
          <h4 className="mb-3 text-sm font-medium text-foreground">Ajouter une prestation</h4>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[150px]">
              <label className="mb-1 block text-xs text-muted-foreground">Nom</label>
              <input
                type="text"
                value={newCoachingName}
                onChange={(e) => setNewCoachingName(e.target.value)}
                className="input-field w-full"
                placeholder="Ex: Coach John"
              />
            </div>
            <div className="w-32">
              <label className="mb-1 block text-xs text-muted-foreground">Montant (€)</label>
              <input
                type="number"
                value={newCoachingAmount}
                onChange={(e) => setNewCoachingAmount(e.target.value)}
                className="input-field w-full"
                min="0"
                step="0.01"
                placeholder="0"
              />
            </div>
            <div className="w-36">
              <label className="mb-1 block text-xs text-muted-foreground">Type</label>
              <select
                value={newCoachingType}
                onChange={(e) => setNewCoachingType(e.target.value as CoachingExpenseType)}
                className="input-field w-full"
              >
                <option value="coaching">Coaching</option>
                <option value="mentoring">Mentorat</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => {
                  if (newCoachingName.trim() && newCoachingAmount) {
                    onAddCoachingExpense({
                      name: newCoachingName.trim(),
                      amount: parseFloat(newCoachingAmount) || 0,
                      month: selectedMonth,
                      type: newCoachingType,
                    });
                    setNewCoachingName('');
                    setNewCoachingAmount('');
                    setNewCoachingType('coaching');
                  }
                }} 
                disabled={!newCoachingName.trim() || !newCoachingAmount}
              >
                <Plus className="mr-1 h-4 w-4" />
                Ajouter
              </Button>
            </div>
          </div>
        </div>

        {/* Coaching expenses list for this month */}
        {monthlyCoachingExpenses.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aucune prestation de coaching/mentorat ce mois-ci
          </p>
        ) : (
          <div className="space-y-2">
            {monthlyCoachingExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between rounded-lg bg-secondary/30 p-3"
              >
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    expense.type === 'coaching' 
                      ? 'bg-primary/10 text-primary' 
                      : 'bg-accent/10 text-accent-foreground'
                  }`}>
                    {coachingExpenseTypeLabels[expense.type]}
                  </span>
                  <input
                    type="text"
                    value={expense.name}
                    onChange={(e) => onUpdateCoachingExpense(expense.id, { name: e.target.value })}
                    className="bg-transparent font-medium text-foreground outline-none focus:underline"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={expense.amount}
                      onChange={(e) => onUpdateCoachingExpense(expense.id, { amount: parseFloat(e.target.value) || 0 })}
                      className="w-28 rounded-lg bg-secondary/50 px-3 py-1.5 text-right font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                      min="0"
                      step="0.01"
                    />
                    <span className="text-muted-foreground">€</span>
                  </div>
                  <button
                    onClick={() => onDeleteCoachingExpense(expense.id)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Salaries section */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-semibold text-foreground">
              Salaires
            </h3>
          </div>
          <div className="rounded-lg bg-secondary/50 px-4 py-2">
            <span className="text-sm text-muted-foreground">Total: </span>
            <span className="font-display text-lg font-bold text-foreground">
              {salaries.reduce((sum, s) => sum + s.monthlyAmount, 0).toLocaleString('fr-FR')} €
            </span>
          </div>
        </div>

        {/* Add new salary */}
        <div className="mb-4 rounded-lg border border-dashed border-border/50 p-4">
          <h4 className="mb-3 text-sm font-medium text-foreground">Ajouter un salaire</h4>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">Nom</label>
              <input
                type="text"
                value={newSalaryName}
                onChange={(e) => setNewSalaryName(e.target.value)}
                className="input-field w-full"
                placeholder="Ex: Commercial"
              />
            </div>
            <div className="w-40">
              <label className="mb-1 block text-xs text-muted-foreground">Montant (€)</label>
              <input
                type="number"
                value={newSalaryAmount}
                onChange={(e) => setNewSalaryAmount(e.target.value)}
                className="input-field w-full"
                min="0"
                step="0.01"
                placeholder="0"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => {
                  if (newSalaryName.trim() && newSalaryAmount) {
                    onAddSalary({
                      name: newSalaryName.trim(),
                      monthlyAmount: parseFloat(newSalaryAmount) || 0,
                    });
                    setNewSalaryName('');
                    setNewSalaryAmount('');
                  }
                }} 
                disabled={!newSalaryName.trim() || !newSalaryAmount}
              >
                <Plus className="mr-1 h-4 w-4" />
                Ajouter
              </Button>
            </div>
          </div>
        </div>

        {/* Salaries list */}
        {salaries.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aucun salaire configuré
          </p>
        ) : (
          <div className="space-y-2">
            {salaries.map((salary) => (
              <div
                key={salary.id}
                className="flex items-center justify-between rounded-lg bg-secondary/30 p-3"
              >
                <div className="flex-1">
                  <input
                    type="text"
                    value={salary.name}
                    onChange={(e) => onUpdateSalary(salary.id, { name: e.target.value })}
                    className="bg-transparent font-medium text-foreground outline-none focus:underline"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={salary.monthlyAmount}
                      onChange={(e) => onUpdateSalary(salary.id, { monthlyAmount: parseFloat(e.target.value) || 0 })}
                      className="w-28 rounded-lg bg-secondary/50 px-3 py-1.5 text-right font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                      min="0"
                      step="0.01"
                    />
                    <span className="text-muted-foreground">€</span>
                  </div>
                  <button
                    onClick={() => onDeleteSalary(salary.id)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 text-primary" />
        <div className="text-sm">
          <p className="font-medium text-foreground">Ordre de calcul des déductions</p>
          <ol className="mt-2 list-inside list-decimal text-muted-foreground">
            <li>Processeur de paiement (sur le CA collecté)</li>
            <li>Closeurs</li>
            <li>Agence (si seuil dépassé)</li>
            <li>Charges fixes (publicité, marketing, logiciels, etc.)</li>
            <li>Coaching / Mentorat (variable par mois)</li>
            <li>Salaires</li>
            <li>Part associé (sur le bénéfice net uniquement)</li>
          </ol>
        </div>
      </div>

      {/* Reset button */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
          Réinitialisation
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Réinitialiser tous les paramètres aux valeurs par défaut.
        </p>
        <Button variant="outline" onClick={onResetCharges}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Réinitialiser les charges par défaut
        </Button>
        <div className="mt-4 rounded-lg border border-border/50 p-4">
          <h4 className="mb-2 text-sm font-medium text-foreground">Valeurs par défaut</h4>
          <div className="grid gap-1 text-xs text-muted-foreground">
            <p>• Closeurs: {defaultCharges.closersPercent}%</p>
            <p>• Agence: {defaultCharges.agencyPercent}%</p>
            <p>• Associé: {defaultCharges.associatePercent}%</p>
            <p>• Seuil agence: {defaultCharges.agencyThreshold.toLocaleString('fr-FR')} €</p>
          </div>
        </div>
      </div>
    </div>
  );
}
