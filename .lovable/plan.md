
# Plan : Correction du calcul "Reste à encaisser ce mois"

## Problème identifié

Le calcul actuel de `remainingToCollectThisMonth` (lignes 254-271 de `useBusinessCalculations.ts`) ne fonctionne que si `nextPaymentDate` correspond exactement au mois sélectionné.

**Problème** : `nextPaymentDate` représente uniquement la prochaine échéance immédiate. Pour un paiement en 4x :
- Mars : paiement 1 ✓ (affiché car `nextPaymentDate` = avril)
- Avril : Si on regarde avril, `nextPaymentDate` pointe sur mai après le paiement d'avril
- Mai/Juin : Le calcul ne trouve rien car `nextPaymentDate` n'est pas encore à ces mois

## Solution

Recalculer dynamiquement toutes les dates d'échéance à partir de :
1. `saleDate` (date de la vente)
2. `numberOfPayments` (nombre total de paiements)
3. `paymentHistory.length` (paiements déjà effectués)

Pour chaque vente avec paiement échelonné, générer toutes les dates d'échéance futures et vérifier si l'une tombe dans le mois sélectionné.

## Modifications

### Fichier : `src/hooks/useBusinessCalculations.ts`

Remplacer le calcul de `remainingToCollectThisMonth` (lignes 253-271) par une logique qui :

1. Pour chaque vente avec `numberOfPayments > 1` :
   - Calcule toutes les dates d'échéance futures (saleDate + N mois)
   - Vérifie si une échéance tombe dans le mois sélectionné
   - Exclut les échéances déjà payées (vérifiées dans paymentHistory)

2. Logique de calcul des dates :
```typescript
// Pour une vente du 15 mars en 4x
// Échéances : 15 mars (1), 15 avril (2), 15 mai (3), 15 juin (4)
const saleDate = new Date(sale.saleDate);
for (let i = 1; i <= sale.numberOfPayments; i++) {
  const paymentDate = new Date(saleDate);
  paymentDate.setMonth(saleDate.getMonth() + (i - 1));
  const paymentMonth = format(paymentDate, 'yyyy-MM');
  
  // Si cette échéance est dans le mois sélectionné ET pas encore payée
  if (paymentMonth === selectedMonth) {
    const isPaid = (sale.paymentHistory || []).some(p => 
      p.date.substring(0, 7) === paymentMonth && p.verified
    );
    if (!isPaid) {
      // Ajouter le montant de l'échéance
    }
  }
}
```

## Résultat attendu

- Mars : affiche la 1ère échéance des ventes de mars
- Avril : affiche la 2ème échéance des ventes de mars + 1ère échéance des ventes d'avril
- Mai : affiche la 3ème échéance des ventes de mars + 2ème des ventes d'avril + etc.
- Fonctionne pour n'importe quel mois futur
