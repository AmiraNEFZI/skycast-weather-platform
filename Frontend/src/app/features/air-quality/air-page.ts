import { Component, computed, inject, input, signal } from '@angular/core';
import { map } from 'rxjs';
import { RouterLink } from '@angular/router';
import { demoCities } from '../../core/demo/demo-fixtures';
import { CityDate, dateLabel } from '../../shared/data/local-time';
import { remoteContent } from '../../shared/data/remote-content';
import { ContentState } from '../../shared/ui/content-state';
import { Reading } from '../../shared/ui/reading';
import { SeriesChart } from '../../shared/ui/series-chart';
import { ActiveCityStore } from '../locations/data/active-city-store';
import { City } from '../locations/location';
import { AIR_QUALITY, airMetrics, AirPeriod } from './data/air-quality';
import { airLevel } from './air-level';

@Component({
  selector: 'app-air-details',
  imports: [CityDate, ContentState, Reading, RouterLink, SeriesChart],
  template: `
    <div class="section-stack">
      <section aria-label="Dernier relevé">
        @let reading = current.state();
        @if (reading.status === 'empty') {
          <p class="card reading-strip"><strong>Dernier relevé</strong> Aucun relevé air ou UV disponible.</p>
          <dl class="measurements">
            @for (metric of metrics; track metric.key) {
              <div class="card"><dt>{{ metric.title }}</dt><dd class="muted">Indisponible</dd></div>
            }
          </dl>
        } @else {
        <app-content-state [status]="reading.status"
          errorMessage="Le dernier relevé est indisponible." (retry)="current.retry()">
          @if (reading.value; as value) {
            <p class="card reading-strip"><strong>Dernier relevé</strong> <time [attr.datetime]="value.timestamp">{{ value.timestamp | cityDate:city().timezone }}</time> <span class="muted">· Heure locale</span></p>
            <dl class="measurements">
              @for (metric of metrics; track metric.key) {
                <div class="card"><dt>{{ metric.title }}</dt><dd>{{ value.values[metric.key] | reading:metric.unit }}
                  @if (level(metric.key, value.values[metric.key]); as label) { <span class="badge">{{ label }}</span> }
                </dd></div>
              }
            </dl>
          }
        </app-content-state>
        }
      </section>

      <section aria-label="Historique des mesures">
        <div class="heading-row history-heading">
        @let result = average.state();
        <app-content-state [status]="result.status" errorMessage="La moyenne est indisponible."
          (retry)="average.retry()">
          @if (result.value; as value) {
            <p class="average">
              <strong>Moyenne US AQI sur 24 h · {{ value.value | reading }}</strong>
              @if (value.count) { <span class="muted"> · {{ value.count }} relevés</span> }
              @else { <span class="muted"> · Aucun relevé sur les dernières 24 h</span> }
            </p>
          }
        </app-content-state>
          <fieldset>
            <legend class="visually-hidden">Période de l’historique</legend>
            <label><input type="radio" name="period" [checked]="period() === '24h'" (change)="period.set('24h')" /> 24 h</label>
            <label><input type="radio" name="period" [checked]="period() === '7d'" (change)="period.set('7d')" /> 7 jours</label>
          </fieldset>
        </div>
        @if (history.state().status === 'empty') {
          <div class="card empty-history">
            <h2>Aucun historique pour cette période</h2>
            <p class="muted">Essayez une autre période ou utilisez la recherche pour choisir une autre ville.</p>
            @if (city().id !== exampleCity.ville) {
              <a class="button button-secondary" routerLink="/air-et-uv" [queryParams]="exampleCity">Voir les mesures de Tunis</a>
            }
          </div>
        } @else {
        <app-content-state [status]="history.state().status"
          errorMessage="L’historique des mesures est indisponible." (retry)="history.retry()">
          @if (history.state().value) {
            <div class="chart-grid">
              @for (chart of charts(); track chart.key) {
                <app-series-chart [heading]="chart.heading" [unit]="chart.unit" [points]="chart.points" />
              }
            </div>
          }
        </app-content-state>
        }
      </section>
    </div>
  `,
  styles: `
    .measurements { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr)); gap: .6rem; margin: 0; }
    .measurements div { padding: .85rem 1rem; border-radius: .75rem; }
    .reading-strip { margin: 0 0 .6rem; padding: .55rem .9rem; border-radius: .65rem; }
    .reading-strip strong { margin-inline-end: .4rem; }
    .average { margin: 0; }
    .empty-history p { margin: .45rem 0 .85rem; }
    dt { color: var(--muted); font-size: .875rem; }
    dd { margin: .2rem 0 0; font-size: 1.35rem; font-weight: 750; }
    dd .badge { display: table; margin-top: .25rem; }
    .history-heading { margin-bottom: .65rem; }
    fieldset { margin: 0; padding: 0; border: 0; display: flex; gap: .75rem; }
    label { cursor: pointer; }
    input { accent-color: var(--accent); }
  `,
})
export class AirDetails {
  protected readonly exampleCity = { ville: demoCities.tunis };
  protected readonly level = airLevel;
  readonly city = input.required<City>();
  private readonly port = inject(AIR_QUALITY);
  protected readonly metrics = airMetrics;
  protected readonly period = signal<AirPeriod>('24h');
  private readonly historyQuery = computed(() => ({ id: this.city().id, period: this.period() }));

  protected readonly current = remoteContent(this.city, (city) => this.port.current(city.id));
  protected readonly average = remoteContent(this.city, (city) => this.port.average(city.id));
  protected readonly history = remoteContent(this.historyQuery, ({ id, period }) =>
    this.port.history(id, period).pipe(map((rows) => rows.length ? rows : null)),
  );
  protected readonly charts = computed(() => {
    const rows = (this.history.state().value ?? []).map((row) => ({
      label: dateLabel(row.timestamp, this.city().timezone, 'short'), values: row.values,
    }));
    return [airMetrics[0], airMetrics[3], airMetrics[1], airMetrics[2]].map((metric) => ({
      ...metric,
      heading: metric.unit ? `${metric.title} (${metric.unit})` : metric.title,
      points: rows.map((row) => ({ label: row.label, value: row.values[metric.key] })),
    }));
  });
}

@Component({
  imports: [AirDetails, ContentState],
  template: `
    <h1 class="page-title">Air et UV @if (active.city(); as city) { <span> · {{ city.name }}</span> }</h1>
    <app-content-state [status]="active.state().status" errorMessage="La ville est indisponible." (retry)="active.retry()">
      @if (active.city(); as city) { <app-air-details [city]="city" /> }
    </app-content-state>
  `,
})
export class AirPage {
  protected readonly active = inject(ActiveCityStore);
}
