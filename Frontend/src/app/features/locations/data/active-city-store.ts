import { computed, inject, Injectable, InjectionToken } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { catchError, combineLatest, defer, distinctUntilChanged, filter, map, merge, of, skip, startWith, Subject, switchMap } from 'rxjs';
import { City, CityId } from '../location';
import { demoCities } from '../../../core/demo/demo-fixtures';
import { CITY_CATALOG } from './city-catalog';

export const DEFAULT_CITY_ID = demoCities.tunis;
export const ACCOUNT_DEFAULT_CITY = new InjectionToken<() => CityId | null>('Ville par défaut du compte', {
  providedIn: 'root',
  factory: () => () => null,
});

type CityState =
  | { status: 'loading' | 'error' }
  | { status: 'success'; city: City; invalidLink: boolean };

@Injectable({ providedIn: 'root' })
export class ActiveCityStore {
  private readonly router = inject(Router);
  private readonly root = inject(ActivatedRoute).root;
  private readonly catalog = inject(CITY_CATALOG);
  private readonly accountDefault = inject(ACCOUNT_DEFAULT_CITY);
  private readonly reload = new Subject<void>();
  private readonly selections = new Subject<void>();
  private readonly addressChanges = this.router.events.pipe(
    filter((event) => event instanceof NavigationEnd),
    map(() => this.root.snapshot.queryParamMap.get('ville')),
  );
  private readonly address = defer(() => this.addressChanges.pipe(
    startWith(this.root.snapshot.queryParamMap.get('ville')), distinctUntilChanged(),
  ));
  readonly selectionChanges = merge(this.selections, this.address.pipe(skip(1)));

  readonly state = toSignal(combineLatest([
    this.address,
    toObservable(computed(() => this.accountDefault())).pipe(startWith(this.accountDefault())),
    toObservable(computed(() => this.catalog.changes?.())).pipe(startWith(this.catalog.changes?.())),
  ]).pipe(
    map(([requested, preferred, catalogue]) => ({ requested, id: requested ?? preferred ?? DEFAULT_CITY_ID, catalogue })),
    distinctUntilChanged((a, b) => a.requested === b.requested && a.id === b.id && a.catalogue === b.catalogue),
    switchMap(({ requested, id }) => this.reload.pipe(
      startWith(undefined),
      switchMap(() => this.resolve(requested, id)),
    )),
  ), { initialValue: { status: 'loading' } as CityState });

  readonly city = computed(() => {
    const state = this.state();
    return state.status === 'success' ? state.city : undefined;
  });

  readonly navigationParams = toSignal(this.address.pipe(
    map((ville) => ville === null ? {} : { ville }),
  ), { requireSync: true });

  select(id: CityId, replaceUrl = false): Promise<boolean> {
    this.selections.next();
    return this.router.navigate([], {
      relativeTo: this.root,
      queryParams: { ville: id },
      queryParamsHandling: 'merge',
      preserveFragment: true,
      replaceUrl,
    });
  }

  retry(): void {
    this.reload.next();
  }

  private resolve(requested: CityId | null, id: CityId) {
    return this.catalog.find(id).pipe(
      switchMap((city) => {
        if (city) return of<CityState>({ status: 'success', city, invalidLink: false });
        if (id === DEFAULT_CITY_ID) return of<CityState>({ status: 'error' });
        return this.catalog.find(DEFAULT_CITY_ID).pipe(
          map((fallback): CityState => fallback
            ? { status: 'success', city: fallback, invalidLink: requested !== null }
            : { status: 'error' }),
        );
      }),
      catchError(() => of<CityState>({ status: 'error' })),
      startWith<CityState>({ status: 'loading' }),
    );
  }
}
