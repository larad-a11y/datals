
# Plan : Correction des calculs CPL, CAC et Coût/Présent dans TunnelCard

## Probleme identifie

Les metriques de performance publicitaire dans `TunnelCard.tsx` utilisent le total (Ads + Organic) au lieu des donnees Ads uniquement :

| Metrique | Calcul actuel (incorrect) | Calcul attendu |
|----------|---------------------------|----------------|
| CAC | Budget / Total ventes | Budget / Ventes Ads |
| CPL | Budget / Total inscriptions | Budget / Inscriptions Ads |
| Cout/Present | Budget / Total presents | Budget / Presents Ads (estimes) |

## Solution proposee

### Fichier : src/components/dashboard/TunnelCard.tsx

**1. CAC - Calculer sur les ventes Ads uniquement (lignes 51-54)**

```typescript
// AVANT
const actualSalesCount = tunnel.sales.length;
const cac = actualSalesCount > 0 
  ? tunnel.adBudget / actualSalesCount 
  : 0;

// APRES
const salesFromAds = tunnel.sales.filter(s => s.trafficSource === 'ads').length;
const cac = salesFromAds > 0 
  ? tunnel.adBudget / salesFromAds 
  : 0;
```

**2. CPL - Utiliser registrationsAds (lignes 56-59)**

```typescript
// AVANT
const cpl = tunnel.registrations && tunnel.registrations > 0 
  ? tunnel.adBudget / tunnel.registrations 
  : 0;

// APRES
const cpl = tunnel.registrationsAds && tunnel.registrationsAds > 0 
  ? tunnel.adBudget / tunnel.registrationsAds 
  : 0;
```

**3. Cout par Present - Estimer les presents Ads (lignes 61-71)**

```typescript
// APRES - Calculer le ratio Ads pour estimer les presents Ads
const totalRegistrations = (tunnel.registrationsAds || 0) + (tunnel.registrationsOrganic || 0);
const adsRatio = totalRegistrations > 0 
  ? (tunnel.registrationsAds || 0) / totalRegistrations 
  : 1;

let costPerAttendee = 0;
if (tunnel.type === 'webinar' && tunnel.attendees && tunnel.attendees > 0) {
  const attendeesAds = Math.round(tunnel.attendees * adsRatio);
  if (attendeesAds > 0) {
    costPerAttendee = tunnel.adBudget / attendeesAds;
  }
} else if (tunnel.type === 'challenge' && tunnel.challengeDays && tunnel.challengeDays.length > 0) {
  const maxAttendees = Math.max(...tunnel.challengeDays.map(d => d.attendees));
  const maxAttendeesAds = Math.round(maxAttendees * adsRatio);
  if (maxAttendeesAds > 0) {
    costPerAttendee = tunnel.adBudget / maxAttendeesAds;
  }
}
```

## Resume des modifications

| Ligne | Modification |
|-------|-------------|
| 46 | Ajouter `salesFromAds` filtre sur trafficSource |
| 52-54 | CAC utilise `salesFromAds` |
| 57-59 | CPL utilise `registrationsAds` |
| 61-71 | Cout/Present avec ratio Ads applique |

## Resultat attendu

Avec les donnees actuelles (30 000€ budget, 6250 inscrits Ads, 1800 presents peak) :
- CPL = 30 000 / 6 250 = **4.8€**
- Cout/Present = 30 000 / 1 800 = **16.67€** (si 100% Ads)
- CAC = 30 000 / (nombre de ventes Ads uniquement)

Ces calculs refletent maintenant le cout reel d'acquisition via la publicite, sans etre dilues par les leads organiques.
