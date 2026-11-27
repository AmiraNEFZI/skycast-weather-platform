import { inject, Injectable } from '@angular/core';
import { AdminMock } from '../../../core/session/admin-mock';
import { DemoConflict } from '../../../core/session/user-mock';
import { AirData } from '../../air-quality/data/air-quality';
import { AlertsData } from '../../alerts/data/alerts';
import { PreferencesData } from '../../favorites/data/preferences';
import { ActivitiesData } from '../../forecasts/activities/activities';
import { ForecastData } from '../../forecasts/data/forecasts';
import { ReviewEdits } from '../../weather/data/review-edits';
import { WeatherManaged } from '../../weather/data/weather-managed';
import { CatalogCity, CatalogStore, seedCityIds } from './city-catalog';

@Injectable({ providedIn: 'root' })
export class CatalogAdmin {
  private readonly admin = inject(AdminMock);
  private readonly catalog = inject(CatalogStore);
  private readonly forecasts = inject(ForecastData);
  private readonly air = inject(AirData);
  private readonly accounts = inject(PreferencesData);
  private readonly alerts = inject(AlertsData);
  private readonly activities = inject(ActivitiesData);
  private readonly reviews = inject(ReviewEdits);
  private readonly weather = inject(WeatherManaged);

  cities() { return this.admin.read(() => this.catalog.cities.rows()); }
  countries() { return this.admin.read(() => this.catalog.countries.rows()); }
  zones() { return this.admin.read(() => this.catalog.zones.rows()); }

  saveCity(city: Omit<CatalogCity, 'id'>, id?: string) {
    return this.admin.write(() => {
      if (!city.name.trim() || !Number.isFinite(city.latitude) || Math.abs(city.latitude) > 90
        || !Number.isFinite(city.longitude) || Math.abs(city.longitude) > 180
        || !this.catalog.countries.rows().some((item) => item.id === city.countryCode)
        || !this.catalog.zones.rows().some((item) => item.id === city.zoneId)) {
        throw new DemoConflict(422, 'Vérifiez le nom, les coordonnées, le pays et le fuseau.');
      }
      const rows = this.catalog.cities.rows();
      if (rows.some((item) => item.id !== id && item.countryCode === city.countryCode
        && item.name.toLocaleLowerCase('fr') === city.name.trim().toLocaleLowerCase('fr'))) {
        throw new DemoConflict(409, 'Cette ville existe déjà dans ce pays.');
      }
      const next = { ...city, name: city.name.trim(), id: id ?? crypto.randomUUID() };
      this.catalog.cities.set(id ? rows.map((row) => row.id === id ? next : row) : [...rows, next]);
    });
  }

  removeCity(id: string) {
    return this.admin.write(() => {
      if (seedCityIds.has(id) || this.weather.showcase.rows().includes(id) || this.accounts.hasFavoriteCity(id)
        || this.reviews.rows().some((row) => row.cityId === id) || this.activities.rows().some((row) => row.cityId === id)
        || this.alerts.hasCity(id) || this.forecasts.hasCity(id) || this.air.hasCity(id)) {
        throw new DemoConflict(409, 'Cette ville est référencée par le jeu initial ou par des données de la démo.');
      }
      this.catalog.cities.set(this.catalog.cities.rows().filter((row) => row.id !== id));
    });
  }

  saveReference(kind: 'countries' | 'zones', id: string, name: string, creating: boolean) {
    return this.admin.write(() => {
      if (!name.trim() || !id.trim() || (kind === 'countries' && !/^[A-Z]{2}$/.test(id))) {
        throw new DemoConflict(422, 'Saisissez un nom et un identifiant valides. Le code pays comporte deux majuscules.');
      }
      if (kind === 'zones') {
        try { new Intl.DateTimeFormat('fr', { timeZone: name.trim() }); }
        catch { throw new DemoConflict(422, 'Saisissez un fuseau IANA valide, par exemple Europe/Paris.'); }
      }
      const records = this.catalog[kind];
      const rows = records.rows();
      if (creating && rows.some((row) => row.id === id)) throw new DemoConflict(409, 'Cet identifiant existe déjà.');
      records.set([...rows.filter((row) => row.id !== id), { id, name: name.trim() }]);
    });
  }

  removeReference(kind: 'countries' | 'zones', id: string) {
    return this.admin.write(() => {
      if (this.catalog.cities.rows().some((row) => (kind === 'countries' ? row.countryCode : row.zoneId) === id)) {
        throw new DemoConflict(409, 'Ce référentiel est utilisé par une ville.');
      }
      const records = this.catalog[kind];
      records.set(records.rows().filter((row) => row.id !== id));
    });
  }
}
