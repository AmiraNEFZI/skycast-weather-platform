import { inject, Injectable, InjectionToken } from '@angular/core';
import { map, Observable, timer } from 'rxjs';
import { DEMO_NOW, localCalendarTime } from '../../../core/config/demo-clock';
import { DEMO_CONFIG } from '../../../core/config/demo-config';
import { AdminMock } from '../../../core/session/admin-mock';
import { SessionAccessError } from '../../../core/session/private-access';
import { demoRecords } from '../../../core/demo/demo-records';
import { DemoConflict } from '../../../core/session/user-mock';
import { City } from '../../locations/location';
import { CatalogStore } from '../../locations/data/city-catalog';
import { Condition, conditions } from '../../weather/data/weather';

export interface ForecastHour { localTime: string; temperatureC: number | null; rainPercent: number | null }
export interface ForecastDay { date: string; minC: number; maxC: number; condition: Condition }
export type ForecastKind = 'hourly' | 'daily';
export interface ForecastRow {
  id: string; time: string; first: number; second: number; condition: Condition; source: 'OPEN_METEO' | 'MANUAL';
  modifiedAt?: string;
}
interface ForecastSeries { cityId: string; kind: ForecastKind; rows: readonly ForecastRow[] }
export interface SyncConfig {
  id: string; active: boolean; frequency: number; horizon: number;
  status: 'En attente' | 'Réussie' | 'Échec'; lastSync: string;
}
interface ForecastPort {
  hourly(city: City): Observable<readonly ForecastHour[]>;
  daily(city: City): Observable<readonly ForecastDay[]>;
}

const hourMs = 3_600_000;
const temperature: Record<string, number> = { '1': 22, '2': 24, '4': 26, '5': 23, '6': 21, '8': 22, '9': 12 };

@Injectable({ providedIn: 'root' })
export class ForecastData {
  private readonly now = inject(DEMO_NOW);
  private readonly admin = inject(AdminMock);
  private readonly catalog = inject(CatalogStore);
  private readonly stored = demoRecords<ForecastSeries>('stored-forecasts', []);
  private readonly configs = demoRecords<SyncConfig>('forecast-sync', [
    { id: '1', active: true, frequency: 6, horizon: 7, status: 'En attente', lastSync: '' },
  ]);

  rows(city: City, kind: ForecastKind): readonly ForecastRow[] {
    return this.stored.rows().find((entry) => entry.cityId === city.id && entry.kind === kind)?.rows ?? this.generate(city, kind);
  }

  hasCity(id: string): boolean {
    return this.configs.rows().some((row) => row.id === id)
      || this.stored.rows().some((row) => row.cityId === id && row.rows.length > 0);
  }

  adminRows(city: City, kind: ForecastKind) { return this.admin.read(() => this.rows(city, kind)); }
  adminConfigs() { return this.admin.read(() => this.configs.rows()); }

  saveConfig(id: string, frequency: number, horizon: number, active: boolean, creating: boolean) {
    return this.admin.write(() => {
      if (!this.catalog.publicCities().some((city) => city.id === id)) throw new SessionAccessError(404);
      const rows = this.configs.rows();
      const current = rows.find((row) => row.id === id);
      if (creating && current) throw new DemoConflict(409, 'Une configuration existe déjà pour cette ville.');
      if (!Number.isInteger(frequency) || frequency < 1 || frequency > 24 || !Number.isInteger(horizon) || horizon < 1 || horizon > 7) {
        throw new DemoConflict(422, 'Fréquence de 1 à 24 h et horizon de 1 à 7 jours requis.');
      }
      this.configs.set([...rows.filter((row) => row.id !== id), {
        id, frequency, horizon, active, status: current?.status ?? 'En attente', lastSync: current?.lastSync ?? '',
      }]);
    });
  }

  removeConfig(id: string) {
    return this.admin.write(() => this.configs.set(this.configs.rows().filter((row) => row.id !== id)));
  }

  synchronize(city: City, fail = false) {
    return this.admin.write(() => {
      const config = this.configs.rows().find((row) => row.id === city.id);
      if (!config?.active) throw new DemoConflict(422, 'Activez la configuration avant la synchronisation.');
      const lastSync = this.now.toISOString();
      if (!fail) {
        for (const kind of ['hourly', 'daily'] as const) {
          const manual = this.rows(city, kind).filter((row) => row.source === 'MANUAL');
          const generated = this.generate(city, kind, config.horizon);
          this.replace(city, kind, [...generated.filter((row) => !manual.some((item) => item.id === row.id)), ...manual]);
        }
      }
      this.configs.set(this.configs.rows().map((row) => row === config ? { ...row, lastSync, status: fail ? 'Échec' : 'Réussie' } : row));
    });
  }

  save(city: City, kind: ForecastKind, value: Omit<ForecastRow, 'id' | 'source'>, previous?: string) {
    return this.admin.write(() => {
      const hourly = kind === 'hourly';
      const instant = new Date(value.time + (hourly ? ':00Z' : 'T00:00:00Z'));
      const validTime = Number.isFinite(instant.getTime()) && instant.toISOString().slice(0, hourly ? 16 : 10) === value.time;
      if (!validTime || !Number.isFinite(value.first) || !Number.isFinite(value.second) || !Object.hasOwn(conditions, value.condition)
        || (kind === 'daily' ? value.first > value.second : value.second < 0 || value.second > 100)) {
        throw new DemoConflict(422, 'Vérifiez la date, les températures et la probabilité de pluie.');
      }
      const rows = this.rows(city, kind);
      if (rows.some((row) => row.id === value.time && row.id !== previous)) throw new DemoConflict(409, 'Une prévision existe à cet instant.');
      this.replace(city, kind, [...rows.filter((row) => row.id !== previous), {
        ...value, id: value.time, source: 'MANUAL', modifiedAt: this.now.toISOString(),
      }]);
    });
  }

  remove(city: City, kind: ForecastKind, id: string) {
    return this.admin.write(() => this.replace(city, kind, this.rows(city, kind).filter((row) => row.id !== id)));
  }

  purge(city: City) {
    return this.admin.write(() => { this.replace(city, 'hourly', []); this.replace(city, 'daily', []); });
  }

  private replace(city: City, kind: ForecastKind, rows: readonly ForecastRow[]): void {
    this.stored.set([...this.stored.rows().filter((row) => row.cityId !== city.id || row.kind !== kind),
      { cityId: city.id, kind, rows: [...rows].sort((a, b) => a.time.localeCompare(b.time)) }]);
  }

  private generate(city: City, kind: ForecastKind, horizon?: number): ForecastRow[] {
    const origin = Math.floor(this.now.getTime() / hourMs) * hourMs;
    const today = Date.parse(localCalendarTime(this.now, city.timezone).slice(0, 10));
    const base = temperature[city.id] ?? 20;
    const rows: ForecastRow[] = Array.from({ length: kind === 'hourly' ? (horizon ?? 1) * 24 : (horizon ?? 7) }, (_, index) => {
      const hourly = kind === 'hourly';
      const time = hourly ? localCalendarTime(new Date(origin + index * hourMs), city.timezone)
        : new Date(today + index * 24 * hourMs).toISOString().slice(0, 10);
      const max = base + (index % 5) - 2;
      return {
        id: time, time, first: hourly ? base + Math.round(4 * Math.sin(index / 4)) : max - 7,
        second: hourly ? (city.id === '9' ? Math.min(100, 25 + index * 3) : Math.round(15 * (1 + Math.sin(index / 4)))) : max,
        condition: city.id === '9' && index < 2 ? 'PLUIE' : index % 3 === 1 ? 'NUAGEUX' : 'ENSOLEILLE', source: 'OPEN_METEO',
      };
    });
    return [...new Map(rows.map((row) => [row.id, row])).values()];
  }
}

export const FORECASTS = new InjectionToken<ForecastPort>('Prévisions météo', {
  providedIn: 'root',
  factory: () => {
    const delay = inject(DEMO_CONFIG).responseDelayMs;
    const data = inject(ForecastData);
    return {
      hourly: (city) => timer(delay).pipe(map(() => data.rows(city, 'hourly').slice(0, 24).map((row) => ({
        localTime: row.time, temperatureC: row.first, rainPercent: row.second,
      })))),
      daily: (city) => timer(delay / 2).pipe(map(() => data.rows(city, 'daily').slice(0, 7).map((row) => ({
        date: row.time, minC: row.first, maxC: row.second, condition: row.condition,
      })))),
    };
  },
});
