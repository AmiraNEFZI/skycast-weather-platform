import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { DEMO_CONFIG, LOCAL_DEMO_CONFIG } from './core/config/demo-config';
import { PreferencesData } from './features/favorites/data/preferences';
import { ACCOUNT_DEFAULT_CITY } from './features/locations/data/active-city-store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: DEMO_CONFIG, useValue: LOCAL_DEMO_CONFIG },
    { provide: ACCOUNT_DEFAULT_CITY, useFactory: () => inject(PreferencesData).defaultCity },
  ],
};
