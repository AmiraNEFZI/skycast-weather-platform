import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, concat, map, of, Subject, switchMap, timer } from 'rxjs';
import { ContentState } from '../../shared/ui/content-state';
import { ActiveCityStore } from './data/active-city-store';
import { CITY_CATALOG } from './data/city-catalog';
import { City } from './location';

@Component({
  selector: 'app-city-search',
  imports: [ContentState],
  template: `
    <div class="search-box" (keydown.escape)="close(field)" (focusout)="leave($event)">
      <input #field id="recherche-ville" class="field" type="search" autocomplete="off"
        aria-label="Rechercher une ville" placeholder="Rechercher une ville"
        [value]="query()" (input)="search(field.value)"
        (focus)="open.set(true)" (keydown.enter)="$event.preventDefault(); selectFirst(field)" />
      @if (open() && query().trim()) {
        <div class="card results" aria-label="Résultats de recherche">
          <app-content-state [status]="results().status" emptyMessage="Aucune ville correspondante."
            errorMessage="La recherche est indisponible." (retry)="search(query())">
            <ul>
              @for (city of results().cities; track city.id) {
                <li><button type="button" (click)="select(city, field)">
                  <strong>{{ city.name }}</strong> <span class="muted">{{ city.country }}</span>
                </button></li>
              }
            </ul>
          </app-content-state>
        </div>
      }
    </div>
  `,
  styles: `
    :host, input { display: block; width: 100%; }
    .search-box { position: relative; }
    .results { position: absolute; inset: calc(100% + .35rem) 0 auto; z-index: 2; padding: .5rem; max-height: 18rem; overflow: auto; box-shadow: 0 8px 22px #0002; }
    ul { list-style: none; margin: 0; padding: 0; }
    li button { width: 100%; padding: .55rem; color: var(--text); background: none; border: 0; border-radius: .4rem; text-align: start; cursor: pointer; }
    li button:hover { background: var(--accent-soft); }
  `,
})
export class CitySearch {
  private readonly catalog = inject(CITY_CATALOG);
  private readonly activeCity = inject(ActiveCityStore);
  private readonly queries = new Subject<string>();
  protected readonly query = signal('');
  protected readonly open = signal(false);
  protected readonly results = toSignal(this.queries.pipe(
    switchMap((term) => term ? concat(
      of({ status: 'loading' as const, cities: [] }),
      timer(250).pipe(
        switchMap(() => this.catalog.search(term)),
        map((cities) => ({ status: cities.length ? 'success' as const : 'empty' as const, cities })),
        catchError(() => of({ status: 'error' as const, cities: [] })),
      ),
    ) : of({ status: 'empty' as const, cities: [] })),
  ), { initialValue: { status: 'empty', cities: [] } });

  protected search(value: string): void {
    this.query.set(value);
    this.open.set(true);
    this.queries.next(value.trim());
  }

  protected selectFirst(field: HTMLInputElement): void {
    const first = this.results().cities[0];
    if (this.open() && first) this.select(first, field);
  }

  protected select(city: City, field: HTMLInputElement): void {
    void this.activeCity.select(city.id);
    this.search('');
    this.close(field);
  }

  protected close(field: HTMLInputElement): void {
    field.focus();
    this.open.set(false);
  }

  protected leave(event: FocusEvent): void {
    if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null)) {
      this.open.set(false);
    }
  }
}
