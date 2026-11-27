import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map, of, Subject, switchMap, takeUntil } from 'rxjs';
import { City } from './location';
import { ActiveCityStore } from './data/active-city-store';
import { CITY_CATALOG } from './data/city-catalog';
import { GEOLOCATION, PositionScenario } from './data/geolocation';

@Component({
  selector: 'app-position-action',
  template: `
    <button type="button" class="button button-secondary" [disabled]="pending()"
      (click)="requests.next('browser')">Utiliser ma position</button>
    @if (pending()) { <p role="status">Recherche de la ville la plus proche…</p> }
    @if (message()) { <p role="status">{{ message() }}</p> }
    @if (proposal(); as city) {
      <p>Ville proposée · <strong>{{ city.name }}</strong></p>
      <button type="button" class="button" (click)="activeCity.select(city.id)">Afficher {{ city.name }}</button>
    }
    @if (simulation()) {
      <details>
        <summary>Simuler la géolocalisation</summary>
        <label for="scenario-position">Scénario</label>
        <select #scenario id="scenario-position" class="field">
          <option value="accepted">Position acceptée près de La Marsa</option>
          <option value="denied">Autorisation refusée</option>
          <option value="timeout">Délai dépassé</option>
          <option value="outside">Aucune ville proche</option>
        </select>
        <button type="button" class="button button-secondary" [disabled]="pending()"
          (click)="simulate(scenario.value)">Lancer la simulation</button>
      </details>
    }
  `,
  styles: `
    details { margin-top: .75rem; }
    summary { cursor: pointer; color: var(--accent-text); }
    label { display: block; margin-block: .5rem .25rem; }
    select { display: block; width: 100%; margin-bottom: .5rem; }
  `,
})
export class PositionAction {
  protected readonly activeCity = inject(ActiveCityStore);
  private readonly catalog = inject(CITY_CATALOG);
  private readonly locate = inject(GEOLOCATION);
  protected readonly requests = new Subject<PositionScenario>();
  protected readonly pending = signal(false);
  protected readonly message = signal('');
  protected readonly proposal = signal<City | undefined>(undefined);
  readonly simulation = input(false);

  constructor() {
    const destroy = inject(DestroyRef);
    const selection = this.activeCity.selectionChanges;
    selection.pipe(takeUntilDestroyed(destroy)).subscribe(() => {
      this.pending.set(false);
      this.message.set('');
      this.proposal.set(undefined);
    });
    this.requests.pipe(
      switchMap((scenario) => {
        this.pending.set(true);
        this.message.set('');
        this.proposal.set(undefined);
        return this.locate(scenario).pipe(
          switchMap((position) => typeof position === 'string' ? of(position)
            : this.catalog.nearby(position, 100).pipe(map((entries) => entries[0]?.city ?? 'outside' as const))),
          catchError(() => of('unavailable' as const)),
          takeUntil(selection),
        );
      }),
      takeUntilDestroyed(destroy),
    ).subscribe((result) => {
      this.pending.set(false);
      if (typeof result === 'object') {
        this.proposal.set(result);
        return;
      }
      this.message.set({
        denied: 'Autorisation de localisation refusée.',
        timeout: 'Le délai de localisation est dépassé.',
        outside: 'Aucune ville du catalogue dans un rayon de 100 km.',
        unavailable: 'La localisation est indisponible.',
      }[result]);
    });
  }

  protected simulate(value: string): void {
    if (value === 'accepted' || value === 'denied' || value === 'timeout' || value === 'outside') {
      this.requests.next(value);
    }
  }
}
