import { Component, computed, inject, signal } from '@angular/core';
import { map } from 'rxjs';
import { FormAction } from '../../shared/ui/form-action';
import { Modal } from '../../shared/ui/modal';
import { ForecastData, ForecastKind } from '../forecasts/data/forecasts';
import { CatalogStore } from '../locations/data/city-catalog';
import { Condition, conditions } from '../weather/data/weather';
import { AdminCityFilter } from './admin-city-filter';
import { AdminTable, AdminTableConfig, columns, removeAction, yesNo } from './admin-table';

@Component({
  imports: [AdminCityFilter, AdminTable, Modal],
  template: `
    <h1 class="page-title">Prévisions et synchronisation</h1>
    <div class="section-stack">
      <app-admin-table [config]="syncs()" />
      <div class="heading-row">
        <app-admin-city-filter [(value)]="cityId" />
        <label>Série <select #series class="field" [value]="kind()" (change)="kind.set(series.value === 'daily' ? 'daily' : 'hourly')">
          <option value="hourly">Horaires</option><option value="daily">Quotidiennes</option>
        </select></label>
        @if (city(); as selected) {
          <button #purgeButton type="button" class="button button-secondary purge" [disabled]="purgeWrite.busy()"
            (click)="purgeDialog.show(purgeButton)">Purger les prévisions de {{ selected.name }}</button>
        }
      </div>
      @if (purgeWrite.done()) { <p role="status">Prévisions de la ville purgées.</p> }
      @if (purgeWrite.error()) { <p class="error-text" role="alert">{{ purgeWrite.error() }}</p> }
      @if (forecasts(); as view) { <app-admin-table [config]="view" /> }
    </div>
    <app-modal #purgeDialog label="Purger les prévisions" closeLabel="Annuler">
      @if (city(); as selected) {
        <p>Supprimer toutes les prévisions horaires et quotidiennes de <strong>{{ selected.name }}</strong> ?</p>
        <button class="button" type="button" [disabled]="purgeWrite.busy()"
          (click)="purgeDialog.close(); purge(selected.id)">Confirmer la purge</button>
      }
    </app-modal>
  `,
  styles: '.purge:not(:disabled) { color: var(--danger); }',
})
export class ForecastAdminPage {
  private readonly data = inject(ForecastData);
  private readonly catalog = inject(CatalogStore);
  protected readonly cityId = signal('1');
  protected readonly kind = signal<ForecastKind>('hourly');
  protected readonly city = computed(() => this.catalog.publicCities().find((city) => city.id === this.cityId()));
  protected readonly purgeWrite = new FormAction();

  protected readonly syncs = computed<AdminTableConfig>(() => {
    const cities = this.catalog.publicCities();
    const find = (id: string) => cities.find((city) => city.id === id);
    return {
      title: 'Configurations de synchronisation', createLabel: 'Ajouter une configuration', editLabel: 'Modifier la configuration',
      columns: columns(['name', 'Ville'], ['enabled', 'Active'], ['frequency', 'Fréquence (h)'], ['horizon', 'Horizon (j)'],
        ['lastSync', 'Dernière exécution UTC'], ['status', 'Statut']),
      fields: [
        { key: 'id', label: 'Ville', choices: cities.map((city) => ({ value: city.id, label: city.name })), readonlyOnEdit: true },
        { key: 'enabled', label: 'Active', choices: yesNo, initial: true },
        { key: 'frequency', label: 'Fréquence (1 à 24 h)', type: 'number', step: '1', initial: 6 },
        { key: 'horizon', label: 'Horizon (1 à 7 jours)', type: 'number', step: '1', initial: 7 },
      ],
      load: () => this.data.adminConfigs().pipe(map((rows) => rows.map((row) => ({
        id: row.id, label: find(row.id)?.name,
        cells: { ...row, name: find(row.id)?.name, enabled: row.active },
      })))),
      save: (fields, row) => this.data.saveConfig(row?.id ?? fields['id'], Number(fields['frequency']),
        Number(fields['horizon']), fields['enabled'] === 'true', !row),
      actions: [
        { label: 'Synchroniser', enabled: (row) => !!row.cells['enabled'] && !!find(row.id),
          run: (row) => this.data.synchronize(find(row.id)!) },
        { label: 'Simuler un échec', enabled: (row) => !!row.cells['enabled'] && !!find(row.id),
          run: (row) => this.data.synchronize(find(row.id)!, true) },
        removeAction('la configuration de', (row) => this.data.removeConfig(row.id)),
      ],
    };
  });

  protected readonly forecasts = computed<AdminTableConfig | undefined>(() => {
    const city = this.city();
    if (!city) return undefined;
    const kind = this.kind();
    const hourly = kind === 'hourly';
    const first = hourly ? 'Température (°C)' : 'Minimum (°C)';
    const second = hourly ? 'Probabilité de pluie (%)' : 'Maximum (°C)';
    return {
      title: hourly ? 'Prévisions horaires stockées' : 'Prévisions quotidiennes stockées',
      createLabel: 'Saisir une prévision', editLabel: 'Corriger la prévision',
      columns: columns(['time', 'Date locale'], ['first', first], ['second', second], ['conditionLabel', 'Condition'],
        ['source', 'Source'], ['modifiedAt', 'Correction UTC']),
      fields: [
        { key: 'time', label: `Date locale · ${city.timezone}`, type: hourly ? 'datetime-local' : 'date' },
        { key: 'first', label: first, type: 'number', step: 'any' },
        { key: 'second', label: second, type: 'number', step: 'any' },
        { key: 'condition', label: 'Condition', initial: 'ENSOLEILLE',
          choices: Object.entries(conditions).map(([value, condition]) => ({ value, label: condition.label })) },
      ],
      load: () => this.data.adminRows(city, kind).pipe(map((rows) => rows.map((row) => ({
        id: row.id, cells: { ...row, conditionLabel: conditions[row.condition].label },
      })))),
      save: (fields, row) => this.data.save(city, kind, {
        time: fields['time'], first: Number(fields['first']), second: Number(fields['second']), condition: fields['condition'] as Condition,
      }, row?.id),
      actions: [removeAction(`la prévision de ${city.name} du`, (row) => this.data.remove(city, kind, row.id))],
    };
  });

  protected purge(id: string): void {
    const city = this.city();
    if (city?.id === id) {
      this.purgeWrite.run(this.data.purge(city));
    }
  }
}
