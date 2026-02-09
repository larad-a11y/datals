
# Fonctionnalité de Remboursement des Ventes

## Résumé

Ajouter un bouton de remboursement sur chaque ligne de vente dans le CRM, permettant de :
1. Rembourser totalement la vente en un clic
2. Rembourser un montant personnalisé (partiel)
3. Tracker le montant total remboursé par tunnel et par mois
4. Soustraire automatiquement les remboursements du CA Collecté et CA Contracté

---

## Modifications à effectuer

### 1. Mise à jour du type Sale (`src/types/business.ts`)

Ajouter les nouveaux champs pour les remboursements :

```typescript
export interface RefundRecord {
  id: string;
  amount: number;
  date: string;
  reason?: string;
}

export interface Sale {
  // ... champs existants ...
  refundedAmount?: number;        // Montant total remboursé
  refundHistory?: RefundRecord[]; // Historique des remboursements
  isFullyRefunded?: boolean;      // Vente totalement remboursée
}
```

### 2. Mise à jour du KPIData (`src/types/business.ts`)

Ajouter les métriques de remboursement :

```typescript
export interface KPIData {
  // ... champs existants ...
  totalRefundedAmount: number;    // Total remboursé ce mois
  refundedSalesCount: number;     // Nombre de ventes remboursées
}
```

### 3. Migration base de données

Ajouter les colonnes dans la table `sales` :
- `refunded_amount` (numeric, default 0)
- `refund_history` (jsonb, default '[]')
- `is_fully_refunded` (boolean, default false)

### 4. Nouveau composant RefundActions (`src/components/sales/RefundActions.tsx`)

Similaire à PaymentActions, avec :
- Dropdown pour choisir l'action
- Option "Remboursement total" (1 clic)
- Option "Remboursement partiel" (montant personnalisé)
- Dialogue d'historique des remboursements

### 5. Mise à jour de SalesTable (`src/components/sales/SalesTable.tsx`)

- Ajouter une colonne "Remboursé" après "Reste"
- Intégrer le composant RefundActions dans les actions de chaque ligne
- Badge visuel pour les ventes partiellement/totalement remboursées

### 6. Mise à jour des calculs KPI (`src/hooks/useBusinessCalculations.ts`)

Modifier les calculs pour soustraire les remboursements :
- `contractedRevenue` : soustrait `refundedAmount` de chaque vente
- `collectedRevenue` : soustrait `refundedAmount` de chaque vente
- Nouvelle métrique `totalRefundedAmount` pour le mois

### 7. Mise à jour de useSupabaseData (`src/hooks/useSupabaseData.ts`)

- Mapper les nouveaux champs de la DB vers le type Sale
- Ajouter une fonction `onRecordRefund` pour enregistrer les remboursements

### 8. Mise à jour du Dashboard (`src/components/dashboard/Dashboard.tsx`)

Afficher une nouvelle carte KPI optionnelle "Remboursements" si le montant > 0.

---

## Interface utilisateur

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│ Date    │ Client │ Prix    │ Encaissé │ Reste  │ Remboursé │ Actions          │
├────────────────────────────────────────────────────────────────────────────────┤
│ 15/03   │ Jean   │ 2000 €  │ 2000 €   │ 0 €    │ 500 €     │ [💰] [↩️] [✏️] [🗑️] │
│         │        │         │          │        │ (partiel) │                  │
├────────────────────────────────────────────────────────────────────────────────┤
│ 12/03   │ Marie  │ 1500 €  │ 1500 €   │ 0 €    │ 1500 €    │ [---] [---]      │
│         │        │         │          │        │ (total)   │ Remboursée       │
└────────────────────────────────────────────────────────────────────────────────┘
```

Dropdown du bouton Remboursement :
```text
┌─────────────────────────────────┐
│ ↩️ Remboursement total          │
│    1 500 €                      │
├─────────────────────────────────┤
│ ✏️ Remboursement partiel        │
│    Saisir un montant            │
├─────────────────────────────────┤
│ 📋 Historique des remboursements│
└─────────────────────────────────┘
```

---

## Détails techniques

### Calcul du CA ajusté

```typescript
// CA Contracté ajusté = sum(totalPrice) - sum(refundedAmount)
const contractedRevenue = sales.reduce((sum, sale) => 
  sum + sale.totalPrice - (sale.refundedAmount || 0), 0
);

// CA Collecté ajusté = sum(amountCollected) - sum(refundedAmount)
const collectedRevenue = sales.reduce((sum, sale) => 
  sum + sale.amountCollected - (sale.refundedAmount || 0), 0
);
```

### Logique du remboursement

- Le remboursement ne peut pas dépasser le montant collecté (`amountCollected`)
- Un remboursement total marque la vente comme `isFullyRefunded = true`
- Les ventes totalement remboursées sont exclues des statistiques de paiement
- L'historique des remboursements conserve la date et le montant de chaque opération

### Fichiers à créer/modifier

| Fichier | Action |
|---------|--------|
| `src/types/business.ts` | Modifier (ajouter types RefundRecord, champs Sale) |
| `src/components/sales/RefundActions.tsx` | Créer |
| `src/components/sales/SalesTable.tsx` | Modifier (ajouter colonne + bouton) |
| `src/hooks/useBusinessCalculations.ts` | Modifier (ajuster calculs) |
| `src/hooks/useSupabaseData.ts` | Modifier (mapper nouveaux champs) |
| `src/components/dashboard/Dashboard.tsx` | Modifier (optionnel: carte KPI) |
| Migration SQL | Créer (nouvelles colonnes) |

