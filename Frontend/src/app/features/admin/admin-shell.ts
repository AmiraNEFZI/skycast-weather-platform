import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SESSION } from '../../core/session/session-provider';
import { ActiveCityStore } from '../locations/data/active-city-store';

@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    @if (session().role === 'admin') {
      <nav class="card form-buttons page-title" aria-label="Rubriques Administration">
        @for (item of sections; track item.path) {
          <a class="button button-secondary" [routerLink]="[item.path]" [queryParams]="city.navigationParams()"
            routerLinkActive="section-active" ariaCurrentWhenActive="page">{{ item.label }}</a>
        }
      </nav>
      <router-outlet />
    }
  `,
  styles: '.section-active { background: var(--accent-soft); color: var(--accent-text); }',
})
export class AdminShell {
  protected readonly session = inject(SESSION).current;
  protected readonly city = inject(ActiveCityStore);
  protected readonly sections = [
    { path: 'catalogue', label: 'Catalogue' }, { path: 'meteo', label: 'Météo et avis' },
    { path: 'previsions', label: 'Prévisions' }, { path: 'comptes', label: 'Comptes' },
    { path: 'air-et-uv', label: 'Air et UV' },
  ];
}
