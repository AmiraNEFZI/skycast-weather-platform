import { computed, inject, Injectable, InjectionToken, Signal } from '@angular/core';
import { map, Observable, timer } from 'rxjs';
import { DEMO_CONFIG } from '../../../core/config/demo-config';
import { demoRecords } from '../../../core/demo/demo-records';
import { demoCities } from '../../../core/demo/demo-fixtures';
import { City, CityId, Coordinates, NearbyCity } from '../location';

export interface CityCatalog {
  readonly changes?: Signal<unknown>;
  search(query: string): Observable<readonly City[]>;
  find(id: CityId): Observable<City | undefined>;
  nearby(center: Coordinates, radiusKm: number, excludedId?: CityId): Observable<readonly NearbyCity[]>;
}

const cities: readonly City[] = [
  { id: demoCities.tunis, name: 'Tunis', country: 'Tunisie', latitude: 36.8065, longitude: 10.1815, timezone: 'Africa/Tunis' },
  { id: demoCities.sousse, name: 'Sousse', country: 'Tunisie', latitude: 35.8256, longitude: 10.6084, timezone: 'Africa/Tunis' },
  { id: demoCities.sfax, name: 'Sfax', country: 'Tunisie', latitude: 34.7406, longitude: 10.7603, timezone: 'Africa/Tunis' },
  { id: demoCities.monastir, name: 'Monastir', country: 'Tunisie', latitude: 35.777, longitude: 10.8262, timezone: 'Africa/Tunis' },
  { id: demoCities.marsa, name: 'La Marsa', country: 'Tunisie', latitude: 36.8782, longitude: 10.3247, timezone: 'Africa/Tunis' },
  { id: demoCities.ariana, name: 'Ariana', country: 'Tunisie', latitude: 36.8625, longitude: 10.1956, timezone: 'Africa/Tunis' },
  { id: demoCities.paris, name: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522, timezone: 'Europe/Paris' },
];

export interface CatalogCity extends Omit<City, 'country' | 'timezone'> {
  countryCode: string;
  zoneId: string;
}
export interface CatalogCountry { id: string; name: string }
export interface CatalogZone { id: string; name: string }
export const seedCityIds = new Set(cities.map((city) => city.id));

@Injectable({ providedIn: 'root' })
export class CatalogStore {
  readonly countries = demoRecords<CatalogCountry>('catalog-countries', [{ id: 'TN', name: 'Tunisie' }, { id: 'FR', name: 'France' }]);
  readonly zones = demoRecords<CatalogZone>('catalog-zones', [{ id: 'tn', name: 'Africa/Tunis' }, { id: 'fr', name: 'Europe/Paris' }]);
  readonly cities = demoRecords<CatalogCity>('catalog-cities', cities.map(({ country, timezone, ...city }) => ({
    ...city, countryCode: country === 'Tunisie' ? 'TN' : 'FR', zoneId: timezone === 'Africa/Tunis' ? 'tn' : 'fr',
  })));
  readonly publicCities = computed<readonly City[]>(() => this.cities.rows().map((city) => ({
    id: city.id, name: city.name, latitude: city.latitude, longitude: city.longitude,
    country: this.countries.rows().find((row) => row.id === city.countryCode)?.name ?? city.countryCode,
    timezone: this.zones.rows().find((row) => row.id === city.zoneId)?.name ?? 'UTC',
  })));
}

function normalized(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('fr');
}

export function distanceKm(from: Coordinates, to: Coordinates): number {
  const radians = Math.PI / 180;
  const latitude = (to.latitude - from.latitude) * radians;
  const longitude = (to.longitude - from.longitude) * radians;
  const angle = Math.sin(latitude / 2) ** 2 +
    Math.cos(from.latitude * radians) * Math.cos(to.latitude * radians) * Math.sin(longitude / 2) ** 2;
  return 12_742 * Math.asin(Math.min(1, Math.sqrt(angle)));
}

@Injectable({ providedIn: 'root' })
class MockCityCatalog implements CityCatalog {
  private readonly delay = inject(DEMO_CONFIG).responseDelayMs;
  private readonly store = inject(CatalogStore);
  readonly changes = this.store.publicCities;

  search(query: string): Observable<readonly City[]> {
    return timer(query === 'tu' ? this.delay * 2 : this.delay).pipe(map(() => {
      if (query === '!erreur') throw new Error('Catalogue indisponible');
      return this.store.publicCities().filter((city) => normalized(city.name).includes(normalized(query))).slice(0, query ? 8 : undefined);
    }));
  }

  find(id: CityId): Observable<City | undefined> {
    return timer(this.delay / 4).pipe(map(() => this.store.publicCities().find((city) => city.id === id)));
  }

  nearby(center: Coordinates, radiusKm: number, excludedId?: CityId): Observable<readonly NearbyCity[]> {
    return timer(this.delay / 2).pipe(map(() => this.store.publicCities()
      .filter((city) => city.id !== excludedId)
      .map((city) => ({ city, distanceKm: distanceKm(center, city) }))
      .filter((entry) => entry.distanceKm <= radiusKm)
      .sort((left, right) => left.distanceKm - right.distanceKm)));
  }
}

export const CITY_CATALOG = new InjectionToken<CityCatalog>('Catalogue des villes', {
  providedIn: 'root',
  factory: () => inject(MockCityCatalog),
});
