# SkyCast - Application Frontend

Application frontend Angular pour la plateforme météorologique SkyCast.

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **Node.js** : version 18.x ou supérieure (recommandé: v26.4.0)
- **npm** : version 10.x ou supérieure (recommandé: v11.17.0)
- **Angular CLI** : version 18.x

### Vérifier vos versions

```bash
node --version
npm --version
ng version
```

### Installer Angular CLI (si nécessaire)

```bash
npm install -g @angular/cli
```

## 🚀 Installation

### 1. Cloner le dépôt (si ce n'est pas déjà fait)

```bash
git clone https://github.com/AmiraNEFZI/skycast-weather-platform.git
cd skycast-weather-platform
```

### 2. Se déplacer dans le dossier frontend

```bash
cd Frontend/client-app
```

### 3. Installer les dépendances

```bash
npm install
```

Cette commande va télécharger tous les packages nécessaires définis dans `package.json`.

## 💻 Développement

### Lancer le serveur de développement

```bash
npm start
```

Ou directement avec Angular CLI :

```bash
ng serve
```

L'application sera accessible sur **http://localhost:4200**

Le serveur se rechargera automatiquement si vous modifiez des fichiers source.

## 📁 Structure du projet

```
client-app/
├── src/
│   ├── app/
│   │   ├── app.component.ts       # Composant principal
│   │   ├── app.component.html     # Template du composant principal
│   │   ├── app.component.scss     # Styles du composant principal
│   │   ├── app.config.ts          # Configuration de l'application
│   │   └── app.routes.ts          # Configuration du routing
│   ├── index.html                 # Page HTML principale
│   ├── main.ts                    # Point d'entrée de l'application
│   └── styles.scss                # Styles globaux
├── public/                        # Assets statiques
├── angular.json                   # Configuration Angular
├── package.json                   # Dépendances npm
├── tsconfig.json                  # Configuration TypeScript
└── README.md                      # Ce fichier
```

## 🏗️ Architecture

Cette application utilise :

- **Angular 18** avec les standalone components
- **SCSS** pour les styles
- **Router** pour la navigation
- **HttpClient** pour les appels API

## 🔌 Microservices Backend

L'application communiquera avec les microservices backend via la **passerelle API** sur le port **8000** :

| Microservice | Port | Endpoint via passerelle |
|-------------|------|------------------------|
| MS1 - Location & Geocoding | 8081 | `/api/locations/*` |
| MS2 - Current Weather | 8082 | `/api/weather/current/*` |
| MS3 - Weather Forecast | 8083 | `/api/weather/forecast/*` |
| MS4 - Favorites & Preferences | 8084 | `/api/favorites/*` |
| MS5 - Notification & Alert | 8085 | `/api/alerts/*` |
| MS6 - Air Quality & UV | 8086 | `/api/air-quality/*` |
| MS7 - Weather History | 8087 | `/api/history/*` |

## 👥 Collaboration

### Workflow Git recommandé

1. **Créer une branche pour votre fonctionnalité**

```bash
git checkout main
git pull origin main
git checkout -b feature/nom-de-votre-fonctionnalite
```

2. **Développer votre fonctionnalité**

Créez vos composants, services, etc. dans le dossier `src/app/`

3. **Commiter vos changements**

```bash
git add .
git commit -m "feat: description de votre fonctionnalité"
```

4. **Pousser votre branche**

```bash
git push origin feature/nom-de-votre-fonctionnalite
```

5. **Créer une Pull Request sur GitHub**

Allez sur GitHub et créez une Pull Request pour merger votre branche dans `main`.

### Organisation des modules

Chaque membre peut créer un module pour sa partie :

- **MS1 (Membre 1)** : Module de recherche de villes et géolocalisation
- **MS2 (Membre 2)** : Module de météo actuelle
- **MS3 (Membre 3)** : Module de prévisions météo
- **MS4 (Membre 4)** : Module de favoris et préférences
- **MS5 (Membre 5)** : Module d'alertes et notifications
- **MS6 (Membre 6)** : Module de qualité de l'air et UV
- **MS7 (Tous)** : Module d'historique et analyse (travail commun)

## 🔧 Commandes utiles

| Commande | Description |
|----------|-------------|
| `npm start` | Démarre le serveur de développement |
| `npm run build` | Compile l'application pour la production |
| `npm test` | Lance les tests unitaires |
| `ng generate component nom` | Génère un nouveau composant |
| `ng generate service nom` | Génère un nouveau service |
| `ng generate module nom` | Génère un nouveau module |

## 🐛 Dépannage

### Le port 4200 est déjà utilisé

Si vous avez une erreur indiquant que le port 4200 est occupé :

```bash
ng serve --port 4201
```

### Erreur après `git pull`

Si vous obtenez des erreurs après avoir récupéré les dernières modifications :

```bash
npm install
```

Cela réinstallera les dépendances qui pourraient avoir été mises à jour.

### Problèmes avec node_modules

Si vous avez des problèmes avec les dépendances :

```bash
rm -rf node_modules package-lock.json
npm install
```

## 📝 Notes importantes

- **Port de développement** : 4200 (à utiliser par tous les membres pour la cohérence)
- **Ne pas commiter** : `node_modules/`, `.angular/cache/`, `dist/`
- **Toujours faire** : `npm install` après un `git pull`
- **Avant de pousser** : Vérifier que l'application compile (`npm run build`)

## 📚 Ressources

- [Documentation Angular](https://angular.dev/)
- [Angular CLI](https://angular.dev/tools/cli)
- [RxJS](https://rxjs.dev/)
- [TypeScript](https://www.typescriptlang.org/)

## 👨‍💻 Contributeurs

- Membre 1 : MS1 - Location & Geocoding
- Membre 2 : MS2 - Current Weather
- Membre 3 : MS3 - Weather Forecast
- Membre 4 : MS4 - Favorites & Preferences
- Membre 5 : MS5 - Notification & Alert
- Membre 6 : MS6 - Air Quality & UV
- Tous : MS7 - Weather History & Analytics

---

**Bon développement ! ☁️🌤️⛈️**
