
# Previsionnel Complet dans les KPI

## Objectif
Ajouter une section "Previsionnel" en bas de la page KPI, avec un filtre de dates (date de debut / date de fin), qui calcule automatiquement les projections financieres sur la periode selectionnee en se basant sur les donnees historiques.

## Fonctionnalites

### Filtre de dates
- Deux selecteurs de mois : "Du" (mois de debut) et "Au" (mois de fin)
- Par defaut : mois actuel jusqu'a +3 mois dans le futur
- Le previsionnel se recalcule automatiquement a chaque changement de dates

### Metriques previsionnelles calculees
Le previsionnel agrege les donnees sur toute la periode selectionnee :

1. **CA Previsionnel (TTC / HT / TVA)** -- base sur les echeances a venir de toutes les ventes existantes dont les paiements tombent dans la periode
2. **Encaissements prevus** -- total des echeances projetees (saleDate + N mois) pour les ventes en cours de paiement echelonne
3. **Charges previsionnelles** -- projection des charges fixes, salaires, coaching sur le nombre de mois de la periode
4. **Benefice Net previsionnel** -- CA previsionnel HT moins toutes les charges projetees (processeur, closers, agence, pub, fixes, coaching)
5. **Benefice Net Net previsionnel** -- apres part associe et salaires
6. **Impayees potentiels** -- montant des echeances en retard ou en defaut sur la periode

### Presentation visuelle
- Section dans une Card avec titre "Previsionnel" et icone
- Filtres de dates en haut de la section
- Grille de KPI cards similaire au style existant
- Un mini-tableau recapitulatif mois par mois sur la periode selectionnee

---

## Details techniques

### Nouveau composant : `src/components/kpi/ForecastSection.tsx`
- Composant autonome qui recoit `tunnels`, `charges`, `salaries`, `coachingExpenses` en props
- Gere son propre state pour les dates de debut/fin
- Calcule les projections en iterant sur chaque mois de la periode :
  - Pour chaque mois, identifie les echeances de paiement attendues (basees sur `saleDate` + `numberOfPayments`)
  - Projette les charges fixes mensuelles
  - Applique les memes formules de calcul que `useBusinessCalculations` (TVA, frais processeur, closers, agence, etc.)

### Modifications dans `src/components/kpi/KPIPanel.tsx`
- Import et ajout du composant `ForecastSection` en bas de la page, apres le "Detail du calcul"
- Passer les props necessaires (`tunnels`, `charges`, `salaries`, `coachingExpenses`)

### Logique de projection
```text
Pour chaque mois M dans [debut..fin] :
  1. Identifier toutes les ventes avec echeance dans M
     (saleDate + i mois, pour i de 1 a numberOfPayments)
  2. Sommer les montants attendus (hors impayes)
  3. Appliquer les deductions : TVA, processeur, Klarna, closers, agence
  4. Soustraire charges fixes + coaching + pub (budget moyen ou dernier mois connu)
  5. Calculer benefice net et net net
```

### Structure du tableau recapitulatif
| Mois | CA Prevu TTC | CA Prevu HT | Charges | Benefice Net | Benefice Net Net |
|------|-------------|-------------|---------|-------------|-----------------|

Aucune modification de base de donnees n'est necessaire -- tout est calcule cote client a partir des donnees existantes.
