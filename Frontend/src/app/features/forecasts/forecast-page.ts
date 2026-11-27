import { Component, computed, inject, input } from '@angular/core';
import { map } from 'rxjs';
import { SESSION } from '../../core/session/session-provider';
import { dateLabel } from '../../shared/data/local-time';
import { remoteContent } from '../../shared/data/remote-content';
import { ContentState } from '../../shared/ui/content-state';
import { SeriesChart } from '../../shared/ui/series-chart';
import { City } from '../locations/location';
import { ActiveCityStore } from '../locations/data/active-city-store';
import { FORECASTS } from './data/forecasts';
import { SevenDays } from './seven-days';
import { ActivitiesPanel } from './activities/activities-panel';
import { PreferencesData } from '../favorites/data/preferences';
import { toFahrenheit } from '../../shared/ui/reading';

@Component({
  selector: 'app-hourly-forecast',
  imports: [ContentState, SeriesChart],
  template: `
    <section class="card">
      <h2>Prévisions heure par heure</h2>
      <p class="muted">Les heures sont affichées dans le fuseau de {{ city().name }}.</p>
      <app-content-state [status]="hourly.state().status" emptyMessage="Aucune prévision horaire."
        errorMessage="Les prévisions horaires sont indisponibles." (retry)="hourly.retry()">
        @if (hourly.state().value) {
          <app-series-chart [heading]="'Température (' + temperatureUnit() + ')'" [unit]="temperatureUnit()"
            [points]="temperatures()" [compareRain]="true" />
        }
      </app-content-state>
    </section>
  `,
})
export class HourlyForecast {
  readonly city = input.required<City>();
  private readonly port = inject(FORECASTS);
  private readonly preferences = inject(PreferencesData);
  protected readonly temperatureUnit = computed(() => this.preferences.current()?.temperature === 'F' ? '°F' : '°C');
  protected readonly hourly = remoteContent(this.city, (city) =>
    this.port.hourly(city).pipe(map((hours) => hours.length ? hours : null)),
  );
  protected readonly temperatures = computed(() => {
    const zone = this.city().timezone;
    return (this.hourly.state().value ?? []).map((hour) => ({
      label: dateLabel(hour.localTime, zone, 'short'),
      value: hour.temperatureC !== null && this.temperatureUnit() === '°F'
        ? toFahrenheit(hour.temperatureC) : hour.temperatureC,
      rain: hour.rainPercent,
    }));
  });
}

@Component({
  imports: [ActivitiesPanel, ContentState, HourlyForecast, SevenDays],
  template: `
    <h1 class="page-title">Prévisions @if (active.city(); as city) { <span> · {{ city.name }}</span> }</h1>
    <app-content-state [status]="active.state().status" errorMessage="La ville est indisponible." (retry)="active.retry()">
      @if (active.city(); as city) {
        <div class="forecast-layout">
          <div class="section-stack">
            <app-hourly-forecast [city]="city" />
            <app-seven-days [city]="city" />
          </div>
          @if (session().role === 'user') {
            @for (account of [session()]; track account) { <app-activities-panel [cityId]="city.id" /> }
          } @else {
            <aside class="card">
              <h2>Mes activités</h2>
              <p class="muted">Choisissez un profil utilisateur dans Compte pour accéder à votre espace personnel.</p>
            </aside>
          }
        </div>
      }
    </app-content-state>
  `,
  styles: `
    .forecast-layout { display: grid; align-items: start; grid-template-columns: minmax(0, 3fr) minmax(13rem, 1fr); gap: 1rem; }
    @media (max-width: 64rem) { .forecast-layout { grid-template-columns: 1fr; } }
  `,
})
export class ForecastPage {
  protected readonly active = inject(ActiveCityStore);
  protected readonly session = inject(SESSION).current;
}
