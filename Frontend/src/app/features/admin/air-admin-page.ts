import { Component, computed, inject, signal } from '@angular/core';
import { map } from 'rxjs';
import { DEMO_NOW } from '../../core/config/demo-clock';
import { FormAction } from '../../shared/ui/form-action';
import { AirData, airMetrics, AirReading } from '../air-quality/data/air-quality';
import { CatalogStore } from '../locations/data/city-catalog';
import { AdminCityFilter } from './admin-city-filter';
import { AdminTable, AdminTableConfig, columns, removeAction } from './admin-table';

@Component({
  imports: [AdminCityFilter, AdminTable],
  template: `
    <h1 class="page-title">Mesures air et UV</h1>
    <div class="section-stack">
      <div class="heading-row">
        <app-admin-city-filter [(value)]="cityId" />
        @if (city(); as selected) {
          <button class="button button-secondary" type="button" [disabled]="sync.busy()" (click)="sync.run(data.sync(selected.id))">Synchroniser {{ selected.name }}</button>
        }
      </div>
      @if (sync.done()) { <p role="status">Synchronisation terminée.</p> }
      @if (sync.error()) { <p role="alert" class="error-text">{{ sync.error() }}</p> }
      @if (table(); as view) { <app-admin-table [config]="view" /> }
    </div>
  `,
})
export class AirAdminPage {
  protected readonly data = inject(AirData);
  protected readonly sync = new FormAction();
  private readonly catalog = inject(CatalogStore);
  private readonly initialTime = inject(DEMO_NOW).toISOString().slice(0, 19);
  protected readonly cityId = signal('1');
  protected readonly city = computed(() => this.catalog.publicCities().find((city) => city.id === this.cityId()));
  protected readonly table = computed<AdminTableConfig | undefined>(() => {
    const city = this.city();
    if (!city) return undefined;
    return {
      title: `Relevés sur 7 jours · ${city.name}`, createLabel: 'Saisir un relevé', editLabel: 'Corriger le relevé',
      columns: columns(['timestamp', 'Horodatage UTC'], ...airMetrics.map(({ key, title, unit }) =>
        [key, unit ? `${title} (${unit})` : title] as [string, string]), ['source', 'Source']),
      fields: [
        { key: 'time', label: 'Date et heure UTC', type: 'datetime-local', step: '1', initial: this.initialTime },
        ...airMetrics.map(({ key, title, unit }) => ({
          key, label: unit ? `${title} (${unit})` : title, type: 'number' as const, step: 'any', optional: true,
        })),
      ],
      load: () => this.data.adminRows(city.id).pipe(map((rows) => rows.map((row) => ({
        id: row.timestamp, cells: { ...row.values, timestamp: row.timestamp, time: row.timestamp.slice(0, 19), source: row.source },
      })))),
      save: (fields, row) => this.data.save(city.id, fields['time'] + 'Z',
        Object.fromEntries(airMetrics.map(({ key }) => [key, fields[key] === '' || fields[key] == null ? null : Number(fields[key])])) as AirReading['values'],
        row?.id),
      actions: [removeAction(`le relevé de ${city.name} du`, (row) => this.data.remove(city.id, row.id))],
    };
  });
}
