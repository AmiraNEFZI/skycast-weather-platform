import { Component, inject, input } from '@angular/core';
import { CityDate } from '../../shared/data/local-time';
import { remoteContent } from '../../shared/data/remote-content';
import { ContentState } from '../../shared/ui/content-state';
import { Reading } from '../../shared/ui/reading';
import { City } from '../locations/location';
import { conditions, WEATHER } from './data/weather';

@Component({
  selector: 'app-weather-card',
  imports: [CityDate, ContentState, Reading],
  template: `
    <section class="card weather">
      <div class="heading-row">
        <h2>Météo actuelle</h2>
        <span class="muted">{{ city().name }}, {{ city().country }}</span>
      </div>
      @let state = weather.state();
      <app-content-state [status]="state.status" emptyMessage="Aucun relevé météo disponible."
        errorMessage="La météo actuelle est indisponible." (retry)="weather.retry()">
        @if (state.value; as value) {
          <div class="weather-value">
            <span class="icon" aria-hidden="true">{{ conditions[value.condition].icon }}</span>
            <div>
              <p class="temperature">{{ value.temperatureC | reading:'°C' }}</p>
              <p>{{ conditions[value.condition].label }}</p>
            </div>
          </div>
          <dl>
            <div><dt>Humidité</dt><dd>{{ value.humidityPercent | reading:'%' }}</dd></div>
            <div><dt>Vent</dt><dd>{{ value.windKmh | reading:'km/h' }}</dd></div>
          </dl>
          <div class="heading-row muted">
            <span>Relevé du <time [attr.datetime]="value.observedAt">{{ value.observedAt | cityDate:city().timezone }}</time></span>
            @if (value.stale) { <span class="badge">Relevé ancien</span> }
          </div>
        }
      </app-content-state>
    </section>
  `,
  styles: `
    :host { display: block; }
    .weather { height: 100%; background: radial-gradient(ellipse at 86% 10%, var(--sky-glow), transparent 72%), var(--surface); }
    .weather-value { display: flex; align-items: center; gap: 1rem; margin-block: 1rem; }
    .weather-value p { margin: 0; }
    .icon { color: var(--sun); font-size: clamp(3rem, 10vw, 4.5rem); line-height: 1; }
    .temperature { font-size: clamp(2.3rem, 8vw, 3.9rem); font-weight: 800; line-height: 1; letter-spacing: -.04em; }
    dl { display: flex; gap: .8rem 2rem; flex-wrap: wrap; margin-block: 0 1rem; }
    dt, .heading-row { font-size: .875rem; }
    dd { margin: 0; font-weight: 650; }
  `,
})
export class WeatherCard {
  readonly city = input.required<City>();
  private readonly port = inject(WEATHER);
  protected readonly conditions = conditions;
  protected readonly weather = remoteContent(this.city, (city) => this.port.current(city.id));
}
