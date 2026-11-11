import { Routes } from '@angular/router';

export const routes: Routes = [
  // Routes à ajouter ici par chaque membre de l'équipe
  // Exemple :
  // { path: 'weather', loadComponent: () => import('./features/weather/weather.component') },
  { path: '', redirectTo: '/', pathMatch: 'full' }
];
