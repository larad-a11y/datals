
# Plan : Correction de l'affichage du CPL dans le KPI Panel

## Probleme identifie

Le **calcul** du CPL est correct dans `useBusinessCalculations.ts` (ligne 216) :
```typescript
const cpl = totalRegistrationsAds > 0 ? totalAdBudget / totalRegistrationsAds : 0;
// 30 000 / 5 614 = 5,34€ ✓
```

Mais le **subtitle** dans `KPIPanel.tsx` affiche le mauvais chiffre (ligne 208) :
```typescript
{kpis.totalRegistrations} inscrits total
// Affiche 6172 (Ads + Organic) au lieu de 5614 (Ads uniquement)
```

Cela donne l'impression que le CPL est 30 000 / 6172 = 4,86€ alors qu'il est bien calculé sur les inscrits Ads.

## Solution

### 1. Ajouter `totalRegistrationsAds` aux KPIs retournes

**Fichier** : `src/hooks/useBusinessCalculations.ts`

Ajouter la propriete dans le return (vers ligne 290) :
```typescript
return {
  // ... existing properties
  totalRegistrations,
  totalRegistrationsAds, // AJOUTER
  totalWebinarAttendees,
  // ...
};
```

### 2. Mettre a jour le type KPIData

**Fichier** : `src/types/business.ts`

Ajouter la propriete dans l'interface KPIData :
```typescript
export interface KPIData {
  // ... existing properties
  totalRegistrations: number;
  totalRegistrationsAds: number; // AJOUTER
  totalWebinarAttendees: number;
  // ...
}
```

### 3. Corriger l'affichage dans KPIPanel

**Fichier** : `src/components/kpi/KPIPanel.tsx`

Modifier la ligne 208 :
```typescript
// AVANT
<p className="text-xs text-muted-foreground mt-1">
  {kpis.totalRegistrations} inscrits total
</p>

// APRES
<p className="text-xs text-muted-foreground mt-1">
  {kpis.totalRegistrationsAds} inscrits ads
</p>
```

## Resultat attendu

- CPL affiche : **5,34 €**
- Subtitle affiche : **5614 inscrits ads**

Cela clarifie que le CPL est calcule uniquement sur les leads Ads, coherent avec la logique metier de mesure de l'efficacite publicitaire.
