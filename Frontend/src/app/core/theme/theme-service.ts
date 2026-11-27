import { computed, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import { DEMO_CONFIG, Theme } from '../config/demo-config';
import { defaults, PreferencesData } from '../../features/favorites/data/preferences';
import { SESSION } from '../session/session-provider';
import { DemoStorage } from '../demo/demo-storage';

const STORAGE_KEY = 'theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly config = inject(DEMO_CONFIG);
  private readonly storage = inject(DemoStorage);
  private readonly selection = signal(this.readTheme());
  private readonly preferences = inject(PreferencesData);
  private readonly session = inject(SESSION);
  readonly theme = computed(() => this.session.current().role === 'user'
    ? (this.preferences.current() ?? defaults).theme : this.selection());

  constructor() {
    effect(() => {
      this.document.documentElement.dataset['theme'] = this.theme();
    });
  }

  setTheme(theme: Theme): void {
    if (this.session.current().role === 'user') {
      this.preferences.saveTheme(theme).subscribe({ error: () => {} });
      return;
    }
    this.selection.set(theme);

    this.storage.set(STORAGE_KEY, theme);
  }

  private readTheme(): Theme {
    const stored = this.storage.get(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;

    return this.config.defaultTheme;
  }
}
