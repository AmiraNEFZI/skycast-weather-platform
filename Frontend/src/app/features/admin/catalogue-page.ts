import { Component, computed, inject, signal } from '@angular/core';
import { map } from 'rxjs';
import { CatalogAdmin } from '../locations/data/catalog-admin';
import { CatalogStore } from '../locations/data/city-catalog';
import { AdminTable, AdminTableConfig, columns, removeAction } from './admin-table';

@Component({
  imports: [AdminTable],
  template: `
    <h1 class="page-title">Catalogue géographique</h1>
    <div class="section-stack">
      <label>Filtrer le catalogue <input #filter type="search" class="field" (input)="query.set(filter.value)" /></label>
      <app-admin-table [config]="cities()" />
      <div class="chart-grid account-layout">
        <app-admin-table [config]="countries()" />
        <app-admin-table [config]="zones()" />
      </div>
    </div>
  `,
})
export class CataloguePage {
  private readonly api = inject(CatalogAdmin);
  private readonly store = inject(CatalogStore);
  protected readonly query = signal('');
  protected readonly cities = computed<AdminTableConfig>(() => {
    this.query();
    return {
    title: 'Villes', createLabel: 'Ajouter une ville', editLabel: 'Modifier la ville',
    columns: columns(['name', 'Ville'], ['countryCode', 'Pays'], ['timezone', 'Fuseau'], ['latitude', 'Latitude'], ['longitude', 'Longitude']),
    fields: [
      { key: 'name', label: 'Nom' },
      { key: 'countryCode', label: 'Pays', choices: this.store.countries.rows().map((row) => ({ value: row.id, label: row.name })) },
      { key: 'zoneId', label: 'Fuseau', choices: this.store.zones.rows().map((row) => ({ value: row.id, label: row.name })) },
      { key: 'latitude', label: 'Latitude', type: 'number', step: 'any' },
      { key: 'longitude', label: 'Longitude', type: 'number', step: 'any' },
    ],
    load: () => this.api.cities().pipe(map((rows) => rows.filter((row) => this.matches(row.name, row.countryCode)).map((row) => ({
      id: row.id, label: row.name, cells: { ...row, timezone: this.store.zones.rows().find((zone) => zone.id === row.zoneId)?.name },
    })))),
    save: (values, row) => this.api.saveCity({
      name: values['name'], countryCode: values['countryCode'], zoneId: values['zoneId'],
      latitude: Number(values['latitude']), longitude: Number(values['longitude']),
    }, row?.id),
    actions: [removeAction('la ville', (row) => this.api.removeCity(row.id))],
    };
  });
  protected readonly countries = computed(() => this.reference('countries'));
  protected readonly zones = computed(() => this.reference('zones'));

  private reference(kind: 'countries' | 'zones'): AdminTableConfig {
    const countries = kind === 'countries';
    this.query();
    return {
      title: countries ? 'Pays' : 'Fuseaux horaires',
      createLabel: countries ? 'Ajouter un pays' : 'Ajouter un fuseau',
      editLabel: countries ? 'Modifier le pays' : 'Modifier le fuseau',
      columns: columns(['id', countries ? 'Code' : 'Identifiant'], ['name', 'Nom']),
      fields: [{ key: 'id', label: countries ? 'Code pays' : 'Identifiant', readonlyOnEdit: true },
        { key: 'name', label: countries ? 'Nom du pays' : 'Fuseau IANA' }],
      load: () => (countries ? this.api.countries() : this.api.zones()).pipe(map((rows) =>
        rows.filter((row) => this.matches(row.id, row.name)).map((row) => ({ id: row.id, label: row.name, cells: { ...row } })),
      )),
      save: (values, row) => this.api.saveReference(kind, row?.id ?? values['id'], values['name'], !row),
      actions: [removeAction(countries ? 'le pays' : 'le fuseau', (row) => this.api.removeReference(kind, row.id))],
    };
  }

  private matches(...values: string[]): boolean {
    return values.some((value) => value.toLocaleLowerCase('fr').includes(this.query().trim().toLocaleLowerCase('fr')));
  }
}
