import { Component, inject, input, model } from '@angular/core';
import { CatalogStore } from '../locations/data/city-catalog';

@Component({
  selector: 'app-admin-city-filter',
  template: `
    <label>Ville <select #select class="field" (change)="value.set(select.value)">
      <option value="" [selected]="!value()">{{ all() ? 'Toutes les villes' : 'Choisir une ville' }}</option>
      @for (city of cities(); track city.id) {
        <option [value]="city.id" [selected]="value() === city.id">{{ city.name }}</option>
      }
    </select></label>
  `,
})
export class AdminCityFilter {
  readonly value = model('');
  readonly all = input(false);
  protected readonly cities = inject(CatalogStore).publicCities;
}
