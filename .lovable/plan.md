

# Remplacer le camembert par un BarChart horizontal

## Probleme
Le PieChart "Repartition par offre" est illisible quand il y a beaucoup d'offres : les labels se chevauchent, les petites parts sont invisibles, et la legende est surchargee.

## Solution
Remplacer le PieChart par un **BarChart horizontal** trie par nombre de ventes decroissant. Chaque barre affiche le nom de l'offre a gauche et la valeur a droite, avec un tooltip detaille au survol.

### Avantages
- Lisible quel que soit le nombre d'offres
- Comparaison directe entre offres facilitee
- Labels toujours visibles sans chevauchement
- Hauteur auto-adaptee au nombre d'offres

## Presentation visuelle
- Barres horizontales triees du plus grand au plus petit
- Couleur primaire (orange/coral) pour les barres
- Tooltip au survol : nombre de ventes + CA genere
- Hauteur dynamique : 40px par offre (minimum 200px)

## Details techniques

### Modification de `src/components/kpi/KPIPanel.tsx`
- Remplacer le `PieChart` + `Pie` + `Cell` + `Legend` par un `BarChart` horizontal avec `layout="vertical"`
- Trier `offerDistribution` par `count` decroissant avant affichage
- Utiliser `YAxis` avec `dataKey="name"` pour les labels d'offres a gauche
- `XAxis` pour l'echelle numerique
- `Bar` avec `dataKey="count"` et couleur primaire
- Hauteur dynamique : `Math.max(200, offerDistribution.length * 40)` px
- Tooltip personnalise affichant ventes + CA
- Supprimer les imports `Pie`, `Cell`, `Legend` devenus inutiles (si non utilises ailleurs)

