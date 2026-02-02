
# Plan : Correction du calcul du Coût par Présent pour les Challenges

## Probleme identifie

Le calcul actuel du "Cout/Present Moy" pour les challenges divise le budget publicitaire par la **moyenne** des presents sur tous les jours, ce qui donne un resultat incorrect.

Avec tes donnees :
- Budget pub : 30 000 euros
- 1800 presents le jour 1 (29% de show-up)
- Si les autres jours ont moins de monde, la moyenne baisse

Resultat actuel : 30 000 / moyenne ≈ 67 euros (faux)
Resultat attendu : 30 000 / 1800 = 16,67 euros

## Solution proposee

Modifier la logique pour calculer le cout par present sur **le jour avec le plus de presents** (le peak). Cela represente le cout reel pour avoir une personne en live, car c'est le meme groupe de personnes qui revient chaque jour.

**Formule corrigee** : Budget Pub / MAX(presents par jour)

## Changements techniques

### Fichier : src/components/dashboard/TunnelCard.tsx

Modifier les lignes 65-70 pour utiliser le maximum au lieu de la moyenne :

```typescript
// AVANT (moyenne)
const avgAttendees = tunnel.challengeDays.reduce((sum, d) => sum + d.attendees, 0) / tunnel.challengeDays.length;

// APRES (maximum)
const maxAttendees = Math.max(...tunnel.challengeDays.map(d => d.attendees));
if (maxAttendees > 0) {
  costPerAttendee = tunnel.adBudget / maxAttendees;
}
```

### Fichier : src/hooks/useBusinessCalculations.ts

Modifier le calcul global du `costPerWebinarAttendee` pour inclure les challenges de la meme maniere (lignes 69-72 et 201-202) :

```typescript
// Calculer les presents max pour les challenges
const totalChallengeMaxAttendees = filteredTunnels
  .filter(t => t.type === 'challenge' && t.challengeDays && t.challengeDays.length > 0)
  .reduce((sum, t) => sum + Math.max(...t.challengeDays!.map(d => d.attendees)), 0);

// Combiner avec les webinars
const totalAttendees = totalWebinarAttendees + totalChallengeMaxAttendees;
const costPerAttendee = totalAttendees > 0 ? totalAdBudget / totalAttendees : 0;
```

## Resultat attendu

Avec 30 000 euros de budget et 1800 presents au peak :
- Cout par present = 30 000 / 1800 = **16,67 euros**

## Alternative

Si tu preferes un autre comportement (par exemple le total cumule des presents sur tous les jours), dis-le moi et j'adapterai le calcul.
