

# Affichage du "Total à encaisser" sous la section Payment Breakdown

## Modification

### Fichier : `src/components/dashboard/Dashboard.tsx`

Ajouter une ligne discrète après la fermeture de la section "Payment Breakdown" (après ligne 321) :

```tsx
      </div>

      {/* Total à encaisser - toutes échéances */}
      {kpis.upcomingPaymentsTotal > 0 && (
        <div className="flex justify-end -mt-2">
          <p className="text-sm text-muted-foreground">
            💰 Total à encaisser (toutes ventes) : 
            <span className="font-semibold text-foreground ml-1">
              {kpis.upcomingPaymentsTotal.toLocaleString('fr-FR')} €
            </span>
          </p>
        </div>
      )}

      {/* Performance KPIs */}
```

## Résultat visuel

```text
┌─────────────────┬─────────────────┬─────────────────┐
│ Encaissé direct │ Encaissé échel. │ Reste ce mois   │
│    12 450 €     │     3 200 €     │    4 800 €      │
└─────────────────┴─────────────────┴─────────────────┘
                  💰 Total à encaisser (toutes ventes) : 28 750 €
```

- Texte discret aligné à droite
- Ne s'affiche que s'il y a des paiements à venir
- Utilise les données déjà calculées (`kpis.upcomingPaymentsTotal`)

