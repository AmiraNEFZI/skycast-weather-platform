import { Component, computed, inject, signal } from '@angular/core';
import { map } from 'rxjs';
import { CatalogStore } from '../locations/data/city-catalog';
import { WeatherAdmin } from '../weather/data/weather-admin';
import { AdminCityFilter } from './admin-city-filter';
import { AdminTable, AdminTableConfig, columns, removeAction } from './admin-table';

@Component({
  imports: [AdminCityFilter, AdminTable],
  template: `
    <h1 class="page-title">Météo actuelle et avis</h1>
    <div class="section-stack">
      <app-admin-table [config]="showcase()" />
      <app-admin-city-filter [(value)]="city" />
      @if (city()) { <app-admin-table [config]="reviews()" /> }
    </div>
  `,
})
export class WeatherAdminPage {
  private readonly data = inject(WeatherAdmin);
  private readonly catalog = inject(CatalogStore);
  protected readonly city = signal('1');
  protected readonly showcase = computed<AdminTableConfig>(() => {
    const cities = this.catalog.publicCities();
    return {
      title: 'Vitrine météo', createLabel: 'Ajouter à la vitrine',
      columns: columns(['position', 'Ordre'], ['name', 'Ville']),
      fields: [{ key: 'city', label: 'Ville', choices: cities.map((city) => ({ value: city.id, label: city.name })) }],
      load: () => this.data.showcase().pipe(map((rows) => rows.map((id, index) => ({
        id, label: cities.find((city) => city.id === id)?.name, cells: {
          name: cities.find((city) => city.id === id)?.name, position: index + 1, length: rows.length,
        },
      })))),
      save: (values) => this.data.add(values['city']),
      actions: [
        { label: 'Monter', run: (row) => this.data.move(row.id, -1), enabled: (row) => Number(row.cells['position']) > 1 },
        { label: 'Descendre', run: (row) => this.data.move(row.id, 1),
          enabled: (row) => Number(row.cells['position']) < Number(row.cells['length']) },
        removeAction('la ville de la vitrine', (row) => this.data.remove(row.id)),
      ],
    };
  });
  protected readonly reviews = computed<AdminTableConfig>(() => {
    const city = this.city();
    return {
      title: 'Avis par ville', editLabel: 'Répondre ou corriger',
      columns: columns(['author', 'Auteur'], ['score', 'Note / 5'], ['comment', 'Avis'], ['reply', 'Réponse administrative']),
      fields: [{ key: 'reply', label: 'Réponse administrative', type: 'textarea' }],
      load: () => this.data.reviews(city).pipe(map((rows) => rows.map((row) => ({ id: row.id, label: row.author, cells: { ...row } })))),
      save: (values, row) => this.data.respond(city, row?.id ?? '', values['reply']),
      actions: [{ label: 'Retirer la réponse', enabled: (row) => !!row.cells['reply'],
        confirmation: (row) => `Retirer la réponse à l’avis de ${row.label} ?`,
        run: (row) => this.data.respond(city, row.id, null) }],
    };
  });
}
