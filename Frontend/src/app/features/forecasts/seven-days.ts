import { Component, inject, input } from '@angular/core';
import { map } from 'rxjs';
import { CityDate } from '../../shared/data/local-time';
import { remoteContent } from '../../shared/data/remote-content';
import { ContentState } from '../../shared/ui/content-state';
import { Reading } from '../../shared/ui/reading';
import { City } from '../locations/location';
import { conditions } from '../weather/data/weather';
import { FORECASTS } from './data/forecasts';

@Component({
  selector: 'app-seven-days',
  imports: [CityDate, ContentState, Reading],
  template: `
    <section class="card">
      <h2>Prévisions sur 7 jours</h2>
      @let state = daily.state();
      <app-content-state [status]="state.status" emptyMessage="Aucune prévision journalière."
        errorMessage="Les prévisions journalières sont indisponibles." (retry)="daily.retry()">
        @if (state.value; as days) {
          <ul>
            @for (day of days; track day.date) {
              <li>
                <strong>{{ day.date | cityDate:city().timezone:'day' }}</strong>
                <span class="icon" aria-hidden="true">{{ conditions[day.condition].icon }}</span>
                <span>{{ conditions[day.condition].label }}</span>
                <span class="range"><strong>{{ day.maxC | reading:'°C' }}</strong><span aria-hidden="true">/</span>
                  <span class="muted">{{ day.minC | reading:'°C' }}</span>
                </span>
              </li>
            }
          </ul>
        }
      </app-content-state>
    </section>
  `,
  styles: `
    ul { list-style: none; padding: 0; margin: .8rem 0 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 6.6rem), 1fr)); gap: .5rem; }
    li { display: grid; justify-items: start; align-content: start; gap: .25rem; border: 1px solid var(--line); background: var(--background); border-radius: .7rem; padding: .65rem; font-size: .875rem; }
    .icon { color: var(--accent-text); font-size: 1.4rem; line-height: 1.2; }
    .range { display: flex; flex-wrap: wrap; gap: .25rem; }
  `,
})
export class SevenDays {
  readonly city = input.required<City>();
  private readonly port = inject(FORECASTS);
  protected readonly conditions = conditions;
  protected readonly daily = remoteContent(this.city, (city) =>
    this.port.daily(city).pipe(map((days) => days.length ? days : null)),
  );
}
