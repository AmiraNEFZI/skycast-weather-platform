import { computed, inject, Injectable, signal } from '@angular/core';
import { Theme } from '../../../core/config/demo-config';
import { AdminMock } from '../../../core/session/admin-mock';
import { demoProfiles, SESSION } from '../../../core/session/session-provider';
import { SessionAccessError } from '../../../core/session/private-access';
import { demoRecords } from '../../../core/demo/demo-records';
import { demoAccounts, demoCities } from '../../../core/demo/demo-fixtures';
import { DemoConflict, owned, UserMock } from '../../../core/session/user-mock';
import { CityId } from '../../locations/location';
import { CatalogStore } from '../../locations/data/city-catalog';

export interface Preferences {
  temperature: 'C' | 'F';
  wind: 'kmh' | 'ms' | 'mph';
  language: 'fr';
  theme: Theme;
}

export const defaults: Preferences = { temperature: 'C', wind: 'kmh', language: 'fr', theme: 'light' };

export interface Favorite { id: string; owner: string; cityId: CityId; cityName: string; alias: string; isDefault: boolean }
interface SavedPreference { owner: string; value: Preferences }

@Injectable({ providedIn: 'root' })
export class PreferencesData {
  private readonly session = inject(SESSION);
  private readonly mock = inject(UserMock);
  private readonly admin = inject(AdminMock);
  private readonly catalog = inject(CatalogStore);
  private readonly favorites = demoRecords<Favorite>('favorites', [
    { id: 'favorite-tunis', owner: demoAccounts.amel, cityId: demoCities.tunis, cityName: 'Tunis', alias: 'Maison', isDefault: true },
    { id: 'favorite-sousse', owner: demoAccounts.karim, cityId: demoCities.sousse, cityName: 'Sousse', alias: 'Côte', isDefault: true },
  ]);
  private readonly preferences = demoRecords<SavedPreference>('preferences', []);
  readonly revision = signal(0);
  readonly current = computed(() => {
    const account = this.session.current();
    return account.role === 'user' ? this.preferences.rows().find((row) => row.owner === account.accountId)?.value : undefined;
  });
  readonly defaultCity = computed(() => {
    const account = this.session.current();
    return account.role === 'user' ? this.favorites.rows().find((row) => row.owner === account.accountId && row.isDefault)?.cityId ?? null : null;
  });

  list() {
    return this.mock.run((owner) => {
      const names = new Map(this.catalog.publicCities().map((city) => [city.id, city.name]));
      return this.favorites.rows().filter((row) => row.owner === owner)
        .map((row) => ({ ...row, cityName: names.get(row.cityId) ?? row.cityName }));
    });
  }

  hasFavoriteCity(id: CityId): boolean { return this.favorites.rows().some((row) => row.cityId === id); }

  adminList(owner: string, city: CityId) {
    return this.admin.read(() => this.favorites.rows().filter((row) =>
      (!owner || row.owner === owner) && (!city || row.cityId === city)));
  }

  adminPreferences(owner: string) {
    return this.admin.read(() => {
      this.requireAccount(owner);
      return this.preferences.rows().find((row) => row.owner === owner)?.value ?? defaults;
    });
  }

  adminSavePreferences(owner: string, value: Preferences | null) {
    return this.admin.write(() => { this.requireAccount(owner); this.saveFor(owner, value); });
  }

  adminSaveFavorite(value: Omit<Favorite, 'id'>, id?: string) {
    return this.admin.write(() => {
      this.requireAccount(value.owner);
      if (!this.catalog.publicCities().some((city) => city.id === value.cityId)) throw new SessionAccessError(404);
      const rows = this.favorites.rows();
      if (id) owned(rows, id, value.owner);
      if (rows.some((row) => row.owner === value.owner && row.id !== id && row.cityId === value.cityId)) {
        throw new DemoConflict(409, 'Cette ville est déjà dans les favoris du compte.');
      }
      const updated = rows.map((row) => {
        if (row.id === id) return { ...value, id };
        return value.isDefault && row.owner === value.owner ? { ...row, isDefault: false } : row;
      });
      this.update(id ? updated : [...updated, { ...value, id: crypto.randomUUID() }]);
    });
  }

  adminRemoveFavorite(owner: string, id: string) {
    return this.admin.write(() => {
      const rows = this.favorites.rows();
      const item = owned(rows, id, owner);
      this.update(rows.filter((row) => row !== item));
    });
  }

  adminMoveFavorite(owner: string, id: string, direction: -1 | 1) {
    return this.admin.write(() => {
      const rows = this.favorites.rows();
      this.update(this.moved(rows, owned(rows, id, owner), direction));
    });
  }

  private requireAccount(owner: string): void {
    if (!demoProfiles.some(({ session }) => session.role === 'user' && session.accountId === owner)) {
      throw new SessionAccessError(404);
    }
  }

  add(cityId: CityId, cityName: string, alias: string) {
    return this.mock.run((owner) => {
      const rows = this.favorites.rows();
      if (rows.some((row) => row.owner === owner && row.cityId === cityId)) throw new DemoConflict(409, 'Cette ville est déjà dans vos favoris.');
      this.update([...rows, { id: crypto.randomUUID(), owner, cityId, cityName, alias: alias.trim(), isDefault: false }]);
    });
  }

  rename(id: string, alias: string) {
    return this.change(id, (rows, item) => rows.map((row) => row === item ? { ...row, alias: alias.trim() } : row));
  }

  remove(id: string) { return this.change(id, (rows, item) => rows.filter((row) => row !== item)); }

  setDefault(id: string) {
    return this.change(id, (rows, item) => rows.map((row) =>
      row.owner === item.owner ? { ...row, isDefault: row === item } : row));
  }

  move(id: string, direction: -1 | 1) {
    return this.change(id, (rows, item) => this.moved(rows, item, direction));
  }

  private moved(rows: readonly Favorite[], item: Favorite, direction: -1 | 1): readonly Favorite[] {
    const indexes = rows.flatMap((row, index) => row.owner === item.owner ? [index] : []);
    const from = rows.indexOf(item);
    const to = indexes[indexes.indexOf(from) + direction];
    if (to === undefined) return rows;
    const next = [...rows];
    [next[from], next[to]] = [next[to], next[from]];
    return next;
  }

  save(value: Preferences | null) {
    return this.mock.run((owner) => this.saveFor(owner, value));
  }

  saveTheme(theme: Theme) {
    return this.mock.run((owner) => {
      const existing = this.preferences.rows().find((row) => row.owner === owner)?.value ?? defaults;
      this.saveFor(owner, { ...existing, theme });
    });
  }

  private saveFor(owner: string, value: Preferences | null): void {
    const remaining = this.preferences.rows().filter((row) => row.owner !== owner);
    this.preferences.set(value ? [...remaining, { owner, value }] : remaining);
  }

  private change(id: string, transform: (rows: readonly Favorite[], item: Favorite) => readonly Favorite[]) {
    return this.mock.run((owner) => {
      const rows = this.favorites.rows();
      this.update(transform(rows, owned(rows, id, owner)));
    });
  }

  private update(rows: readonly Favorite[]): void {
    this.favorites.set(rows);
    this.revision.update((value) => value + 1);
  }
}
