# Pylône Production — Guide d'installation

Application web (PWA) de gestion de production, stock et galvanisation pour la
fabrication de pylônes électriques. Aucun module Qualité / Non-Conformité —
uniquement : Pylônes → Production → Stock → Galvanisation → Retour → Suivi.

## Installation (aucun serveur requis)

1. Décompressez le zip.
2. Ouvrez `index.html` dans un navigateur (Chrome, Edge, Safari).
   - Pour un fonctionnement PWA complet (installation + hors ligne), servez le
     dossier via HTTP plutôt que d'ouvrir le fichier directement, par ex. :
     `npx serve .` ou `python3 -m http.server`, puis ouvrez `http://localhost:PORT`.
3. Sur mobile (Android/iPhone) : ouvrez l'URL, puis "Ajouter à l'écran d'accueil".
   Sur PC (Chrome/Edge) : icône d'installation dans la barre d'adresse.

## Données

Toutes les données sont stockées **localement sur l'appareil** (localStorage),
donc l'application fonctionne hors ligne. Utilisez **Paramètres → Sauvegarde**
pour exporter/importer un fichier JSON de sauvegarde, et le partager entre postes
si besoin (pas de synchronisation automatique multi-appareils dans cette version).

Des données de démonstration sont chargées au premier lancement (1 projet,
3 pièces, quelques entrées de production, 1 expédition de galvanisation).

**Import Excel et scan photo** utilisent des bibliothèques chargées depuis internet
(SheetJS, Tesseract.js) — une connexion est donc nécessaire la première fois pour ces
deux fonctions (la saisie manuelle et le reste de l'application fonctionnent hors ligne).
La reconnaissance photo est une aide : relisez toujours le tableau proposé avant de
valider, en particulier pour de l'écriture manuscrite.

## Modules inclus

- **Dashboard** — KPI production/stock/galvanisation, progression par phase
- **Pylônes** — projets, répartition en phases, liste et statut de chaque pylône
- **Nomenclature** — pièces par pylône et par projet, calcul auto besoin/reste
- **Repérés / Pièces** — catalogue (profil, longueur, acier, poids unitaire), avec 3 façons de
  saisir : manuellement, **import Excel/CSV** (modèle téléchargeable, reconnaissance automatique
  des colonnes), et **scan photo** (prendre une photo d'une feuille de repérés, extraction du
  texte, tableau à corriger avant validation). Modification et suppression possibles à tout moment.
- **Production** — saisie journalière (met à jour le stock automatiquement),
  vue par machine (jour/semaine/mois)
- **Stock** — stock actuel par pièce, poids en kg et tonnes
- **Galvanisation** — expéditions (numéro auto GAL-AAAA-XXX, vérification du
  stock disponible), suivi des envois en cours, retours avec comparaison
  automatique quantité/poids envoyé vs reçu, historique avec export CSV
- **Rapports** — production par profil/machine, totaux galvanisation
- **Recherche rapide** — pièces, pylônes, expéditions, machines
- **Paramètres** — machines, types d'acier, rôle utilisateur, sauvegarde

## Prochaines évolutions possibles (hors périmètre actuel)

- Backend Node.js/PostgreSQL pour partage multi-utilisateurs en temps réel
  (le schéma de tables recommandé est identique à celui du cahier des charges)
- Authentification par rôle avec permissions réellement appliquées
- Import Excel de nomenclatures/pylônes, export PDF des rapports
- Photo/OCR pour la saisie des repérés

## Structure des fichiers

```
index.html      page principale
style.css       identité visuelle (acier / jaune sécurité)
app.js          toute la logique applicative
manifest.json   configuration PWA
sw.js           service worker (cache hors ligne)
icon-192.png / icon-512.png   icônes d'installation
```
