import { Component, computed, inject, signal } from '@angular/core';
import { map } from 'rxjs';
import { demoProfiles } from '../../core/session/session-provider';
import { PreferencesData } from '../favorites/data/preferences';
import { CatalogStore } from '../locations/data/city-catalog';
import { AdminCityFilter } from './admin-city-filter';
import { AdminTable, AdminTableConfig, columns, removeAction, yesNo } from './admin-table';

const accounts = demoProfiles.flatMap(({ session }) => session.role === 'user'
  ? [{ value: session.accountId, label: session.name }] : []);

@Component({
  imports: [AdminCityFilter, AdminTable],
  template: `
    <h1 class="page-title">Comptes et préférences</h1>
    <div class="section-stack">
      <div class="form-buttons">
        <label>Compte <select #account class="field" (change)="owner.set(account.value)">
          <option value="">Tous les comptes</option>
          @for (choice of accounts; track choice.value) { <option [value]="choice.value">{{ choice.label }}</option> }
        </select></label>
        <app-admin-city-filter [(value)]="city" [all]="true" />
      </div>
      <app-admin-table [config]="favorites()" />
      @if (preferences(); as config) { <app-admin-table [config]="config" /> }
      @else { <p class="muted">Sélectionnez un compte pour consulter ses préférences.</p> }
    </div>
  `,
})
export class AccountsAdminPage {
  private readonly data = inject(PreferencesData);
  private readonly catalog = inject(CatalogStore);
  protected readonly accounts = accounts;
  protected readonly owner = signal('');
  protected readonly city = signal('');
  protected readonly favorites = computed<AdminTableConfig>(() => {
    const owner = this.owner();
    const filter = this.city();
    const cities = this.catalog.publicCities();
    const find = (id: string) => cities.find((city) => city.id === id);
    return {
      title: 'Favoris par compte', createLabel: 'Ajouter un favori', editLabel: 'Modifier le favori',
      columns: columns(['account', 'Compte'], ['cityName', 'Ville'], ['alias', 'Alias'], ['isDefault', 'Par défaut']),
      fields: [
        { key: 'owner', label: 'Compte', choices: accounts, initial: owner, readonlyOnEdit: true },
        { key: 'cityId', label: 'Ville', choices: cities.map((city) => ({ value: city.id, label: city.name })), initial: filter },
        { key: 'alias', label: 'Alias', optional: true },
        { key: 'isDefault', label: 'Définir par défaut', choices: yesNo, initial: false },
      ],
      load: () => this.data.adminList(owner, filter).pipe(map((rows) => rows.map((row) => ({
        id: row.id, label: `${row.cityName} · ${accounts.find((entry) => entry.value === row.owner)?.label}`,
        cells: { ...row, cityName: find(row.cityId)?.name ?? row.cityName, account: accounts.find((entry) => entry.value === row.owner)?.label },
      })))),
      save: (fields, row) => this.data.adminSaveFavorite({
        owner: fields['owner'], cityId: fields['cityId'], cityName: find(fields['cityId'])?.name ?? fields['cityId'],
        alias: fields['alias'].trim(), isDefault: fields['isDefault'] === 'true',
      }, row?.id),
      actions: [
        { label: 'Monter', run: (row) => this.data.adminMoveFavorite(String(row.cells['owner']), row.id, -1) },
        { label: 'Descendre', run: (row) => this.data.adminMoveFavorite(String(row.cells['owner']), row.id, 1) },
        removeAction('le favori', (row) => this.data.adminRemoveFavorite(String(row.cells['owner']), row.id)),
      ],
    };
  });

  protected readonly preferences = computed<AdminTableConfig | undefined>(() => {
    const owner = this.owner();
    const account = accounts.find((row) => row.value === owner);
    if (!account) return undefined;
    const temperatures = [{ value: 'C', label: 'Celsius' }, { value: 'F', label: 'Fahrenheit' }];
    const winds = [{ value: 'kmh', label: 'km/h' }, { value: 'ms', label: 'm/s' }, { value: 'mph', label: 'mph' }];
    const themes = [{ value: 'light', label: 'Ciel Clair' }, { value: 'dark', label: 'Horizon' }];
    return {
      title: `Préférences · ${account.label}`, editLabel: 'Modifier les préférences',
      columns: columns(['temperatureLabel', 'Température'], ['windLabel', 'Vent'], ['themeLabel', 'Thème'], ['languageLabel', 'Langue']),
      fields: [
        { key: 'temperature', label: 'Température', choices: temperatures },
        { key: 'wind', label: 'Vent', choices: winds },
        { key: 'theme', label: 'Thème', choices: themes },
        { key: 'language', label: 'Langue', choices: [{ value: 'fr', label: 'Français' }] },
      ],
      load: () => this.data.adminPreferences(owner).pipe(map((value) => [{ id: owner, cells: {
        ...value, languageLabel: 'Français', temperatureLabel: temperatures.find((item) => item.value === value.temperature)?.label,
        windLabel: winds.find((item) => item.value === value.wind)?.label, themeLabel: themes.find((item) => item.value === value.theme)?.label,
      } }])),
      save: (fields) => this.data.adminSavePreferences(owner, {
        temperature: fields['temperature'] === 'F' ? 'F' : 'C',
        wind: fields['wind'] === 'mph' || fields['wind'] === 'ms' ? fields['wind'] : 'kmh',
        theme: fields['theme'] === 'dark' ? 'dark' : 'light', language: 'fr',
      }),
      actions: [{ label: 'Réinitialiser', confirmation: () => `Réinitialiser les préférences de ${account.label} ?`,
        run: () => this.data.adminSavePreferences(owner, null) }],
    };
  });
}
