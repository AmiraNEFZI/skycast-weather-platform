import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CityDate } from '../../shared/data/local-time';
import { remoteContent } from '../../shared/data/remote-content';
import { ContentState } from '../../shared/ui/content-state';
import { Reading } from '../../shared/ui/reading';
import { City } from '../locations/location';
import { AIR_QUALITY, DemoAirFailure } from './data/air-quality';
import { airLevel } from './air-level';

@Component({
  selector: 'app-air-summary',
  imports: [CityDate, ContentState, Reading, RouterLink],
  template: `
    @let state = air.state();
    @if (state.value; as reading) {
      <div class="summaries">
        <a class="card" routerLink="/air-et-uv" [queryParams]="{ ville: city().id }">
          <h2>Qualité de l’air</h2>
          <p><strong>{{ reading.values.aqi | reading }}</strong><span class="muted">US AQI</span>
            @if (level('aqi', reading.values.aqi); as label) { <span class="badge">{{ label }}</span> }
          </p>
          <div class="heading-row"><time class="muted timestamp" [attr.datetime]="reading.timestamp">{{ reading.timestamp | cityDate:city().timezone:'short' }}</time><span class="details">Voir le détail <span aria-hidden="true">→</span></span></div>
        </a>
        <a class="card" routerLink="/air-et-uv" [queryParams]="{ ville: city().id }">
          <h2>Indice UV</h2>
          <p><strong>{{ reading.values.uv | reading }}</strong>
            @if (level('uv', reading.values.uv); as label) { <span class="badge">{{ label }}</span> }
          </p>
          <div class="heading-row"><time class="muted timestamp" [attr.datetime]="reading.timestamp">{{ reading.timestamp | cityDate:city().timezone:'short' }}</time><span class="details">Voir le détail <span aria-hidden="true">→</span></span></div>
        </a>
      </div>
    } @else {
      <section class="card unavailable">
        <h2>Air et UV</h2>
        <app-content-state [status]="state.status" emptyMessage="Aucun relevé air ou UV disponible."
          errorMessage="Le relevé air et UV est indisponible." (retry)="air.retry()" />
        <a routerLink="/air-et-uv" [queryParams]="{ ville: city().id }">Voir le détail air et UV</a>
      </section>
    }
  `,
  styles: `
    :host, .summaries { display: grid; height: 100%; }
    .summaries { gap: 1rem; grid-template-rows: repeat(2, 1fr); }
    .summaries a { display: block; color: var(--text); text-decoration: none; }
    .summaries a:hover { border-color: var(--accent); }
    p { display: flex; flex-wrap: wrap; align-items: baseline; gap: .4rem; margin: .3rem 0 0; }
    strong { font-size: 1.6rem; }
    .timestamp { font-size: .8rem; }
    .details { font-size: .85rem; color: var(--accent-text); font-weight: 650; }
    .unavailable a { display: inline-block; margin-top: .65rem; color: var(--accent-text); }
    @media (min-width: 22rem) and (max-width: 40rem) {
      .summaries { grid-template-rows: auto; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .65rem; }
      .summaries a { padding: .8rem; }
      .summaries .heading-row { gap: .25rem; }
      strong { font-size: 1.35rem; overflow-wrap: anywhere; }
    }
  `,
})
export class AirSummary {
  protected readonly level = airLevel;
  readonly city = input.required<City>();
  readonly initialFailure = input(false);
  private readonly port = inject(AIR_QUALITY);
  private readonly demo = inject(DemoAirFailure);
  private automaticFailureUsed = false;
  protected readonly air = remoteContent(computed(() => ({ city: this.city(), fail: this.initialFailure() })), ({ city, fail }) => {
    if (fail && !this.automaticFailureUsed) {
      this.automaticFailureUsed = true;
      this.demo.failNextReading(city.id);
    }
    return this.port.current(city.id);
  });

  simulateFailure(): void {
    this.demo.failNextReading(this.city().id);
    this.air.retry();
  }
}
