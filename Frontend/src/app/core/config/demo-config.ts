import { InjectionToken } from '@angular/core';

export type Theme = 'light' | 'dark';

interface DemoConfig {
  readonly defaultTheme: Theme;
  readonly responseDelayMs: number;
}

export const DEMO_CONFIG = new InjectionToken<DemoConfig>('Configuration de démo SkyCast');

export const LOCAL_DEMO_CONFIG: DemoConfig = {
  defaultTheme: 'light',
  responseDelayMs: 800,
};
