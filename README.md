# SkyCast

**Plateforme météorologique permettant de consulter la météo actuelle, les prévisions, la qualité de l'air, les alertes et les données historiques, grâce à une architecture basée sur des microservices.**

## 📋 Description

SkyCast est une plateforme météo qui rassemble plusieurs fonctionnalités : recherche de villes, consultation des conditions météorologiques actuelles, prévisions, gestion des favoris, alertes, qualité de l'air et consultation de données historiques.

Le projet est organisé en microservices. Chaque service possède une responsabilité métier précise et peut être développé indépendamment, tout en communiquant avec les autres services lorsque cela est nécessaire.

## 🏗️ Architecture

Le projet est structuré en 7 microservices :

### MS1 — Location & Geocoding Service
**Responsabilité :** Gérer les lieux et leurs informations géographiques.
- Rechercher une ville
- Récupérer la latitude et la longitude d'un lieu
- Gérer les villes, les pays et les fuseaux horaires
- Fournir les informations géographiques aux autres services

**Base de données proposée :** PostgreSQL

### MS2 — Current Weather Service
**Responsabilité :** Fournir les informations météorologiques actuelles.
- Consulter la température, l'humidité et la vitesse du vent
- Fournir les conditions météorologiques actuelles
- Récupérer et normaliser les données d'un fournisseur météo externe
- Mettre en cache les données lorsque cela est nécessaire

**Base de données proposée :** MySQL ou H2

### MS3 — Weather Forecast Service
**Responsabilité :** Gérer les prévisions météorologiques horaires et quotidiennes.
- Fournir les prévisions horaires
- Fournir les prévisions quotidiennes sur 7 jours
- Présenter les températures minimales et maximales
- Fournir les informations de pluie et les conditions prévues

**Base de données proposée :** MySQL ou H2

### MS4 — Favorites & User Preferences Service
**Responsabilité :** Gérer les favoris et les préférences personnelles des utilisateurs.
- Ajouter et supprimer des villes favorites
- Définir une ville par défaut
- Gérer les unités de température et la langue
- Associer les préférences à l'identifiant utilisateur fourni par Keycloak

**Base de données proposée :** MySQL

### MS5 — Notification & Alert Management Service
**Responsabilité :** Centraliser la gestion des règles d'alerte, du déclenchement des alertes et des notifications.
- Créer des règles d'alerte liées à la température, à la pluie ou au vent
- Gérer les abonnements aux alertes
- Vérifier les conditions de déclenchement
- Déclencher les notifications et conserver leur historique et leur statut
- Prévoir une simulation d'envoi par email ou webhook

**Base de données proposée :** MongoDB

### MS6 — Air Quality & UV Service
**Responsabilité :** Fournir des informations sur la qualité de l'air et l'exposition aux UV.
- Fournir l'indice de qualité de l'air (AQI)
- Fournir les données de polluants, notamment PM2.5 et PM10
- Fournir l'indice UV
- Présenter un niveau de risque : bon, modéré ou mauvais
- Récupérer et normaliser les données d'un fournisseur externe

**Base de données proposée :** MySQL ou H2

### MS7 — Weather History & Climate Analytics Service
**Responsabilité :** Conserver et analyser les données météorologiques historiques afin de visualiser l'évolution des conditions météorologiques dans une ville ou sur une période donnée.
- Consulter l'historique des températures d'une ville
- Afficher l'évolution des températures sur une période
- Comparer les températures entre différentes périodes
- Consulter les historiques de pluie et de vent
- Générer des statistiques et des graphiques
- Comparer les données historiques avec les conditions actuelles

**Base de données proposée :** PostgreSQL ou MySQL

**Note :** Ce microservice est une proposition complémentaire. Les choix de bases de données restent également à confirmer selon les contraintes du cours.

## 📁 Structure du projet

```
skycast-weather-platform/
├── Backend/
│   ├── location-service/
│   ├── current-weather-service/
│   ├── forecast-service/
│   ├── favorites-preferences-service/
│   ├── notification-alert-service/
│   ├── air-quality-uv-service/
│   └── weather-history-analytics-service/
├── Frontend/
│   └── client-app/
├── Documentation/
│   ├── Presentation/
│   └── Diagrams/
├── README.md
└── .gitignore
```

### Rôle des dossiers

- **Backend/** : contient les sept microservices, chacun dans son propre dossier
- **Frontend/** : contient l'application cliente et son interface utilisateur
- **Documentation/Presentation/** : contient la présentation de la séance 4 et les autres présentations du projet
- **Documentation/Diagrams/** : contient les diagrammes d'architecture et les principaux diagrammes du projet

## 🔄 Frontières entre les microservices

- **MS1** gère les lieux et les coordonnées, mais pas les données météo
- **MS2** gère uniquement les conditions météorologiques actuelles, pas les prévisions
- **MS3** gère les prévisions, mais ne déclenche pas directement les alertes
- **MS4** gère les favoris et préférences, mais pas l'authentification ; celle-ci est assurée par Keycloak
- **MS5** gère les règles d'alerte et les notifications ; il regroupe les deux anciens modules liés aux alertes et aux notifications
- **MS6** gère uniquement la qualité de l'air et l'indice UV
- **MS7** conserve et analyse les données météorologiques historiques

Les API REST, les événements et les échanges de données entre les services seront définis lors de la conception de l'architecture globale.

## 🚀 Évolution progressive

Le dépôt peut être créé avant la fin du développement. Il sera enrichi progressivement avec des commits et des push.

## 👥 Équipe

Projet réalisé dans le cadre d'un cours d'architecture microservices.

## 📄 Licence

À définir selon les contraintes du projet.
