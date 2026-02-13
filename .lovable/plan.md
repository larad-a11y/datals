

# Tooltip de detail des charges dans le previsionnel

## Objectif
Ajouter un tooltip au survol de la colonne "Charges" dans le tableau previsionnel, affichant le detail de chaque poste de charge pour le mois concerne.

## Comportement
Quand l'utilisateur passe la souris sur le montant des charges d'une ligne du tableau, un tooltip apparait avec le detail :
- Frais processeur
- Frais Klarna
- Commission closers
- Commission agence
- Charges fixes
- Coaching
- Budget pub
- Part associe
- Salaires

Seuls les postes dont le montant est superieur a 0 seront affiches.

## Details techniques

### Modification de `src/components/kpi/ForecastSection.tsx`
- Importer `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` depuis `@/components/ui/tooltip`
- Ajouter `associateCost` dans l'objet `MonthForecast` pour pouvoir l'afficher dans le tooltip
- Envelopper le composant (ou la zone du tableau) dans un `TooltipProvider`
- Remplacer la cellule "Charges" de chaque ligne par un `Tooltip` dont le `TooltipTrigger` est le montant, et le `TooltipContent` liste chaque charge non nulle avec son libelle et son montant
- Faire de meme pour la ligne "Total" en sommant chaque poste sur toute la periode

### Structure du tooltip
```text
Frais processeur : XXX €
Frais Klarna : XXX €
Closers : XXX €
Agence : XXX €
Charges fixes : XXX €
Coaching : XXX €
Budget pub : XXX €
Part associe : XXX €
Salaires : XXX €
```

Aucune nouvelle dependance ni modification de base de donnees requise.

