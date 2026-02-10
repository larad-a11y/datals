

# Colonne "Offre" triable + Camembert de repartition des offres

## Modifications

### 1. `src/components/sales/SalesTable.tsx`

- Ajouter `offers` dans les props (type `Offer[]`)
- Ajouter `'offerName'` comme nouvelle valeur dans le type `SortKey`
- Ajouter une colonne "Offre" dans le header (triable via `SortHeader`)
- Ajouter le cas `'offerName'` dans la logique de tri (resolution du nom d'offre via `offerId`)
- Afficher le nom de l'offre dans chaque ligne, ou "-" si aucune offre associee

### 2. `src/components/sales/SalesCRMPanel.tsx`

- Ajouter `offers` dans les props du composant (deja present via `offers?: Offer[]`)
- Passer `offers` au composant `SalesTable`
- Ajouter un camembert (PieChart de recharts) dans la section des stats globales, affichant la repartition des ventes par offre :
  - Calcul : grouper `allSales` par `offerId`, compter le nombre de ventes par offre
  - Les ventes sans offre seront regroupees sous "Sans offre"
  - Utiliser `recharts` (deja installe) avec `PieChart`, `Pie`, `Cell`, `Tooltip`, `Legend`
  - Le camembert sera place dans une carte dediee sous les KPI globaux

### 3. `src/components/sales/SalesFilters.tsx`

- Ajouter un filtre dropdown par offre (similaire au filtre closer)
- Props supplementaires : `offers`, `selectedOfferId`, `onOfferChange`

### 4. Filtrage dans `SalesCRMPanel.tsx`

- Ajouter l'etat `selectedOfferId` et le filtre correspondant dans `filteredSales`

---

## Details techniques

### Tri par offre

```typescript
type SortKey = 'createdAt' | 'clientName' | 'totalPrice' | 'amountCollected' | 'tunnelName' | 'offerName';

// Dans la logique de tri :
case 'offerName':
  const offerNameA = offers.find(o => o.id === a.offerId)?.name || '';
  const offerNameB = offers.find(o => o.id === b.offerId)?.name || '';
  comparison = offerNameA.localeCompare(offerNameB);
  break;
```

### Camembert des offres

```typescript
// Calcul de la repartition
const offerDistribution = useMemo(() => {
  const counts: Record<string, { name: string; count: number; revenue: number }> = {};
  allSales.forEach(sale => {
    const offer = offers.find(o => o.id === sale.offerId);
    const key = sale.offerId || 'none';
    const name = offer?.name || 'Sans offre';
    if (!counts[key]) counts[key] = { name, count: 0, revenue: 0 };
    counts[key].count++;
    counts[key].revenue += sale.totalPrice;
  });
  return Object.values(counts);
}, [allSales, offers]);
```

### Fichiers modifies

| Fichier | Action |
|---------|--------|
| `src/components/sales/SalesTable.tsx` | Ajouter colonne Offre + tri |
| `src/components/sales/SalesCRMPanel.tsx` | Passer offers a SalesTable + camembert |
| `src/components/sales/SalesFilters.tsx` | Ajouter filtre par offre |

