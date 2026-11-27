import { inject, Injectable, InjectionToken } from '@angular/core';
import { map, Observable, timer } from 'rxjs';
import { DEMO_NOW } from '../../../core/config/demo-clock';
import { DEMO_CONFIG } from '../../../core/config/demo-config';
import { AdminMock } from '../../../core/session/admin-mock';
import { demoRecords } from '../../../core/demo/demo-records';
import { DemoConflict } from '../../../core/session/user-mock';
import { SessionAccessError } from '../../../core/session/private-access';
import { CatalogStore } from '../../locations/data/city-catalog';
import { CityId } from '../../locations/location';

export type AirPeriod = '24h' | '7d';
export type AirMetric = 'aqi' | 'pm25' | 'pm10' | 'uv';
export const airMetrics = [
  { key: 'aqi', title: 'US AQI', unit: '' },
  { key: 'pm25', title: 'PM2,5', unit: 'µg/m³' },
  { key: 'pm10', title: 'PM10', unit: 'µg/m³' },
  { key: 'uv', title: 'Indice UV', unit: '' },
] as const;

export interface AirReading {
  cityId: CityId;
  timestamp: string;
  values: Record<AirMetric, number | null>;
}

interface AirAverage {
  value: number | null;
  count: number;
}

interface AirPort {
  current(id: CityId): Observable<AirReading | null>;
  history(id: CityId, period: AirPeriod): Observable<readonly AirReading[]>;
  average(id: CityId): Observable<AirAverage>;
}

@Injectable({ providedIn: 'root' })
export class DemoAirFailure {
  private nextFailure?: CityId;

  failNextReading(id: CityId): void {
    this.nextFailure = id;
  }

  consume(id: CityId): boolean {
    if (this.nextFailure !== id) return false;
    this.nextFailure = undefined;
    return true;
  }
}

const hourMs = 3_600_000;
const cityCodes = new Map<CityId, number>([['1', 1], ['2', 2], ['4', 4], ['5', 5], ['6', 6], ['8', 8], ['9', 9]]);

export interface ManagedAir extends AirReading { source: 'OPEN_METEO' | 'MANUAL' }
interface AirChange { cityId: CityId; timestamp: string; reading: ManagedAir | null }

@Injectable({ providedIn: 'root' })
export class AirData {
  private readonly admin = inject(AdminMock);
  private readonly catalog = inject(CatalogStore);
  private readonly clock = inject(DEMO_NOW).getTime();
  private readonly end = Math.floor(this.clock / hourMs) * hourMs;
  private readonly changes = demoRecords<AirChange>('air-changes', []);

  hasCity(id: CityId): boolean { return this.changes.rows().some((row) => row.cityId === id && row.reading !== null); }

  rows(id: CityId, hours = 168): ManagedAir[] {
    const code = cityCodes.get(id);
    const values = new Map<string, ManagedAir>();
    if (code !== undefined && id !== '8') {
      for (let age = hours - 1; age >= 0; age--) {
        const time = this.end - age * hourMs;
        const reading = this.generate(id, code, time, age);
        values.set(reading.timestamp, reading);
      }
    }
    for (const row of this.changes.rows()) {
      if (row.cityId !== id || Date.parse(row.timestamp) < this.end - (hours - 1) * hourMs) continue;
      if (row.reading) values.set(row.timestamp, row.reading);
      else values.delete(row.timestamp);
    }
    return [...values.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  adminRows(id: CityId) {
    return this.admin.read(() => this.rows(id).reverse());
  }

  save(id: CityId, datetime: string, values: AirReading['values'], previous?: string) {
    return this.admin.write(() => {
      if (!this.catalog.publicCities().some((city) => city.id === id)) throw new SessionAccessError(404);
      const time = Date.parse(datetime);
      const supplied = Object.values(values).filter((value) => value !== null);
      if (!Number.isFinite(time) || !supplied.length || supplied.some((value) => !Number.isFinite(value) || value < 0)) {
        throw new DemoConflict(422, 'Saisissez une date UTC et au moins une mesure positive ou nulle.');
      }
      if (time > this.clock || time < this.end - 167 * hourMs) {
        throw new DemoConflict(422, 'La date doit être comprise dans les sept jours qui précèdent l’heure de la démo.');
      }
      const timestamp = new Date(time).toISOString();
      if (timestamp !== previous && this.rows(id).some((row) => row.timestamp === timestamp)) {
        throw new DemoConflict(409, 'Un relevé existe pour cette ville à cette date.');
      }
      const changes = this.changes.rows().filter((row) => row.cityId !== id || (row.timestamp !== timestamp && row.timestamp !== previous));
      const reading: ManagedAir = { cityId: id, timestamp, values, source: 'MANUAL' };
      this.changes.set([...changes, ...(previous && previous !== timestamp ? [{ cityId: id, timestamp: previous, reading: null }] : []),
        { cityId: id, timestamp, reading }]);
    });
  }

  remove(id: CityId, timestamp: string) { return this.admin.write(() => this.setChange(id, timestamp, null)); }

  sync(id: CityId) {
    return this.admin.write(() => {
      if (!this.catalog.publicCities().some((city) => city.id === id)) throw new SessionAccessError(404);
      const time = this.end;
      const reading = this.generate(id, cityCodes.get(id) ?? 10, time, 0);
      if (!this.rows(id).some((row) => row.timestamp === reading.timestamp && row.source === 'MANUAL')) {
        this.setChange(id, reading.timestamp, reading);
      }
    });
  }

  private setChange(id: CityId, timestamp: string, reading: ManagedAir | null): void {
    this.changes.set([...this.changes.rows().filter((row) => row.cityId !== id || row.timestamp !== timestamp), { cityId: id, timestamp, reading }]);
  }

  private generate(id: CityId, code: number, time: number, age: number): ManagedAir {
    const date = new Date(time);
    const gap = age % 19 === 7 || age % 19 === 8;
    return {
      cityId: id, timestamp: date.toISOString(), source: 'OPEN_METEO',
      values: {
        aqi: gap ? null : 40 + code + Math.round(10 * Math.sin(age / 4)),
        pm25: gap ? null : 10 + code + Math.round(3 * Math.sin(age / 5) * 10) / 10,
        pm10: gap || (id === '2' && age === 0) ? null : 18 + code + Math.round(6 * Math.sin(age / 6) * 10) / 10,
        uv: gap || (age === 0 && id === '2') ? null : age === 0 && id === '1' ? 0 : Math.max(0, 6 - Math.abs(12 - date.getUTCHours())),
      },
    };
  }
}

export const AIR_QUALITY = new InjectionToken<AirPort>('Mesures air et UV', {
  providedIn: 'root',
  factory: () => {
    const delay = inject(DEMO_CONFIG).responseDelayMs;
    const demo = inject(DemoAirFailure);
    const data = inject(AirData);
    return {
      current: (id) => {
        const fail = demo.consume(id);
        return timer(delay * 0.75).pipe(map(() => {
          if (fail) throw new Error('Lecture MS6 indisponible');
          return data.rows(id).reverse().find((row) => Object.values(row.values).some((value) => value !== null)) ?? null;
        }));
      },
      history: (id, period) => timer(period === '7d' ? delay : delay / 2).pipe(
        map(() => data.rows(id, period === '7d' ? 168 : 24)),
      ),
      average: (id) => timer(delay / 2).pipe(map(() => {
        const values = data.rows(id, 24).map((entry) => entry.values.aqi).filter((aqi) => aqi !== null);
        return { value: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null, count: values.length };
      })),
    };
  },
});
