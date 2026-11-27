import { inject } from '@angular/core';
import { Route, Router, Routes } from '@angular/router';
import { PrivateArea, privateAreas, requireProfile } from './core/guards/private-route';
import { Dashboard } from './features/dashboard/dashboard';
import { NotFound } from './layout/not-found';

function privateRoute(area: PrivateArea, loadComponent: NonNullable<Route['loadComponent']>): Route {
  return {
    path: area,
    data: { privateArea: area },
    canActivate: [requireProfile],
    loadComponent,
    title: privateAreas[area].title + ' | SkyCast',
  };
}

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: Dashboard, title: 'Tableau de bord | SkyCast' },
  {
    path: 'cartes',
    loadComponent: () => import('./features/locations/pages/maps').then(({ Maps }) => Maps),
    title: 'Cartes | SkyCast',
  },
  {
    path: 'previsions',
    loadComponent: () => import('./features/forecasts/forecast-page').then(({ ForecastPage }) => ForecastPage),
    title: 'Prévisions | SkyCast',
  },
  {
    path: 'air-et-uv',
    loadComponent: () => import('./features/air-quality/air-page').then(({ AirPage }) => AirPage),
    title: 'Air et UV | SkyCast',
  },
  {
    path: 'demonstration',
    loadComponent: () => import('./features/demo/demo-scenarios').then(({ DemoScenarios }) => DemoScenarios),
    title: 'Scénarios de démonstration | SkyCast',
  },
  privateRoute('favoris', () => import('./features/favorites/favorites-page').then(({ FavoritesPage }) => FavoritesPage)),
  privateRoute('alertes', () => import('./features/alerts/alerts-page').then(({ AlertsPage }) => AlertsPage)),
  {
    ...privateRoute('administration', () => import('./features/admin/admin-shell').then(({ AdminShell }) => AdminShell)),
    children: [
      { path: '', pathMatch: 'full', redirectTo: ({ queryParams, fragment }) =>
        inject(Router).createUrlTree(['/administration', 'catalogue'], { queryParams, fragment: fragment ?? undefined }) },
      { path: 'catalogue', loadComponent: () => import('./features/admin/catalogue-page').then(({ CataloguePage }) => CataloguePage) },
      { path: 'meteo', loadComponent: () => import('./features/admin/weather-admin-page').then(({ WeatherAdminPage }) => WeatherAdminPage) },
      { path: 'previsions', loadComponent: () => import('./features/admin/forecast-admin-page').then(({ ForecastAdminPage }) => ForecastAdminPage) },
      { path: 'comptes', loadComponent: () => import('./features/admin/accounts-admin-page').then(({ AccountsAdminPage }) => AccountsAdminPage) },
      { path: 'air-et-uv', loadComponent: () => import('./features/admin/air-admin-page').then(({ AirAdminPage }) => AirAdminPage) },
    ],
  },
  {
    path: 'connexion',
    data: { reason: 'session' },
    loadComponent: () => import('./layout/access-notice').then(({ AccessNotice }) => AccessNotice),
    title: 'Connexion requise | SkyCast',
  },
  {
    path: 'acces-refuse',
    loadComponent: () => import('./layout/access-notice').then(({ AccessNotice }) => AccessNotice),
    title: 'Accès refusé | SkyCast',
  },
  { path: '**', component: NotFound, title: 'Page introuvable | SkyCast' },
];
