import { DecimalPipe, registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { ContentState, ContentStatus } from '../../../shared/ui/content-state';
import { ThemeService } from '../../../core/theme/theme-service';
import { ActiveCityStore } from '../data/active-city-store';
import { CITY_CATALOG } from '../data/city-catalog';
import { mapRegions } from '../data/map-geography';
import { City, NearbyCity } from '../location';
import { PositionAction } from '../position-action';

registerLocaleData(localeFr);

interface Proximity {
  readonly status: ContentStatus;
  readonly entries: readonly NearbyCity[];
}

@Component({
  imports: [ContentState, DecimalPipe, PositionAction],
  templateUrl: './maps.html',
  styleUrl: './maps.css',
})
export class Maps {
  protected readonly activeCity = inject(ActiveCityStore);
  private readonly catalog = inject(CITY_CATALOG);
  protected readonly radii = [1, 25, 50, 100, 150];
  protected readonly radius = signal(25);
  private readonly geography = viewChild<ElementRef<HTMLCanvasElement>>('geography');
  private readonly theme = inject(ThemeService).theme;
  protected readonly region = computed(() => {
    const city = this.activeCity.city();
    if (!city) return undefined;
    const halfLatitude = 50 / this.mapScale();
    const halfLongitude = halfLatitude / Math.cos(city.latitude * Math.PI / 180);
    return mapRegions.find(({ bounds: [west, south, east, north] }) =>
      city.longitude - halfLongitude >= west && city.longitude + halfLongitude <= east &&
      city.latitude - halfLatitude >= south && city.latitude + halfLatitude <= north);
  });
  private readonly retry = signal(0);
  private readonly query = computed(() => ({
    city: this.activeCity.city(),
    radius: this.radius(),
    retry: this.retry(),
  }));

  private readonly result = toSignal(toObservable(this.query).pipe(
    switchMap((query) => {
      if (!query.city) return of(undefined);
      const loading = { query, status: 'loading' as const, entries: [] };
      return this.catalog.nearby(query.city, query.radius, query.city.id).pipe(
        map((entries) => ({ query, status: entries.length ? 'success' as const : 'empty' as const, entries })),
        catchError(() => of({ query, status: 'error' as const, entries: [] })),
        startWith(loading),
      );
    }),
  ));

  protected readonly proximity = computed<Proximity>(() => {
    const result = this.result();
    return result?.query === this.query() ? result : { status: 'loading', entries: [] };
  });

  constructor() {
    effect(() => {
      const canvas = this.geography()?.nativeElement;
      const city = this.activeCity.city();
      const region = this.region();
      const dark = this.theme() === 'dark';
      if (!canvas || !city || !region) return;
      const context = canvas.getContext('2d');
      if (!context) return;
      const size = canvas.width;
      const water = dark ? '#204461' : '#bcdded';
      context.fillStyle = water;
      context.fillRect(0, 0, size, size);
      const trace = (path: readonly (readonly [number, number])[]) => {
        context.beginPath();
        for (const [index, [longitude, latitude]] of path.entries()) {
          const { x, y } = this.project(city, longitude, latitude);
          if (index === 0) context.moveTo(x * size / 100, y * size / 100);
          else context.lineTo(x * size / 100, y * size / 100);
        }
      };
      context.fillStyle = dark ? '#293f3e' : '#e9eddb';
      for (const path of region.land) {
        trace(path);
        context.fill();
      }
      context.strokeStyle = dark ? '#70aace' : '#569ab9';
      context.lineWidth = 2;
      for (const path of region.rivers) {
        trace(path);
        context.stroke();
      }
    });
  }

  protected markers(city: City) {
    return this.proximity().entries.map(({ city: neighbor }) => ({
      city: neighbor,
      ...this.project(city, neighbor.longitude, neighbor.latitude),
    }));
  }

  protected stepRadius(direction: -1 | 1): void {
    const next = this.radii[this.radii.indexOf(this.radius()) + direction];
    if (next !== undefined) this.radius.set(next);
  }

  private mapScale(): number {
    return 39 * 111.195 / this.radius();
  }

  private project(city: City, longitude: number, latitude: number) {
    const scale = this.mapScale();
    return {
      x: 50 + (longitude - city.longitude) * scale * Math.cos(city.latitude * Math.PI / 180),
      y: 50 - (latitude - city.latitude) * scale,
    };
  }

  protected retryProximity(): void {
    this.retry.update((value) => value + 1);
  }
}
