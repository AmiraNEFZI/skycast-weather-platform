import { Component, inject, signal } from '@angular/core';
import { map } from 'rxjs';
import { remoteContent } from '../../shared/data/remote-content';
import { ContentState } from '../../shared/ui/content-state';
import { Reading } from '../../shared/ui/reading';
import { ActiveCityStore } from '../locations/data/active-city-store';
import { conditions, WEATHER } from './data/weather';

@Component({
  selector: 'app-weather-showcase',
  imports: [ContentState, Reading],
  template: `
    <section class="card">
      <h2>Villes en vitrine</h2>
      @let state = showcase.state();
      <app-content-state [status]="state.status" emptyMessage="Aucune ville en vitrine."
        errorMessage="La vitrine est indisponible." (retry)="showcase.retry()">
        @if (state.value; as cities) {
          <ul>
            @for (city of cities; track city.id) {
              <li><button class="button button-secondary" type="button"
                [attr.aria-pressed]="active.city()?.id === city.id" (click)="active.select(city.id)">
                <strong>{{ city.label }}</strong>
                <span>{{ city.temperatureC | reading:'°C' }}</span>
                @if (city.condition; as condition) {
                  <span class="muted">{{ conditions[condition].label }}</span>
                }
              </button></li>
            }
          </ul>
        }
      </app-content-state>
    </section>
  `,
  styles: `
    ul { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr)); gap: .55rem; list-style: none; padding: 0; margin: .85rem 0 0; }
    button { display: grid; width: 100%; height: 100%; align-content: start; justify-content: start; text-align: start; }
    [aria-pressed="true"] { background: var(--accent-soft); }
    .muted { font-size: .875rem; font-weight: 400; }
  `,
})
export class WeatherShowcase {
  private readonly port = inject(WEATHER);
  protected readonly active = inject(ActiveCityStore);
  protected readonly conditions = conditions;
  protected readonly showcase = remoteContent(signal(undefined), () => this.port.showcase().pipe(
    map((cities) => cities.length ? cities : null),
  ));
}
