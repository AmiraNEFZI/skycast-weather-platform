import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PrivateRouteMonitor } from '../core/guards/private-route';
import { SESSION } from '../core/session/session-provider';
import { ThemeService } from '../core/theme/theme-service';
import { CitySearch } from '../features/locations/city-search';
import { ActiveCityStore } from '../features/locations/data/active-city-store';
import { AccountMenu } from './account-menu';

@Component({
  selector: 'app-shell',
  imports: [AccountMenu, RouterLink, RouterLinkActive, CitySearch],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {
  protected readonly themes = inject(ThemeService);
  protected readonly activeCity = inject(ActiveCityStore);
  protected readonly session = inject(SESSION).current;
  protected readonly routeMatch = {
    paths: 'exact', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored',
  } as const;
  protected readonly menuOpen = signal(false);

  constructor() {
    inject(PrivateRouteMonitor);
  }
}
