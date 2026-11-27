# SkyCast Frontend

Application météo universitaire en français. Le socle utilise Angular 22.3.0. Les commandes ont été vérifiées avec Node.js 24.19.0 et npm 12.2.2.

## Démarrage

Depuis `Frontend/` :

```sh
npm ci
npm start
```

Ouvrir `http://localhost:4200/`. Exécuter `npm run build` pour construire l’application et `npm test -- --watch=false` pour lancer les tests une fois. `npm test` lance le mode interactif en local.

## Démonstration

| Routes | Accès |
| --- | --- |
| `/`, `/cartes`, `/previsions`, `/air-et-uv`, `/demonstration` | Tous les profils |
| `/favoris`, `/alertes` | Utilisateur |
| `/administration` et ses rubriques `catalogue`, `meteo`, `previsions`, `comptes`, `air-et-uv` | Administrateur |

L’accueil démarre sur Tunis en profil **Visiteur**. Dans **Compte**, choisir **Amel** pour le favori Maison à Tunis et une notification Application non lue, **Karim** pour le favori Côte à Sousse, ou **Lina** pour l’administration.

**Compte → Scénarios de démonstration** regroupe les liens et étapes de recette pour le succès, la recherche retardée, les mesures vides ou partielles, le refus de géolocalisation, la panne air et UV, le doublon d’avis et l’échec partiel d’un abonnement.

**Compte → Réinitialiser la démo → Confirmer la remise à zéro** restaure les fixtures et le thème Ciel Clair dans l’onglet courant. L’application annule les requêtes privées en cours et revient sur Tunis en visiteur. Les valeurs initiales sont ancrées au **27 novembre 2026 à 14 h 30 UTC**. Pour les activités de la démonstration, utiliser une date à partir du 28 novembre 2026.

## Vérifier le socle

- Ouvrir `/`, puis une adresse inconnue comme `/inconnue`. Utiliser « Retour au tableau de bord ».
- Basculer entre Ciel Clair et Horizon en bas de page, puis recharger pour vérifier la mémorisation du thème.
- Réduire la fenêtre à une largeur de téléphone et ouvrir le menu. Utiliser Tab pour parcourir les contrôles et vérifier le focus visible.

La démo a été vérifiée dans Chromium à 1 280 et 390 pixels, en Ciel Clair et Horizon.

## Vérifier la ville active et les cartes

- Ouvrir `/` pour Tunis ou `/cartes?ville=9` pour Paris. Les liens du menu conservent le paramètre de ville. Tester un identifiant inconnu pour afficher la ville de repli et corriger le lien.
- Dans la recherche globale, taper `tu` puis `par` pour comparer une requête lente et une autre plus rapide. Valider une ville au clic ou avec Entrée pour le premier résultat. Taper `!erreur` pour tester l’erreur et `zzzz` pour tester un résultat vide.
- Dans Cartes, modifier le rayon de 25 km à 1 km autour de Tunis pour obtenir un résultat vide. La carte schématique et sa liste numérotée utilisent le catalogue local.
- Depuis l’accueil ou Cartes, utiliser « Utiliser ma position » pour demander l’autorisation au navigateur. Dans Cartes, « Simuler la géolocalisation » permet de rejouer les quatre scénarios de démo sans autorisation réelle. Une position trouvée propose une ville dans un rayon de 100 km. Il faut confirmer pour l’afficher.

## Vérifier les données publiques

- Sur `/`, sélectionner Tunis, Sousse puis Paris dans la vitrine. La météo, les sept jours et les avis suivent la ville. Tunis a plusieurs pages d’avis. Le relevé météo de Sousse est ancien et partiel.
- Ouvrir « Scénario de démonstration » puis « Simuler une panne air et UV ». Vérifier que seule cette carte échoue, puis que « Réessayer » restaure son contenu.
- Consulter `/previsions?ville=9` pour la température horaire, la probabilité de pluie et les sept jours de Paris. Ouvrir « Voir les valeurs » sous un graphique pour lire les mesures en tableau.
- Consulter `/air-et-uv?ville=1`, vérifier l’UV à zéro et basculer de 24 h à 7 jours. La moyenne AQI reste calculée sur 24 h. Sur Sousse (`ville=2`), les mesures PM10 et UV actuelles sont absentes. Sur Ariana (`ville=8`), il n’y a ni relevé ni historique.

Les horaires s’affichent dans le fuseau de la ville. Les relevés et prévisions sont simulés à partir de l’horloge de référence.

## Vérifier les sessions simulées

- Ouvrir **Compte**, choisir Visiteur, Utilisateur · Amel, Utilisateur · Karim ou Administrateur · Lina, puis appliquer. Le profil est mémorisé pour la session de l’onglet. Choisir Visiteur pour fermer la session de démonstration.
- En visiteur, ouvrir directement `/favoris?ville=9` ou `/alertes?ville=9`. L’invitation permet de choisir un profil et de poursuivre vers la page demandée avec la même ville.
- En utilisateur, ouvrir `/administration` pour vérifier le refus. En administrateur, vérifier l’apparition du lien Administration, puis passer à Visiteur depuis cette page pour vérifier la redirection.
- Depuis Favoris ou Alertes, basculer d’Amel à Karim pendant le chargement. Les données affichées doivent correspondre uniquement au nouveau compte.

L’identité, les permissions et les écritures sont simulées côté navigateur. Les modifications sont conservées pour la session de l’onglet.

## Vérifier le parcours utilisateur

- En profil **Utilisateur · Amel**, ajouter Paris aux favoris, modifier son alias et le placer en tête. Le définir par défaut puis ouvrir `/` et `/?ville=1`. Vérifier respectivement Paris et Tunis. Supprimer un favori après confirmation.
- Dans Préférences, choisir Fahrenheit, m/s et Horizon. Vérifier les unités sur l’accueil et sur les graphiques de prévisions. Le formulaire et l’application restent en français. Vérifier la réinitialisation.
- Donner un avis à Tunis, le modifier et tester un second avis le même jour. La limite se base sur la date locale de la ville. Le mock conserve l’horodatage du relevé associé.
- Depuis Prévisions, planifier puis modifier une activité, consulter son verdict simulé et supprimer une activité passée. Le fournisseur accepte dix activités à venir par compte.
- Dans Alertes, créer ou modifier une règle, puis ajouter les canaux Application et Courriel. La première tentative Courriel échoue par règle dans la démo. Réessayer ce canal et vérifier que la règle et l’abonnement Application ont été conservés.
- Filtrer les notifications et marquer une notification Application comme lue. Comparer le compteur sur la page Alertes et dans l’aperçu de l’accueil. Passer à Karim pour vérifier l’isolation des données.

## Vérifier les parcours d’administration

Passer en **Administrateur · Lina** et ouvrir Administration.

- **Catalogue** · Ajouter un pays, un fuseau IANA et une ville, puis constater le refus de supprimer un référentiel utilisé. Supprimer la ville ajoutée pour libérer le référentiel. Les villes du jeu initial sont protégées parce qu’elles alimentent les exemples de la démo.
- **Météo et avis** · Ajouter, déplacer et retirer une ville de la vitrine. Répondre à un avis puis vérifier la réponse sur l’accueil de la ville concernée.
- **Prévisions** · Créer une configuration par ville. Simuler un échec, puis une synchronisation réussie. Corriger une prévision et resynchroniser pour vérifier que la saisie manuelle est conservée. Tester l’annulation puis la confirmation d’une purge. Elle s’applique aux séries horaires et quotidiennes de la ville affichée dans la confirmation.
- **Comptes** · Filtrer les favoris par compte ou par ville. Modifier les préférences de Karim, puis passer à son profil pour vérifier leur application.
- **Air et UV** · Sur Ariana, saisir un relevé daté dans les sept derniers jours, avec un UV à zéro. Corriger son AQI et vérifier le détail public. La saisie est en UTC et le détail public affiche l’heure locale.

Les synchronisations sont déclenchées manuellement dans la démo. Les activités, règles, abonnements et notifications personnels restent réservés à leur propriétaire.

## Réglages et limites

- `DEMO_CONFIG` dans `src/app/core/config/demo-config.ts` règle les délais et le thème initial du visiteur. `DEMO_NOW` dans `src/app/core/config/demo-clock.ts` fixe l’horloge.
- Les scénarios utilisent des ressources locales et des comptes fictifs. La géolocalisation du navigateur peut demander une autorisation. Les simulations de Cartes couvrent les mêmes états sans dépendre de cette autorisation.
- L’intégration ultérieure nécessite l’URL et les contrats effectifs de la Gateway, le client et les rôles Keycloak, puis le contrat de l’historique météo MS7.
