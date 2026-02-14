

# Ajouter le CA Contracte total sous les benefices Net et Net Net

## Objectif
Afficher en petit sous le montant du Benefice Net Net et du Benefice Net, le montant total du CA Contracte (en euros). Cela permet de voir d'un coup d'oeil le volume total contracte par rapport au profit genere.

## Modification

### Fichier : `src/components/kpi/KPIPanel.tsx`

**Carte "Benefice Net Net"** (ligne 82-84) : ajouter apres le montant une ligne en petit :
```
CA Contracté : XXX XXX €
```

**Carte "Benefice Net"** (ligne 92-94) : meme ajout :
```
CA Contracté : XXX XXX €
```

Le montant affiche sera `kpis.contractedRevenue` formate en francais. Le style utilisera le pattern existant `text-xs text-muted-foreground mt-1`, identique aux sous-titres des cartes CA Collecte et CA Contracte juste a cote.

Aucune nouvelle dependance ni modification de base de donnees requise.

