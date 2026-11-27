import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { DEMO_NOW } from '../../core/config/demo-clock';
import { DEMO_CONFIG, LOCAL_DEMO_CONFIG } from '../../core/config/demo-config';
import { MockSessionProvider } from '../../core/session/session-provider';
import { AirData } from '../air-quality/data/air-quality';
import { AlertsData } from '../alerts/data/alerts';
import { defaults, PreferencesData } from '../favorites/data/preferences';
import { ActivitiesData } from '../forecasts/activities/activities';
import { ForecastData } from '../forecasts/data/forecasts';
import { CatalogAdmin } from '../locations/data/catalog-admin';
import { CatalogStore } from '../locations/data/city-catalog';
import { WeatherAdmin } from '../weather/data/weather-admin';

describe('Opérations administrateur de démonstration', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [
      { provide: DEMO_CONFIG, useValue: { ...LOCAL_DEMO_CONFIG, responseDelayMs: 2 } },
      { provide: DEMO_NOW, useValue: new Date() },
    ] });
    TestBed.inject(MockSessionProvider).select('admin');
  });
  afterEach(() => sessionStorage.clear());

  it('ne donne pas à l’administrateur accès aux notifications ou aux activités personnelles', async () => {
    const alerts = TestBed.inject(AlertsData);
    const activities = TestBed.inject(ActivitiesData);
    await expect(firstValueFrom(alerts.notificationList())).rejects.toMatchObject({ status: 403 });
    await expect(firstValueFrom(activities.list())).rejects.toMatchObject({ status: 403 });
  });

  it('refuse aux profils ordinaires les opérations administratives', async () => {
    const catalog = TestBed.inject(CatalogAdmin);
    const preferences = TestBed.inject(PreferencesData);
    TestBed.inject(MockSessionProvider).select('amel');
    await expect(firstValueFrom(catalog.cities())).rejects.toMatchObject({ status: 403 });
    await expect(firstValueFrom(preferences.adminSavePreferences('demo-karim', null))).rejects.toMatchObject({ status: 403 });
  });

  it('protège les référentiels liés et répercute la création et la suppression d’une ville', async () => {
    const catalog = TestBed.inject(CatalogAdmin);
    const store = TestBed.inject(CatalogStore);
    await firstValueFrom(catalog.saveReference('countries', 'DE', 'Allemagne', true));
    await firstValueFrom(catalog.saveReference('zones', 'berlin', 'Europe/Berlin', true));
    await firstValueFrom(catalog.saveCity({
      name: 'Berlin', latitude: 52.52, longitude: 13.4, countryCode: 'DE', zoneId: 'berlin',
    }));
    const berlin = store.publicCities().find((city) => city.name === 'Berlin')!;
    expect(berlin.timezone).toBe('Europe/Berlin');
    await expect(firstValueFrom(catalog.removeReference('zones', 'berlin'))).rejects.toMatchObject({ status: 409 });
    await firstValueFrom(catalog.removeCity(berlin.id));
    await firstValueFrom(catalog.removeReference('zones', 'berlin'));
    expect(store.publicCities().some((city) => city.id === berlin.id)).toBe(false);
  });

  it('préserve la prévision manuelle pendant la synchronisation et purge seulement la ville cible', async () => {
    const cities = TestBed.inject(CatalogStore).publicCities();
    const tunis = cities.find((city) => city.id === '1')!;
    const paris = cities.find((city) => city.id === '9')!;
    const forecasts = TestBed.inject(ForecastData);
    const initial = forecasts.rows(tunis, 'daily')[0];
    await expect(firstValueFrom(forecasts.saveConfig('1', 6, 7, true, true))).rejects.toMatchObject({ status: 409 });
    await expect(firstValueFrom(forecasts.saveConfig('9', 25, 8, true, true))).rejects.toMatchObject({ status: 422 });
    await firstValueFrom(forecasts.save(tunis, 'daily', { ...initial, second: 41 }, initial.id));
    await firstValueFrom(forecasts.synchronize(tunis));
    expect(forecasts.rows(tunis, 'daily')[0]).toMatchObject({ second: 41, source: 'MANUAL' });
    await firstValueFrom(forecasts.purge(tunis));
    expect(forecasts.rows(tunis, 'daily')).toHaveLength(0);
    expect(forecasts.rows(tunis, 'hourly')).toHaveLength(0);
    expect(forecasts.rows(paris, 'daily')).toHaveLength(7);
  });

  it('limite la vitrine à six villes et enregistre une seule réponse par avis', async () => {
    const weather = TestBed.inject(WeatherAdmin);
    await firstValueFrom(weather.add('4'));
    await firstValueFrom(weather.add('6'));
    await expect(firstValueFrom(weather.add('8'))).rejects.toMatchObject({ status: 409 });
    const review = (await firstValueFrom(weather.reviews('1')))[0];
    await firstValueFrom(weather.respond('1', review.id, 'Première réponse'));
    await firstValueFrom(weather.respond('1', review.id, 'Corrigée'));
    expect((await firstValueFrom(weather.reviews('1')))[0].reply).toBe('Corrigée');
    await firstValueFrom(weather.respond('1', review.id, null));
    expect((await firstValueFrom(weather.reviews('1')))[0].reply).toBeUndefined();
  });

  it('enregistre un relevé manuel UTC et répercute les préférences sur le compte cible', async () => {
    const air = TestBed.inject(AirData);
    const timestamp = new Date(Date.now() - 37_000).toISOString();
    await firstValueFrom(air.save('8', timestamp, { aqi: 57, uv: 0, pm10: null, pm25: null }));
    expect(air.rows('8')[0]).toMatchObject({ timestamp, source: 'MANUAL', values: { aqi: 57, uv: 0 } });
    await firstValueFrom(air.remove('8', timestamp));
    expect(air.rows('8')).toHaveLength(0);

    const preferences = TestBed.inject(PreferencesData);
    await firstValueFrom(preferences.adminSavePreferences('demo-karim', { ...defaults, theme: 'dark' }));
    await firstValueFrom(preferences.adminSaveFavorite({
      owner: 'demo-karim', cityId: '9', cityName: 'Paris', alias: 'Déplacement', isDefault: true,
    }));
    expect(await firstValueFrom(preferences.adminList('demo-karim', '9'))).toHaveLength(1);
    TestBed.inject(MockSessionProvider).select('karim');
    expect(preferences.current()?.theme).toBe('dark');
    expect(preferences.defaultCity()).toBe('9');
  });
});
